// @mytask/tokens: shared helpers for build.mjs and contrast.mjs.
// Plain Node (>= 18), no dependencies, no install step.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const here = dirname(fileURLToPath(import.meta.url));

export function loadJson(name) {
  return JSON.parse(readFileSync(join(here, name), 'utf8'));
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const isToken = (node) => isObj(node) && Object.prototype.hasOwnProperty.call(node, '$value');

/** Get a node by dotted path ("color.brand.700"). */
export function getPath(root, path) {
  return path.split('.').reduce((n, k) => (n == null ? undefined : n[k]), root);
}

/** Walk every token, yielding { path: string[], token, type } with $type inherited from groups. */
export function* walk(node, path = [], inheritedType) {
  if (!isObj(node)) return;
  const type = node.$type ?? inheritedType;
  if (isToken(node)) {
    yield { path, token: node, type };
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    yield* walk(v, [...path, k], type);
  }
}

/** Find the effective $type of the token at `path` (walks groups upward). */
export function typeOf(root, path) {
  const parts = path.split('.');
  let node = root;
  let type;
  for (const p of parts) {
    if (node?.$type) type = node.$type;
    node = node?.[p];
  }
  return node?.$type ?? type;
}

const REF = /^\{([^}]+)\}$/;

/** Resolve aliases recursively. Returns a plain value (string, number, array, object). */
export function resolve(root, value, seen = new Set()) {
  if (typeof value === 'string') {
    const m = value.match(REF);
    if (!m) return value;
    const path = m[1];
    if (seen.has(path)) throw new Error(`Circular alias: ${[...seen, path].join(' -> ')}`);
    const target = getPath(root, path);
    if (!isToken(target)) throw new Error(`Unknown alias {${path}}`);
    return resolve(root, target.$value, new Set([...seen, path]));
  }
  if (Array.isArray(value)) return value.map((v) => resolve(root, v, seen));
  if (isObj(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(root, v, seen)]));
  return value;
}

/** The alias path if value is a pure alias, else null. */
export function aliasOf(value) {
  const m = typeof value === 'string' && value.match(REF);
  return m ? m[1] : null;
}

// ---------- colour + WCAG ----------
export function parseHex(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const a = n.length === 8 ? parseInt(n.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

/** Composite a (possibly translucent) colour over an opaque base. */
export function over(fg, baseHex) {
  const f = parseHex(fg);
  const b = parseHex(baseHex);
  const mix = (x, y) => Math.round(x * f.a + y * (1 - f.a));
  return '#' + [mix(f.r, b.r), mix(f.g, b.g), mix(f.b, b.b)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function luminance(hex) {
  const { r, g, b } = parseHex(hex);
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
