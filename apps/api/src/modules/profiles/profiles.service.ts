// Profiles (spec 02, ROADMAP 4.1.8a/b): getMyProfile, updateMyProfile, getUserProfile, putMyAvatar, deleteMyAvatar,
// createUserReport (AC-14, EV-13).
// Data of slices not built yet gets the contract's neutral value (4.1.1 handoff §C): ratings empty, no
// Premium, `canRequestOffer` false, `isIndexable` from the public portfolio only. `timezone` null → Asia/Tbilisi
// (legacy `config/app.php:73`, no editor). `account.updated` (x-emits) waits for the realtime gateway (slice 08).
import { Injectable, Logger } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { UserProfile } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { SettingsService } from '../../platform/settings/settings.service';
import { AccountService } from '../auth/account.service';
import { AvatarReader } from '../auth/avatar.reader';
import { PresenceService } from '../auth/presence.service';
import type { RequestContext } from '../auth/request-context';
import { FileAttachments, FilesService } from '../files/files.service';
import { languageView, linkedView, skillView } from './profile-views';
import { ReportLimiter } from './report-limiter';

type S = components['schemas'];

export const DEFAULT_TIMEZONE = 'Asia/Tbilisi';
const EMPTY_RATING: S['RatingBlock'] = {
  count: 0,
  averageTenths: null,
  starCounts: { five: 0, four: 0, three: 0, two: 0, one: 0 },
};
/** Calendar date of an instant on the platform clock (Asia/Tbilisi), `YYYY-MM-DD`. */
const dateOnly = new Intl.DateTimeFormat('en-CA', {
  timeZone: DEFAULT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');

/** Insertion order (uuid v7 ids are time-ordered), as the legacy lists. */
const BY_ID = { orderBy: { id: 'asc' } } as const;

/** The notice while "unavailable until" is in the future; a passed date shows nothing (AC-23). */
function availabilityView(p: UserProfile | null, now: Date): S['AvailabilityNotice'] | null {
  if (!p?.unavailableUntil || p.unavailableUntil <= now) return null;
  return {
    unavailableUntil: dateOnly.format(p.unavailableUntil),
    message: p.unavailableMessage ?? '',
  };
}

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger('Profiles');

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly account: AccountService,
    private readonly avatars: AvatarReader,
    private readonly files: FilesService,
    private readonly presence: PresenceService,
    private readonly outbox: OutboxService,
    private readonly reportLimiter: ReportLimiter,
    attachmentChecks: FileAttachments,
  ) {
    // The current avatar cannot be deleted through deleteFile (409); deleteMyAvatar removes it.
    attachmentChecks.register(
      async (file) =>
        file.purpose === 'avatar' &&
        (await this.prisma.userProfile.count({ where: { avatarFileId: file.id } })) > 0,
    );
  }

  // ------------------------------------------------------------------ own profile (AC-15…AC-18)

  async getMine(userId: string): Promise<S['MeProfile']> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        profile: true,
        skills: BY_ID,
        languages: BY_ID,
        linkedAccounts: true,
      },
    });
    return {
      headline: user.profile?.headline ?? null,
      about: user.profile?.about ?? null,
      avatar: await this.avatars.get(user.profile?.avatarFileId),
      skills: user.skills.map(skillView),
      languages: user.languages.map(languageView),
      linkedAccounts: linkedView(user.linkedAccounts),
      linkedAccountsEnabled: await this.settings.get('S-123'),
      availability: availabilityView(user.profile, new Date()),
    };
  }

  /** Each block saves on its own (AC-15, EC-7): only the fields sent change. Blank after trimming → required. */
  async updateMine(
    userId: string,
    input: S['MeProfileUpdateRequest'],
    ctx: RequestContext,
  ): Promise<S['MeProfile']> {
    const data: { headline?: string; about?: string } = {};
    for (const field of ['headline', 'about'] as const) {
      const value = input[field];
      if (value === undefined) continue;
      const trimmed = value.trim();
      if (!trimmed) {
        throw new ApiException(400, 'VALIDATION_FAILED', 't_validator_required', {
          fields: [
            {
              field,
              code: 'required',
              message: ctx.t('t_validator_required'),
              messageKey: 't_validator_required',
            },
          ],
        });
      }
      data[field] = trimmed;
    }
    if (Object.keys(data).length) {
      await this.prisma.userProfile.update({ where: { userId }, data });
    }
    return this.getMine(userId);
  }

  // ------------------------------------------------------------------ avatar (AC-16)

  /** Attaches a ready own `avatar` file; the old avatar file is deleted. Same file again → nothing changes. */
  async putAvatar(userId: string, input: S['MeAvatarPutRequest']): Promise<S['Me']> {
    const file = await this.prisma.file.findUnique({ where: { id: input.fileId } });
    if (
      !file ||
      file.ownerUserId !== userId ||
      file.purpose !== 'avatar' ||
      file.status === 'deleted'
    ) {
      throw new ApiException(422, 'FILE_PURPOSE_MISMATCH', 't_forbidden');
    }
    if (file.status !== 'ready') throw new ApiException(422, 'FILE_NOT_READY', 't_file_not_ready');
    await this.swapAvatar(userId, file.id);
    return this.account.me(userId);
  }

  async deleteAvatar(userId: string): Promise<void> {
    await this.swapAvatar(userId, null);
  }

  /**
   * Compare-and-set on the current avatar, so two parallel changes never leave an attached file deleted or
   * an old one orphaned; then the replaced file is deleted (storage + row).
   */
  private async swapAvatar(userId: string, next: string | null): Promise<void> {
    for (;;) {
      const { avatarFileId: before } = await this.prisma.userProfile.findUniqueOrThrow({
        where: { userId },
        select: { avatarFileId: true },
      });
      if (before === next) return;
      const done = await this.prisma.userProfile.updateMany({
        where: { userId, avatarFileId: before },
        data: { avatarFileId: next },
      });
      if (!done.count) continue;
      if (before) {
        try {
          await this.files.remove(userId, before);
        } catch (e) {
          // The profile is already right; a left-over file is only storage, never shown.
          this.logger.warn({ fileId: before, err: e }, 'old avatar file not deleted');
        }
      }
      return;
    }
  }

  // ------------------------------------------------------------------ public profile (AC-8…AC-13, R-P3)

  async getPublic(username: string, viewerId: string | null): Promise<S['UserProfile']> {
    // Active or verified, not deleted; pending, banned, deleted and old usernames → 404 (AC-9, EC-4).
    // A restricted user's profile stays visible (R-P3).
    const user = await this.prisma.user.findFirst({
      where: { username, deletedAt: null, status: { in: ['active', 'verified'] } },
      include: {
        profile: { include: { country: true } },
        skills: BY_ID,
        languages: BY_ID,
        linkedAccounts: true,
      },
    });
    if (!user) throw notFound();
    const now = new Date();
    const [portfolioCount, idVerified, linkedEnabled, avatar, isOnline] = await Promise.all([
      this.prisma.portfolioItem.count({ where: { userId: user.id, status: 'active' } }),
      this.prisma.kycVerification.count({ where: { userId: user.id, status: 'verified' } }),
      this.settings.get('S-123'),
      this.avatars.get(user.profile?.avatarFileId),
      this.presence.isOnline(user),
    ]);
    const isOwnProfile = viewerId === user.id;
    return {
      id: user.id,
      username: user.username,
      fullName: user.profile?.fullname ?? user.username,
      headline: user.profile?.headline ?? null,
      about: user.profile?.about ?? null,
      avatar,
      countryCode: user.profile?.country?.iso2 ?? null,
      timezone: user.profile?.timezone ?? DEFAULT_TIMEZONE,
      isOnline,
      availability: availabilityView(user.profile, now),
      lastDeliveryAt: user.profile?.lastDeliveryAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      isEmailVerified: user.emailVerifiedAt !== null,
      isIdVerified: idVerified > 0,
      // Premium: slice 9 (spec 10).
      isPremium: false,
      languages: user.languages.map(languageView),
      skills: user.skills.map(skillView),
      linkedAccounts: linkedEnabled ? linkedView(user.linkedAccounts) : null,
      // Reviews: slice 6 (spec 07, getUserReviewSummary) fills both blocks.
      ratings: { asFreelancer: EMPTY_RATING, asClient: EMPTY_RATING },
      portfolioCount,
      isOwnProfile,
      // Guests see "Contact me" and log in first (AC-11).
      canContact: !isOwnProfile,
      // Custom offers: slice 11 (spec 12, S-034, availability).
      canRequestOffer: false,
      canReport: viewerId !== null && !isOwnProfile,
      // Spec 17 AC-41: active gig (slice 3) or visible review (slice 6) count too, once they exist.
      isIndexable: portfolioCount > 0,
    };
  }

  // ------------------------------------------------------------------ report a profile (AC-14)

  /**
   * One report per reporter and profile: a second one replaces the reason and puts it back in the staff queue
   * (`created` false → 200). Every report emails all S-100 addresses (EV-13; legacy notified on every save).
   * Shares the SEC-23 limit with the gig, project and proposal reports.
   */
  async report(
    reporterId: string,
    username: string,
    input: S['UserReportCreateRequest'],
    ctx: RequestContext,
  ): Promise<{ created: boolean; report: S['UserReport'] }> {
    await this.reportLimiter.hit(reporterId);
    const target = await this.prisma.user.findFirst({
      where: { username, deletedAt: null, status: { in: ['active', 'verified'] } },
      select: { id: true, username: true },
    });
    if (!target) throw notFound();
    if (target.id === reporterId) throw new ApiException(403, 'FORBIDDEN', 't_forbidden');
    const reason = input.reason.trim();
    if (!reason) {
      throw new ApiException(400, 'VALIDATION_FAILED', 't_validator_required', {
        fields: [
          {
            field: 'reason',
            code: 'required',
            message: ctx.t('t_validator_required'),
            messageKey: 't_validator_required',
          },
        ],
      });
    }
    const admins = await this.settings.get('S-100');
    const key = { reporterUserId: reporterId, targetType: 'user' as const, targetId: target.id };
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.report.findUnique({
        where: { reporterUserId_targetType_targetId: key },
        select: { id: true },
      });
      const row = await tx.report.upsert({
        where: { reporterUserId_targetType_targetId: key },
        create: { ...key, reason },
        // Back to the queue with the new reason, like legacy `seen = false`.
        update: {
          reason,
          status: 'pending',
          decisionNote: null,
          handledByStaffId: null,
          handledAt: null,
        },
      });
      if (admins.length) {
        await this.outbox.add(
          'EV-13',
          { type: 'report', id: row.id },
          { to: [...admins], locale: 'ka', params: { username: target.username } },
          tx,
        );
      }
      return {
        created: before === null,
        report: {
          id: row.id,
          reason: row.reason,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      };
    });
  }
}
