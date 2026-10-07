// createGigReport (ROADMAP 4.3.6; spec 04 AC-37, AC-38, EC-10, R-G10): one report per user and gig, saved in the
// shared `reports` table for the staff queue; EV-22 `Admin/GigReported` to every S-100 address (NEW, P-36). Order as
// legacy `Service/ServiceComponent.php:212-303`: owner refused, then the reason (6–500), then the duplicate check.
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { SettingsService } from '../../platform/settings/settings.service';
import type { RequestContext } from '../auth/request-context';
import { ReportLimiter } from '../profiles/report-limiter';
import { GigPages } from './gig-pages.service';

type S = components['schemas'];

/** Legacy `Main/Service/ReportValidator.php`: min 6, max 500 characters. */
const REASON = { min: 6, max: 500 };

const alreadyReported = () =>
  new ApiException(409, 'DUPLICATE', 't_looks_like_alrdy_reported_this_gig');

@Injectable()
export class GigReports {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly outbox: OutboxService,
    private readonly pages: GigPages,
    private readonly limiter: ReportLimiter,
  ) {}

  /** SEC-23: every attempt counts first, also one refused with 400, 403 or 404 (I-31). */
  async create(
    reporterId: string,
    gigId: string,
    input: S['GigReportCreateRequest'],
    ctx: RequestContext,
  ): Promise<S['GigReport']> {
    await this.limiter.hit(reporterId);
    // EC-10: a gig deleted (or no longer public) after the page opened → 404, as getGig.
    const { ownerId } = await this.pages.visible(gigId, reporterId);
    if (ownerId === reporterId) {
      throw new ApiException(403, 'FORBIDDEN', 't_gig_owner_cant_report_his_gig');
    }
    const reason = input.reason.trim();
    const n = [...reason].length;
    if (n < REASON.min || n > REASON.max) {
      const [code, messageKey, params] =
        n < REASON.min
          ? (['too_short', 't_validator_min', { min: REASON.min }] as const)
          : (['too_long', 't_validator_max', { max: REASON.max }] as const);
      throw new ApiException(400, 'VALIDATION_FAILED', messageKey, {
        fields: [{ field: 'reason', code, message: ctx.t(messageKey, params), messageKey, params }],
      });
    }

    const admins = await this.settings.get('S-100');
    const key = { reporterUserId: reporterId, targetType: 'gig' as const, targetId: gigId };
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.report.findUnique({
          where: { reporterUserId_targetType_targetId: key },
          select: { id: true },
        });
        if (before) throw alreadyReported();
        const row = await tx.report.create({ data: { ...key, reason } });
        if (admins.length) {
          await this.outbox.add(
            'EV-22',
            { type: 'report', id: row.id },
            { to: [...admins], locale: 'ka', params: {} },
            tx,
          );
        }
        return { id: row.id, gigId, createdAt: row.createdAt.toISOString() };
      });
    } catch (e) {
      // Two reports at the same moment: the unique key decides.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw alreadyReported();
      }
      throw e;
    }
  }
}
