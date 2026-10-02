// Spec 02 account settings (ROADMAP 4.1.11): updateMe (AC-29…AC-31, Q-144 emailed code for accounts without a
// password), confirmEmailChange (AC-30, P-18), updateMyPreferences (spec 00 AC-4, spec 02 AC-3) and deleteMe
// (AC-32…AC-34 through the pluggable AccountDeletionGuards).
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { Prisma } from '../../generated/prisma/client';
import { randomToken, sha256 } from '../../platform/crypto';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { SettingsService } from '../../platform/settings/settings.service';
import { AccountDeletionGuards } from './account-deletion.guards';
import { AccountService } from './account.service';
import type { RequestContext } from './request-context';
import { SessionsService } from './sessions.service';
import { ThrottleService } from './throttle.service';
import { TwoFactorService } from './two-factor.service';

type S = components['schemas'];

@Injectable()
export class AccountSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly account: AccountService,
    private readonly sessions: SessionsService,
    private readonly throttle: ThrottleService,
    private readonly twoFactor: TwoFactorService,
    private readonly outbox: OutboxService,
    private readonly deletionGuards: AccountDeletionGuards,
  ) {}

  // ------------------------------------------------------------------ updateMe (AC-29…AC-31)

  async updateMe(userId: string, input: S['MeUpdateRequest'], ctx: RequestContext) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true },
    });
    const field = (name: string, code: string, key: string) =>
      this.account.fieldError(ctx, name, code, key);

    // 1) Shape (the contract checks lengths and the username pattern; blanks after trimming are ours).
    const fullName = input.fullName?.trim();
    if (input.fullName !== undefined && !fullName)
      throw field('fullName', 'required', 't_validator_required');
    const city = input.city?.trim();
    if (input.city !== undefined && !city) throw field('city', 'required', 't_validator_required');
    let countryId: number | null | undefined;
    if (input.countryCode === null) countryId = null;
    else if (input.countryCode !== undefined) {
      const country = await this.prisma.country.findFirst({
        where: { iso2: input.countryCode.toUpperCase(), isActive: true },
        select: { id: true },
      });
      if (!country) throw field('countryCode', 'exists', 't_validator_exists');
      countryId = country.id;
    }
    const email = input.email?.trim();
    const emailChanges = !!email && email.toLowerCase() !== user.email.toLowerCase();
    const usernameChanges = !!input.username && input.username !== user.username;

    // 2) Unique (deleted accounts keep theirs, AC-34). Checked before re-authentication so a correct
    // emailed code is not used up by a save that fails anyway.
    if (usernameChanges) {
      const clash = await this.prisma.user.findFirst({
        where: { username: input.username, id: { not: userId } },
        select: { id: true },
      });
      if (clash) throw field('username', 'unique', 't_validator_unique');
    }
    if (emailChanges) {
      const clash = await this.prisma.user.findFirst({
        where: { email, id: { not: userId } },
        select: { id: true },
      });
      if (clash) throw field('email', 'unique', 't_validator_unique');
    }

    // 3) Re-authentication: the current password on every save (legacy `SettingsComponent.php:156-223`);
    // without a password only an email change needs the emailed code (Q-144, EC-12).
    if (user.passwordHash || emailChanges) {
      await this.account.reauthenticate(user, input, 'email_change', ctx);
    }

    // 4) Email-change links are capped like the other link emails (R-A9: 3 per hour per account and IP).
    if (emailChanges && !(await this.throttle.allowLinkEmail('email_change', userId, ctx.ip))) {
      throw new ApiException(429, 'RATE_LIMITED', 't_too_many_requests', {
        retryAfterSeconds: 3600,
      });
    }

    const minutes = await this.settings.get('S-054');
    try {
      await this.prisma.$transaction(async (tx) => {
        const username = usernameChanges ? input.username! : user.username;
        if (usernameChanges) await tx.user.update({ where: { id: userId }, data: { username } });
        const profile = {
          ...(fullName !== undefined && { fullname: fullName }),
          ...(city !== undefined && { city }),
          ...(countryId !== undefined && { countryId }),
        };
        if (Object.keys(profile).length > 0) {
          await tx.userProfile.upsert({
            where: { userId },
            create: { userId, fullname: fullName ?? user.username, ...profile },
            update: profile,
          });
        }
        if (emailChanges) {
          // AC-30 / P-18: nothing changes until the new address confirms; an older open link stops working.
          await tx.authToken.updateMany({
            where: { userId, purpose: 'email_change', consumedAt: null },
            data: { consumedAt: new Date() },
          });
          const token = randomToken();
          await tx.authToken.create({
            data: {
              userId,
              purpose: 'email_change',
              tokenHash: sha256(token),
              newEmail: email,
              expiresAt: new Date(Date.now() + minutes * 60_000),
              createdIp: ctx.ip,
            },
          });
          await this.outbox.add(
            'EV-11',
            { type: 'user', id: userId },
            {
              to: [email!],
              locale: user.locale,
              params: { token, email: email!, minutes, username },
            },
            tx,
          );
          await this.outbox.add(
            'EV-12',
            { type: 'user', id: userId },
            { userId, params: { email: email! } },
            tx,
          );
        }
      });
    } catch (e) {
      // Two saves racing for the same username: the unique index decides.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw field('username', 'unique', 't_validator_unique');
      throw e;
    }
    return this.account.me(userId);
  }

  // ------------------------------------------------------------------ confirmEmailChange (AC-30)

  async confirmEmailChange(input: S['EmailChangeConfirmRequest'], ctx: RequestContext) {
    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash: sha256(input.token) },
      include: { user: { select: { deletedAt: true } } },
    });
    if (
      !token ||
      token.purpose !== 'email_change' ||
      !token.newEmail ||
      token.consumedAt ||
      token.user.deletedAt
    ) {
      throw new ApiException(422, 'AUTH_LINK_INVALID', 't_email_change_link_invalid');
    }
    if (token.expiresAt <= new Date())
      throw new ApiException(422, 'AUTH_LINK_EXPIRED', 't_email_change_link_expired');
    const newEmail = token.newEmail;
    const taken = () => new ApiException(409, 'DUPLICATE', 't_validator_unique');
    try {
      await this.prisma.$transaction(async (tx) => {
        const consumed = await tx.authToken.updateMany({
          where: { id: token.id, consumedAt: null },
          data: { consumedAt: new Date() },
        });
        if (consumed.count !== 1)
          throw new ApiException(422, 'AUTH_LINK_INVALID', 't_email_change_link_invalid');
        const clash = await tx.user.findFirst({
          where: { email: newEmail, id: { not: token.userId } },
          select: { id: true },
        });
        if (clash) throw taken();
        const now = new Date();
        // emailChangedAt starts the withdrawal pause of spec 14 AC-21 (S-129, Q-144).
        await tx.user.update({
          where: { id: token.userId },
          data: { email: newEmail, emailVerifiedAt: now, emailChangedAt: now },
        });
        // Open verification and reset links of the old address stop working (spec 01 EC-5, spec 02 EC-5).
        await tx.authToken.updateMany({
          where: {
            userId: token.userId,
            purpose: { in: ['email_verification', 'password_reset'] },
            consumedAt: null,
          },
          data: { consumedAt: now },
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw taken();
      throw e;
    }
    return {
      messageKey: 't_email_changed_success',
      message: ctx.t('t_email_changed_success'),
      params: {},
    };
  }

  // ------------------------------------------------------------------ updateMyPreferences (AC-3)

  async updatePreferences(userId: string, input: S['MePreferencesUpdateRequest']) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.lastDashboard !== undefined && { lastDashboard: input.lastDashboard }),
        ...(input.theme !== undefined && { theme: input.theme }),
        ...(input.locale !== undefined && { locale: input.locale }),
      },
    });
    return this.account.me(userId);
  }

  // ------------------------------------------------------------------ deleteMe (AC-32…AC-34)

  async deleteMe(userId: string): Promise<void> {
    const refusal = await this.deletionGuards.firstRefusal(userId);
    if (refusal) throw new ApiException(422, 'BUSINESS_RULE_VIOLATION', refusal);
    await this.prisma.$transaction(async (tx) => {
      // Soft delete: email and username stay reserved (unique columns keep the row); readers of public
      // profiles, login and the auth guard already skip deleted accounts.
      await tx.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
      await tx.trustedDevice.deleteMany({ where: { userId } });
      await this.twoFactor.cancelOpen({ kind: 'user', id: userId }, tx);
      await tx.authToken.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await this.sessions.revokeWhere({ userId }, 'user_revoked', tx);
    });
  }
}
