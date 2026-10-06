// Types for src/category-color.mjs (@mytask/tokens/color). Keep in sync by hand; the unit test checks the export list.

export type CategoryColorMode = 'light' | 'dark';

/** One mode's derived category theme (visual-refresh.md §8.2). Every value is `#RRGGBB`, except `glow` (`#RRGGBBAA`). */
export interface CategoryThemeColors {
  /** Filled pill, tile label band, active bar item. */
  readonly solid: string;
  /** Text/icon on `solid` and on both gradient ends (≥ 4.5:1): white or neutral.950. */
  readonly onSolid: string;
  readonly gradientStart: string;
  readonly gradientEnd: string;
  /** Soft background (pill at rest, chips, breadcrumb). */
  readonly tint: string;
  readonly tintStrong: string;
  /** Category-coloured text on surface, canvas, tint and tintStrong (≥ 4.5:1). */
  readonly ink: string;
  /** Dot, accent bar, borders, underline (≥ 3:1 on surface and canvas). */
  readonly indicator: string;
  /** Colour of glow.category. */
  readonly glow: string;
}

export interface DerivedCategoryColor {
  readonly light: CategoryThemeColors;
  readonly dark: CategoryThemeColors;
}

export interface CategoryStarterColor {
  readonly id: string;
  readonly color: string;
}

export type CategoryColorMeaning = 'brand' | 'error' | 'success' | 'featured';

export interface CategoryReservedColor {
  readonly id: string;
  readonly color: string;
  readonly meaning: CategoryColorMeaning;
}

/** The 12 starter colours in assignment order (ADR-023 §4). */
export declare const categoryStarter: readonly CategoryStarterColor[];
export declare const categoryReserved: readonly CategoryReservedColor[];
/** The brand fallback set (theme.<mode>.cat). */
export declare const categoryBrand: DerivedCategoryColor;
/** 0.08 */
export declare const categorySimilarDeltaE: number;
/** 0.06 */
export declare const categoryReservedDeltaE: number;

export declare function isCategoryColor(value: unknown): value is string;
export declare function normalizeCategoryColor(value: unknown): string | null;
export declare function contrastRatio(a: string, b: string): number;
export declare function deltaE(a: string, b: string): number;

/** `null`/`undefined` → brand fallback; throws TypeError on any other non-`#RRGGBB` input. */
export declare function deriveCategoryColor(hex: string | null | undefined): DerivedCategoryColor;
/** Native: the set for one scheme; null or invalid → brand fallback. */
export declare function categoryTheme(hex: string | null | undefined, mode?: CategoryColorMode): CategoryThemeColors;
/** Web: inline style with `--mt-cat-l-*` and `--mt-cat-d-*`; null or invalid → `{}`. */
export declare function categoryStyle(hex: string | null | undefined): Record<`--mt-cat-${string}`, string>;

export declare function findSimilar<T extends { color?: string | null }>(
  hex: string,
  others: readonly T[],
  threshold?: number,
): Array<T & { deltaE: number }>;
export declare function findDuplicate<T extends { color?: string | null }>(hex: string, others: readonly T[]): T | undefined;
export declare function findReserved(hex: string, threshold?: number): Array<CategoryReservedColor & { deltaE: number }>;
export declare function nextStarterColor(used: readonly (string | null | undefined)[]): string | null;
