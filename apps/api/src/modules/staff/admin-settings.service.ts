// Admin settings (spec 16 AC-51…AC-56, ADR-005 §4): the only write path for register rows.
// Per write: area permission, register validation, optimistic version, step-up for marked rows (AC-7),
// new version row + audit (before/after), EV-124 to every S-100 address for critical rows (AC-55, AC-56).
import { Inject, Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { Prisma } from '../../generated/prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { RedisService } from '../../platform/redis/redis.module';
import {
  settingIdByKey,
  settingsRegistry,
  type SettingId,
  type SocialProviderStored,
} from '../../platform/settings/registry';
import { SecretBox } from '../../platform/settings/secret-box';
import { SettingsService } from '../../platform/settings/settings.service';
import type { StaffAuthState } from '../auth/auth.guard';
import type { RequestContext } from '../auth/request-context';

type S = components['schemas'];
type Meta = (typeof settingsRegistry)[SettingId];

const SEMVER = /^\d+\.\d+\.\d+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isSocial = (m: Meta) => 'socialProvider' in m && !!m.socialProvider;

/** Contract SettingSocialProviderValue: the secret only as "set / not set" (spec 16 AC-54). */
function socialView(v: SocialProviderStored): S['SettingSocialProviderValue'] {
  return {
    isEnabled: v.isEnabled,
    clientId: v.clientId,
    clientSecret: { isSet: !!v.clientSecret, updatedAt: v.clientSecret?.updatedAt ?? null },
  };
}

/** What audit rows and EV-124 may show of a provider row: never the secret (ADR-005 §8). */
const socialAudit = (v: SocialProviderStored, replaced = false) => ({
  isEnabled: v.isEnabled,
  clientId: v.clientId,
  clientSecretSet: !!v.clientSecret,
  ...(replaced ? { clientSecretReplaced: true } : {}),
});

@Injectable()
export class AdminSettingsService {
  private readonly box: SecretBox;

  constructor(
    @Inject(ENV) env: Env,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly settings: SettingsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {
    this.box = new SecretBox(env.SETTINGS_ENCRYPTION_KEY);
  }

  async list(area?: string, q?: string): Promise<S['SettingList']> {
    const rows = await this.prisma.setting.findMany();
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const staffIds = [...new Set(rows.map((r) => r.updatedByStaffId).filter(Boolean))] as string[];
    const staff = await this.prisma.staff.findMany({ where: { id: { in: staffIds } } });
    const needle = q?.trim().toLowerCase();
    const settings = (Object.entries(settingsRegistry) as [SettingId, Meta][])
      .filter(([, m]) => !area || m.area === area)
      .map(([id, m]) => this.entry(id, m, byKey.get(m.key), staff))
      .filter(
        (e) =>
          !needle ||
          [e.registerId, e.key, e.meaning.en ?? '', e.meaning.ka].some((v) =>
            v.toLowerCase().includes(needle),
          ),
      );
    return { settings };
  }

  async get(key: string): Promise<S['SettingEntry']> {
    const id = settingIdByKey.get(key);
    if (!id) throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
    const row = await this.prisma.setting.findUnique({ where: { key } });
    const staff = row?.updatedByStaffId
      ? await this.prisma.staff.findMany({ where: { id: row.updatedByStaffId } })
      : [];
    return this.entry(id, settingsRegistry[id], row ?? undefined, staff);
  }

  async update(
    key: string,
    input: S['SettingUpdateRequest'],
    caller: StaffAuthState,
    ctx: RequestContext,
  ): Promise<S['SettingEntry']> {
    const id = settingIdByKey.get(key);
    if (!id) throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
    const meta: Meta = settingsRegistry[id];
    if (!caller.isSuperAdmin && !caller.permissions.has(meta.writePermission)) {
      throw new ApiException(403, 'FORBIDDEN', 't_forbidden', { permission: meta.writePermission });
    }
    if (
      'stepUp' in meta &&
      meta.stepUp &&
      !(await this.redis.client.exists(`auth:stepup:${caller.sessionId}`))
    ) {
      throw new ApiException(403, 'REAUTH_REQUIRED', 't_reauth_required', { stepUpFor: key });
    }
    const current = await this.prisma.setting.findUnique({ where: { key } });
    let stored: unknown = input.value;
    let beforeView: unknown = current ? current.value : meta.default;
    let afterView: unknown = input.value;
    if (isSocial(meta)) {
      const prev = (current ? current.value : meta.default) as SocialProviderStored;
      stored = this.mergeSocial(prev, input.value, ctx);
      const replaced = typeof (input.value as { clientSecret?: unknown }).clientSecret === 'string';
      beforeView = socialAudit(prev);
      afterView = socialAudit(stored as SocialProviderStored, replaced);
    } else {
      this.validate(meta, input.value, ctx);
    }

    const currentVersion = current?.currentVersion ?? 1;
    if (input.expectedVersion !== currentVersion) {
      throw new ApiException(409, 'STATE_CONFLICT', 't_toast_something_went_wrong', {
        currentState: String(currentVersion),
      });
    }
    const version = currentVersion + 1;
    // A stored null (unlimited, R-2.2) is a JSON null, not a missing row.
    const value = stored === null ? Prisma.JsonNull : (stored as Prisma.InputJsonValue);
    // Read everything outside the transaction (a second connection inside it could wait forever).
    const critical = 'critical' in meta && meta.critical;
    const adminRecipients = critical ? ((await this.settings.get('S-100')) as string[]) : [];
    const actor = await this.prisma.staff.findUniqueOrThrow({ where: { id: caller.staffId } });
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.setting.updateMany({
        where: { key, currentVersion },
        data: { value, currentVersion: version, updatedByStaffId: caller.staffId },
      });
      if (updated.count === 0) {
        if (current) throw new ApiException(409, 'STATE_CONFLICT', 't_toast_something_went_wrong');
        await tx.setting.create({
          data: {
            key,
            registerId: id,
            value,
            currentVersion: version,
            updatedByStaffId: caller.staffId,
          },
        });
      }
      await tx.settingVersion.create({
        data: {
          key,
          version,
          value,
          changedByStaffId: caller.staffId,
          reason: input.reason ?? null,
        },
      });
      await this.audit.write(
        {
          actorStaffId: caller.staffId,
          permissionCode: meta.writePermission,
          action: 'settings.update',
          targetType: 'setting',
          targetId: id,
          before: { value: beforeView, version: currentVersion },
          after: { value: afterView, version },
          reason: input.reason ?? null,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
      if (critical) {
        const recipients = new Set<string>(adminRecipients);
        if (id === 'S-100') for (const e of input.value as string[]) recipients.add(e);
        await this.outbox.add(
          'EV-124',
          { type: 'setting', id },
          {
            to: [...recipients],
            locale: 'ka',
            params: {
              staff: actor.username,
              setting: `${id} ${key}`,
              time: new Date().toISOString(),
              old: JSON.stringify(beforeView),
              new: JSON.stringify(afterView),
            },
          },
          tx,
        );
      }
    });
    this.settings.invalidate();
    return this.get(key);
  }

  /**
   * SettingSocialProviderUpdate (ADR-005 §8): `clientSecret` omitted keeps the stored one, a string replaces it,
   * null clears it. EC-10: ON needs a client ID and a secret, else 422 and nothing is saved.
   */
  private mergeSocial(
    prev: SocialProviderStored,
    raw: unknown,
    ctx: RequestContext,
  ): SocialProviderStored {
    const v = (raw ?? {}) as Record<string, unknown>;
    const invalid = (): never => {
      throw new ApiException(400, 'VALIDATION_FAILED', 't_setting_invalid_value', {
        params: { rule: '{ isEnabled, clientId, clientSecret? }' },
        fields: [
          {
            field: 'value',
            code: 'invalid',
            message: ctx.t('t_setting_invalid_value', {
              rule: '{ isEnabled, clientId, clientSecret? }',
            }),
            messageKey: 't_setting_invalid_value',
          },
        ],
      });
    };
    const text = (x: unknown) => typeof x === 'string' && x.trim().length >= 1 && x.length <= 512;
    if (typeof v.isEnabled !== 'boolean') invalid();
    if (v.clientId !== null && !text(v.clientId)) invalid();
    if ('clientSecret' in v && v.clientSecret !== null && !text(v.clientSecret)) invalid();
    if (Object.keys(v).some((k) => !['isEnabled', 'clientId', 'clientSecret'].includes(k)))
      invalid();

    let clientSecret = prev.clientSecret;
    if (v.clientSecret === null) clientSecret = null;
    else if (typeof v.clientSecret === 'string') {
      if (!this.box.available) {
        throw new ApiException(503, 'SERVICE_UNAVAILABLE', 't_toast_something_went_wrong');
      }
      clientSecret = this.box.seal(v.clientSecret.trim());
    }
    const next: SocialProviderStored = {
      isEnabled: v.isEnabled as boolean,
      clientId: v.clientId === null ? null : (v.clientId as string).trim(),
      clientSecret,
    };
    if (next.isEnabled && (!next.clientId || !next.clientSecret)) {
      throw new ApiException(422, 'BUSINESS_RULE_VIOLATION', 't_social_provider_keys_required');
    }
    return next;
  }

  private validate(meta: Meta, value: unknown, ctx: RequestContext): void {
    const fail = (rule: string): never => {
      throw new ApiException(400, 'VALIDATION_FAILED', 't_setting_invalid_value', {
        params: { rule },
        fields: [
          {
            field: 'value',
            code: 'invalid',
            message: ctx.t('t_setting_invalid_value', { rule }),
            messageKey: 't_setting_invalid_value',
          },
        ],
      });
    };
    switch (meta.type) {
      case 'boolean':
        if (typeof value !== 'boolean') fail('true / false');
        return;
      case 'integer': {
        if (value === null && 'nullable' in meta && meta.nullable) return;
        const min = 'minimum' in meta ? meta.minimum : undefined;
        const max = 'maximum' in meta ? meta.maximum : undefined;
        if (typeof value !== 'number' || !Number.isInteger(value)) fail('integer');
        if (min !== undefined && (value as number) < min) fail(`≥ ${min}`);
        if (max !== undefined && (value as number) > max) fail(`≤ ${max}`);
        return;
      }
      case 'enum': {
        const allowed = ('allowedValues' in meta ? meta.allowedValues : []) as readonly string[];
        if (typeof value !== 'string' || !allowed.includes(value)) fail(allowed.join(' / '));
        return;
      }
      case 'email_list':
        // 00 EC-9: at least one valid address.
        if (
          !Array.isArray(value) ||
          value.length === 0 ||
          !value.every((v) => typeof v === 'string' && EMAIL.test(v))
        ) {
          fail('email, email, …');
        }
        return;
      case 'structured': {
        // Only S-130 so far; the other structured rows get their editors in slice 16.
        if (meta.key !== settingsRegistry['S-130'].key) fail('not editable here yet');
        const v = value as { ios?: unknown; android?: unknown };
        if (
          !v ||
          typeof v.ios !== 'string' ||
          typeof v.android !== 'string' ||
          !SEMVER.test(v.ios) ||
          !SEMVER.test(v.android)
        ) {
          fail('{ ios: x.y.z, android: x.y.z }');
        }
        return;
      }
      default:
        fail('not editable here yet');
    }
  }

  private entry(
    id: SettingId,
    m: Meta,
    row:
      | { value: unknown; currentVersion: number; updatedAt: Date; updatedByStaffId: string | null }
      | undefined,
    staff: { id: string; username: string; fullName: string }[],
  ): S['SettingEntry'] {
    const by = row?.updatedByStaffId ? staff.find((s) => s.id === row.updatedByStaffId) : undefined;
    const social = isSocial(m);
    const raw = row ? row.value : m.default;
    return {
      key: m.key,
      registerId: id,
      area: m.area,
      type: m.type,
      unit: 'unit' in m ? (m.unit ?? null) : null,
      meaning: { ka: m.meaning.ka, en: m.meaning.en },
      value: social ? socialView(raw as SocialProviderStored) : raw,
      isSet: social ? !!(raw as SocialProviderStored).clientSecret : null,
      defaultValue: social ? socialView(m.default as SocialProviderStored) : m.default,
      allowedValues: 'allowedValues' in m && m.allowedValues ? [...m.allowedValues] : null,
      minimum: 'minimum' in m ? (m.minimum ?? null) : null,
      maximum: 'maximum' in m ? (m.maximum ?? null) : null,
      source: m.source,
      tag: m.tag,
      registerStatus: 'approved',
      isVersioned: true,
      isSecret: social,
      isPublic: 'public' in m ? !!m.public : false,
      isCritical: 'critical' in m ? !!m.critical : false,
      stepUpRequired: 'stepUp' in m ? !!m.stepUp : false,
      writePermission: m.writePermission,
      version: row?.currentVersion ?? 1,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      updatedBy: by ? { id: by.id, username: by.username, fullName: by.fullName } : null,
    };
  }
}
