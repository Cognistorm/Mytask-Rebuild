// recordGigView (ROADMAP 4.3.5b; spec 04 AC-34, Q-055, ADR-012). The request only checks that the caller may see
// the gig (as getGig, else 404) and answers 202; the visit is recorded right after, off the request path.
//
// Not counted: the owner's own views and bots (`isbot`; a request without a user agent counts as a bot).
// Counted once per visitor per Tbilisi day and gig (Owner Q-182, 2026-10-07; legacy counted once per IP + browser
// ever, `Jobs/Main/Service/Track.php`, which needs the stored IP that Q-055 forbids). The visitor is a daily-salted
// HMAC of the IP (IPv6 by its /64) and the user agent: the salt lives in Redis for two days only, so hashes cannot
// be linked across days and the IP is never stored or sent anywhere. Country and city come from the local GeoIP
// file (null without it).
//
// A counted visit writes, in one transaction: one `analytics_events` row (`gig_view`), `gigs.visits_count` + 1
// (the "Most popular" sort and "Total clicks") and the `analytics_daily` rows of metric `gig_view` that
// getGigAnalytics (4.3.5c) reads: dimension `total`, plus `device`, `browser`, `os` (`unknown` when not detected)
// and `referrer`, `country`, `city` (left out when not known, as legacy listed only known values).
import { createHmac, randomBytes } from 'node:crypto';
import { type BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import type { Locale } from '@mytask/types';
import { isbot } from 'isbot';
import { UAParser } from 'ua-parser-js';
import { Prisma, type ClientKind } from '../../generated/prisma/client';
import { ipBucket } from '../../platform/client-ip/client-ip.resolver';
import { PrismaService } from '../../platform/db/prisma.service';
import { GeoIp } from '../../platform/geoip/geoip';
import { RedisService } from '../../platform/redis/redis.module';
import { tbilisiDay } from '../catalog/list-rules';
import { GigPages } from './gig-pages.service';

const METRIC = 'gig_view';
const SALT_TTL_SECONDS = 2 * 24 * 3600;
/** A little over a day, so the "already counted today" mark outlives the Tbilisi day it belongs to. */
const SEEN_TTL_SECONDS = 26 * 3600;
const PATH_TEMPLATE = '/service/{slug}';

export interface GigViewInput {
  gigId: string;
  viewerId: string | null;
  ip: string;
  userAgent: string | undefined;
  client: ClientKind;
  locale: Locale;
  /** `document.referrer` of the web page (only its domain is kept); null from the app. */
  referrer: string | null;
}

export interface VisitFacts {
  deviceType: string;
  browser: string;
  os: string;
  referrerDomain: string | null;
}

/** Device type, browser and OS names as legacy listed them (names without versions) and the referrer's domain. */
export function visitFacts(
  userAgent: string,
  client: ClientKind,
  referrer: string | null,
): VisitFacts {
  const ua = new UAParser(userAgent).getResult();
  const app = client === 'ios' || client === 'android';
  // ua-parser-js leaves the type empty for desktop browsers; the app's own user agent may not say "mobile".
  const deviceType = ua.device.type ?? (app ? 'mobile' : 'desktop');
  const os =
    ua.os.name ?? (client === 'ios' ? 'iOS' : client === 'android' ? 'Android' : 'unknown');
  let referrerDomain: string | null = null;
  if (referrer) {
    try {
      referrerDomain = new URL(referrer).hostname.toLowerCase().slice(0, 255) || null;
    } catch {
      referrerDomain = null;
    }
  }
  return {
    deviceType: deviceType.slice(0, 20),
    browser: (ua.browser.name ?? 'unknown').slice(0, 40),
    os: os.slice(0, 40),
    referrerDomain,
  };
}

@Injectable()
export class GigViews implements BeforeApplicationShutdown {
  private readonly logger = new Logger('GigViews');
  private readonly running = new Set<Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly geo: GeoIp,
    private readonly pages: GigPages,
  ) {}

  /** The request part: 404 unless the caller may see the gig; the recording itself runs after the answer. */
  async accept(input: GigViewInput): Promise<void> {
    const { ownerId } = await this.pages.visible(input.gigId, input.viewerId);
    if (ownerId === input.viewerId) return;
    const { userAgent } = input;
    if (!userAgent || isbot(userAgent)) return;
    const job: Promise<unknown> = this.record({ ...input, userAgent })
      .catch((err: unknown) =>
        this.logger.error({ err, gigId: input.gigId }, 'gig view not recorded'),
      )
      .finally(() => this.running.delete(job));
    this.running.add(job);
  }

  /** Waits for the recordings still running (tests, graceful shutdown). */
  async idle(): Promise<void> {
    await Promise.all([...this.running]);
  }

  async beforeApplicationShutdown(): Promise<void> {
    await this.idle();
  }

  /** Records one visit; false when this visitor was already counted for the gig on that Tbilisi day. */
  async record(input: GigViewInput & { userAgent: string }, now = new Date()): Promise<boolean> {
    const day = tbilisiDay(now);
    const visitor = createHmac('sha256', await this.salt(day))
      .update(`${ipBucket(input.ip)}\n${input.userAgent}`)
      .digest();
    const first = await this.redis.client.set(
      `analytics:gig_view:${input.gigId}:${day}:${visitor.toString('hex')}`,
      '1',
      'EX',
      SEEN_TTL_SECONDS,
      'NX',
    );
    if (first !== 'OK') return false;

    const facts = visitFacts(input.userAgent, input.client, input.referrer);
    const place = await this.geo.lookup(input.ip);
    const buckets: [string, string | null][] = [
      ['total', ''],
      ['device', facts.deviceType],
      ['browser', facts.browser],
      ['os', facts.os],
      ['referrer', facts.referrerDomain],
      ['country', place?.countryCode ?? null],
      ['city', place?.city ?? null],
    ];
    const rows = buckets.flatMap(([dimension, value]) =>
      value === null
        ? []
        : [
            Prisma.sql`(${day}::date, ${METRIC}, ${dimension}, ${value}, 'gig', ${input.gigId}::uuid, 1, 1)`,
          ],
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.analyticsEvent.create({
        data: {
          occurredAt: now,
          eventType: METRIC,
          platform: input.client === 'admin' ? 'web' : input.client,
          pathTemplate: PATH_TEMPLATE,
          locale: input.locale,
          entityType: 'gig',
          entityId: input.gigId,
          userId: input.viewerId,
          visitorHash: visitor,
          countryCode: place?.countryCode ?? null,
          city: place?.city ?? null,
          deviceType: facts.deviceType,
          os: facts.os,
          browser: facts.browser,
          referrerDomain: facts.referrerDomain,
        },
      });
      // Raw SQL: a Prisma update would also move the gig's `updated_at`, which the page shows.
      await tx.$executeRaw`UPDATE "gigs" SET "visits_count" = "visits_count" + 1 WHERE "id" = ${input.gigId}::uuid`;
      await tx.$executeRaw`
        INSERT INTO "analytics_daily"
          ("day", "metric", "dimension", "dimension_value", "entity_type", "entity_id", "count", "uniques")
        VALUES ${Prisma.join(rows)}
        ON CONFLICT ("day", "metric", "dimension", "dimension_value", "entity_type",
          (COALESCE("entity_id", '00000000-0000-0000-0000-000000000000'::uuid)))
        DO UPDATE SET "count" = "analytics_daily"."count" + 1, "uniques" = "analytics_daily"."uniques" + 1`;
    });
    return true;
  }

  /** The salt of a Tbilisi day: random, created by the first visit of the day, gone from Redis after two days. */
  private async salt(day: string): Promise<string> {
    const key = `analytics:salt:${day}`;
    await this.redis.client.set(
      key,
      randomBytes(32).toString('base64'),
      'EX',
      SALT_TTL_SECONDS,
      'NX',
    );
    const salt = await this.redis.client.get(key);
    if (!salt) throw new Error(`analytics salt ${day} missing`);
    return salt;
  }
}
