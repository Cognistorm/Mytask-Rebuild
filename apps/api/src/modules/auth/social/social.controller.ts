// Contract: startSocialLogin, completeSocialLogin (slice 01 part B-2c; ADR-002 §7).
import { Body, Controller, Param, Post, Req, Res } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request, Response } from 'express';
import type { SocialProvider } from '../../../generated/prisma/client';
import { ClientIpResolver } from '../../../platform/client-ip/client-ip.resolver';
import { COOKIE_OAUTH } from '../auth.constants';
import { Public } from '../auth.guard';
import { setDeviceCookie, setSessionCookies } from '../cookies';
import { buildContext, isCookieClient } from '../request-context';
import { SocialAuthService, STATE_SECONDS } from './social-auth.service';

type S = components['schemas'];
type Req_ = Request & { cookies?: Record<string, string> };

const oauthCookie = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' };

@Controller('auth/social')
export class SocialAuthController {
  constructor(
    private readonly social: SocialAuthService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  private ctx(req: Req_, deviceToken?: string | null) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent, deviceToken);
  }

  @Public()
  @Post(':provider/authorize')
  async start(
    @Param('provider') provider: SocialProvider,
    @Body() body: S['SocialAuthorizeRequest'],
    @Req() req: Req_,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['SocialAuthorization']> {
    const { body: out, nonce } = await this.social.start(provider, body, this.ctx(req));
    if (nonce) res.cookie(COOKIE_OAUTH, nonce, { ...oauthCookie, maxAge: STATE_SECONDS * 1000 });
    res.status(200);
    return out;
  }

  @Public()
  @Post(':provider/callback')
  async complete(
    @Param('provider') provider: SocialProvider,
    @Body() body: S['SocialCallbackRequest'],
    @Req() req: Req_,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['AuthSession'] | S['TwoFactorChallenge']> {
    const ctx = this.ctx(req, body.deviceToken);
    const nonce = req.cookies?.[COOKIE_OAUTH];
    // The binding cookie is single-use: cleared whatever the outcome.
    res.clearCookie(COOKIE_OAUTH, oauthCookie);
    const result = await this.social.complete(provider, body, nonce, ctx);
    if (isCookieClient(ctx.client)) {
      if (result.kind === 'session') {
        setSessionCookies(res, result.tokens, result.deviceId, result.rememberMe);
      } else setDeviceCookie(res, result.deviceId);
    }
    res.status(result.kind === 'session' ? 200 : 202);
    return result.body;
  }
}
