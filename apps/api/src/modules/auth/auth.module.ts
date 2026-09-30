import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccountService } from './account.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { MeController } from './me.controller';
import { PasswordService } from './password.service';
import { RecaptchaService } from './recaptcha.service';
import { ReferralService } from './referral.service';
import { SessionsService } from './sessions.service';
import { ThrottleService } from './throttle.service';
import { TokensService } from './tokens.service';
import { TwoFactorService } from './two-factor.service';

@Module({
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    AccountService,
    PasswordService,
    RecaptchaService,
    ReferralService,
    SessionsService,
    ThrottleService,
    TokensService,
    TwoFactorService,
    // Deny by default: every route needs a session unless marked @Public (ADR-010 style).
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [SessionsService, PasswordService],
})
export class AuthModule {}
