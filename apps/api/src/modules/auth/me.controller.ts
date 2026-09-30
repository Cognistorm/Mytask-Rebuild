// Contract: getMe, changeMyPassword, listMySessions, revokeMyOtherSessions, updateMyTwoFactor (slice 01 part A).
import { Body, Controller, Get, HttpCode, Post, Put, Req } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { AccountService } from './account.service';
import { AllowRestricted, CurrentAuth, type AuthState } from './auth.guard';
import { buildContext } from './request-context';

type S = components['schemas'];

@Controller('me')
export class MeController {
  constructor(
    private readonly account: AccountService,
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

  @Put('two-factor')
  updateTwoFactor(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['TwoFactorSettingUpdateRequest'],
    @Req() req: Request,
  ): Promise<S['TwoFactorSetting']> {
    return this.account.updateTwoFactor(auth.userId, body, this.ctx(req));
  }
}
