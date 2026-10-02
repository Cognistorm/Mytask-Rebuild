// Contract: createFileUpload, getFile, deleteFile, completeFileUpload, getFileDownload (ADR-009 §3–§4), and the
// staff side adminCreateFileUpload, adminGetFile, adminCompleteFileUpload. Audience `restricted-user` on the
// upload operations: the guard lets restricted users through and FilesService allows them `appeal_file` only.
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request, Response } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { resolveLocale } from '../../platform/errors/messages';
import {
  AllowRestricted,
  CurrentAuth,
  CurrentStaff,
  StaffRoute,
  type AuthState,
  type StaffAuthState,
} from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { FilesService } from './files.service';

type S = components['schemas'];

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @AllowRestricted()
  @Post()
  @HttpCode(201)
  create(
    @Body() body: S['FileUploadRequest'],
    @CurrentAuth() auth: AuthState,
    @Headers('accept-language') lang?: string,
  ): Promise<S['FileUploadTicket']> {
    return this.files.create(auth.userId, body, resolveLocale(lang));
  }

  @AllowRestricted()
  @Get(':fileId')
  get(
    @Param('fileId') id: string,
    @CurrentAuth() auth: AuthState,
    @Headers('accept-language') lang?: string,
  ): Promise<S['File']> {
    return this.files.get(auth.userId, id, resolveLocale(lang));
  }

  @AllowRestricted()
  @Delete(':fileId')
  @HttpCode(204)
  remove(@Param('fileId') id: string, @CurrentAuth() auth: AuthState): Promise<void> {
    return this.files.remove(auth.userId, id);
  }

  @AllowRestricted()
  @Post(':fileId/complete')
  @HttpCode(202)
  complete(
    @Param('fileId') id: string,
    @CurrentAuth() auth: AuthState,
    @Headers('accept-language') lang?: string,
  ): Promise<S['File']> {
    return this.files.complete(auth.userId, id, resolveLocale(lang));
  }

  /** `mode=redirect` (default, web links) → 302; `mode=json` (mobile) → 200 SignedUrl. Never cached. */
  @Get(':fileId/download')
  async download(
    @Param('fileId') id: string,
    @CurrentAuth() auth: AuthState,
    @Res({ passthrough: true }) res: Response,
    @Query('mode') mode?: 'redirect' | 'json',
  ): Promise<S['SignedUrl'] | undefined> {
    const signed = await this.files.download(auth.userId, id);
    res.setHeader('Cache-Control', 'no-store');
    if (mode === 'json') return signed;
    res.redirect(302, signed.url);
    return undefined;
  }
}

@Controller('admin/files')
export class AdminFilesController {
  constructor(
    private readonly files: FilesService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  private ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }

  /** The permission depends on the purpose (`x-permission.permissionBy`): checked in FilesService. */
  @StaffRoute()
  @Post()
  @HttpCode(201)
  create(
    @Body() body: S['FileUploadRequest'],
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['FileUploadTicket']> {
    return this.files.adminCreate(staff, body, this.ctx(req));
  }

  @StaffRoute()
  @Get(':fileId')
  get(
    @Param('fileId') id: string,
    @CurrentStaff() staff: StaffAuthState,
    @Headers('accept-language') lang?: string,
  ): Promise<S['File']> {
    return this.files.adminGet(staff.staffId, id, resolveLocale(lang));
  }

  @StaffRoute()
  @Post(':fileId/complete')
  @HttpCode(202)
  complete(
    @Param('fileId') id: string,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['File']> {
    return this.files.adminComplete(staff.staffId, id, this.ctx(req));
  }
}
