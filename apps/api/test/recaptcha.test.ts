// SEC-47: a reCAPTCHA token counts only for the action and the host it was minted for.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/platform/config/env';
import type { SettingsService } from '../src/platform/settings/settings.service';
import { RecaptchaService } from '../src/modules/auth/recaptcha.service';

const env = {
  RECAPTCHA_SECRET_KEY: 'secret',
  APP_URL: 'https://mytask.ge',
  ADMIN_URL: 'https://admin.mytask.ge',
} as Env;
const service = new RecaptchaService(env, {} as SettingsService);

function google(answer: object) {
  vi.stubGlobal('fetch', async () => ({ json: async () => answer }));
}

afterEach(() => vi.unstubAllGlobals());

describe('RecaptchaService.verify (SEC-47)', () => {
  const ok = { success: true, score: 0.9, action: 'login', hostname: 'mytask.ge' };

  it('accepts a good token for the same action on the site host', async () => {
    google(ok);
    expect(await service.verify('t', '1.1.1.1', 'login')).toBe(true);
  });

  it('refuses a token minted for another action', async () => {
    google({ ...ok, action: 'register' });
    expect(await service.verify('t', '1.1.1.1', 'login')).toBe(false);
  });

  it('refuses a token minted on another host', async () => {
    google({ ...ok, hostname: 'evil.example' });
    expect(await service.verify('t', '1.1.1.1', 'login')).toBe(false);
  });

  it('the staff login needs the admin host', async () => {
    google({ ...ok, action: 'staff_login' });
    expect(await service.verify('t', '1.1.1.1', 'staff_login')).toBe(false);
    google({ ...ok, action: 'staff_login', hostname: 'admin.mytask.ge' });
    expect(await service.verify('t', '1.1.1.1', 'staff_login')).toBe(true);
  });

  it('keeps the score rule and refuses a missing token', async () => {
    google({ ...ok, score: 0.5 });
    expect(await service.verify('t', '1.1.1.1', 'login')).toBe(false);
    expect(await service.verify(null, '1.1.1.1', 'login')).toBe(false);
  });
});
