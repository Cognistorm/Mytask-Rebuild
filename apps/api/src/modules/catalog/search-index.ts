// Search documents of gigs (ADR-011 §1, §3; data-model §3.S). Every gig write of slice 3 (create, edit, moderation,
// delete) calls `indexGig` inside its own transaction, so a gig is searchable (or gone) with the same commit.
// Projects and users join in their slices.
//
// What the listing reads from here: only `search_text` (the keyword rule). Status, prices, counters and the owner
// are read from the live `gigs` and `users` rows at query time (GigSearchService), because counters change in other
// slices (visits, sales, reviews) and the owner's listability changes in many places (ban, restriction, deletion,
// verification); reading them live keeps every list exact without a refresh from each of those paths. The copies
// in the document are kept current on each index call for a later engine (ADR-011 §3) and for diagnostics.
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { PremiumStatus } from '../subscriptions/premium-status';
import { htmlToText, normalizeSearchText } from './search-text';

type Db = Prisma.TransactionClient | PrismaService;

const LISTABLE_STATUSES = new Set(['active', 'verified']);

@Injectable()
export class SearchIndex {
  constructor(
    private readonly prisma: PrismaService,
    private readonly premium: PremiumStatus,
  ) {}

  /** Writes (or replaces) the gig's document; a missing or deleted gig has none. */
  async indexGig(gigId: string, db: Db = this.prisma): Promise<void> {
    const gig = await db.gig.findUnique({
      where: { id: gigId },
      include: {
        translations: true,
        owner: { select: { status: true, deletedAt: true, isRestricted: true } },
        category: { include: { translations: true } },
        subcategory: { include: { translations: true } },
        childcategory: { include: { translations: true } },
      },
    });
    if (!gig || gig.status === 'deleted') {
      await this.removeGig(gigId, db);
      return;
    }
    // The keyword rule matches title and description only (spec 03 AC-19); one line per field so no word spans two.
    const searchText = gig.translations
      .flatMap((t) => [
        normalizeSearchText(t.title),
        normalizeSearchText(htmlToText(t.description)),
      ])
      .join('\n');
    // Words (tsvector, ADR-011 §1) also carry the category names, for a later relevance order.
    const categoryNames = [gig.category, gig.subcategory, gig.childcategory].flatMap((c) =>
      c.translations.map((t) => t.name),
    );
    const words = [searchText, normalizeSearchText(categoryNames.join(' '))].join('\n');
    const ownerListable =
      LISTABLE_STATUSES.has(gig.owner.status) &&
      gig.owner.deletedAt === null &&
      !gig.owner.isRestricted;
    const ownerIsPremium = await this.premium.isActive(gig.ownerId);
    await db.$executeRaw`
      INSERT INTO "search_documents" (
        "entity_type", "entity_id", "tsv", "search_text", "category_id", "subcategory_id", "childcategory_id",
        "price_tetri", "delivery_days", "rating_count", "rating_sum", "sales_count", "visits_count",
        "owner_is_premium", "owner_listable", "status", "published_at", "updated_at")
      VALUES (
        'gig', ${gig.id}::uuid, to_tsvector('simple', ${words}), ${searchText}, ${gig.categoryId}::uuid,
        ${gig.subcategoryId}::uuid, ${gig.childcategoryId}::uuid, ${gig.priceTetri}, ${gig.deliveryDays},
        ${gig.ratingCount}, ${gig.ratingSum}, ${gig.salesCount}, ${gig.visitsCount}, ${ownerIsPremium},
        ${ownerListable}, ${gig.status}, ${gig.publishedAt}, now())
      ON CONFLICT ("entity_type", "entity_id") DO UPDATE SET
        "tsv" = EXCLUDED."tsv", "search_text" = EXCLUDED."search_text",
        "category_id" = EXCLUDED."category_id", "subcategory_id" = EXCLUDED."subcategory_id",
        "childcategory_id" = EXCLUDED."childcategory_id", "price_tetri" = EXCLUDED."price_tetri",
        "delivery_days" = EXCLUDED."delivery_days", "rating_count" = EXCLUDED."rating_count",
        "rating_sum" = EXCLUDED."rating_sum", "sales_count" = EXCLUDED."sales_count",
        "visits_count" = EXCLUDED."visits_count", "owner_is_premium" = EXCLUDED."owner_is_premium",
        "owner_listable" = EXCLUDED."owner_listable", "status" = EXCLUDED."status",
        "published_at" = EXCLUDED."published_at", "updated_at" = now()`;
  }

  async removeGig(gigId: string, db: Db = this.prisma): Promise<void> {
    await db.searchDocument.deleteMany({ where: { entityType: 'gig', entityId: gigId } });
  }
}
