// Contract: createKycVerification, getMyKyc and adminListKycVerifications, adminGetKycVerification,
// adminApproveKycVerification, adminDeclineKycVerification, adminGetKycFileDownload (ROADMAP 4.1.13).
import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request, Response } from 'express';
import type { KycDocumentType, KycStatus } from '../../generated/prisma/client';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import {
  CurrentAuth,
  CurrentStaff,
  StaffRoute,
  type AuthState,
  type StaffAuthState,
} from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { KycService } from './kyc.service';

type S = components['schemas'];

/** The contract has already checked the range; query values may still arrive as strings. */
const int = (v: unknown): number | undefined => (v === undefined ? undefined : Number(v));

abstract class WithContext {
  constructor(protected readonly ipResolver: ClientIpResolver) {}
  protected ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }
}

@Controller()
export class KycController extends WithContext {
  constructor(
    private readonly kyc: KycService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  @Post('kyc')
  @HttpCode(201)
  create(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['KycVerificationCreateRequest'],
    @Req() req: Request,
  ): Promise<S['KycVerification']> {
    return this.kyc.create(auth.userId, body, this.ctx(req));
  }

  @Get('me/kyc')
  overview(@CurrentAuth() auth: AuthState): Promise<S['KycOverview']> {
    return this.kyc.overview(auth.userId);
  }
}

@Controller('admin/kyc')
export class AdminKycController extends WithContext {
  constructor(
    private readonly kyc: KycService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  @StaffRoute('kyc.review')
  @Get()
  list(
    @Req() req: Request,
    @Query('status') status?: KycStatus,
    @Query('documentType') documentType?: KycDocumentType,
    @Query('userId') userId?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: unknown,
  ): Promise<S['AdminKycVerificationPage']> {
    return this.kyc.adminList(
      { status, documentType, userId, createdFrom, createdTo, cursor, limit: int(limit) },
      this.ctx(req).t,
    );
  }

  @StaffRoute('kyc.review')
  @Get(':kycId')
  get(@Param('kycId') id: string): Promise<S['AdminKycVerification']> {
    return this.kyc.adminGet(id);
  }

  @StaffRoute('kyc.review')
  @Post(':kycId/approve')
  @HttpCode(200)
  approve(
    @Param('kycId') id: string,
    @Body() body: S['StaffOptionalNoteRequest'] | undefined,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['AdminKycVerification']> {
    return this.kyc.approve(id, body?.note ?? null, staff.staffId, this.ctx(req));
  }

  @StaffRoute('kyc.review')
  @Post(':kycId/decline')
  @HttpCode(200)
  decline(
    @Param('kycId') id: string,
    @Body() body: S['StaffReasonRequest'],
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['AdminKycVerification']> {
    return this.kyc.decline(id, body.reason, staff.staffId, this.ctx(req));
  }

  /** Same answer as getFileDownload: 302 by default, `mode=json` → SignedUrl; never cached. */
  @StaffRoute('kyc.review')
  @Get(':kycId/files/:fileId/download')
  async fileDownload(
    @Param('kycId') kycId: string,
    @Param('fileId') fileId: string,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('mode') mode?: 'redirect' | 'json',
  ): Promise<S['SignedUrl'] | undefined> {
    const signed = await this.kyc.fileDownload(kycId, fileId, staff.staffId, this.ctx(req));
    res.setHeader('Cache-Control', 'no-store');
    if (mode === 'json') return signed;
    res.redirect(302, signed.url);
    return undefined;
  }
}
