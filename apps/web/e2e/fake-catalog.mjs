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
  // Resolved colour (contract 1.4.0, ADR-023): set on the top level below, inherited by every level.
  color: null,
  children,
});

/** Starter colours (visual-refresh.md §8.1) in bar order; the last category has none (brand teal fallback). */
export const CATEGORY_COLORS = [
  '#7C3AED',
  '#2563EB',
  '#D99A00',
  '#0EA5E9',
  '#1E3A8A',
  '#DB2777',
  '#C026D3',
  '#4D9A1E',
  '#52606D',
  null,
];

const paint = (n, color) => ({ ...n, color, children: n.children.map((c) => paint(c, color)) });

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
    paint(
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
      CATEGORY_COLORS[i],
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

/** lookupCategory: the node of each slug must sit under the previous one (spec 03 AC-3), else 404. */
function categoryDetail(locale, path) {
  const slugs = path.split('/');
  if (slugs.length > 3 || slugs.some((x) => x === '')) return null;
  let level = categoryTree(locale);
  const trail = [];
  for (const slug of slugs) {
    const found = level.find((n) => n.slug === slug);
    if (!found) return null;
    trail.push(found);
    level = found.children;
  }
  const node = trail[trail.length - 1];
  // "web-design" has no English: /en shows the Georgian name and texts (AC-4).
  const georgianOnly = locale === 'en' && node.slug === 'web-design';
  const ref = (n) => ({
    id: n.id,
    slug: n.slug,
    name: n.slug === 'web-design' && georgianOnly ? 'ვებ დიზაინი' : n.name,
    contentLocale: n.slug === 'web-design' && georgianOnly ? 'ka' : locale,
    color: n.color,
  });
  return {
    id: node.id,
    slug: node.slug,
    path: node.path,
    depth: node.depth,
    name: ref(node).name,
    color: node.color,
    description: null,
    contentTop: georgianOnly
      ? '<p>ვებ დიზაინის აღწერა</p>'
      : node.slug === 'design'
        ? `<h2>${locale === 'en' ? 'About design' : 'დიზაინის შესახებ'}</h2>`
        : null,
    contentBottom: node.slug === 'design' ? '<p>bottom text</p>' : null,
    contentLocale: georgianOnly ? 'ka' : locale,
    hasEnglish: !georgianOnly,
    icon: null,
    image: null,
    breadcrumb: trail.map(ref),
    children: node.children.map(ref),
    updatedAt: '2026-10-01T00:00:00Z',
  };
}

const DESIGN_ID = '01900000-0000-7000-8000-0000000c0001';
const GIGS = Array.from({ length: 50 }, (_, i) => ({
  id: `01900000-0000-7000-8000-0000000g${String(i + 1).padStart(4, '0')}`,
  uid: `GIG${String(i + 1).padStart(17, '0')}`,
  slug: `logo-design-${i + 1}`,
  title: i === 0 ? 'Premium logo design' : `Logo design ${i + 1}`,
  contentLocale: 'en',
  thumbnail: null,
  price: { amount: 2500 + i * 100, currency: 'GEL' },
  deliveryDays: 3,
  rating: i === 1 ? { count: 0, averageTenths: null } : { count: 12, averageTenths: 48 },
  seller: {
    id: '01900000-0000-7000-8000-000000000501',
    username: 'designer_one',
    avatar: null,
    isPremium: i === 0,
    isIdVerified: true,
    isOnline: false,
    countryCode: null,
    isDeleted: false,
  },
  isFeatured: i === 0,
  isFavorite: null,
}));

/**
 * The last searchGigs query string the web server sent, per `categoryId` ('' = no category): e2e assertions read
 * it from `/__last-search?categoryId=…`, so spec files running in parallel do not see each other's calls.
 */
const lastSearch = new Map();

function searchGigs(url) {
  const q = url.searchParams;
  lastSearch.set(q.get('categoryId') ?? '', url.search);
  if (q.get('categoryId') && q.get('categoryId') !== DESIGN_ID) {
    return [200, { data: [], nextCursor: null, totalCount: 0 }];
  }
  const words = (q.get('q') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const all = GIGS.filter((g) => words.every((w) => g.title.toLowerCase().includes(w)));
  const limit = Number(q.get('limit') ?? 20);
  const page = Number(q.get('page') ?? 1);
  return [
    200,
    { data: all.slice((page - 1) * limit, page * limit), nextCursor: null, totalCount: all.length },
  ];
}

const seller = (n, skills, verified = false) => ({
  user: {
    id: `01900000-0000-7000-8000-0000005${String(n).padStart(5, '0')}`,
    username: `seller_${n}`,
    avatar: null,
    isPremium: false,
    isIdVerified: verified,
    isOnline: n % 2 === 0,
    countryCode: null,
    isDeleted: false,
  },
  skills,
});
const SKILLS = [
  { name: 'Logo design', slug: 'logo-design' },
  { name: 'Branding', slug: 'branding' },
  { name: 'Illustration', slug: 'illustration' },
];
const SELLERS = Array.from({ length: 45 }, (_, i) =>
  seller(i + 1, SKILLS.slice(0, (i % 3) + 1), i === 0),
);

const paged = (all, url) => {
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const page = Number(url.searchParams.get('page') ?? 1);
  return {
    data: all.slice((page - 1) * limit, page * limit),
    nextCursor: null,
    totalCount: all.length,
  };
};

const PROJECT_CATEGORIES = [
  {
    id: '01900000-0000-7000-8000-0000000d0001',
    slug: 'web-development',
    name: 'Web development',
    seoDescription: null,
    contentLocale: 'en',
    hasEnglish: true,
    image: null,
    position: 0,
    // Linked to the programming top-level category (contract 1.4.0: its colour).
    color: '#2563EB',
    skills: [
      {
        id: '01900000-0000-7000-8000-0000000e0001',
        slug: 'react',
        name: 'React',
        contentLocale: 'en',
      },
    ],
  },
  {
    id: '01900000-0000-7000-8000-0000000d0002',
    slug: 'design',
    name: 'Design',
    seoDescription: null,
    contentLocale: 'en',
    hasEnglish: true,
    image: null,
    position: 1,
    color: '#7C3AED',
    skills: [],
  },
];

/** getHome: 4 top gigs, two category rows (the second empty: hidden), featured tiles, best sellers. */
function home(locale) {
  const tree = categoryTree(locale);
  const ref = (n) => ({
    id: n.id,
    slug: n.slug,
    name: n.name,
    contentLocale: locale,
    color: n.color,
  });
  return {
    topGigs: GIGS.slice(0, 4),
    categoryRows: [
      { category: ref(tree[0]), gigs: GIGS.slice(4, 8) },
      { category: ref(tree[1]), gigs: [] },
    ],
    featuredCategories: tree.slice(0, 3).map((n) => ({ category: ref(n), image: null })),
    bestSellers: SELLERS.slice(0, 2).map((s) => ({
      ...s,
      rating: { count: 3, averageTenths: 50 },
      salesCount: 7,
    })),
    logos: null,
    recentArticles: null,
  };
}

/** [status, body] for the catalogue routes, or null. */
export function catalogRoute(url, req) {
  const lang = String(req.headers['accept-language'] ?? 'ka').startsWith('en') ? 'en' : 'ka';
  if (url.pathname === '/api/v1/home') return [200, home(lang)];
  if (url.pathname === '/api/v1/gigs') {
    // listGigs: 8 gigs for `gig_seller` (6 + "Load more"), none for anyone else (cursor = offset).
    const all = url.searchParams.get('sellerUsername') === 'gig_seller' ? GIGS.slice(10, 18) : [];
    const start = Number(url.searchParams.get('cursor') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const next = start + limit < all.length ? String(start + limit) : null;
    return [200, { data: all.slice(start, start + limit), nextCursor: next }];
  }
  if (url.pathname === '/api/v1/sellers') return [200, paged(SELLERS, url)];
  const hire = url.pathname.match(/^\/api\/v1\/hire\/([^/]+)$/);
  if (hire) {
    const keyword = decodeURIComponent(hire[1]);
    const skill = SKILLS.find((x) => x.slug === keyword);
    if (!skill) return [404, { code: 'NOT_FOUND' }];
    return [200, { skill, ...paged(SELLERS.slice(0, 3), url) }];
  }
  if (url.pathname === '/api/v1/project-categories') {
    return [200, { projectCategories: PROJECT_CATEGORIES }];
  }
  if (url.pathname === '/api/v1/project-categories/lookup') {
    const category = PROJECT_CATEGORIES.find((c) => c.slug === url.searchParams.get('slug'));
    const skillSlug = url.searchParams.get('skillSlug');
    const skill = skillSlug ? category?.skills.find((x) => x.slug === skillSlug) : null;
    if (!category || skill === undefined) return [404, { code: 'NOT_FOUND' }];
    return [200, { projectCategory: category, skill }];
  }
  if (url.pathname === '/api/v1/search/projects') {
    // `q=feature-off` stands for S-075 OFF (the stand-in has no settings).
    if (url.searchParams.get('q') === 'feature-off') {
      return [403, { code: 'FEATURE_DISABLED', message: 'off' }];
    }
    return [200, { data: [], nextCursor: null, totalCount: 0 }];
  }
  if (url.pathname === '/__last-search') {
    return [200, { search: lastSearch.get(url.searchParams.get('categoryId') ?? '') ?? '' }];
  }
  if (url.pathname === '/api/v1/search/gigs') return searchGigs(url);
  if (url.pathname === '/api/v1/categories/lookup') {
    const detail = categoryDetail(
      String(req.headers['accept-language'] ?? 'ka').startsWith('en') ? 'en' : 'ka',
      url.searchParams.get('path') ?? '',
    );
    return detail ? [200, detail] : [404, { code: 'NOT_FOUND' }];
  }
  const locale = String(req.headers['accept-language'] ?? 'ka').startsWith('en') ? 'en' : 'ka';
  if (url.pathname === '/api/v1/categories') return [200, { categories: categoryTree(locale) }];
  if (url.pathname === '/api/v1/me') {
    return req.headers.authorization === 'Bearer e2e-header'
      ? [200, HEADER_ME]
      : [401, { code: 'UNAUTHENTICATED' }];
  }
  return null;
}
