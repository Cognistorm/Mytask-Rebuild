// User row -> contract `Me` (getMe, AuthSession.user). Fields of later slices get their neutral values:
// plan/premium from PremiumStatus (neutral until slice 8), KYC (4.1.13); social = linked providers. The avatar comes from AvatarReader
// (spec 02 AC-16); `pendingEmail` is the open email-change link (spec 02 AC-30).
import type { components } from '@mytask/types';
import type { Country, SocialProvider, User, UserProfile } from '../../generated/prisma/client';
import type { PremiumState } from '../subscriptions/premium-status';

export type Me = components['schemas']['Me'];

export function toMe(
  user: User & {
    profile: (UserProfile & { country?: Country | null }) | null;
    socialAccounts?: { provider: SocialProvider }[];
  },
  twoFactorAvailable: boolean,
  avatar: components['schemas']['ImageVariants'] | null = null,
  pendingEmail: string | null = null,
  premium: PremiumState = { isActive: false, endsAt: null },
): Me {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    pendingEmail,
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
    plan: premium.isActive ? 'premium' : 'standard',
    premiumEndsAt: premium.endsAt?.toISOString() ?? null,
    referralCode: user.referralCode,
    countryCode: user.profile?.country?.iso2 ?? null,
    city: user.profile?.city ?? null,
    kycStatus: 'none',
    socialProviders: [...new Set((user.socialAccounts ?? []).map((a) => a.provider))],
    createdAt: user.createdAt.toISOString(),
  };
}
