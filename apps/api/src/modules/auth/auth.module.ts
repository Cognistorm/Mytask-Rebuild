import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccountDeletionGuards } from './account-deletion.guards';
import { AccountSettingsService } from './account-settings.service';
import { AccountService } from './account.service';
import { AuthController } from './auth.controller';
import { AvatarReader } from './avatar.reader';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { MeController } from './me.controller';
import { PasswordService } from './password.service';
import { PresenceService } from './presence.service';
import { RecaptchaService } from './recaptcha.service';
import { ReferralService } from './referral.service';
import { SessionsService } from './sessions.service';
import { SocialAuthService } from './social/social-auth.service';
import { SocialKeysService } from './social/social-keys.service';
import { SocialAuthController } from './social/social.controller';
import { ThrottleService } from './throttle.service';
import { TokensService } from './tokens.service';
import { TwoFactorService } from './two-factor.service';

@Module({
  controllers: [AuthController, MeController, SocialAuthController],
  providers: [
    AuthService,
    AccountService,
    AccountSettingsService,
    AccountDeletionGuards,
    AvatarReader,
    PasswordService,
    PresenceService,
    RecaptchaService,
    ReferralService,
    SessionsService,
    ThrottleService,
    TokensService,
    TwoFactorService,
    SocialAuthService,
    SocialKeysService,
    // Deny by default: every route needs a session unless marked @Public (ADR-010 style).
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [
    AccountService,
    AccountDeletionGuards,
    AvatarReader,
    PresenceService,
    SessionsService,
    PasswordService,
    RecaptchaService,
    ThrottleService,
    TwoFactorService,
    ReferralService,
    SocialKeysService,
  ],
})
export class AuthModule {}
