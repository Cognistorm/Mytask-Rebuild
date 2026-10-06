// Contract: getMe, changeMyPassword, listMySessions, revokeMyOtherSessions, updateMyTwoFactor (slice 01 part A);
// updateMe, updateMyPreferences, deleteMe (spec 02, ROADMAP 4.1.11).
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request, Response } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { AccountSettingsService } from './account-settings.service';
import { AccountService } from './account.service';
import { AllowRestricted, CurrentAuth, type AuthState } from './auth.guard';
import { clearSessionCookies } from './cookies';
import { buildContext, isCookieClient } from './request-context';

type S = components['schemas'];

@Controller('me')
export class MeController {
  constructor(
    private readonly account: AccountService,
    private readonly accountSettings: AccountSettingsService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  private ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }

  @AllowRestricted()
  @Get()
  getMe(@CurrentAuth() auth: AuthState): Promise<S['Me']> {
    return this.account.me(auth.userId);
  }

  @Patch()
  updateMe(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['MeUpdateRequest'],
    @Req() req: Request,
  ): Promise<S['Me']> {
    return this.accountSettings.updateMe(auth.userId, body, this.ctx(req));
  }

  @Delete()
  @HttpCode(204)
  async deleteMe(
    @CurrentAuth() auth: AuthState,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.accountSettings.deleteMe(auth.userId);
    if (isCookieClient(this.ctx(req).client)) clearSessionCookies(res);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['MePreferencesUpdateRequest'],
  ): Promise<S['Me']> {
    return this.accountSettings.updatePreferences(auth.userId, body);
  }

  @Post('password')
  @HttpCode(200)
  changePassword(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['PasswordChangeRequest'],
    @Req() req: Request,
  ): Promise<S['AuthNotice']> {
    return this.account.changePassword(auth.userId, auth.sessionId, body, this.ctx(req));
  }

  @Get('sessions')
  listSessions(@CurrentAuth() auth: AuthState): Promise<S['SessionPage']> {
    return this.account.listSessions(auth.userId, auth.sessionId);
  }

  @Post('sessions/revoke-others')
  @HttpCode(200)
  revokeOthers(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['SessionRevokeOthersRequest'],
    @Req() req: Request,
  ): Promise<S['SessionRevokeResult']> {
    return this.account.revokeOthers(auth.userId, auth.sessionId, body, this.ctx(req));
  }

  @Post('two-factor/challenges')
  @HttpCode(202)
  createChallenge(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['TwoFactorChallengeCreateRequest'],
    @Req() req: Request,
  ): Promise<S['TwoFactorChallenge']> {
    return this.account.createChallenge(auth.userId, body ?? {}, this.ctx(req));
  }

  @Put('two-factor')
  updateTwoFactor(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['TwoFactorSettingUpdateRequest'],
    @Req() req: Request,
  ): Promise<S['TwoFactorSetting']> {
    return this.account.updateTwoFactor(auth.userId, body, this.ctx(req));
  }
}
