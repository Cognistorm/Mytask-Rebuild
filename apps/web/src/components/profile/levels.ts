// Labels shared by the public profile and the edit-profile page (spec 02 AC-8, AC-19…AC-21). Stored values are
// the legacy ones (`pro` = "Expert").
import type { components } from '@mytask/types';

type LinkedAccounts = components['schemas']['ProfileLinkedAccounts'];

export const LANGUAGE_LEVEL = {
  basic: 't_basic',
  conversational: 't_conversational',
  fluent: 't_fluent',
  native: 't_native',
} as const satisfies Record<components['schemas']['UserLanguageLevel'], string>;

export const SKILL_LEVEL = {
  beginner: 't_beginner',
  intermediate: 't_intermediate',
  pro: 't_expert',
} as const satisfies Record<components['schemas']['UserSkillLevel'], string>;

/** The seven linked accounts in the legacy order, with their label key. */
export const LINKED: [keyof LinkedAccounts, string][] = [
  ['facebook', 't_facebook'],
  ['twitter', 't_twitter'],
  ['dribbble', 't_dribbble'],
  ['stackoverflow', 't_stackoverflow'],
  ['github', 't_github'],
  ['youtube', 't_youtube'],
  ['vimeo', 't_vimeo'],
];
