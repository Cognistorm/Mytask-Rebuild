// getPublicConfig (ADR-005 §9; spec 00 AC-6, AC-8, AC-11; spec 01 AC-37). Responses are validated against
// openapi.yaml by the test app, so every 200 here is also a contract check of the `PublicConfig` shape.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/platform/db/prisma.service';
import { PUBLIC_CONFIG_SETTING_IDS } from '../src/platform/public-config/public-config.service';
import { SecretBox } from '../src/platform/settings/secret-box';
import {
  settingsRegistry,
  SettingsService,
  type SettingId,
} from '../src/platform/settings/settings.service';
import { createTestApp } from './app';

const SITE_KEY = 'test-recaptcha-site-key';
process.env.RECAPTCHA_SITE_KEY = SITE_KEY;

let app: NestExpressApplication;
let prisma: PrismaService;
const URL = '/api/v1/config/public';
const get = (headers: Record<string, string> = {}) =>
  request(app.getHttpServer()).get(URL).set(headers);

async function setSetting(registerId: SettingId, value: unknown) {
  const key = settingsRegistry[registerId].key;
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId, value: value as never, currentVersion: 1 },
    update: { value: value as never },
  });
  app.get(SettingsService).invalidate();
}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});
afterAll(async () => {
  delete process.env.RECAPTCHA_SITE_KEY;
  await app?.close();
});
beforeEach(async () => {
  await prisma.setting.deleteMany();
  app.get(SettingsService).invalidate();
});

describe('getPublicConfig', () => {
  it('reads exactly the x-settings rows of the contract', () => {
    const contract = readFileSync(resolve(__dirname, '../../../docs/04-api/openapi.yaml'), 'utf8');
    const op = contract.slice(contract.indexOf('operationId: getPublicConfig'));
    const block = op.slice(op.indexOf('x-settings:'), op.indexOf('responses:'));
    const cited = [...block.matchAll(/- (S-\d{3})/g)].map((m) => m[1]);
    const social = ['S-065', 'S-066', 'S-067', 'S-068', 'S-069'];
    expect([...PUBLIC_CONFIG_SETTING_IDS, ...social].sort()).toEqual([...cited].sort());
  });

  it('answers without a session with the approved defaults, in the contract shape', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers['content-language']).toBe('ka');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers.vary).toContain('Accept-Language');
    expect(res.headers.etag).toBe(`"${res.body.version}"`);
    const c = res.body;
    expect(c.i18n).toEqual({ defaultLocale: 'ka', languageSwitcherEnabled: true });
    expect(c.plans.standard).toEqual({ gigLimit: 1, projectLimit: null, customOfferLimit: null });
    expect(c.plans.premium.gigLimit).toBeNull();
    expect(c.plans.premiumMonthlyPrice).toEqual({ amount: 999, currency: 'GEL' });
    expect(c.payments.topupMaxAmount).toEqual({ amount: 90_000_000, currency: 'GEL' });
    expect(c.escrow).toMatchObject({
      autoReleaseEnabled: true,
      autoReleaseHours: 72,
      unblockRequestAvailable: false,
    });
    expect(c.auth).toEqual({
      recaptcha: { enabled: false, siteKey: null },
      twoFactorAvailable: true,
      socialProviders: [],
      passwordMinLength: 8,
      passwordMaxLength: 60,
    });
    expect(c.uploads.appealFile).toMatchObject({ enabled: true, maxFiles: 2, maxSizeMb: 100 });
    expect(c.uploads.offerAttachment).toEqual({
      enabled: true,
      maxSizeMb: 50,
      maxFiles: 10,
      allowedExtensions: ['png', 'jpg', 'zip', 'pdf', 'psd', 'mp4', 'mp3'],
    });
    expect(c.uploads.projectThumbnail).toEqual({
      enabled: true,
      maxSizeMb: 5,
      maxFiles: 1,
      allowedExtensions: [],
    });
    expect(c.branding).toMatchObject({ siteTitle: 'MyTask', titleSeparator: '|', logoUrl: null });
    expect(c.branding.headerAnnouncement).toBeNull();
    expect(c.content.hero).toEqual({
      title: null,
      subtitle: null,
      imageUrls: [],
      contentLocale: 'ka',
    });
    expect(c.system.maintenanceMode).toBe(false);
  });

  it('answers 304 to a matching If-None-Match and a new ETag after a staff change', async () => {
    const first = await get();
    const etag = first.headers.etag as string;
    const again = await get({ 'If-None-Match': etag });
    expect(again.status).toBe(304);
    expect(again.text).toBe('');
    expect((await get({ 'If-None-Match': `"other", W/${etag}` })).status).toBe(304);

    await setSetting('S-075', false); // projects OFF (00 AC-6: no deployment)
    const changed = await get({ 'If-None-Match': etag });
    expect(changed.status).toBe(200);
    expect(changed.body.projects.enabled).toBe(false);
    expect(changed.headers.etag).not.toBe(etag);
  });

  it('reflects stored values: unlimited limits, derived unblock flag, maintenance', async () => {
    await setSetting('S-001', null);
    await setSetting('S-025', false);
    await setSetting('S-121', { enabled: true, headline: null, message: null });
    const res = await get();
    expect(res.status).toBe(200); // works during maintenance
    expect(res.body.plans.standard.gigLimit).toBeNull();
    expect(res.body.escrow.unblockRequestAvailable).toBe(true);
    expect(res.body.system.maintenanceMode).toBe(true);

    await setSetting('S-025', true);
    await setSetting('S-029', true);
    expect((await get()).body.escrow.unblockRequestAvailable).toBe(true);
  });

  it('localizes admin texts with Georgian fallback and a per-language ETag', async () => {
    await setSetting('S-112', {
      text: { ka: 'სიახლე', en: 'News' },
      url: 'https://mytask.ge/blog',
    });
    await setSetting('S-113', {
      title: { ka: 'სათაური', en: 'Title' },
      subtitle: { ka: 'ქვესათაური', en: null },
      imageFileIds: [],
    });
    await setSetting('S-115', {
      metaDescription: { ka: 'აღწერა', en: 'Description' },
      keywords: 'freelance',
      ogImageFileId: null,
      facebookPageUrl: 'https://facebook.com/mytask.ge',
      facebookAppId: null,
      twitterUsername: null,
    });

    const ka = await get({ 'Accept-Language': 'ka' });
    expect(ka.body.branding.headerAnnouncement).toEqual({
      text: 'სიახლე',
      url: 'https://mytask.ge/blog',
      contentLocale: 'ka',
    });

    const en = await get({ 'Accept-Language': 'en-US,en;q=0.9' });
    expect(en.status).toBe(200);
    expect(en.headers['content-language']).toBe('en');
    expect(en.headers.etag).not.toBe(ka.headers.etag);
    expect(en.body.branding.headerAnnouncement).toMatchObject({
      text: 'News',
      contentLocale: 'en',
    });
    // the subtitle has no English, so the hero is reported as Georgian content
    expect(en.body.content.hero).toEqual({
      title: 'Title',
      subtitle: 'ქვესათაური',
      imageUrls: [],
      contentLocale: 'ka',
    });
    expect(en.body.seo).toMatchObject({
      defaultMetaDescription: 'Description',
      defaultKeywords: 'freelance',
      facebookPageUrl: 'https://facebook.com/mytask.ge',
    });
  });

  it('lists a social provider only when ON with saved keys, and never leaks the keys', async () => {
    const box = new SecretBox(process.env.SETTINGS_ENCRYPTION_KEY);
    const secret = box.seal('google-client-secret');
    await setSetting('S-065', {
      isEnabled: true,
      clientId: 'google-client-id',
      clientSecret: secret,
    });
    await setSetting('S-066', { isEnabled: true, clientId: 'fb-client-id', clientSecret: null });
    await setSetting('S-067', {
      isEnabled: false,
      clientId: 'gh-client-id',
      clientSecret: box.seal('gh'),
    });
    const res = await get();
    expect(res.body.auth.socialProviders).toEqual(['google']);
    const text = JSON.stringify(res.body);
    for (const leak of ['google-client-id', 'fb-client-id', 'gh-client-id', secret.ciphertext]) {
      expect(text).not.toContain(leak);
    }
  });

  it('sends the reCAPTCHA site key only while S-061 is ON', async () => {
    await setSetting('S-061', true);
    expect((await get()).body.auth.recaptcha).toEqual({ enabled: true, siteKey: SITE_KEY });
  });
});
