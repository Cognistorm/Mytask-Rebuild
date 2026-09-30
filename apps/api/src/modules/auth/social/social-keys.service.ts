// Provider switch + keys for social login (S-065…S-069, Q-155: one structured row per provider with
// `isEnabled`, `clientId` and the encrypted write-only `clientSecret`, ADR-005 §8).
import { Inject, Injectable } from '@nestjs/common';
import type { SocialProvider } from '../../../generated/prisma/client';
import { ENV, type Env } from '../../../platform/config/env';
import type { SocialProviderStored } from '../../../platform/settings/registry';
import { SecretBox } from '../../../platform/settings/secret-box';
import { SettingsService } from '../../../platform/settings/settings.service';
import type { ProviderKeys } from './providers';

const SETTING_ID = {
  google: 'S-065',
  facebook: 'S-066',
  github: 'S-067',
  linkedin: 'S-068',
  twitter: 'S-069',
} as const satisfies Record<SocialProvider, string>;

export const SOCIAL_PROVIDERS = Object.keys(SETTING_ID) as SocialProvider[];

@Injectable()
export class SocialKeysService {
  private readonly box: SecretBox;

  constructor(
    @Inject(ENV) env: Env,
    private readonly settings: SettingsService,
  ) {
    this.box = new SecretBox(env.SETTINGS_ENCRYPTION_KEY);
  }

  settingId(provider: SocialProvider): string {
    return SETTING_ID[provider];
  }

  /**
   * The provider's keys when it is switched ON with both keys saved and the secret decrypts; otherwise null
   * (FEATURE_DISABLED, spec 01 AC-37). A secret sealed with a rotated-away key counts as not set.
   */
  async get(provider: SocialProvider): Promise<ProviderKeys | null> {
    const v = (await this.settings.get(SETTING_ID[provider])) as SocialProviderStored;
    if (!v.isEnabled || !v.clientId || !v.clientSecret) return null;
    const clientSecret = this.box.open(v.clientSecret);
    return clientSecret ? { clientId: v.clientId, clientSecret } : null;
  }

  /** Providers enabled with usable keys (PublicConfig.socialProviders). */
  async enabled(): Promise<SocialProvider[]> {
    const on = await Promise.all(
      SOCIAL_PROVIDERS.map(async (p) => ((await this.get(p)) ? p : null)),
    );
    return on.filter((p): p is SocialProvider => p !== null);
  }
}
