// User row -> contract `Me` (getMe, AuthSession.user). Fields of later slices get their neutral values:
// plan/premium (slice 09), country/city (4.1.11), KYC (4.1.13); social = linked providers. The avatar comes
// from AvatarReader (spec 02 AC-16).
import type { components } from '@mytask/types';
import type { SocialProvider, User, UserProfile } from '../../generated/prisma/client';

export type Me = components['schemas']['Me'];

export function toMe(
  user: User & { profile: UserProfile | null; socialAccounts?: { provider: SocialProvider }[] },
  twoFactorAvailable: boolean,
  avatar: components['schemas']['ImageVariants'] | null = null,
): Me {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    pendingEmail: null,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    fullName: user.profile?.fullname ?? user.username,
    avatar,
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
