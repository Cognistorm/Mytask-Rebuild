// Favourites (ROADMAP 4.3.6; spec 04 AC-35, AC-36, EC-11, R-G10): putFavorite and deleteFavorite are idempotent;
// listFavorites shows only the saved gigs that are still listable (active gig, listable owner as spec 03 P-29), so a
// gig that becomes pending or whose owner is restricted drops out and comes back when listable again. Rows are kept.
import { Injectable } from '@nestjs/common';
import type { components, Locale } from '@mytask/types';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { decodeCursor, encodeCursor } from '../../platform/pagination';
import { GigCards } from '../catalog/gig-cards';
import { GigPages } from './gig-pages.service';
import { notFound } from './gigs.service';

type S = components['schemas'];
type Translate = (key: string) => string;

/** Prisma form of `LISTABLE_OWNER` (catalog/list-rules.ts) for an active gig. */
const LISTABLE_GIG: Prisma.GigWhereInput = {
  status: 'active',
  owner: { status: { in: ['active', 'verified'] }, deletedAt: null, isRestricted: false },
};

@Injectable()
export class GigFavorites {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pages: GigPages,
    private readonly cards: GigCards,
  ) {}

  /** AC-35: a gig the caller may see as a page (404 otherwise); own gig → 403 (R-G10). Saving twice keeps the first. */
  async put(userId: string, gigId: string): Promise<S['FavoriteGig']> {
    const { ownerId } = await this.pages.visible(gigId, userId);
    if (ownerId === userId) throw new ApiException(403, 'FORBIDDEN', 't_forbidden');
    const row = await this.prisma.favorite.upsert({
      where: { userId_gigId: { userId, gigId } },
      create: { userId, gigId },
      update: {},
    });
    return { gigId: row.gigId, createdAt: row.createdAt.toISOString() };
  }

  /** AC-35, AC-36: removes the saved gig whatever its state now; an unknown gig id → 404. */
  async remove(userId: string, gigId: string): Promise<void> {
    const gig = await this.prisma.gig.findUnique({ where: { id: gigId }, select: { id: true } });
    if (!gig) throw notFound();
    await this.prisma.favorite.deleteMany({ where: { userId, gigId } });
  }

  /** AC-36: newest saved first; the cursor is `(createdAt, gigId)` of the last row. */
  async list(
    userId: string,
    query: { cursor?: string; limit?: number },
    locale: Locale,
    t: Translate,
  ): Promise<S['GigCardPage']> {
    const limit = query.limit ?? 20;
    const after = decodeCursor(query.cursor, t);
    const rows = await this.prisma.favorite.findMany({
      where: {
        userId,
        gig: LISTABLE_GIG,
        ...(after && {
          OR: [
            { createdAt: { lt: after.createdAt } },
            { createdAt: after.createdAt, gigId: { lt: after.id } },
          ],
        }),
      },
      select: { gigId: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { gigId: 'desc' }],
      take: limit + 1,
    });
    const data = rows.slice(0, limit);
    const last = data[data.length - 1];
    return {
      data: await this.cards.cards(
        data.map((r) => r.gigId),
        locale,
        userId,
      ),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({ createdAt: last.createdAt, id: last.gigId })
          : null,
    };
  }
}
