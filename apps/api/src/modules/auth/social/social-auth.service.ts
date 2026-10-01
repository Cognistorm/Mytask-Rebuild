// Social login (spec 01 AC-30, AC-37…AC-41; ADR-002 §7; SEC-09, SEC-32(a); Q-156). Contract: startSocialLogin,
// completeSocialLogin. `code` + `state` alone never log anyone in: the flow is bound to the client that started
// it (web: `__Host-mt_oauth` nonce cookie; mobile: the app's PKCE verifier), chosen by the client kind stored
// with `state`, never by the callback's header.
import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { Prisma, type SocialProvider } from '../../../generated/prisma/client';
import { ENV, type Env } from '../../../platform/config/env';
import { randomToken, sha256Hex } from '../../../platform/crypto';
import { PrismaService } from '../../../platform/db/prisma.service';
import { ApiException } from '../../../platform/errors/api-exception';
import { RedisService } from '../../../platform/redis/redis.module';
import { AuthService, type ChallengeResult, type SessionResult } from '../auth.service';
import { ReferralService } from '../referral.service';
import { isCookieClient, type RequestContext } from '../request-context';
import {
  authorizationUrl,
  PROVIDERS,
  SocialProviderError,
  usernameFrom,
  type ProviderProfile,
} from './providers';
import { SocialKeysService } from './social-keys.service';

type S = components['schemas'];

export const STATE_SECONDS = 600;
const stateKey = (state: string) => `auth:oauth:state:${sha256Hex(state)}`;
const s256 = (verifier: string) =>
  createHash('sha256').update(verifier, 'ascii').digest('base64url');

interface StoredState {
  provider: SocialProvider;
  client: RequestContext['client'];
  redirectUri: string;
  referralCode: string | null;
  /** Web: hash of the binding-cookie nonce + the server-held PKCE verifier. */
  nonceHash?: string;
  verifier?: string;
  /** Mobile: the app's S256 challenge. */
  challenge?: string;
}

const failed = () => new ApiException(422, 'AUTH_SOCIAL_FAILED', 't_toast_something_went_wrong');

@Injectable()
export class SocialAuthService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly keys: SocialKeysService,
    private readonly auth: AuthService,
    private readonly referrals: ReferralService,
  ) {}

  /** Redirect URIs allowed per client kind (url-map §5 web callback, §7 mobile App Link). */
  private allowedRedirects(provider: SocialProvider, client: RequestContext['client']): string[] {
    const app = new URL(this.env.APP_URL).origin;
    return isCookieClient(client)
      ? [`${app}/auth/${provider}/callback`, `${app}/en/auth/${provider}/callback`]
      : [`${app}/app-return/auth/${provider}`];
  }

  async start(
    provider: SocialProvider,
    input: S['SocialAuthorizeRequest'],
    ctx: RequestContext,
  ): Promise<{ body: S['SocialAuthorization']; nonce?: string }> {
    const keys = await this.keys.get(provider);
    if (!keys) {
      throw new ApiException(403, 'FEATURE_DISABLED', 't_toast_something_went_wrong', {
        settingId: this.keys.settingId(provider),
      });
    }
    if (ctx.client === 'admin') throw failed();
    if (!this.allowedRedirects(provider, ctx.client).includes(input.redirectUri)) {
      throw new ApiException(400, 'VALIDATION_FAILED', 't_toast_something_went_wrong', {
        fields: [
          {
            field: 'redirectUri',
            code: 'not_allowed',
            message: ctx.t('t_toast_something_went_wrong'),
            messageKey: 't_toast_something_went_wrong',
          },
        ],
      });
    }
    const state = randomToken();
    const stored: StoredState = {
      provider,
      client: ctx.client,
      redirectUri: input.redirectUri,
      referralCode: input.referralCode ?? null,
    };
    let challenge: string;
    let nonce: string | undefined;
    if (isCookieClient(ctx.client)) {
      nonce = randomToken();
      stored.nonceHash = sha256Hex(nonce);
      stored.verifier = randomToken(48);
      challenge = s256(stored.verifier);
    } else {
      if (!input.codeChallenge || input.codeChallengeMethod !== 'S256') {
        throw new ApiException(400, 'VALIDATION_FAILED', 't_toast_something_went_wrong', {
          fields: [
            {
              field: 'codeChallenge',
              code: 'required',
              message: ctx.t('t_validator_required'),
              messageKey: 't_validator_required',
            },
          ],
        });
      }
      stored.challenge = input.codeChallenge;
      challenge = input.codeChallenge;
    }
    await this.redis.client.set(stateKey(state), JSON.stringify(stored), 'EX', STATE_SECONDS);
    return {
      body: {
        authorizationUrl: authorizationUrl(
          provider,
          keys.clientId,
          input.redirectUri,
          state,
          challenge,
        ),
        state,
        expiresAt: new Date(Date.now() + STATE_SECONDS * 1000).toISOString(),
      },
      nonce,
    };
  }

  async complete(
    provider: SocialProvider,
    input: S['SocialCallbackRequest'],
    cookieNonce: string | undefined,
    ctx: RequestContext,
    fetchImpl: typeof fetch = fetch,
  ): Promise<SessionResult | ChallengeResult> {
    // Single use: read and delete in one step, whatever happens next.
    const [[, raw]] = ((await this.redis.client
      .multi()
      .get(stateKey(input.state))
      .del(stateKey(input.state))
      .exec()) ?? [[null, null]]) as [[unknown, string | null]];
    if (!raw) throw failed();
    const stored = JSON.parse(raw) as StoredState;
    if (stored.provider !== provider) throw failed();
    // SEC-58: the callback must come from the same kind of client (browser vs app) that started the flow, and
    // the session is recorded and delivered for the stored client kind, never for the callback's header.
    if (isCookieClient(stored.client) !== isCookieClient(ctx.client)) throw failed();
    ctx = { ...ctx, client: stored.client };

    // SEC-09 binding, by the client kind stored with `state`; empty stored values never match (SEC-32(a)).
    let verifier: string;
    if (isCookieClient(stored.client)) {
      if (!stored.nonceHash || !stored.verifier || !cookieNonce) throw failed();
      if (sha256Hex(cookieNonce) !== stored.nonceHash) throw failed();
      verifier = stored.verifier;
    } else {
      if (!stored.challenge || !input.codeVerifier) throw failed();
      if (s256(input.codeVerifier) !== stored.challenge) throw failed();
      verifier = input.codeVerifier;
    }

    const keys = await this.keys.get(provider);
    if (!keys) {
      throw new ApiException(403, 'FEATURE_DISABLED', 't_toast_something_went_wrong', {
        settingId: this.keys.settingId(provider),
      });
    }
    let profile: ProviderProfile;
    try {
      const adapter = PROVIDERS[provider];
      const token = await adapter.token(fetchImpl, keys, input.code, stored.redirectUri, verifier);
      profile = await adapter.profile(fetchImpl, token);
    } catch (e) {
      if (e instanceof SocialProviderError || e instanceof TypeError || e instanceof SyntaxError) {
        throw failed();
      }
      throw e;
    }

    // An existing link logs in (every provider, including Facebook and X, Q-156).
    const link = await this.prisma.socialAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId: profile.id } },
      include: { user: { include: { profile: true } } },
    });
    if (link) {
      if (link.user.deletedAt) {
        throw new ApiException(
          401,
          'AUTH_INVALID_CREDENTIALS',
          't_invalid_login_credentials_pls_try_again',
        );
      }
      return this.auth.issueSession(link.user, ctx, true);
    }

    // No link: only a verified email may create an account (ADR-002 §7; Facebook/X never, Q-156).
    const email = profile.verifiedEmail?.trim();
    if (!email) {
      throw new ApiException(422, 'AUTH_SOCIAL_EMAIL_MISSING', 't_social_email_missing', {
        params: { provider },
      });
    }
    // AC-39: an email used by any account (password or another provider, deleted too) is refused.
    if (await this.prisma.user.findFirst({ where: { email }, select: { id: true } })) {
      throw new ApiException(409, 'AUTH_SOCIAL_EMAIL_EXISTS', 't_socialite_error_email_exists');
    }
    const user = await this.createAccount(provider, profile, email, stored.referralCode, ctx);
    return this.auth.issueSession(user, ctx, true, { skipTwoFactor: true, isNewAccount: true });
  }

  /** AC-38: active, email verified, no password, referral code; `?ref=` applied as in AC-6. */
  private async createAccount(
    provider: SocialProvider,
    profile: ProviderProfile,
    email: string,
    referralCode: string | null,
    ctx: RequestContext,
  ) {
    const base = usernameFrom(profile);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          let username = base;
          if (
            attempt > 0 ||
            (await tx.user.findFirst({ where: { username }, select: { id: true } }))
          ) {
            username = `${base}_${randomToken(3)
              .replace(/[^A-Za-z0-9]/g, 'x')
              .slice(0, 4)
              .toLowerCase()}`;
          }
          const referrerId = referralCode
            ? await this.referrals.findReferrer(tx, referralCode)
            : null;
          const created = await tx.user.create({
            data: {
              username,
              email,
              passwordHash: null,
              passwordAlgo: null,
              status: 'active',
              emailVerifiedAt: new Date(),
              locale: ctx.locale,
              referralCode: await this.auth.uniqueReferralCode(tx),
              profile: { create: { fullname: (profile.name ?? username).slice(0, 100) } },
              socialAccounts: {
                create: {
                  provider,
                  providerUserId: profile.id,
                  email,
                  avatarUrl: profile.avatarUrl,
                },
              },
            },
            include: { profile: true },
          });
          if (referrerId)
            await this.referrals.storePending(tx, referrerId, created.id, referralCode!);
          await this.referrals.creditSignup(tx, created.id); // ADR-002 §4: the single activation hook
          return created;
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          const target = String((e.meta as { target?: unknown })?.target ?? '');
          if (target.includes('email') || target.includes('provider')) {
            throw new ApiException(
              409,
              'AUTH_SOCIAL_EMAIL_EXISTS',
              't_socialite_error_email_exists',
            );
          }
          continue; // username taken by a concurrent signup: try another suffix
        }
        throw e;
      }
    }
    throw failed();
  }
}
