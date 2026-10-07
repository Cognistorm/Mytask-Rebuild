// Gig page answers of the stand-in API (e2e/fake-api.mjs) for e2e/gig-page.spec.ts: the page loads on the server, so
// its `lookupGig` call cannot be routed in the browser. The viewer comes from the Bearer token (fake-profiles.mjs
// `viewerOf`): `owner-token` = nino_b, who owns every gig here. The language comes from `Accept-Language`.
import { MEDIA, viewerOf } from './fake-profiles.mjs';

const image = (name) => ({
  fileId: `01900000-0000-7000-8000-${name.padStart(12, '0').slice(-12)}`,
  thumb: `${MEDIA}/${name}-thumb.webp`,
  medium: `${MEDIA}/${name}-medium.webp`,
  large: `${MEDIA}/${name}-large.webp`,
  width: 1200,
  height: 800,
});

const id = (n) => `01900000-0000-7000-8000-0000000d${String(n).padStart(4, '0')}`;
export const GIG_UID = (n) => `GIGA${String(n).padStart(16, '0')}`;

const NINO = {
  id: '01900000-0000-7000-8000-000000000001',
  username: 'nino_b',
  avatar: image('avatar'),
  isPremium: true,
  isIdVerified: true,
  isOnline: true,
  countryCode: 'GE',
  isDeleted: false,
};

const ref = (n, slug, ka, en) => ({ id: id(900 + n), slug, ka, en });
const CATEGORIES = [
  ref(1, 'design', 'დიზაინი', 'Design'),
  ref(2, 'logo-design', 'ლოგოს დიზაინი', 'Logo design'),
  ref(3, 'minimal', 'მინიმალისტური ლოგო', 'Minimalist logo'),
];

/** Every gig of the run; `en` null = no English text (spec 04 AC-27). */
const GIGS = [
  {
    n: 1,
    slug: `logo-dizaini-${GIG_UID(1).toLowerCase()}`,
    status: 'active',
    ka: {
      title: 'ლოგოს დიზაინი თქვენი ბიზნესისთვის',
      description: '<p>ქართული <strong>აღწერა</strong>.</p>',
    },
    en: {
      title: 'Logo design for your business',
      description:
        '<p>I design <strong>clean</strong> logos.</p><ul><li>Two concepts</li><li>Source files</li></ul>',
    },
    price: 25000,
    deliveryDays: 3,
    revisionsAllowed: 3,
    upgrades: [
      { n: 1, ka: 'წყარო ფაილი', en: 'Source file', price: 2000, extraDays: 1 },
      { n: 2, ka: '4K გარჩევადობა', en: '4K resolution', price: 3500, extraDays: 0 },
    ],
    featured: true,
    rating: { count: 2, averageTenths: 45 },
    queue: 1,
    away: null,
    seo: { title: 'Logo design | SEO', description: 'Clean logos for small businesses.' },
  },
  {
    n: 2,
    slug: `mxolod-qartulad-${GIG_UID(2).toLowerCase()}`,
    status: 'active',
    ka: { title: 'მხოლოდ ქართული განცხადება', description: '<p>მხოლოდ ქართულად.</p>' },
    en: null,
    price: 1050,
    deliveryDays: 0,
    revisionsAllowed: null,
    upgrades: [],
    featured: false,
    rating: { count: 0, averageTenths: null },
    queue: 3,
    away: { until: '2026-12-24T00:00:00+04:00' },
    seo: null,
  },
  {
    n: 3,
    slug: `ganxilvaze-${GIG_UID(3).toLowerCase()}`,
    status: 'pending',
    ka: { title: 'განხილვაზე მყოფი განცხადება', description: '<p>ტექსტი.</p>' },
    en: { title: 'A gig under review', description: '<p>Text.</p>' },
    price: 5000,
    deliveryDays: 30,
    revisionsAllowed: 0,
    upgrades: [],
    featured: false,
    rating: { count: 0, averageTenths: null },
    queue: 0,
    away: null,
    seo: null,
  },
  {
    n: 4,
    slug: `uarkofili-${GIG_UID(4).toLowerCase()}`,
    status: 'rejected',
    ka: { title: 'უარყოფილი განცხადება', description: '<p>ტექსტი.</p>' },
    en: { title: 'A rejected gig', description: '<p>Text.</p>' },
    price: 5000,
    deliveryDays: 1,
    revisionsAllowed: 1,
    upgrades: [],
    featured: false,
    rating: { count: 0, averageTenths: null },
    queue: 0,
    away: { until: null },
    seo: null,
  },
];

const money = (amount) => ({ amount, currency: 'GEL' });

function gigFor(g, locale, viewer) {
  const text = locale === 'en' && g.en ? g.en : g.ka;
  const contentLocale = locale === 'en' && g.en ? 'en' : 'ka';
  const cat = (c) => ({
    id: c.id,
    slug: c.slug,
    name: locale === 'en' ? c.en : c.ka,
    contentLocale: locale,
  });
  return {
    id: id(g.n),
    uid: GIG_UID(g.n),
    slug: g.slug,
    status: g.status,
    title: text.title,
    description: text.description,
    contentLocale,
    hasEnglish: Boolean(g.en),
    category: cat(CATEGORIES[0]),
    subcategory: cat(CATEGORIES[1]),
    childCategory: cat(CATEGORIES[2]),
    price: money(g.price),
    deliveryDays: g.deliveryDays,
    revisionsAllowed: g.revisionsAllowed,
    upgrades: g.upgrades.map((u) => ({
      id: id(100 + g.n * 10 + u.n),
      title: locale === 'en' && g.en ? u.en : u.ka,
      price: money(u.price),
      extraDays: u.extraDays,
    })),
    faqs:
      g.n === 1
        ? [
            {
              id: id(201),
              question: locale === 'en' ? 'Do you make revisions?' : 'აკეთებთ შესწორებებს?',
              answer: locale === 'en' ? 'Yes, three.\nMore on request.' : 'დიახ, სამს.',
            },
            {
              id: id(202),
              question: locale === 'en' ? 'Which formats?' : 'რა ფორმატები?',
              answer: 'PNG, SVG',
            },
          ]
        : [],
    thumbnail: image(`gig-${g.n}`),
    // Gig 1: three images; gig 2: none (the page shows the cover); others: one.
    images:
      g.n === 1
        ? ['a', 'b', 'c'].map((x) => image(`gig-1-${x}`))
        : g.n === 2
          ? []
          : [image(`gig-${g.n}`)],
    documents:
      g.n === 1
        ? [
            {
              fileId: id(301),
              fileName: 'brief-template.pdf',
              sizeBytes: 1468006,
              url: `${MEDIA}/docs/brief-template.pdf`,
            },
          ]
        : [],
    seller: {
      user: NINO,
      rating: { count: 4, averageTenths: 47 },
      unavailableUntil: g.away?.until ?? null,
      isAcceptingOrders: !g.away,
    },
    isFeatured: g.featured,
    rating: g.rating,
    ordersInQueueCount: g.queue,
    seoTitle: g.seo?.title ?? null,
    seoDescription: g.seo?.description ?? null,
    publishedAt: g.status === 'active' ? '2026-10-01T10:00:00Z' : null,
    updatedAt: '2026-10-01T10:00:00Z',
    viewer:
      viewer === 'guest'
        ? null
        : { isOwner: viewer === 'owner', isFavorite: false, hasReported: false },
  };
}

/** "You may also like" for gig 1 (three other cards); none for the others (the section is hidden). */
function relatedFor(gigId, locale) {
  if (gigId !== id(1)) return [];
  return [5, 6, 7].map((n) => ({
    id: id(n),
    uid: GIG_UID(n),
    slug: `related-${n}-${GIG_UID(n).toLowerCase()}`,
    title: locale === 'en' ? `Related gig ${n}` : `მსგავსი განცხადება ${n}`,
    contentLocale: locale,
    thumbnail: image(`gig-${n}`),
    price: money(1000 * n),
    deliveryDays: 2,
    rating: { count: 0, averageTenths: null },
    seller: NINO,
    isFeatured: false,
    isFavorite: false,
  }));
}

export function gigRoute(url, req) {
  const related = url.pathname.match(/^\/api\/v1\/gigs\/([^/]+)\/related$/);
  if (related) {
    const locale = req.headers['accept-language'] === 'en' ? 'en' : 'ka';
    return [200, { gigs: relatedFor(related[1], locale) }];
  }
  if (url.pathname !== '/api/v1/gigs/lookup') return undefined;
  const viewer = viewerOf(req);
  const locale = req.headers['accept-language'] === 'en' ? 'en' : 'ka';
  const uid = (url.searchParams.get('uid') ?? '').toUpperCase();
  const g = GIGS.find((x) => GIG_UID(x.n) === uid);
  // AC-28: others' pending and rejected gigs are 404.
  if (!g || (g.status !== 'active' && viewer !== 'owner')) return [404, { code: 'NOT_FOUND' }];
  return [200, gigFor(g, locale, viewer)];
}

/** Current slugs, for the specs. */
export const GIG_SLUG = Object.fromEntries(GIGS.map((g) => [g.n, g.slug]));
