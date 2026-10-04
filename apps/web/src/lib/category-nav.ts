// The public category tree as header/menu nodes (spec 03 AC-1/AC-2): every node links to `/categories/{path}`
// in the page language. Shared by server and client components.
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import type { NavNode } from '@mytask/ui/web';
import { href } from './href';

type CategoryNode = components['schemas']['CategoryNode'];

export function categoryHref(locale: Locale, path: string): string {
  return href(locale, `/categories/${path}`);
}

export function toNavNodes(locale: Locale, nodes: CategoryNode[]): NavNode[] {
  return nodes.map((n) => ({
    id: n.id,
    label: n.name,
    href: categoryHref(locale, n.path),
    children: toNavNodes(locale, n.children),
  }));
}

/** The same path in the other language: Georgian unprefixed, English under /en (ADR-006 §1). */
export function localePath(pathname: string, to: Locale): string {
  const bare = pathname.replace(/^\/(en|ka)(?=\/|$)/, '') || '/';
  return href(to, bare);
}
