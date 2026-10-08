// Local IP → country and city (ADR-012 §2, Q-055): a city database file in MMDB format on this server, read into
// memory on the first lookup. DB-IP "IP to City Lite" (CC BY 4.0, no key; the analytics screens must credit
// DB-IP) or MaxMind GeoLite2 City; both share the MMDB layout read here. The IP never leaves the process: there
// is no third-party lookup. Without the file (GEOIP_CITY_DB_PATH unset, missing or unreadable) every answer is
// null, so local development and tests need no download. The weekly file update is a Phase 6 job (devops).
import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import maxmind, { type CityResponse, type Reader } from 'maxmind';
import { ENV, type Env } from '../config/env';

export interface GeoPlace {
  /** ISO 3166-1 alpha-2, upper case. */
  countryCode: string | null;
  /** English city name. */
  city: string | null;
}

@Injectable()
export class GeoIp {
  private readonly logger = new Logger('GeoIp');
  private reader: Promise<Reader<CityResponse> | null> | undefined;

  constructor(@Inject(ENV) private readonly env: Env) {}

  /** The place of `ip`, or null without a database or when the address is unknown (private ranges, typos). */
  async lookup(ip: string): Promise<GeoPlace | null> {
    const reader = await this.open();
    if (!reader) return null;
    let found: CityResponse | null;
    try {
      found = reader.get(ip);
    } catch {
      return null; // not an IP address
    }
    const countryCode = found?.country?.iso_code?.toUpperCase().slice(0, 2) ?? null;
    const city = found?.city?.names?.en?.slice(0, 100) ?? null;
    return countryCode || city ? { countryCode, city } : null;
  }

  private open(): Promise<Reader<CityResponse> | null> {
    this.reader ??= (async () => {
      const path = this.env.GEOIP_CITY_DB_PATH;
      if (!path) return null;
      try {
        return await maxmind.open<CityResponse>(path, { watchForUpdates: false });
      } catch (err) {
        this.logger.warn({ err, path }, 'GeoIP database not readable; country and city stay empty');
        return null;
      }
    })();
    return this.reader;
  }
}

@Global()
@Module({ providers: [GeoIp], exports: [GeoIp] })
export class GeoIpModule {}
