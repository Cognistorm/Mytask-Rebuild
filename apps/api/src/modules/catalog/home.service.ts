// `getHome` (`GET /home`, spec 03 AC-5, AC-24…AC-26; spec 17 AC-21, AC-35; LEGACY `Main/Home/HomeComponent.php`).
//
// - Top gigs (AC-24): 4 listed gigs (R-S1: active gig, listable owner joined live), active-Premium owners first, random
//   inside each group; the second group tops the row up (legacy `:92-110`, but active Premium only, R-2.1).
// - Category rows (AC-5, AC-25): every visible top-level category in random order, up to 4 of its listed gigs each,
//   Premium owners first, random inside each group. Empty rows are returned empty; clients hide them.
// - Featured categories (S-107): the same visible top-level categories, in the rows' order (legacy uses one
//   collection for both), with the category image; `null` while OFF.
// - Best sellers (S-108, AC-26): nobody has completed sales until slice 5, so `[]` while ON, `null` while OFF.
// - Logos (S-109) and recent articles (S-117 + S-119): `[]` while ON, `null` while OFF until slice 16.
// Random on every request, so nothing is cached here (the category tree has its own 60 s cache).
import { Injectable } from '@nestjs/common';
import type { Locale, Schema } from '@mytask/types';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { SettingsService } from '../../platform/settings/settings.service';
import { PremiumStatus } from '../subscriptions/premium-status';
import { CategoriesService } from './categories.service';
import { GigCards } from './gig-cards';
import { LISTABLE_OWNER } from './list-rules';

const TOP_GIGS = 4;
const ROW_GIGS = 4;

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly premium: PremiumStatus,
    private readonly categories: CategoriesService,
    private readonly cards: GigCards,
  ) {}

  async home(locale: Locale, viewerId: string | null): Promise<Schema<'Home'>> {
    const s = await this.settings.getMany(['S-107', 'S-108', 'S-109', 'S-117', 'S-119']);
    const { categories: tree } = await this.categories.listTree(locale);
    const visible = shuffle(tree.filter((c) => c.isVisibleOnHome));

    const groupA = Prisma.sql`CASE WHEN g."owner_id" IN (${this.premium.activeUsersSql()}) THEN 0 ELSE 1 END`;
    const listed = Prisma.sql`g."status" = 'active' AND ${LISTABLE_OWNER}`;
    const [top, rowGigs] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT g."id" FROM "gigs" g JOIN "users" u ON u."id" = g."owner_id"
        WHERE ${listed}
        ORDER BY ${groupA}, random()
        LIMIT ${TOP_GIGS}`,
      visible.length === 0
        ? []
        : this.prisma.$queryRaw<{ id: string; categoryId: string }[]>`
            SELECT "id", "categoryId" FROM (
              SELECT g."id", g."category_id" AS "categoryId",
                row_number() OVER (PARTITION BY g."category_id" ORDER BY ${groupA}, random()) AS "n"
              FROM "gigs" g JOIN "users" u ON u."id" = g."owner_id"
              WHERE ${listed} AND g."category_id" IN (${Prisma.join(visible.map((c) => Prisma.sql`${c.id}::uuid`))})
            ) ranked
            WHERE "n" <= ${ROW_GIGS}
            ORDER BY "categoryId", "n"`,
    ]);

    const cards = await this.cards.cards(
      [...top.map((r) => r.id), ...rowGigs.map((r) => r.id)],
      locale,
      viewerId,
    );
    const cardById = new Map(cards.map((c) => [c.id, c]));
    const cardsOf = (ids: string[]) => ids.flatMap((id) => cardById.get(id) ?? []);
    const ref = (c: Schema<'CategoryNode'>): Schema<'CategoryColorRef'> => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      contentLocale: c.contentLocale,
      color: c.color,
    });

    return {
      topGigs: cardsOf(top.map((r) => r.id)),
      categoryRows: visible.map((c) => ({
        category: ref(c),
        gigs: cardsOf(rowGigs.filter((r) => r.categoryId === c.id).map((r) => r.id)),
      })),
      featuredCategories: s['S-107']
        ? visible.map((c) => ({ category: ref(c), image: c.image }))
        : null,
      bestSellers: s['S-108'] ? [] : null,
      logos: s['S-109'] ? [] : null,
      recentArticles: s['S-117'] && s['S-119'] ? [] : null,
    };
  }
}

/** Fisher–Yates: legacy `inRandomOrder()` on the categories. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
