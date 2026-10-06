// Category colours (ADR-023, spec 3X R-1): the starter palette comes from packages/tokens (one source for the
// API default, the admin swatches and the migration), never a copy kept here.
import tokens from '@mytask/tokens/tokens.json';

/** `category.starter` in JSON order: the 7 starter colours, then spares S1…S5 (ADR-023 §4). */
export const CATEGORY_STARTER: readonly string[] = Object.values(tokens.category.starter).flatMap(
  (t) => (typeof t === 'object' && t !== null && '$value' in t ? [t.$value as string] : []),
);

/** Stored and returned upper case (ADR-023 §1); the request schema already checked `#RRGGBB`. */
export const normalizeColor = (hex: string): string => hex.toUpperCase();

/** The first starter colour no top-level category uses, or null when all 12 are taken (brand fallback). */
export function firstUnusedStarter(used: Iterable<string | null>): string | null {
  const taken = new Set(used);
  return CATEGORY_STARTER.find((c) => !taken.has(c)) ?? null;
}
