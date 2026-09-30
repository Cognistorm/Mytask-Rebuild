// Admin settings (spec 16 AC-51…AC-56, ADR-005 §4): the only write path for register rows.
// Per write: area permission, register validation, optimistic version, step-up for marked rows (AC-7),
// new version row + audit (before/after), EV-124 to every S-100 address for critical rows (AC-55, AC-56).
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Prisma } from '../../generated/prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { RedisService } from '../../platform/redis/redis.module';
import { settingIdByKey, settingsRegistry, type SettingId } from '../../platform/settings/registry';
import { SettingsService } from '../../platform/settings/settings.service';
import type { StaffAuthState } from '../auth/auth.guard';
import type { RequestContext } from '../auth/request-context';

type S = components['schemas'];
type Meta = (typeof settingsRegistry)[SettingId];

const SEMVER = /^\d+\.\d+\.\d+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly settings: SettingsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

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
    this.validate(meta, input.value, ctx);

    const current = await this.prisma.setting.findUnique({ where: { key } });
    const currentVersion = current?.currentVersion ?? 1;
    if (input.expectedVersion !== currentVersion) {
      throw new ApiException(409, 'STATE_CONFLICT', 't_toast_something_went_wrong', {
        currentState: String(currentVersion),
      });
    }
    const before = current?.value ?? meta.default;
    const version = currentVersion + 1;
    const value = input.value as Prisma.InputJsonValue;
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
          before: { value: before, version: currentVersion },
          after: { value: input.value, version },
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
              old: JSON.stringify(before),
              new: JSON.stringify(input.value),
            },
          },
          tx,
        );
      }
    });
    this.settings.invalidate();
    return this.get(key);
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
    return {
      key: m.key,
      registerId: id,
      area: m.area,
      type: m.type,
      unit: 'unit' in m ? (m.unit ?? null) : null,
      meaning: { ka: m.meaning.ka, en: m.meaning.en },
      value: row?.value ?? m.default,
      isSet: null,
      defaultValue: m.default,
      allowedValues: 'allowedValues' in m && m.allowedValues ? [...m.allowedValues] : null,
      minimum: 'minimum' in m ? (m.minimum ?? null) : null,
      maximum: 'maximum' in m ? (m.maximum ?? null) : null,
      source: m.source,
      tag: m.tag,
      registerStatus: 'approved',
      isVersioned: true,
      isSecret: false,
      isPublic: false,
      isCritical: 'critical' in m ? !!m.critical : false,
      stepUpRequired: 'stepUp' in m ? !!m.stepUp : false,
      writePermission: m.writePermission,
      version: row?.currentVersion ?? 1,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      updatedBy: by ? { id: by.id, username: by.username, fullName: by.fullName } : null,
    };
  }
}
