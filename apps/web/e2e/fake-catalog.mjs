// Server-side catalogue answers for the web E2E run (slice 2): the category tree for the public header, and getMe
// for a visitor who sends the test access cookie (`__Host-mt_at=e2e-header`). Later page tasks add the lookups,
// search and list answers here.
const node = (id, slug, path, depth, name, children = []) => ({
  id: `01900000-0000-7000-8000-0000000c${String(id).padStart(4, '0')}`,
  slug,
  path,
  depth,
  name,
  contentLocale: 'ka',
  icon: null,
  image: null,
  isVisibleOnHome: true,
  position: id,
  children,
});

export const CATEGORY_NAMES = {
  ka: [
    'დიზაინი',
    'პროგრამირება',
    'მარკეტინგი',
    'ვიდეო და ანიმაცია',
    'ბიზნესი',
    'მუსიკა',
    'თარგმნა',
    'ფოტოგრაფია და ვიდეოგადაღება',
    'იურიდიული მომსახურება',
    'ცხოვრების სტილი',
  ],
  // More than the live site's 7, so the category bar needs "More ▾" at 1024 px.
  en: [
    'Design',
    'Programming',
    'Marketing',
    'Video & Animation',
    'Business',
    'Music',
    'Translation',
    'Photography & Videography',
    'Legal services',
    'Lifestyle',
  ],
};
const SLUGS = [
  'design',
  'programming',
  'marketing',
  'video',
  'business',
  'music',
  'translation',
  'photography',
  'legal',
  'lifestyle',
];

export function categoryTree(locale) {
  const names = CATEGORY_NAMES[locale === 'en' ? 'en' : 'ka'];
  const sub = locale === 'en' ? ['Logo design', 'Web design'] : ['ლოგოს დიზაინი', 'ვებ დიზაინი'];
  const child = locale === 'en' ? 'Minimalist logo' : 'მინიმალისტური ლოგო';
  return SLUGS.map((slug, i) =>
    node(
      i + 1,
      slug,
      slug,
      1,
      names[i],
      i === 0
        ? [
            node(101, 'logo-design', 'design/logo-design', 2, sub[0], [
              node(1001, 'minimal', 'design/logo-design/minimal', 3, child),
            ]),
            node(102, 'web-design', 'design/web-design', 2, sub[1]),
          ]
        : [],
    ),
  );
}

export const HEADER_ME = {
  id: '01900000-0000-7000-8000-000000000077',
  fullName: 'Header Tester',
  username: 'header_tester',
  email: 'header@example.com',
  pendingEmail: null,
  referralCode: 'HEAD1234',
  hasPassword: true,
  twoFactorAvailable: false,
  twoFactorEnabled: false,
  isRestricted: false,
  lastDashboard: 'selling',
  avatar: null,
  kycStatus: 'none',
  countryCode: null,
  city: null,
  theme: null,
  createdAt: '2024-01-10T08:00:00Z',
};

/** [status, body] for the catalogue routes, or null. */
export function catalogRoute(url, req) {
  const locale = String(req.headers['accept-language'] ?? 'ka').startsWith('en') ? 'en' : 'ka';
  if (url.pathname === '/api/v1/categories') return [200, { categories: categoryTree(locale) }];
  if (url.pathname === '/api/v1/me') {
    return req.headers.authorization === 'Bearer e2e-header'
      ? [200, HEADER_ME]
      : [401, { code: 'UNAUTHENTICATED' }];
  }
  return null;
}
