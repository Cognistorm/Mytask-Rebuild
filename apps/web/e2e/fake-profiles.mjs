// Profile and portfolio answers of the stand-in API (e2e/fake-api.mjs) for e2e/profile.spec.ts: the public
// profile pages load on the server, so their API calls cannot be routed in the browser. The viewer is chosen
// by the Bearer token the web server sends (from the `__Host-mt_at` cookie the test sets):
// none = guest, `viewer-token` = another signed-in user, `owner-token` = nino_b herself.

export const MEDIA = 'http://media.test/public-media';
export const UID = (n) => `AAAA${String(n).padStart(16, '0')}`;

const image = (name) => ({
  fileId: `01900000-0000-7000-8000-${name.padStart(12, '0').slice(-12)}`,
  thumb: `${MEDIA}/${name}-thumb.webp`,
  medium: `${MEDIA}/${name}-medium.webp`,
  large: `${MEDIA}/${name}-large.webp`,
  width: 1200,
  height: 800,
});

const NINO = {
  id: '01900000-0000-7000-8000-000000000001',
  username: 'nino_b',
  fullName: 'Nino Beridze',
  headline: 'Logo and brand designer',
  about: Array.from({ length: 12 }, (_, i) => `About line ${i + 1}.`).join('\n'),
  avatar: image('avatar'),
  countryCode: 'GE',
  timezone: 'Asia/Tbilisi',
  isOnline: true,
  availability: { unavailableUntil: '2026-12-24', message: 'On holiday, back after Christmas.' },
  lastDeliveryAt: null,
  createdAt: '2023-05-10T08:00:00Z',
  isEmailVerified: true,
  isIdVerified: true,
  isPremium: false,
  languages: [
    { id: '01900000-0000-7000-8000-0000000000a1', name: 'Georgian', level: 'native' },
    { id: '01900000-0000-7000-8000-0000000000a2', name: 'English', level: 'fluent' },
  ],
  skills: [
    {
      id: '01900000-0000-7000-8000-0000000000b1',
      name: 'Logo design',
      slug: 'logo-design',
      experience: 'pro',
    },
  ],
  linkedAccounts: {
    facebook: null,
    twitter: null,
    dribbble: 'https://dribbble.com/nino',
    stackoverflow: null,
    github: 'https://github.com/nino',
    youtube: null,
    vimeo: null,
  },
  ratings: {
    asFreelancer: {
      count: 4,
      averageTenths: 45,
      starCounts: { five: 2, four: 2, three: 0, two: 0, one: 0 },
    },
    asClient: {
      count: 0,
      averageTenths: null,
      starCounts: { five: 0, four: 0, three: 0, two: 0, one: 0 },
    },
  },
  portfolioCount: 30,
  isOwnProfile: false,
  canContact: true,
  canRequestOffer: false,
  canReport: false,
  isIndexable: true,
};

const EMPTY = {
  ...NINO,
  id: '01900000-0000-7000-8000-000000000002',
  username: 'new_user',
  fullName: '',
  headline: null,
  about: null,
  avatar: null,
  timezone: null,
  isOnline: false,
  availability: null,
  isEmailVerified: false,
  isIdVerified: false,
  languages: [],
  skills: [],
  linkedAccounts: null,
  ratings: {
    asFreelancer: NINO.ratings.asClient,
    asClient: NINO.ratings.asClient,
  },
  portfolioCount: 0,
  isIndexable: false,
};

const SUMMARY = {
  id: NINO.id,
  username: NINO.username,
  avatar: NINO.avatar,
  isPremium: false,
  isIdVerified: true,
  isOnline: true,
  countryCode: 'GE',
  isDeleted: false,
};

/** 30 public works, newest first (n = 30 … 1), plus the owner's pending (31) and rejected (32) ones. */
const card = (n, status = 'active') => ({
  id: `01900000-0000-7000-8000-${String(n).padStart(12, '0')}`,
  uid: UID(n),
  slug: `work-${n}-${UID(n)}`,
  title: `Work ${n}`,
  thumbnail: image(`work-${n}`),
  status,
});
const PUBLIC = Array.from({ length: 30 }, (_, i) => card(30 - i));
const PENDING = card(31, 'pending');
const REJECTED = card(32, 'rejected');

export function viewerOf(req) {
  const auth = req.headers.authorization ?? '';
  if (auth === 'Bearer owner-token') return 'owner';
  if (auth === 'Bearer viewer-token') return 'viewer';
  return 'guest';
}

function profileFor(base, viewer) {
  if (viewer === 'owner' && base.username === NINO.username)
    return { ...base, isOwnProfile: true, canContact: false, canReport: false };
  if (viewer !== 'guest') return { ...base, canReport: true };
  return base;
}

/** The item behind a card, as `lookupPortfolioItem` / `getPortfolioItem` answer it. */
function item(c, viewer) {
  return {
    id: c.id,
    uid: c.uid,
    slug: c.slug,
    title: c.title,
    description: `Description of ${c.title}.\nSecond line.`,
    projectUrl: 'https://example.com/project',
    videoUrl: c.status === 'active' ? 'https://example.com/video' : null,
    thumbnail: c.thumbnail,
    images: [image(`${c.uid}-1`), image(`${c.uid}-2`)],
    status: c.status,
    rejectionReason: c.status === 'rejected' ? 'Images are blurry' : null,
    rejectedAt: c.status === 'rejected' ? '2026-10-01T10:00:00Z' : null,
    owner: SUMMARY,
    isOwn: viewer === 'owner',
    publishedAt: c.status === 'active' ? '2026-09-01T10:00:00Z' : null,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  };
}

/** Answers the profile operations; `undefined` for any other path. */
export function profileRoute(url, req) {
  const viewer = viewerOf(req);
  const users = { [NINO.username]: NINO, [EMPTY.username]: EMPTY };

  const user = url.pathname.match(/^\/api\/v1\/users\/([^/]+)$/);
  if (user) {
    const base = users[decodeURIComponent(user[1])];
    return base ? [200, profileFor(base, viewer)] : [404, { code: 'NOT_FOUND' }];
  }

  if (url.pathname === '/api/v1/portfolio-items') {
    const username = url.searchParams.get('username');
    if (!users[username]) return [404, { code: 'NOT_FOUND' }];
    const own = viewer === 'owner' && username === NINO.username;
    const all = username === NINO.username ? (own ? [REJECTED, PENDING, ...PUBLIC] : PUBLIC) : [];
    const start = Number(url.searchParams.get('cursor') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const data = all.slice(start, start + limit);
    const next = start + limit < all.length ? String(start + limit) : null;
    return [200, { data, nextCursor: next }];
  }

  if (url.pathname === '/api/v1/portfolio-items/lookup') {
    const slug = url.searchParams.get('slug') ?? '';
    // As the API: the uid after the last "-" identifies the work, whatever the title part says.
    const uid = slug.slice(slug.lastIndexOf('-') + 1);
    const c = [...PUBLIC, PENDING, REJECTED].find((x) => x.uid === uid);
    if (!c || (c.status !== 'active' && viewer !== 'owner')) return [404, { code: 'NOT_FOUND' }];
    return [200, item(c, viewer)];
  }
  return undefined;
}

/** The second page the browser asks for on "Load more" (routed in the test, as the browser calls /api/v1). */
export const PORTFOLIO_PAGE_2 = { data: PUBLIC.slice(24), nextCursor: null };
