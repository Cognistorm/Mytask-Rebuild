// Settings register, read side (ADR-005, spec 00 §4, data-model §3.K). The registry below lists the rows
// slice 01 reads, with their approved defaults (spec 00 register, production values). A row in the
// `settings` table overrides the default. Editing, versions and audit are the admin panel (slice 16).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

import { settingsRegistry, type SettingId } from './registry';

export { settingsRegistry, type SettingId };
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
    const value = (row ? row.value : settingsRegistry[id].default) as SettingValue<Id>;
    this.cache.set(id, { value, at: Date.now() });
    return value;
  }

  /** Tests and the future admin write path. */
  invalidate(): void {
    this.cache.clear();
  }
}
