// Contract: listMyRestrictions, createRestrictionAppeal (restricted users allowed, spec 01 AC-19) and
// adminListRestrictions, adminCreateRestriction, adminDeleteRestriction, adminListRestrictionAppeals,
// adminApproveRestrictionAppeal, adminRejectRestrictionAppeal (slice 01 part B-2b),
// adminGetRestrictionAppealFileDownload (ROADMAP 4.1.6a).
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request, Response } from 'express';
import type { RestrictionStatus } from '../../generated/prisma/client';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import {
  AllowRestricted,
  CurrentAuth,
  CurrentStaff,
  StaffRoute,
  type AuthState,
  type StaffAuthState,
} from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { RestrictionsService } from './restrictions.service';

type S = components['schemas'];

/** `status` is `style: form, explode: true`: one value or several. */
const statuses = (v: unknown): RestrictionStatus[] | undefined =>
  v === undefined ? undefined : ((Array.isArray(v) ? v : [v]) as RestrictionStatus[]);

abstract class WithContext {
  constructor(protected readonly ipResolver: ClientIpResolver) {}
  protected ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }
}

@Controller()
export class RestrictionsController extends WithContext {
  constructor(
    private readonly restrictions: RestrictionsService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  @AllowRestricted()
  @Get('me/restrictions')
  mine(@CurrentAuth() auth: AuthState): Promise<S['RestrictionPage']> {
    return this.restrictions.listMine(auth.userId);
  }

  @AllowRestricted()
  @Post('restriction-appeals')
  @HttpCode(201)
  appeal(
    @Body() body: S['RestrictionAppealCreateRequest'],
    @CurrentAuth() auth: AuthState,
    @Req() req: Request,
  ): Promise<S['Restriction']> {
    return this.restrictions.appeal(auth.userId, body, this.ctx(req));
  }
}

@Controller('admin')
export class AdminRestrictionsController extends WithContext {
  constructor(
    private readonly restrictions: RestrictionsService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  @StaffRoute('users.read')
  @Get('restrictions')
  list(
    @Query('userId') userId?: string,
    @Query('status') status?: unknown,
  ): Promise<S['AdminRestrictionPage']> {
    return this.restrictions.list({ userId, status: statuses(status) });
  }

  @StaffRoute('users.restrict')
  @Post('restrictions')
  @HttpCode(201)
  create(
    @Body() body: S['AdminRestrictionCreateRequest'],
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['AdminRestriction']> {
    return this.restrictions.create(body, staff.staffId, this.ctx(req));
  }

  @StaffRoute('users.restrict')
  @Delete('restrictions/:restrictionId')
  @HttpCode(204)
  remove(
    @Param('restrictionId') id: string,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<void> {
    return this.restrictions.remove(id, staff.staffId, this.ctx(req));
  }

  @StaffRoute('users.restrict')
  @Get('restriction-appeals')
  appeals(
    @Query('userId') userId?: string,
    @Query('status') status?: unknown,
  ): Promise<S['AdminRestrictionAppealPage']> {
    return this.restrictions.listAppeals({ userId, status: statuses(status) });
  }

  @StaffRoute('users.restrict')
  @Post('restriction-appeals/:appealId/approve')
  @HttpCode(200)
  approve(
    @Param('appealId') id: string,
    @Body() body: S['StaffOptionalNoteRequest'] | undefined,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['AdminRestrictionAppeal']> {
    return this.restrictions.decide(
      id,
      'approved',
      body?.note ?? null,
      staff.staffId,
      this.ctx(req),
    );
  }

  /** Same answer as getFileDownload: 302 by default, `mode=json` → SignedUrl; never cached. */
  @StaffRoute('users.restrict')
  @Get('restriction-appeals/:appealId/files/:fileId/download')
  async fileDownload(
    @Param('appealId') appealId: string,
    @Param('fileId') fileId: string,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('mode') mode?: 'redirect' | 'json',
  ): Promise<S['SignedUrl'] | undefined> {
    const signed = await this.restrictions.fileDownload(
      appealId,
      fileId,
      staff.staffId,
      this.ctx(req),
    );
    res.setHeader('Cache-Control', 'no-store');
    if (mode === 'json') return signed;
    res.redirect(302, signed.url);
    return undefined;
  }

  @StaffRoute('users.restrict')
  @Post('restriction-appeals/:appealId/reject')
  @HttpCode(200)
  reject(
    @Param('appealId') id: string,
    @Body() body: S['StaffReasonRequest'],
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['AdminRestrictionAppeal']> {
    return this.restrictions.decide(
      id,
      'rejected',
      body.reason.trim(),
      staff.staffId,
      this.ctx(req),
    );
  }
}
