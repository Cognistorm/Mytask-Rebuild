// Settings register, read side (ADR-005, spec 00 §4, data-model §3.K). The registry below lists the rows
// slice 01 reads, with their approved defaults (spec 00 register, production values). A row in the
// `settings` table overrides the default. Editing, versions and audit are the admin panel (slice 16).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

export const settingsRegistry = {
  'S-052': { key: 'auth.email_verification.required', default: false },
  'S-053': { key: 'auth.email_verification.method', default: 'admin' as 'email' | 'admin' },
  'S-054': { key: 'auth.email_verification.link_expiry_minutes', default: 60 },
  'S-055': { key: 'auth.password_reset.link_expiry_minutes', default: 60 },
  'S-056': { key: 'auth.two_factor.enabled', default: true },
  'S-057': { key: 'auth.two_factor.code_ttl_minutes', default: 10 },
  'S-058': { key: 'auth.two_factor.max_attempts', default: 5 },
  'S-059': { key: 'auth.two_factor.trusted_device_days', default: 30 },
  'S-061': { key: 'auth.recaptcha.enabled', default: false },
  'S-062': { key: 'auth.login_throttle.max_attempts', default: 5 },
  'S-063': { key: 'auth.login_throttle.lock_minutes', default: 15 },
  'S-100': { key: 'notifications.admin_recipients', default: ['ir.gvazava@gmail.com'] },
  'S-124': {
    key: 'auth.two_factor.trigger',
    default: 'new_device' as 'new_device' | 'new_device_or_ip',
  },
} as const;

export type SettingId = keyof typeof settingsRegistry;
type Widen<T> = T extends boolean ? boolean : T extends number ? number : T;
export type SettingValue<Id extends SettingId> = Widen<(typeof settingsRegistry)[Id]['default']>;

/** Short in-process cache; admin changes apply within this time (spec 01 AC-17: "no deployment"). */
const CACHE_MS = 5_000;

@Injectable()
export class SettingsService {
  private cache = new Map<string, { value: unknown; at: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async get<Id extends SettingId>(id: Id): Promise<SettingValue<Id>> {
    const hit = this.cache.get(id);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as SettingValue<Id>;
    const row = await this.prisma.setting.findUnique({ where: { registerId: id } });
    const value = (row?.value ?? settingsRegistry[id].default) as SettingValue<Id>;
    this.cache.set(id, { value, at: Date.now() });
    return value;
  }

  /** Tests and the future admin write path. */
  invalidate(): void {
    this.cache.clear();
  }
}
