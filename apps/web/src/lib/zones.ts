// Public vs private web pages (ADR-019 §2, spec 16 AC-73). Public pages live under `app/[locale]/(public)`
// and may carry the S-110 custom code with the S-127 hosts in their CSP; every other page lives under
// `app/[locale]/(private)` (its own root layout, so crossing the line is a full page load) and always gets
// the strict CSP. The proxy decides the CSP from this list: a page added to `(public)` must be added here
// too (e2e/custom-code.spec.ts checks both directions). Unknown paths count as private (fail closed).

/** AC-73 allow-list, as path patterns without the `/en` prefix. Grows with the slices that build them. */
const PUBLIC_PATTERNS: readonly RegExp[] = [
  /^\/$/,
  // Profile, portfolio list and item (spec 02 AC-8, AC-28; url-map §3).
  /^\/profile\/[^/]+(\/portfolio(\/[^/]+)?)?$/,
  // Category pages at 3 levels (spec 03 AC-3; url-map §3).
  /^\/categories(\/[^/]+){1,3}$/,
  // Search results (spec 03 AC-19).
  /^\/search$/,
  // Freelancers, hire by skill and explore projects (spec 03 AC-27…AC-34).
  /^\/sellers$/,
  /^\/hire\/[^/]+$/,
  /^\/explore\/projects(\/[^/]+){0,2}$/,
  // Gig page (spec 04 AC-26; url-map §4.1).
  /^\/service\/[^/]+$/,
];

/** `pathname` as the browser sent it (`/`, `/en/...`; the proxy has already removed `/ka` and trailing slashes). */
export function isPublicPath(pathname: string): boolean {
  const path =
    pathname === '/en' ? '/' : pathname.startsWith('/en/') ? pathname.slice(3) : pathname;
  return PUBLIC_PATTERNS.some((re) => re.test(path));
}
