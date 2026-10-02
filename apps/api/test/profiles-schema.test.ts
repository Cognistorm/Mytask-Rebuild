// Spec 02 data model (ROADMAP 4.1.7, data-model §3.B): the constraints the migration adds in SQL — country
// reference rows, case-insensitive skill/language names, one active KYC verification, the portfolio
// rejection pair, report uniqueness and decision notes.
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/platform/db/prisma.service';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
let seq = 0;

async function user() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  return prisma.user.create({
    data: {
      username: `ps_${n}`,
      email: `ps${n}@example.com`,
      referralCode: `PS${n.slice(-6).toUpperCase().padStart(6, '0')}`,
      profile: { create: { fullname: 'Profile Schema' } },
    },
  });
}

async function file(ownerUserId: string, purpose: 'portfolio_image' | 'kyc_document') {
  return prisma.file.create({
    data: {
      purpose,
      ownerUserId,
      bucket: purpose === 'kyc_document' ? 'kyc' : 'public_media',
      objectKey: `test/${ownerUserId}/${Math.random().toString(36).slice(2)}`,
      originalName: 'a.jpg',
      declaredType: 'image/jpeg',
      sizeBytes: 1000n,
      status: 'ready',
    },
  });
}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app?.close();
});

describe('countries (legacy reference rows)', () => {
  it('has the 243 legacy countries with Georgian and English names and legacy ids', async () => {
    expect(await prisma.country.count()).toBe(243);
    const ge = await prisma.country.findUniqueOrThrow({ where: { iso2: 'GE' } });
    expect(ge).toMatchObject({ nameEn: 'Georgia', nameKa: 'საქართველო', isActive: true });
    expect(await prisma.country.findUnique({ where: { iso2: 'YT' } })).toMatchObject({ id: 139 });
    expect(await prisma.country.findUnique({ where: { iso2: 'TY' } })).toBeNull();
  });

  it('links a profile to a country', async () => {
    const u = await user();
    const ge = await prisma.country.findUniqueOrThrow({ where: { iso2: 'GE' } });
    const p = await prisma.userProfile.update({
      where: { userId: u.id },
      data: { countryId: ge.id, city: 'Tbilisi' },
      include: { country: true },
    });
    expect(p.country?.iso2).toBe('GE');
    expect(p.timezone).toBeNull();
  });
});

describe('skills and languages', () => {
  it('refuses the same skill or language name twice for one user, whatever the case', async () => {
    const u = await user();
    await prisma.userSkill.create({
      data: { userId: u.id, name: 'Laravel', slug: 'laravel', experience: 'pro' },
    });
    await expect(
      prisma.userSkill.create({
        data: { userId: u.id, name: 'LARAVEL', slug: 'laravel', experience: 'beginner' },
      }),
    ).rejects.toThrow();
    await prisma.userLanguage.create({ data: { userId: u.id, name: 'English', level: 'fluent' } });
    await expect(
      prisma.userLanguage.create({ data: { userId: u.id, name: 'english', level: 'basic' } }),
    ).rejects.toThrow();
    const other = await user();
    await prisma.userSkill.create({
      data: { userId: other.id, name: 'laravel', slug: 'laravel', experience: 'intermediate' },
    });
  });
});

describe('portfolio', () => {
  it('keeps the rejection reason and date only on rejected items', async () => {
    const u = await user();
    const thumb = await file(u.id, 'portfolio_image');
    const data = {
      userId: u.id,
      uid: `T${Date.now()}`.slice(0, 20),
      slug: 'my-work',
      title: 'My work',
      description: 'A description of my work',
      thumbnailFileId: thumb.id,
    };
    const item = await prisma.portfolioItem.create({
      data: { ...data, images: { create: { fileId: thumb.id, position: 0 } } },
    });
    expect(item.status).toBe('pending');
    await expect(
      prisma.portfolioItem.update({ where: { id: item.id }, data: { status: 'rejected' } }),
    ).rejects.toThrow();
    await prisma.portfolioItem.update({
      where: { id: item.id },
      data: { status: 'rejected', rejectionReason: 'Blurry images', rejectedAt: new Date() },
    });
    await expect(
      prisma.portfolioItem.update({ where: { id: item.id }, data: { status: 'pending' } }),
    ).rejects.toThrow();
    await prisma.portfolioItem.delete({ where: { id: item.id } });
    expect(await prisma.portfolioImage.count({ where: { portfolioItemId: item.id } })).toBe(0);
  });
});

describe('KYC verifications', () => {
  it('allows one pending or verified verification per user; declined ones may repeat', async () => {
    const u = await user();
    const f = await file(u.id, 'kyc_document');
    const base = {
      userId: u.id,
      documentType: 'passport' as const,
      frontFileId: f.id,
      selfieFileId: f.id,
    };
    const first = await prisma.kycVerification.create({ data: base });
    expect(first).toMatchObject({ status: 'pending', provider: 'manual', backFileId: null });
    await expect(prisma.kycVerification.create({ data: base })).rejects.toThrow();
    await prisma.kycVerification.update({
      where: { id: first.id },
      data: { status: 'declined', declineReason: 'Unreadable photo', reviewedAt: new Date() },
    });
    const second = await prisma.kycVerification.create({ data: base });
    await expect(
      prisma.kycVerification.update({ where: { id: second.id }, data: { declineReason: 'x' } }),
    ).rejects.toThrow();
    await prisma.kycVerification.update({ where: { id: second.id }, data: { status: 'declined' } });
    await prisma.kycVerification.create({ data: base });
  });
});

describe('reports', () => {
  it('keeps one report per reporter and item, and needs a note for a decision', async () => {
    const reporter = await user();
    const target = await user();
    const key = { reporterUserId: reporter.id, targetType: 'user' as const, targetId: target.id };
    const r = await prisma.report.upsert({
      where: { reporterUserId_targetType_targetId: key },
      create: { ...key, reason: 'Spam' },
      update: { reason: 'Spam' },
    });
    await prisma.report.upsert({
      where: { reporterUserId_targetType_targetId: key },
      create: { ...key, reason: 'Fake profile' },
      update: { reason: 'Fake profile' },
    });
    expect(await prisma.report.count({ where: key })).toBe(1);
    await expect(
      prisma.report.update({ where: { id: r.id }, data: { status: 'dismissed' } }),
    ).rejects.toThrow();
    await prisma.report.update({
      where: { id: r.id },
      data: { status: 'dismissed', decisionNote: 'Not spam', handledAt: new Date() },
    });
  });
});
