// Contract: adminLogin, adminVerifyTwoFactor, adminResendTwoFactorCode, adminRefreshSession, adminLogout,
// adminReauthenticate, adminGetMe, adminListSettings, adminGetSetting, adminUpdateSetting (slice 01 part B).
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request, Response } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import {
  ACCESS_TOKEN_SECONDS,
  COOKIE_STAFF_ACCESS,
  COOKIE_STAFF_DEVICE,
  COOKIE_STAFF_REFRESH,
  DEVICE_COOKIE_DAYS,
  STAFF_REFRESH_COOKIE_PATH,
} from '../auth/auth.constants';
import { CurrentStaff, Public, StaffRoute, type StaffAuthState } from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { AdminSettingsService } from './admin-settings.service';
import {
  StaffAuthService,
  type StaffChallengeResult,
  type StaffSessionResult,
} from './staff-auth.service';

type S = components['schemas'];
type Req_ = Request & { cookies?: Record<string, string> };
const base = { httpOnly: true, secure: true, sameSite: 'lax' as const };

/** Host-only staff cookies on the admin origin (ADR-002 §2). */
function deliver(res: Response, result: StaffSessionResult | StaffChallengeResult) {
  if (result.deviceId) {
    res.cookie(COOKIE_STAFF_DEVICE, result.deviceId, {
      ...base,
      path: '/',
      maxAge: DEVICE_COOKIE_DAYS * 86_400_000,
    });
  }
  if (result.kind !== 'session') return;
  res.cookie(COOKIE_STAFF_ACCESS, result.tokens.accessToken, {
    ...base,
    path: '/',
    maxAge: ACCESS_TOKEN_SECONDS * 1000,
  });
  res.cookie(COOKIE_STAFF_REFRESH, result.tokens.refreshToken, {
    ...base,
    path: STAFF_REFRESH_COOKIE_PATH,
    expires: result.tokens.refreshTokenExpiresAt,
  });
}

function clear(res: Response) {
  res.clearCookie(COOKIE_STAFF_ACCESS, { ...base, path: '/' });
  res.clearCookie(COOKIE_STAFF_REFRESH, { ...base, path: STAFF_REFRESH_COOKIE_PATH });
}

abstract class WithContext {
  constructor(protected readonly ipResolver: ClientIpResolver) {}
  protected ctx(req: Req_) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    const ctx = buildContext(req, ip, userAgent);
    // Staff devices use their own cookie on the admin host.
    const did = req.cookies?.[COOKIE_STAFF_DEVICE];
    return { ...ctx, deviceId: did && did.length >= 16 && did.length <= 200 ? did : undefined };
  }
}

@Controller('admin/auth')
export class StaffAuthController extends WithContext {
  constructor(
    private readonly auth: StaffAuthService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  @Public()
  @Post('login')
  async login(
    @Body() body: S['AdminAuthLoginRequest'],
    @Req() req: Req_,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['AdminAuthSession'] | S['AdminAuthTwoFactorChallenge']> {
    const result = await this.auth.login(body, this.ctx(req));
    deliver(res, result);
    res.status(result.kind === 'session' ? 200 : 202);
    return result.body;
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(200)
  async verify(
    @Body() body: S['AdminAuthTwoFactorVerifyRequest'],
    @Req() req: Req_,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['AdminAuthSession']> {
    const result = await this.auth.verifyTwoFactor(body, this.ctx(req));
    deliver(res, result);
    return result.body;
  }

  @Public()
  @Post('2fa/resend')
  @HttpCode(202)
  resend(@Body() body: S['AdminAuthTwoFactorResendRequest'], @Req() req: Req_) {
    return this.auth.resend(body, this.ctx(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() body: S['AdminAuthRefreshRequest'],
    @Req() req: Req_,
    @Res({ passthrough: true }) res: Response,
  ): Promise<S['AdminAuthSession']> {
    const raw = req.cookies?.[COOKIE_STAFF_REFRESH] ?? body?.refreshToken ?? undefined;
    try {
      const result = await this.auth.refresh(raw, this.ctx(req));
      deliver(res, result);
      return result.body;
    } catch (e) {
      clear(res);
      throw e;
    }
  }

  @StaffRoute()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Req_,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(staff.staffId, staff.sessionId, this.ctx(req));
    clear(res);
  }

  @StaffRoute()
  @Post('reauth/code')
  @HttpCode(202)
  reauthCode(@CurrentStaff() staff: StaffAuthState, @Req() req: Req_) {
    return this.auth.requestReauthCode(staff.staffId, this.ctx(req));
  }

  @StaffRoute()
  @Post('reauth')
  @HttpCode(200)
  reauth(
    @CurrentStaff() staff: StaffAuthState,
    @Body() body: S['AdminAuthReauthRequest'],
    @Req() req: Req_,
  ): Promise<S['AdminAuthReauthResult']> {
    return this.auth.reauthenticate(staff.staffId, staff.sessionId, body, this.ctx(req));
  }
}

@Controller('admin/me')
export class AdminMeController {
  constructor(private readonly auth: StaffAuthService) {}

  @StaffRoute()
  @Get()
  me(@CurrentStaff() staff: StaffAuthState): Promise<S['AdminMe']> {
    return this.auth.me(staff.staffId, staff.sessionId);
  }
}

@Controller('admin/settings')
export class AdminSettingsController extends WithContext {
  constructor(
    private readonly settings: AdminSettingsService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  @StaffRoute('settings.read')
  @Get()
  list(@Query('area') area?: string, @Query('q') q?: string): Promise<S['SettingList']> {
    return this.settings.list(area, q);
  }

  @StaffRoute('settings.read')
  @Get(':key')
  get(@Param('key') key: string): Promise<S['SettingEntry']> {
    return this.settings.get(key);
  }

  /** The area's write permission is checked in the service (one permission per row, spec 16). */
  @StaffRoute()
  @Patch(':key')
  update(
    @Param('key') key: string,
    @Body() body: S['SettingUpdateRequest'],
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Req_,
  ): Promise<S['SettingEntry']> {
    return this.settings.update(key, body, staff, this.ctx(req));
  }
}
