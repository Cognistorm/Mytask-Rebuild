// Contract tag Auth, slice 01 part A. Request bodies are validated against openapi.yaml before they get here.
import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request, Response } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { COOKIE_REFRESH } from './auth.constants';
import { AllowRestricted, CurrentAuth, type AuthState, Public } from './auth.guard';
import { AuthService, type ChallengeResult, type SessionResult } from './auth.service';
import { clearSessionCookies, setDeviceCookie, setSessionCookies } from './cookies';
import { buildContext, isCookieClient, type RequestContext } from './request-context';

type S = components['schemas'];
type Req_ = Request & { cookies?: Record<string, string> };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  private ctx(req: Req_, deviceToken?: string | null): RequestContext {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent, deviceToken);
  }

  /** Web: tokens as cookies; mobile: tokens stay in the body (ADR-002 §2). */
  private deliver(res: Response, ctx: RequestContext, result: SessionResult | ChallengeResult) {
    if (!isCookieClient(ctx.client)) return;
    if (result.kind === 'session')
      setSessionCookies(res, result.tokens, result.deviceId, result.rememberMe);
    else setDeviceCookie(res, result.deviceId);
  }

  @Public()
  @Post('register')
  @HttpCode(201)
  async register(
    @Body() body: S['RegisterRequest'],
    @Req() req: Req_,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['RegisterResult']> {
    const ctx = this.ctx(req, body.deviceToken);
    const { result, session } = await this.auth.register(body, ctx);
    if (session) this.deliver(res, ctx, session);
    return result;
  }

  @Public()
  @Post('login')
  async login(
    @Body() body: S['LoginRequest'],
    @Req() req: Req_,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['AuthSession'] | S['TwoFactorChallenge']> {
    const ctx = this.ctx(req, body.deviceToken);
    const result = await this.auth.login(body, ctx);
    this.deliver(res, ctx, result);
    res.status(result.kind === 'session' ? 200 : 202);
    return result.body;
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(200)
  async verifyTwoFactor(
    @Body() body: S['TwoFactorVerifyRequest'],
    @Req() req: Req_,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['AuthSession']> {
    const ctx = this.ctx(req, body.deviceToken);
    const result = await this.auth.verifyTwoFactorLogin(body, ctx);
    this.deliver(res, ctx, result);
    return result.body;
  }

  @Public()
  @Post('2fa/resend')
  @HttpCode(202)
  resendTwoFactor(
    @Body() body: S['TwoFactorResendRequest'],
    @Req() req: Req_,
  ): Promise<S['TwoFactorChallenge']> {
    return this.auth.resendTwoFactorCode(body, this.ctx(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() body: S['SessionRefreshRequest'],
    @Req() req: Req_,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['AuthSession']> {
    const ctx = this.ctx(req);
    const raw = isCookieClient(ctx.client)
      ? req.cookies?.[COOKIE_REFRESH]
      : (body?.refreshToken ?? undefined);
    try {
      const result = await this.auth.refresh(raw, ctx);
      this.deliver(res, ctx, result);
      return result.body;
    } catch (e) {
      if (isCookieClient(ctx.client)) clearSessionCookies(res);
      throw e;
    }
  }

  @AllowRestricted()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentAuth() auth: AuthState,
    @Body() _body: S['LogoutRequest'],
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    // installationId (push token removal) arrives with spec 15 push tokens.
    await this.auth.logout(auth.sessionId);
    clearSessionCookies(res);
  }

  @Public()
  @Post('email-verification/confirm')
  @HttpCode(200)
  verifyEmail(
    @Body() body: S['EmailVerificationConfirmRequest'],
    @Req() req: Req_,
  ): Promise<S['AuthNotice']> {
    return this.auth.verifyEmail(body, this.ctx(req));
  }

  @Public()
  @Post('email-verification/resend')
  @HttpCode(202)
  resendVerification(
    @Body() body: S['EmailVerificationResendRequest'],
    @Req() req: Req_,
  ): Promise<S['AuthNotice']> {
    return this.auth.resendVerificationEmail(body, this.ctx(req));
  }

  @Public()
  @Post('password-reset')
  @HttpCode(202)
  requestReset(
    @Body() body: S['PasswordResetRequest'],
    @Req() req: Req_,
  ): Promise<S['AuthNotice']> {
    return this.auth.requestPasswordReset(body, this.ctx(req));
  }

  @Public()
  @Post('password-reset/validate')
  @HttpCode(204)
  validateReset(@Body() body: S['PasswordResetTokenCheckRequest']): Promise<void> {
    return this.auth.validatePasswordResetToken(body);
  }

  @Public()
  @Post('password-reset/complete')
  @HttpCode(200)
  completeReset(
    @Body() body: S['PasswordResetCompleteRequest'],
    @Req() req: Req_,
  ): Promise<S['AuthNotice']> {
    return this.auth.completePasswordReset(body, this.ctx(req));
  }
}
