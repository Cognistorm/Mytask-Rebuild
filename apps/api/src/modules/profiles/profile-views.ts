// Row → contract mappers shared by the profile services.
import type { components } from '@mytask/types';
import type {
  LinkedProvider,
  UserLanguage,
  UserLinkedAccount,
  UserSkill,
} from '../../generated/prisma/client';

type S = components['schemas'];

/** The seven linked-account providers of spec 02 AC-21, in display order. */
export const PROVIDERS: LinkedProvider[] = [
  'facebook',
  'twitter',
  'dribbble',
  'stackoverflow',
  'github',
  'youtube',
  'vimeo',
];

export function skillView(s: UserSkill): S['UserSkill'] {
  return { id: s.id, name: s.name, slug: s.slug, experience: s.experience };
}

export function languageView(l: UserLanguage): S['UserLanguage'] {
  return { id: l.id, name: l.name, level: l.level };
}

/** All seven keys, null where the user has no link. */
export function linkedView(rows: UserLinkedAccount[]): S['ProfileLinkedAccounts'] {
  const urls = new Map(rows.map((r) => [r.provider, r.url]));
  return Object.fromEntries(
    PROVIDERS.map((p) => [p, urls.get(p) ?? null]),
  ) as S['ProfileLinkedAccounts'];
}
