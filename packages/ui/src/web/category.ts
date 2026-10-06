// Category colour themes on the web (visual-refresh.md §8.3, R-1, ADR-023). No 'use client': server components call it.
import type { CSSProperties } from 'react';
import { categoryStyle, normalizeCategoryColor } from '@mytask/tokens/color';

export interface CategoryThemeProps {
  'data-category-theme': string;
  style: CSSProperties;
}

/**
 * Spread onto the element that carries a category's colour: `<div {...categoryThemeProps(category.color)}>`.
 * tokens.css maps the inline --mt-cat-l-* / --mt-cat-d-* to --mt-cat-* for the current theme, so everything inside
 * can use --mt-cat-*, --mt-gradient-category and --mt-glow-category. The colour is the API's validated `#RRGGBB`;
 * null, missing or anything else gives the brand teal fallback (`data-category-theme="brand"`, no inline style).
 */
export function categoryThemeProps(color: string | null | undefined): CategoryThemeProps {
  const hex = normalizeCategoryColor(color);
  return {
    'data-category-theme': hex ?? 'brand',
    style: (hex ? categoryStyle(hex) : {}) as CSSProperties,
  };
}
