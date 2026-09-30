// Slice 01 part B-2c: social login (spec 01 AC-37…AC-41; ADR-002 §7; SEC-09, SEC-32(a); Q-156).
// The provider is faked at the HTTP level (global fetch); the keys service is stubbed "ON with keys".
import { createHash, randomBytes } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../src/platform/db/prisma.service';
import { SocialKeysService } from '../src/modules/auth/social/social-keys.service';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
const WEB = { 'X-MyTask-Client': 'web', Origin: 'http://localhost:3100' };
const IOS = { 'X-MyTask-Client': 'ios' };
const webRedirect = (p: string) => `http://localhost:3100/auth/${p}/callback`;
const appRedirect = (p: string) => `http://localhost:3100/app-return/auth/${p}`;

let profile: Record<string, unknown>;
let githubEmails: { email: string; primary: boolean; verified: boolean }[] = [];
let tokenCalls: URLSearchParams[] = [];

function fakeProvider() {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const u = String(url);
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    if (/token/i.test(u) && init?.method === 'POST') {
      tokenCalls.push(new URLSearchParams(String(init.body)));
      return ok({ access_token: 'provider-token' });
    }
    if (u.includes('/user/emails')) return ok(githubEmails);
    return ok(profile);
  });
}

const pkce = () => {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
};

async function startWeb(provider = 'google') {
  const res = await request(app.getHttpServer())
    .post(`/api/v1/auth/social/${provider}/authorize`)
    .set(WEB)
    .send({ redirectUri: webRedirect(provider) });
  expect(res.status).toBe(200);
  const cookie = [res.headers['set-cookie']].flat().find((c) => c?.startsWith('__Host-mt_oauth='));
  expect(cookie).toBeDefined();
  return {
    state: res.body.state as string,
    cookie: cookie!.split(';')[0]!,
    url: res.body.authorizationUrl,
  };
}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});
afterAll(async () => {
  await app?.close();
});
beforeEach(() => {
  vi.spyOn(app.get(SocialKeysService), 'get').mockResolvedValue({
    clientId: 'cid',
    clientSecret: 'secret',
  });
  tokenCalls = [];
  const n = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  profile = { sub: `g-${n}`, email: `s${n}@example.com`, email_verified: true, name: 'Nino Test' };
  fakeProvider();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('start (SEC-09)', () => {
  it('a switched-off provider answers FEATURE_DISABLED with its setting id', async () => {
    vi.spyOn(app.get(SocialKeysService), 'get').mockResolvedValue(null);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/authorize')
      .set(WEB)
      .send({ redirectUri: webRedirect('google') });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'FEATURE_DISABLED', details: { settingId: 'S-065' } });
  });

  it('web: PKCE S256 URL + binding cookie; foreign redirect URI refused', async () => {
    const { url } = await startWeb();
    const q = new URL(url).searchParams;
    expect(q.get('code_challenge_method')).toBe('S256');
    expect(q.get('client_id')).toBe('cid');
    const bad = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/authorize')
      .set(WEB)
      .send({ redirectUri: 'https://evil.example/cb' });
    expect(bad.status).toBe(400);
  });

  it('mobile must send a code challenge', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/authorize')
      .set(IOS)
      .send({ redirectUri: appRedirect('google') });
    expect(res.status).toBe(400);
  });
});

describe('complete (SEC-09, SEC-32(a), AC-37…AC-41)', () => {
  it('web: code + state without the binding cookie never log in; the state is then used up', async () => {
    const { state, cookie } = await startWeb();
    const stolen = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/callback')
      .set(WEB)
      .send({ code: 'c', state });
    expect(stolen.status).toBe(422);
    expect(stolen.body.code).toBe('AUTH_SOCIAL_FAILED');
    const late = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/callback')
      .set({ ...WEB, Cookie: cookie })
      .send({ code: 'c', state });
    expect(late.status).toBe(422);
  });

  it('web: first login creates an active verified account with a session cookie (AC-38)', async () => {
    const { state, cookie } = await startWeb();
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/callback')
      .set({ ...WEB, Cookie: cookie })
      .send({ code: 'c', state });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ isNewAccount: true, accessToken: null });
    expect(tokenCalls[0]!.get('code_verifier')).toMatch(/^[A-Za-z0-9_-]{43,}$/);
    const user = await prisma.user.findFirstOrThrow({
      where: { email: String(profile.email) },
      include: { socialAccounts: true },
    });
    expect(user).toMatchObject({ status: 'active', passwordHash: null, username: 'nino_test' });
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.socialAccounts[0]).toMatchObject({
      provider: 'google',
      providerUserId: profile.sub,
    });

    // Second login through the link: same account, not new.
    const again = await startWeb();
    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/callback')
      .set({ ...WEB, Cookie: again.cookie })
      .send({ code: 'c', state: again.state });
    expect(second.status).toBe(200);
    expect(second.body.isNewAccount).toBe(false);
  });

  it('mobile: the verifier must match the challenge; the state of a web flow cannot be finished by an app', async () => {
    const { verifier, challenge } = pkce();
    const start = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/authorize')
      .set(IOS)
      .send({
        redirectUri: appRedirect('google'),
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
      });
    expect(start.status).toBe(200);
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/callback')
      .set(IOS)
      .send({ code: 'c', state: start.body.state, codeVerifier: pkce().verifier });
    expect(wrong.status).toBe(422);

    const again = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/authorize')
      .set(IOS)
      .send({
        redirectUri: appRedirect('google'),
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
      });
    const ok = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/callback')
      .set(IOS)
      .send({ code: 'c', state: again.body.state, codeVerifier: verifier });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toEqual(expect.any(String));
    expect(tokenCalls.at(-1)!.get('code_verifier')).toBe(verifier);

    // A web-started state presented by an app with any verifier: the stored client kind decides (SEC-32(a)).
    const web = await startWeb();
    const cross = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/callback')
      .set(IOS)
      .send({ code: 'c', state: web.state, codeVerifier: verifier });
    expect(cross.status).toBe(422);
  });

  it('unverified email is treated as missing; an existing email is refused (AC-39, AC-41)', async () => {
    profile.email_verified = false;
    let flow = await startWeb();
    const missing = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/callback')
      .set({ ...WEB, Cookie: flow.cookie })
      .send({ code: 'c', state: flow.state });
    expect(missing.status).toBe(422);
    expect(missing.body.code).toBe('AUTH_SOCIAL_EMAIL_MISSING');

    const n = Date.now().toString(36);
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set(IOS)
      .send({
        fullName: 'P P P',
        username: `pw_${n}`,
        email: `pw_${n}@example.com`,
        password: 'Secret123',
        acceptTerms: true,
      });
    profile.email_verified = true;
    profile.email = `pw_${n}@example.com`;
    flow = await startWeb();
    const exists = await request(app.getHttpServer())
      .post('/api/v1/auth/social/google/callback')
      .set({ ...WEB, Cookie: flow.cookie })
      .send({ code: 'c', state: flow.state });
    expect(exists.status).toBe(409);
    expect(exists.body.code).toBe('AUTH_SOCIAL_EMAIL_EXISTS');
  });

  it('Q-156: Facebook never creates an account, but logs in through an existing link', async () => {
    const fbId = `fb-${Date.now()}`;
    profile = { id: fbId, name: 'F B' };
    let flow = await startWeb('facebook');
    const refused = await request(app.getHttpServer())
      .post('/api/v1/auth/social/facebook/callback')
      .set({ ...WEB, Cookie: flow.cookie })
      .send({ code: 'c', state: flow.state });
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe('AUTH_SOCIAL_EMAIL_MISSING');

    const n = Date.now().toString(36);
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set(IOS)
      .send({
        fullName: 'L L L',
        username: `lk_${n}`,
        email: `lk_${n}@example.com`,
        password: 'Secret123',
        acceptTerms: true,
      });
    await prisma.socialAccount.create({
      data: {
        userId: reg.body.session.user.id,
        provider: 'facebook',
        providerUserId: fbId,
        email: `lk_${n}@example.com`,
      },
    });
    flow = await startWeb('facebook');
    const linked = await request(app.getHttpServer())
      .post('/api/v1/auth/social/facebook/callback')
      .set({ ...WEB, Cookie: flow.cookie })
      .send({ code: 'c', state: flow.state });
    expect(linked.status).toBe(200);
    expect(linked.body.user.id).toBe(reg.body.session.user.id);
  });

  it('GitHub: only a primary verified address counts', async () => {
    profile = { id: Date.now(), login: 'Octo-Cat', name: null, avatar_url: null };
    githubEmails = [{ email: `gh${Date.now()}@example.com`, primary: true, verified: false }];
    const flow = await startWeb('github');
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/social/github/callback')
      .set({ ...WEB, Cookie: flow.cookie })
      .send({ code: 'c', state: flow.state });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('AUTH_SOCIAL_EMAIL_MISSING');
  });
});
