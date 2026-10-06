// Availability (ROADMAP 4.1.10; spec 02 AC-22, AC-23, R-P5): putMyAvailability, deleteMyAvailability and the
// daily availability-reset job.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { availableFrom } from '../src/modules/profiles/profiles.service';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { AvailabilityResetSweeper } from '../src/worker/availability-reset.sweeper';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
let seq = 0;
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;

/** `YYYY-MM-DD` on the platform clock, `days` from today. */
function tbilisiDay(days: number): string {
  const at = new Date(Date.now() + days * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tbilisi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `av_${n}`,
      email: `av${n}@example.com`,
      fullName: 'Away User',
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

const put = (auth: Auth, body: object) =>
  http().put('/api/v1/me/availability').set(auth).send(body);

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});

beforeEach(async () => {
  // Registration allows 10 per IP and hour.
  await app.get(RedisService).client.flushall();
});

afterAll(async () => {
  await app?.close();
});

describe('availableFrom', () => {
  it('is the start of the day in Asia/Tbilisi (UTC+4)', () => {
    expect(availableFrom('2099-05-01')?.toISOString()).toBe('2099-04-30T20:00:00.000Z');
  });

  it('refuses dates that do not exist', () => {
    expect(availableFrom('2099-02-30')).toBeNull();
    expect(availableFrom('2099-13-01')).toBeNull();
    expect(availableFrom('1.5.2099')).toBeNull();
  });
});

describe('putMyAvailability (AC-22)', () => {
  it('sets the notice; own and public profile show it', async () => {
    const u = await member();
    const until = tbilisiDay(10);
    const res = await put(u.auth, { unavailableUntil: until, message: '  On holiday  ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ unavailableUntil: until, message: 'On holiday' });

    const row = await prisma.userProfile.findUniqueOrThrow({ where: { userId: u.userId } });
    expect(row.unavailableUntil?.toISOString()).toBe(availableFrom(until)!.toISOString());

    const mine = await http().get('/api/v1/me/profile').set(u.auth);
    expect(mine.body.availability).toEqual({ unavailableUntil: until, message: 'On holiday' });
    const pub = await http().get(`/api/v1/users/${u.username}`);
    expect(pub.body.availability).toEqual({ unavailableUntil: until, message: 'On holiday' });
  });

  it('replaces an earlier notice', async () => {
    const u = await member();
    await put(u.auth, { unavailableUntil: tbilisiDay(10), message: 'First' });
    const res = await put(u.auth, { unavailableUntil: tbilisiDay(3), message: 'Second' });
    expect(res.status).toBe(200);
    const mine = await http().get('/api/v1/me/profile').set(u.auth);
    expect(mine.body.availability).toEqual({ unavailableUntil: tbilisiDay(3), message: 'Second' });
  });

  it('refuses today and past dates with t_pls_select_availability_date_in_future', async () => {
    const u = await member();
    for (const day of [tbilisiDay(0), tbilisiDay(-1)]) {
      const res = await put(u.auth, { unavailableUntil: day, message: 'Away' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.details.fields[0]).toMatchObject({
        field: 'unavailableUntil',
        messageKey: 't_pls_select_availability_date_in_future',
      });
    }
    const row = await prisma.userProfile.findUniqueOrThrow({ where: { userId: u.userId } });
    expect(row.unavailableUntil).toBeNull();
  });

  it('accepts tomorrow', async () => {
    const u = await member();
    expect((await put(u.auth, { unavailableUntil: tbilisiDay(1), message: 'Away' })).status).toBe(
      200,
    );
  });

  it('refuses a blank, missing or too long message and a bad date', async () => {
    const u = await member();
    const until = tbilisiDay(5);
    const blank = await put(u.auth, { unavailableUntil: until, message: '   ' });
    expect(blank.status).toBe(400);
    expect(blank.body.details.fields[0]).toMatchObject({
      field: 'message',
      messageKey: 't_validator_required',
    });
    expect((await put(u.auth, { unavailableUntil: until })).status).toBe(400);
    expect((await put(u.auth, { unavailableUntil: until, message: 'x'.repeat(751) })).status).toBe(
      400,
    );
    expect((await put(u.auth, { unavailableUntil: '2099-02-30', message: 'Away' })).status).toBe(
      400,
    );
    expect((await put(u.auth, { unavailableUntil: 'soon', message: 'Away' })).status).toBe(400);
    expect((await put(u.auth, { unavailableUntil: until, message: 'x'.repeat(750) })).status).toBe(
      200,
    );
  });

  it('needs a session', async () => {
    const res = await put(
      { 'X-MyTask-Client': 'ios' },
      { unavailableUntil: tbilisiDay(5), message: 'Away' },
    );
    expect(res.status).toBe(401);
    expect(
      (await http().delete('/api/v1/me/availability').set('X-MyTask-Client', 'ios')).status,
    ).toBe(401);
  });
});

describe('deleteMyAvailability (AC-23)', () => {
  it('removes the notice early; removing nothing is also 204', async () => {
    const u = await member();
    await put(u.auth, { unavailableUntil: tbilisiDay(10), message: 'Away' });
    const del = await http().delete('/api/v1/me/availability').set(u.auth);
    expect(del.status).toBe(204);
    const row = await prisma.userProfile.findUniqueOrThrow({ where: { userId: u.userId } });
    expect(row).toMatchObject({ unavailableUntil: null, unavailableMessage: null });
    expect((await http().get(`/api/v1/users/${u.username}`)).body.availability).toBeNull();
    expect((await http().delete('/api/v1/me/availability').set(u.auth)).status).toBe(204);
  });
});

describe('availability-reset job (AC-23)', () => {
  it('clears passed notices only, and a second run changes nothing', async () => {
    const passed = await member();
    const future = await member();
    await prisma.userProfile.update({
      where: { userId: passed.userId },
      data: { unavailableUntil: new Date(Date.now() - 1000), unavailableMessage: 'Away' },
    });
    await put(future.auth, { unavailableUntil: tbilisiDay(10), message: 'Later' });

    const sweeper = new AvailabilityResetSweeper(prisma);
    expect(await sweeper.tick()).toBeGreaterThanOrEqual(1);
    expect(sweeper.lastRunAt).toBeInstanceOf(Date);
    expect(
      await prisma.userProfile.findUniqueOrThrow({ where: { userId: passed.userId } }),
    ).toMatchObject({ unavailableUntil: null, unavailableMessage: null });
    expect(
      (await prisma.userProfile.findUniqueOrThrow({ where: { userId: future.userId } }))
        .unavailableMessage,
    ).toBe('Later');
    expect(await sweeper.tick()).toBe(0);
  });
});
