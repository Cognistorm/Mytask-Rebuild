// User row -> contract `Me` (getMe, AuthSession.user). Fields of later slices get their neutral values:
// avatar (slice 02 files), plan/premium (slice 09), country/city (slice 02), KYC (slice 02), social = linked providers.
import type { components } from '@mytask/types';
import type { SocialProvider, User, UserProfile } from '../../generated/prisma/client';

export type Me = components['schemas']['Me'];

export function toMe(
  user: User & { profile: UserProfile | null; socialAccounts?: { provider: SocialProvider }[] },
  twoFactorAvailable: boolean,
): Me {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    pendingEmail: null,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    fullName: user.profile?.fullname ?? user.username,
    avatar: null,
    status: user.status,
    isRestricted: user.isRestricted,
    hasPassword: user.passwordHash !== null,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorAvailable,
    locale: user.locale,
    theme: user.theme,
    lastDashboard: user.lastDashboard,
    plan: 'standard',
    premiumEndsAt: null,
    referralCode: user.referralCode,
    countryCode: null,
    city: null,
    kycStatus: 'none',
    socialProviders: [...new Set((user.socialAccounts ?? []).map((a) => a.provider))],
    createdAt: user.createdAt.toISOString(),
  };
}
