// Contract: getMyProfile, updateMyProfile, putMyAvatar, deleteMyAvatar, getUserProfile (ROADMAP 4.1.8a),
// createUserReport (4.1.8b); skills, languages and linked accounts (4.1.9) below.
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request, Response } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { CurrentAuth, OptionalAuth, OptionalUser, type AuthState } from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { ProfileListsService } from './profile-lists.service';
import { ProfilesService } from './profiles.service';

type S = components['schemas'];

@Controller()
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  @Get('me/profile')
  getMine(@CurrentAuth() auth: AuthState): Promise<S['MeProfile']> {
    return this.profiles.getMine(auth.userId);
  }

  private ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }

  @Patch('me/profile')
  updateMine(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['MeProfileUpdateRequest'],
    @Req() req: Request,
  ): Promise<S['MeProfile']> {
    return this.profiles.updateMine(auth.userId, body, this.ctx(req));
  }

  @Put('me/avatar')
  putAvatar(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['MeAvatarPutRequest'],
  ): Promise<S['Me']> {
    return this.profiles.putAvatar(auth.userId, body);
  }

  @Delete('me/avatar')
  @HttpCode(204)
  deleteAvatar(@CurrentAuth() auth: AuthState): Promise<void> {
    return this.profiles.deleteAvatar(auth.userId);
  }

  @OptionalUser()
  @Get('users/:username')
  getPublic(
    @Param('username') username: string,
    @OptionalAuth() viewer: AuthState | null,
  ): Promise<S['UserProfile']> {
    return this.profiles.getPublic(username, viewer?.userId ?? null);
  }

  /** 201 for the first report, 200 when it replaces the caller's earlier one (AC-14). */
  @Post('users/:username/reports')
  async report(
    @CurrentAuth() auth: AuthState,
    @Param('username') username: string,
    @Body() body: S['UserReportCreateRequest'],
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['UserReport']> {
    const { created, report } = await this.profiles.report(
      auth.userId,
      username,
      body,
      this.ctx(req),
    );
    res.status(created ? 201 : 200);
    return report;
  }
}

/** Contract: createMySkill, updateMySkill, deleteMySkill, createMyLanguage, updateMyLanguage, deleteMyLanguage,
 * putMyLinkedAccounts (ROADMAP 4.1.9). */
@Controller('me')
export class ProfileListsController {
  constructor(
    private readonly lists: ProfileListsService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  private ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }

  @Post('skills')
  createSkill(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['UserSkillCreateRequest'],
    @Req() req: Request,
  ): Promise<S['UserSkill']> {
    return this.lists.createSkill(auth.userId, body, this.ctx(req));
  }

  @Patch('skills/:skillId')
  updateSkill(
    @CurrentAuth() auth: AuthState,
    @Param('skillId') skillId: string,
    @Body() body: S['UserSkillUpdateRequest'],
    @Req() req: Request,
  ): Promise<S['UserSkill']> {
    return this.lists.updateSkill(auth.userId, skillId, body, this.ctx(req));
  }

  @Delete('skills/:skillId')
  @HttpCode(204)
  deleteSkill(@CurrentAuth() auth: AuthState, @Param('skillId') skillId: string): Promise<void> {
    return this.lists.deleteSkill(auth.userId, skillId);
  }

  @Post('languages')
  createLanguage(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['UserLanguageCreateRequest'],
    @Req() req: Request,
  ): Promise<S['UserLanguage']> {
    return this.lists.createLanguage(auth.userId, body, this.ctx(req));
  }

  @Patch('languages/:languageId')
  updateLanguage(
    @CurrentAuth() auth: AuthState,
    @Param('languageId') languageId: string,
    @Body() body: S['UserLanguageUpdateRequest'],
    @Req() req: Request,
  ): Promise<S['UserLanguage']> {
    return this.lists.updateLanguage(auth.userId, languageId, body, this.ctx(req));
  }

  @Delete('languages/:languageId')
  @HttpCode(204)
  deleteLanguage(
    @CurrentAuth() auth: AuthState,
    @Param('languageId') languageId: string,
  ): Promise<void> {
    return this.lists.deleteLanguage(auth.userId, languageId);
  }

  @Put('linked-accounts')
  putLinkedAccounts(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['ProfileLinkedAccountsPutRequest'],
    @Req() req: Request,
  ): Promise<S['ProfileLinkedAccounts']> {
    return this.lists.putLinkedAccounts(auth.userId, body, this.ctx(req));
  }
}
