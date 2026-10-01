// operationId getPublicConfig (ADR-005 §9, CONVENTIONS §5.7): every `public` register row, shaped as the contract's
// `PublicConfig`. Secret social-login rows only contribute the provider names that are ON with usable keys
// (spec 01 AC-37). Localized texts follow the request language with Georgian fallback (ADR-006 §6).
import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Locale, Schema } from '@mytask/types';
import { SocialKeysService } from '../../modules/auth/social/social-keys.service';
import { ENV, type Env } from '../config/env';
import type { LocalizedText } from '../settings/registry';
import { SettingsService, type SettingId } from '../settings/settings.service';

type PublicConfig = Schema<'PublicConfig'>;
type UploadRule = Schema<'PublicConfigUploadRule'>;

/** The rows read here = `x-settings` of getPublicConfig without the social rows (read by SocialKeysService). */
export const PUBLIC_CONFIG_SETTING_IDS = [
  'S-001',
  'S-002',
  'S-003',
  'S-004',
  'S-005',
  'S-006',
  'S-007',
  'S-008',
  'S-009',
  'S-019',
  'S-020',
  'S-021',
  'S-022',
  'S-023',
  'S-024',
  'S-025',
  'S-026',
  'S-027',
  'S-028',
  'S-029',
  'S-030',
  'S-031',
  'S-032',
  'S-034',
  'S-035',
  'S-036',
  'S-037',
  'S-038',
  'S-039',
  'S-040',
  'S-041',
  'S-045',
  'S-046',
  'S-056',
  'S-061',
  'S-075',
  'S-076',
  'S-077',
  'S-078',
  'S-079',
  'S-080',
  'S-081',
  'S-082',
  'S-083',
  'S-084',
  'S-085',
  'S-086',
  'S-087',
  'S-088',
  'S-089',
  'S-090',
  'S-091',
  'S-092',
  'S-093',
  'S-094',
  'S-095',
  'S-096',
  'S-097',
  'S-098',
  'S-099',
  'S-101',
  'S-103',
  'S-104',
  'S-105',
  'S-106',
  'S-107',
  'S-108',
  'S-109',
  'S-111',
  'S-112',
  'S-113',
  'S-114',
  'S-115',
  'S-116',
  'S-117',
  'S-118',
  'S-119',
  'S-120',
  'S-121',
  'S-123',
  'S-126',
] as const satisfies readonly SettingId[];

/** Fixed rule R-A2 (P-14), not a setting. */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 60;

export interface PublicConfigResult {
  body: PublicConfig;
  /** Language of the localized parts (`Content-Language`). */
  locale: Locale;
}

@Injectable()
export class PublicConfigService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly settings: SettingsService,
    private readonly social: SocialKeysService,
  ) {}

  async get(locale: Locale): Promise<PublicConfigResult> {
    const [s, socialProviders] = await Promise.all([
      this.settings.getMany(PUBLIC_CONFIG_SETTING_IDS),
      this.social.enabled(),
    ]);
    const text = (v: LocalizedText | null) => localized(v, locale);
    const rule = (r: Partial<UploadRule> & Pick<UploadRule, 'maxSizeMb'>): UploadRule => ({
      enabled: true,
      maxFiles: null,
      allowedExtensions: [],
      ...r,
    });

    const announcement = text(s['S-112'].text);
    const hero = { title: text(s['S-113'].title), subtitle: text(s['S-113'].subtitle) };
    const seo = s['S-115'];

    const config: Omit<PublicConfig, 'version'> = {
      i18n: { defaultLocale: s['S-103'], languageSwitcherEnabled: s['S-104'] },
      appearance: {
        themeSwitcherEnabled: s['S-105'],
        defaultTheme: s['S-106'],
        homeFeaturedCategories: s['S-107'],
        homeBestSellers: s['S-108'],
        homeLogoCloud: s['S-109'],
        homeBlogPosts: s['S-119'],
      },
      branding: {
        siteTitle: s['S-111'].siteTitle,
        siteSubtitle: s['S-111'].siteSubtitle,
        titleSeparator: s['S-111'].titleSeparator,
        logoUrl: fileUrl(s['S-111'].logoFileId),
        logoDarkUrl: fileUrl(s['S-111'].logoDarkFileId),
        logoTransparentUrl: fileUrl(s['S-111'].logoTransparentFileId),
        faviconUrl: fileUrl(s['S-111'].faviconFileId),
        headerAnnouncement: announcement
          ? { text: announcement.value, url: s['S-112'].url, contentLocale: announcement.locale }
          : null,
      },
      auth: {
        recaptcha: {
          enabled: s['S-061'],
          siteKey: s['S-061'] ? (this.env.RECAPTCHA_SITE_KEY ?? null) : null,
        },
        twoFactorAvailable: s['S-056'],
        socialProviders,
        passwordMinLength: PASSWORD_MIN,
        passwordMaxLength: PASSWORD_MAX,
      },
      plans: {
        standard: {
          gigLimit: s['S-001'],
          projectLimit: s['S-003'],
          customOfferLimit: s['S-005'],
        },
        premium: {
          gigLimit: s['S-002'],
          projectLimit: s['S-004'],
          customOfferLimit: s['S-006'],
        },
        customOffersCountTowardLimit: s['S-007'],
        premiumMonthlyPrice: s['S-008'],
        premiumYearlyPrice: s['S-009'],
        pointsPerPremiumMonth: s['S-045'],
        pointsPerReferralSignup: s['S-046'],
      },
      payments: {
        bogCardEnabled: s['S-019'],
        walletEnabled: s['S-020'],
        bankTransferEnabled: s['S-021'],
        topupEnabled: s['S-022'],
        topupMinAmount: s['S-023'],
        topupMaxAmount: s['S-024'],
        mobileCardSubscriptionEnabled: s['S-126'],
      },
      escrow: {
        autoReleaseEnabled: s['S-025'],
        autoReleaseHours: s['S-026'],
        // P-5: unblock requests exist when auto-release is OFF, or when S-029 allows them alongside it.
        unblockRequestAvailable: !s['S-025'] || s['S-029'],
        unblockRequestWaitHours: s['S-028'],
        refundSellerResponseDays: s['S-030'],
      },
      projects: { enabled: s['S-075'], maxSkills: s['S-076'], awardAcceptanceHours: s['S-027'] },
      customOffers: {
        enabled: s['S-034'],
        requireAdminApproval: s['S-035'],
        expiryDays: s['S-036'],
      },
      revisions: { maxAllowed: s['S-041'] },
      withdrawals: { minAmount: s['S-031'], period: s['S-032'] },
      // Empty extension list = the purpose's fixed list (gig/portfolio images, gig documents, thumbnail).
      uploads: {
        gigImage: rule({ maxSizeMb: s['S-078'], maxFiles: s['S-077'] }),
        gigDocument: rule({
          enabled: s['S-080'],
          maxFiles: s['S-081'],
          maxSizeMb: s['S-082'],
        }),
        gigVideoLinkEnabled: s['S-079'],
        gigMaxTags: s['S-083'],
        // One thumbnail per project, jpg/jpeg/png (spec 10 AC-2, AC-7).
        projectThumbnail: rule({ maxSizeMb: s['S-078'], maxFiles: 1 }),
        requirementFile: rule({ maxSizeMb: s['S-084'], allowedExtensions: s['S-085'] }),
        delivery: rule({ maxSizeMb: s['S-086'], allowedExtensions: s['S-087'] }),
        audioUploadEnabled: s['S-088'],
        portfolioImage: rule({ maxFiles: s['S-089'], maxSizeMb: s['S-090'] }),
        appealFile: rule({
          maxFiles: s['S-091'],
          maxSizeMb: s['S-092'],
          allowedExtensions: s['S-093'],
        }),
        offerAttachment: rule({
          enabled: s['S-037'],
          maxSizeMb: s['S-038'],
          maxFiles: s['S-039'],
          allowedExtensions: s['S-040'],
        }),
        chatImage: rule({
          enabled: s['S-094'],
          maxSizeMb: s['S-097'],
          allowedExtensions: s['S-095'],
        }),
        chatFile: rule({
          enabled: s['S-094'],
          maxSizeMb: s['S-097'],
          allowedExtensions: s['S-096'],
        }),
      },
      chat: {
        attachmentsEnabled: s['S-094'],
        emojisEnabled: s['S-098'],
        soundEnabled: s['S-099'],
      },
      profile: { linkedAccountsEnabled: s['S-123'] },
      content: {
        blogEnabled: s['S-117'],
        blogCommentsEnabled: s['S-118'],
        newsletterEnabled: s['S-120'],
        hero: {
          title: hero.title?.value ?? null,
          subtitle: hero.subtitle?.value ?? null,
          imageUrls: fileUrls(s['S-113'].imageFileIds),
          // English only when every present text has an English value (ADR-006 §6).
          contentLocale: [hero.title, hero.subtitle].some((t) => t?.locale === 'ka')
            ? 'ka'
            : locale,
        },
        footer: {
          links: s['S-114'].links,
          socialLinks: s['S-114'].socialLinks,
          logos: s['S-114'].logos.flatMap((l) => {
            const imageUrl = fileUrl(l.imageFileId);
            return imageUrl ? [{ name: l.name, imageUrl, linkUrl: l.linkUrl }] : [];
          }),
        },
      },
      seo: {
        defaultMetaDescription: text(seo.metaDescription)?.value ?? null,
        defaultKeywords: seo.keywords,
        defaultOgImageUrl: fileUrl(seo.ogImageFileId),
        facebookPageUrl: seo.facebookPageUrl,
        facebookAppId: seo.facebookAppId,
        twitterUsername: seo.twitterUsername,
        sitemapEnabled: s['S-116'],
      },
      notifications: { pushEnabled: s['S-101'] },
      system: { maintenanceMode: s['S-121'].enabled },
    };

    const version = createHash('sha256')
      .update(locale)
      .update(JSON.stringify(config))
      .digest('base64url')
      .slice(0, 27);
    return { body: { version, ...config }, locale };
  }
}

/** Admin text in the requested language, Georgian when English is missing; null when empty. */
function localized(
  v: LocalizedText | null,
  locale: Locale,
): { value: string; locale: Locale } | null {
  if (!v) return null;
  if (locale === 'en' && v.en) return { value: v.en, locale: 'en' };
  return v.ka ? { value: v.ka, locale: 'ka' } : null;
}

/**
 * Public URL of a ready public image. The files foundation (F0, slice 02, ADR-009) owns file ids and their URLs;
 * until it exists no image can be saved in these rows (admin editors arrive in slice 16), so none resolves.
 */
function fileUrl(_fileId: string | null): string | null {
  return null;
}

function fileUrls(ids: string[]): string[] {
  return ids.map(fileUrl).filter((u): u is string => u !== null);
}
