// reCAPTCHA v3 (spec 01 AC-18, R-A10): checked on web register/login while S-061 is ON, score > 0.5.
// Mobile relies on throttling (ADR-002 §6); the mobile reCAPTCHA mechanism is a later decision.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../../platform/config/env';
import { SettingsService } from '../../platform/settings/settings.service';

const SCORE_THRESHOLD = 0.5;

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger('Recaptcha');

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly settings: SettingsService,
  ) {}

  enabled(): Promise<boolean> {
    return this.settings.get('S-061');
  }

  /** True when the token passes Google's server-side check. */
  async verify(token: string | null | undefined, ip: string): Promise<boolean> {
    if (!token) return false;
    if (!this.env.RECAPTCHA_SECRET_KEY) {
      this.logger.error('S-061 is ON but RECAPTCHA_SECRET_KEY is not set; refusing');
      return false;
    }
    try {
      const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: this.env.RECAPTCHA_SECRET_KEY,
          response: token,
          remoteip: ip,
        }),
        signal: AbortSignal.timeout(5000),
      });
      const body = (await res.json()) as { success?: boolean; score?: number };
      return body.success === true && (body.score ?? 0) > SCORE_THRESHOLD;
    } catch {
      return false;
    }
  }
}
