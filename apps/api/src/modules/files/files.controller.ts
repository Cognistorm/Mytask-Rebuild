// Contract: createFileUpload, getFile, deleteFile, completeFileUpload (ADR-009 §3). Audience
// `restricted-user`: the guard lets restricted users through and FilesService allows them `appeal_file` only.
import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import type { components } from '@mytask/types';
import { resolveLocale } from '../../platform/errors/messages';
import { AllowRestricted, CurrentAuth, type AuthState } from '../auth/auth.guard';
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
}
