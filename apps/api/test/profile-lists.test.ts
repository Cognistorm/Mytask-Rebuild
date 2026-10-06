// Edit-profile lists (ROADMAP 4.1.9; spec 02 AC-19…AC-21, P-25): skills and languages CRUD and
// putMyLinkedAccounts (S-123).
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { SettingsService } from '../src/platform/settings/settings.service';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
let seq = 0;
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;
const S123_KEY = 'profile.linked_accounts.enabled';

async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `pl_${n}`,
      email: `pl${n}@example.com`,
      fullName: 'List User',
      password: 'Secret123',
      acceptTerms: true,
    });
  expect(reg.status).toBe(201);
  const userId = reg.body.session.user.id as string;
  await prisma.user.update({ where: { id: userId }, data: { status: 'active' } });
  return {
    userId,
    username: reg.body.session.user.username as string,
    auth: {
      'X-MyTask-Client': 'ios',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    } as Auth,
  };
}

async function setS123(value: boolean) {
  await prisma.setting.upsert({
    where: { key: S123_KEY },
    create: { key: S123_KEY, registerId: 'S-123', value, currentVersion: 1 },
    update: { value },
  });
  app.get(SettingsService).invalidate();
}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});

beforeEach(async () => {
  // Registration allows 10 per IP and hour.
  await app.get(RedisService).client.flushall();
});

afterAll(async () => {
  await prisma?.setting.deleteMany({ where: { key: S123_KEY } });
  await app?.close();
});

describe('skills (AC-19)', () => {
  it('adds, edits and deletes a skill; the slug follows the name', async () => {
    const { auth, username } = await member();
    const add = await http()
      .post('/api/v1/me/skills')
      .set(auth)
      .send({ name: '  ლოგოს   დიზაინი ', experience: 'pro' });
    expect(add.status).toBe(201);
    expect(add.body).toMatchObject({
      name: 'ლოგოს დიზაინი',
      slug: 'logos-dizaini',
      experience: 'pro',
    });
    const id = add.body.id as string;

    const level = await http()
      .patch(`/api/v1/me/skills/${id}`)
      .set(auth)
      .send({ experience: 'intermediate' });
    expect(level.body).toMatchObject({ name: 'ლოგოს დიზაინი', experience: 'intermediate' });
    const renamed = await http().patch(`/api/v1/me/skills/${id}`).set(auth).send({ name: 'Figma' });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ name: 'Figma', slug: 'figma' });

    const profile = await http().get(`/api/v1/users/${username}`);
    expect(profile.body.skills).toEqual([renamed.body]);

    expect((await http().delete(`/api/v1/me/skills/${id}`).set(auth)).status).toBe(204);
    expect((await http().get('/api/v1/me/profile').set(auth)).body.skills).toEqual([]);
  });

  it('refuses the same name twice, case-insensitive, also on rename', async () => {
    const { auth } = await member();
    await http().post('/api/v1/me/skills').set(auth).send({ name: 'Figma', experience: 'pro' });
    const twice = await http()
      .post('/api/v1/me/skills')
      .set(auth)
      .send({ name: 'FIGMA', experience: 'beginner' });
    expect(twice.status).toBe(409);
    expect(twice.body).toMatchObject({ code: 'DUPLICATE' });
    expect(twice.body.details.messageKey).toBe('t_add_skill_already_exists');
    const other = await http()
      .post('/api/v1/me/skills')
      .set(auth)
      .send({ name: 'Sketch', experience: 'pro' });
    const rename = await http()
      .patch(`/api/v1/me/skills/${other.body.id as string}`)
      .set(auth)
      .send({ name: 'figma' });
    expect(rename.status).toBe(409);
    // Another user may have the same skill.
    const second = await member();
    const own = await http()
      .post('/api/v1/me/skills')
      .set(second.auth)
      .send({ name: 'Figma', experience: 'pro' });
    expect(own.status).toBe(201);
  });

  it('validates the name and level', async () => {
    const { auth } = await member();
    for (const body of [
      { name: '', experience: 'pro' },
      { name: '   ', experience: 'pro' },
      { name: 'x'.repeat(31), experience: 'pro' },
      { name: 'Figma', experience: 'expert' },
      { name: 'Figma' },
    ]) {
      const res = await http().post('/api/v1/me/skills').set(auth).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    }
  });

  it("answers 404 for another user's skill and for unknown ids", async () => {
    const owner = await member();
    const other = await member();
    const add = await http()
      .post('/api/v1/me/skills')
      .set(owner.auth)
      .send({ name: 'Figma', experience: 'pro' });
    const id = add.body.id as string;
    expect(
      (await http().patch(`/api/v1/me/skills/${id}`).set(other.auth).send({ name: 'Mine' })).status,
    ).toBe(404);
    expect((await http().delete(`/api/v1/me/skills/${id}`).set(other.auth)).status).toBe(404);
    expect(
      (
        await http()
          .delete('/api/v1/me/skills/01890000-0000-7000-8000-000000000000')
          .set(owner.auth)
      ).status,
    ).toBe(404);
    expect(await prisma.userSkill.count({ where: { id } })).toBe(1);
  });
});

describe('languages (AC-20)', () => {
  it('adds, edits and deletes a language; duplicates refused', async () => {
    const { auth } = await member();
    const add = await http()
      .post('/api/v1/me/languages')
      .set(auth)
      .send({ name: 'ქართული', level: 'native' });
    expect(add.status).toBe(201);
    expect(add.body).toMatchObject({ name: 'ქართული', level: 'native' });
    const id = add.body.id as string;
    const twice = await http()
      .post('/api/v1/me/languages')
      .set(auth)
      .send({ name: 'ქართული', level: 'basic' });
    expect(twice.status).toBe(409);
    expect(twice.body.details.messageKey).toBe('t_add_language_already_exists');

    const edit = await http()
      .patch(`/api/v1/me/languages/${id}`)
      .set(auth)
      .send({ name: 'Georgian', level: 'fluent' });
    expect(edit.body).toMatchObject({ id, name: 'Georgian', level: 'fluent' });
    const other = await member();
    expect((await http().delete(`/api/v1/me/languages/${id}`).set(other.auth)).status).toBe(404);
    expect((await http().delete(`/api/v1/me/languages/${id}`).set(auth)).status).toBe(204);
    expect((await http().get('/api/v1/me/profile').set(auth)).body.languages).toEqual([]);
  });

  it('validates the name (≤ 100) and level', async () => {
    const { auth } = await member();
    for (const body of [
      { name: 'x'.repeat(101), level: 'native' },
      { name: ' ', level: 'native' },
      { name: 'English', level: 'good' },
    ]) {
      const res = await http().post('/api/v1/me/languages').set(auth).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });
});

describe('putMyLinkedAccounts (AC-21, S-123)', () => {
  it('answers 403 FEATURE_DISABLED while S-123 is OFF', async () => {
    await setS123(false);
    const { auth } = await member();
    const res = await http()
      .put('/api/v1/me/linked-accounts')
      .set(auth)
      .send({ github: 'https://github.com/nino' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FEATURE_DISABLED');
  });

  it('saves all seven at once; missing or null clears one', async () => {
    await setS123(true);
    const { auth, username } = await member();
    const first = await http().put('/api/v1/me/linked-accounts').set(auth).send({
      github: 'https://github.com/nino',
      vimeo: 'https://vimeo.com/nino',
      facebook: null,
    });
    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      facebook: null,
      twitter: null,
      dribbble: null,
      stackoverflow: null,
      github: 'https://github.com/nino',
      youtube: null,
      vimeo: 'https://vimeo.com/nino',
    });
    const second = await http()
      .put('/api/v1/me/linked-accounts')
      .set(auth)
      .send({ twitter: 'https://x.com/nino', vimeo: null });
    expect(second.body).toMatchObject({
      github: null,
      twitter: 'https://x.com/nino',
      vimeo: null,
    });
    expect((await http().get(`/api/v1/users/${username}`)).body.linkedAccounts).toEqual(
      second.body,
    );
    expect(
      await prisma.userLinkedAccount.count({ where: { userId: (await member()).userId } }),
    ).toBe(0);
  });

  it('refuses non-web URLs and URLs over 160 characters', async () => {
    await setS123(true);
    const { auth } = await member();
    for (const github of [
      'javascript:alert(1)',
      'data:text/html,hi',
      'ftp://example.com/x',
      'not a url',
      `https://example.com/${'a'.repeat(150)}`,
    ]) {
      const res = await http().put('/api/v1/me/linked-accounts').set(auth).send({ github });
      expect(res.status, github).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    }
  });
});
