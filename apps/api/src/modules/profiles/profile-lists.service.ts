// Edit-profile lists (spec 02 AC-19…AC-21, ROADMAP 4.1.9): skills and languages CRUD, putMyLinkedAccounts.
// Names are trimmed; the same name twice per user (case-insensitive, DB unique index on lower(name)) → 409
// DUPLICATE. Other users' rows answer 404. Linked accounts only while S-123 is ON (P-25).
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { Prisma, type LinkedProvider } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { SettingsService } from '../../platform/settings/settings.service';
import { slugify } from '../../platform/slug';
import type { RequestContext } from '../auth/request-context';
import { languageView, linkedView, PROVIDERS, skillView } from './profile-views';

type S = components['schemas'];

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');

function fieldError(ctx: RequestContext, field: string, code: string, messageKey: string) {
  return new ApiException(400, 'VALIDATION_FAILED', messageKey, {
    fields: [{ field, code, message: ctx.t(messageKey), messageKey }],
  });
}

/** Trimmed name; blank → required. Undefined stays undefined (not sent on an update). */
function cleanName(ctx: RequestContext, name: string | undefined): string | undefined {
  if (name === undefined) return undefined;
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) throw fieldError(ctx, 'name', 'required', 't_validator_required');
  return trimmed;
}

/** Runs a write; the per-user unique name index turns into 409 DUPLICATE with the given message. */
async function unique<T>(messageKey: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ApiException(409, 'DUPLICATE', messageKey, { field: 'name' });
    }
    throw e;
  }
}

/** Only web links: `format: uri` alone would also accept `javascript:` or `data:` URLs on a public page. */
function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.length > 0;
  } catch {
    return false;
  }
}

@Injectable()
export class ProfileListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  // ------------------------------------------------------------------ skills (AC-19)

  async createSkill(
    userId: string,
    input: S['UserSkillCreateRequest'],
    ctx: RequestContext,
  ): Promise<S['UserSkill']> {
    const name = cleanName(ctx, input.name)!;
    const row = await unique('t_add_skill_already_exists', () =>
      this.prisma.userSkill.create({
        data: { userId, name, slug: slugify(name), experience: input.experience },
      }),
    );
    return skillView(row);
  }

  async updateSkill(
    userId: string,
    skillId: string,
    input: S['UserSkillUpdateRequest'],
    ctx: RequestContext,
  ): Promise<S['UserSkill']> {
    const name = cleanName(ctx, input.name);
    const own = await this.prisma.userSkill.findFirst({ where: { id: skillId, userId } });
    if (!own) throw notFound();
    const row = await unique('t_add_skill_already_exists', () =>
      this.prisma.userSkill.update({
        where: { id: own.id },
        data: {
          ...(name !== undefined ? { name, slug: slugify(name) } : {}),
          ...(input.experience ? { experience: input.experience } : {}),
        },
      }),
    );
    return skillView(row);
  }

  async deleteSkill(userId: string, skillId: string): Promise<void> {
    const done = await this.prisma.userSkill.deleteMany({ where: { id: skillId, userId } });
    if (!done.count) throw notFound();
  }

  // ------------------------------------------------------------------ languages (AC-20)

  async createLanguage(
    userId: string,
    input: S['UserLanguageCreateRequest'],
    ctx: RequestContext,
  ): Promise<S['UserLanguage']> {
    const name = cleanName(ctx, input.name)!;
    const row = await unique('t_add_language_already_exists', () =>
      this.prisma.userLanguage.create({ data: { userId, name, level: input.level } }),
    );
    return languageView(row);
  }

  async updateLanguage(
    userId: string,
    languageId: string,
    input: S['UserLanguageUpdateRequest'],
    ctx: RequestContext,
  ): Promise<S['UserLanguage']> {
    const name = cleanName(ctx, input.name);
    const own = await this.prisma.userLanguage.findFirst({ where: { id: languageId, userId } });
    if (!own) throw notFound();
    const row = await unique('t_add_language_already_exists', () =>
      this.prisma.userLanguage.update({
        where: { id: own.id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(input.level ? { level: input.level } : {}),
        },
      }),
    );
    return languageView(row);
  }

  async deleteLanguage(userId: string, languageId: string): Promise<void> {
    const done = await this.prisma.userLanguage.deleteMany({ where: { id: languageId, userId } });
    if (!done.count) throw notFound();
  }

  // ------------------------------------------------------------------ linked accounts (AC-21)

  /** All seven at once: a missing or null URL clears that provider (contract ProfileLinkedAccountsPutRequest). */
  async putLinkedAccounts(
    userId: string,
    input: S['ProfileLinkedAccountsPutRequest'],
    ctx: RequestContext,
  ): Promise<S['ProfileLinkedAccounts']> {
    if (!(await this.settings.get('S-123'))) {
      throw new ApiException(403, 'FEATURE_DISABLED', 't_toast_something_went_wrong', {
        settingId: 'S-123',
      });
    }
    const urls = new Map<LinkedProvider, string>();
    for (const provider of PROVIDERS) {
      const value = input[provider]?.trim();
      if (!value) continue;
      if (!isWebUrl(value)) throw fieldError(ctx, provider, 'url', 't_validator_url');
      urls.set(provider, value);
    }
    const rows = await this.prisma.$transaction(async (tx) => {
      await tx.userLinkedAccount.deleteMany({
        where: { userId, provider: { notIn: [...urls.keys()] } },
      });
      for (const [provider, url] of urls) {
        await tx.userLinkedAccount.upsert({
          where: { userId_provider: { userId, provider } },
          create: { userId, provider, url },
          update: { url },
        });
      }
      return tx.userLinkedAccount.findMany({ where: { userId } });
    });
    return linkedView(rows);
  }
}
