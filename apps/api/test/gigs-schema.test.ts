// Spec 04 data model (ROADMAP 4.3.2b, data-model §3.D, §3.S, ADR-012, ADR-024): staff removal / restore columns
// and checks on `gigs`, upgrades, FAQs, gallery images and documents (deferred position key), favourites, and
// the analytics tables (monthly-partitioned raw events, daily aggregates with the expression key).
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/platform/db/prisma.service';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
let seq = 0;
const tag = Date.now().toString(36);
const next = () => {
  seq += 1;
  return `${tag}${seq}`;
};

async function user() {
  const n = next();
  return prisma.user.create({
    data: {
      username: `gs_${n}`,
      email: `gs${n}@example.com`,
      referralCode: `GS${n.slice(-6).toUpperCase().padStart(6, '0')}`,
      profile: { create: { fullname: 'Gigs Schema' } },
    },
  });
}

async function file(ownerUserId: string, purpose: 'gig_thumbnail' | 'gig_image' | 'gig_document') {
  return prisma.file.create({
    data: {
      purpose,
      ownerUserId,
      bucket: 'public_media',
      objectKey: `test/${ownerUserId}/${next()}`,
      originalName: purpose === 'gig_document' ? 'a.pdf' : 'a.jpg',
      declaredType: purpose === 'gig_document' ? 'application/pdf' : 'image/jpeg',
      sizeBytes: 1000n,
      status: 'ready',
    },
  });
}

async function gig(overrides: Record<string, unknown> = {}) {
  const u = await user();
  const cat = (parentId: string | null) =>
    prisma.gigCategory.create({
      data: {
        parentId,
        depth: 1,
        slug: `t-${next()}`,
        translations: { create: [{ locale: 'ka', name: 'კატეგორია' }] },
      },
    });
  const top = await cat(null);
  const sub = await cat(top.id);
  const child = await cat(sub.id);
  const thumb = await file(u.id, 'gig_thumbnail');
  return prisma.gig.create({
    data: {
      uid: `G${next()}`.toUpperCase().slice(0, 20),
      slug: `logo-${next()}`,
      ownerId: u.id,
      categoryId: top.id,
      subcategoryId: sub.id,
      childcategoryId: child.id,
      priceTetri: 5000n,
      deliveryDays: 3,
      revisionsAllowed: 1,
      thumbnailFileId: thumb.id,
      ...overrides,
    },
  });
}

async function staff() {
  const n = next();
  return prisma.staff.create({
    data: { username: `st_${n}`, fullName: 'Staff', email: `st${n}@example.com` },
  });
}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app?.close();
});

describe('gigs: removal and restore columns (ADR-024)', () => {
  it('ties status deleted, deleted_at and deleted_by together', async () => {
    const g = await gig();
    const now = new Date();
    for (const bad of [
      { status: 'deleted' as const, deletedAt: now },
      { status: 'deleted' as const, deletedBy: 'owner' as const },
      { deletedAt: now, deletedBy: 'owner' as const },
      { deletedBy: 'staff' as const },
    ]) {
      await expect(prisma.gig.update({ where: { id: g.id }, data: bad })).rejects.toThrow();
    }
    const removed = await prisma.gig.update({
      where: { id: g.id },
      data: { status: 'deleted', deletedAt: now, deletedBy: 'owner' },
    });
    expect(removed.deletedBy).toBe('owner');
  });

  it('keeps staff id and reason for staff removals only, and clears them on restore', async () => {
    const s = await staff();
    const g = await gig({ status: 'active', publishedAt: new Date() });
    await expect(
      prisma.gig.update({
        where: { id: g.id },
        data: {
          status: 'deleted',
          deletedAt: new Date(),
          deletedBy: 'owner',
          removalReason: 'spam',
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.gig.update({ where: { id: g.id }, data: { removalReason: 'spam' } }),
    ).rejects.toThrow();
    await prisma.gig.update({
      where: { id: g.id },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
        deletedBy: 'staff',
        deletedByStaffId: s.id,
        removalReason: 'Copied images',
      },
    });
    // A migrated staff removal has no staff id and no reason.
    await gig({
      status: 'deleted',
      deletedAt: new Date(),
      deletedBy: 'staff',
      legacyId: BigInt(Date.now()),
    });
    const restored = await prisma.gig.update({
      where: { id: g.id },
      data: {
        status: 'active',
        deletedAt: null,
        deletedBy: null,
        deletedByStaffId: null,
        removalReason: null,
      },
    });
    expect(restored.publishedAt).not.toBeNull();
  });

  it('refuses an unknown staff id', async () => {
    const g = await gig();
    await expect(
      prisma.gig.update({
        where: { id: g.id },
        data: {
          status: 'deleted',
          deletedAt: new Date(),
          deletedBy: 'staff',
          deletedByStaffId: '00000000-0000-7000-8000-000000000000',
        },
      }),
    ).rejects.toThrow();
  });

  it('stores submitted_at for the moderation queue', async () => {
    const at = new Date('2026-10-07T10:00:00Z');
    const g = await gig({ submittedAt: at });
    expect((await prisma.gig.findUniqueOrThrow({ where: { id: g.id } })).submittedAt).toEqual(at);
  });
});

describe('gig upgrades and FAQs (R-G9)', () => {
  it('checks the upgrade price, extra days and position, and keeps removed upgrades', async () => {
    const g = await gig();
    for (const bad of [{ priceTetri: 99n }, { extraDays: 8 }, { position: -1 }]) {
      await expect(
        prisma.gigUpgrade.create({
          data: {
            gigId: g.id,
            title: 'Extra',
            priceTetri: 1000n,
            extraDays: 0,
            position: 0,
            ...bad,
          },
        }),
      ).rejects.toThrow();
    }
    const up = await prisma.gigUpgrade.create({
      data: { gigId: g.id, title: 'Source file', priceTetri: 100n, extraDays: 2, position: 0 },
    });
    await prisma.gigUpgrade.update({ where: { id: up.id }, data: { deletedAt: new Date() } });
    expect(await prisma.gigUpgrade.count({ where: { gigId: g.id } })).toBe(1);
  });

  it('limits FAQ question and answer lengths', async () => {
    const g = await gig();
    await expect(
      prisma.gigFaq.create({
        data: { gigId: g.id, question: 'q'.repeat(101), answer: 'a', position: 0 },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.gigFaq.create({
        data: { gigId: g.id, question: 'q', answer: 'a'.repeat(301), position: 0 },
      }),
    ).rejects.toThrow();
    await prisma.gigFaq.create({
      data: { gigId: g.id, question: 'q'.repeat(100), answer: 'a'.repeat(300), position: 0 },
    });
  });
});

describe('gig images and documents (P-34, R-G11)', () => {
  it('allows one position per gig, checked at commit so a reorder can swap positions', async () => {
    const g = await gig();
    const [a, b] = [await file(g.ownerId, 'gig_image'), await file(g.ownerId, 'gig_image')];
    await prisma.gigImage.createMany({
      data: [
        { gigId: g.id, fileId: a.id, position: 0 },
        { gigId: g.id, fileId: b.id, position: 1 },
      ],
    });
    await expect(
      prisma.gigImage.update({
        where: { gigId_fileId: { gigId: g.id, fileId: b.id } },
        data: { position: 0 },
      }),
    ).rejects.toThrow();
    await prisma.$transaction([
      prisma.gigImage.update({
        where: { gigId_fileId: { gigId: g.id, fileId: a.id } },
        data: { position: 1 },
      }),
      prisma.gigImage.update({
        where: { gigId_fileId: { gigId: g.id, fileId: b.id } },
        data: { position: 0 },
      }),
    ]);
    const order = await prisma.gigImage.findMany({
      where: { gigId: g.id },
      orderBy: { position: 'asc' },
    });
    expect(order.map((i) => i.fileId)).toEqual([b.id, a.id]);
  });

  it('refuses unknown files and duplicate document positions; deleting the gig row cascades', async () => {
    const g = await gig();
    await expect(
      prisma.gigDocument.create({
        data: { gigId: g.id, fileId: '00000000-0000-7000-8000-000000000000', position: 0 },
      }),
    ).rejects.toThrow();
    const [d1, d2] = [await file(g.ownerId, 'gig_document'), await file(g.ownerId, 'gig_document')];
    await prisma.gigDocument.create({ data: { gigId: g.id, fileId: d1.id, position: 0 } });
    await expect(
      prisma.gigDocument.create({ data: { gigId: g.id, fileId: d2.id, position: 0 } }),
    ).rejects.toThrow();
    await prisma.gig.delete({ where: { id: g.id } });
    expect(await prisma.gigDocument.count({ where: { gigId: g.id } })).toBe(0);
  });
});

describe('favorites (AC-35, AC-36)', () => {
  it('saves a gig once per user, newest first', async () => {
    const u = await user();
    const [g1, g2] = [await gig(), await gig()];
    await prisma.favorite.create({
      data: { userId: u.id, gigId: g1.id, createdAt: new Date('2026-10-01') },
    });
    await prisma.favorite.create({
      data: { userId: u.id, gigId: g2.id, createdAt: new Date('2026-10-02') },
    });
    await expect(
      prisma.favorite.create({ data: { userId: u.id, gigId: g1.id } }),
    ).rejects.toThrow();
    const list = await prisma.favorite.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(list.map((f) => f.gigId)).toEqual([g2.id, g1.id]);
  });
});

describe('analytics (§3.S, ADR-012)', () => {
  it('stores raw events in the partitioned table (default partition) and checks the platform', async () => {
    const g = await gig();
    const e = await prisma.analyticsEvent.create({
      data: {
        eventType: 'gig_view',
        platform: 'web',
        entityType: 'gig',
        entityId: g.id,
        countryCode: 'GE',
        city: 'Tbilisi',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        referrerDomain: 'google.com',
      },
    });
    expect(e.id).toBeGreaterThan(0n);
    await expect(
      prisma.analyticsEvent.create({ data: { eventType: 'gig_view', platform: 'tv' } }),
    ).rejects.toThrow();
    const parts = await prisma.$queryRaw<{ relname: string }[]>`
      SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent WHERE p.relname = 'analytics_events'`;
    expect(parts.map((p) => p.relname)).toContain('analytics_events_default');
  });

  it('keeps one daily row per key, with a null entity counted as one key', async () => {
    const day = new Date('2026-10-07');
    const g = await gig();
    const base = { day, metric: `gig_view_${next()}`, dimension: 'country', dimensionValue: 'GE' };
    await prisma.analyticsDaily.create({ data: { ...base, count: 1n } });
    await expect(prisma.analyticsDaily.create({ data: { ...base, count: 1n } })).rejects.toThrow();
    await prisma.analyticsDaily.create({
      data: { ...base, entityType: 'gig', entityId: g.id, count: 2n },
    });
    await expect(
      prisma.analyticsDaily.create({ data: { ...base, entityType: 'gig', entityId: g.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.analyticsDaily.create({ data: { ...base, dimensionValue: 'DE', count: -1n } }),
    ).rejects.toThrow();
    // The upsert the aggregation job will use.
    await prisma.$executeRaw`
      INSERT INTO "analytics_daily" ("day", "metric", "dimension", "dimension_value", "entity_type", "entity_id", "count")
      VALUES (${day}::date, ${base.metric}, 'country', 'GE', 'gig', ${g.id}::uuid, 3)
      ON CONFLICT ("day", "metric", "dimension", "dimension_value", "entity_type",
        COALESCE("entity_id", '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET "count" = "analytics_daily"."count" + EXCLUDED."count"`;
    const row = await prisma.analyticsDaily.findFirstOrThrow({
      where: { metric: base.metric, entityId: g.id },
    });
    expect(row.count).toBe(5n);
  });
});
