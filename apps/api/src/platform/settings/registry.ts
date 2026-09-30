// Code-defined settings registry (ADR-005): the register rows implemented so far, with the metadata the admin
// settings screen shows (spec 16 AC-51). Defaults = approved production values of the spec 00 register.
// Rows of later slices are added by those slices. Meanings: English from spec 00, Georgian alongside (Q-058).
import type { components } from '@mytask/types';

type Permission = components['schemas']['PermissionCode'];
type Area = components['schemas']['SettingArea'];
type Type = components['schemas']['SettingType'];

interface RowMeta<D> {
  key: string;
  default: D;
  area: Area;
  type: Type;
  unit?: string;
  meaning: { en: string; ka: string };
  allowedValues?: string[];
  minimum?: number;
  maximum?: number;
  source: string;
  tag: string;
  /** Changing it emails every S-100 address (EV-124, spec 16 AC-55). */
  critical?: boolean;
  /** Needs a re-login within 15 minutes (spec 16 AC-7, Q-145). */
  stepUp?: boolean;
  writePermission: Permission;
}

const row = <D>(m: RowMeta<D>) => m;

export const settingsRegistry = {
  'S-052': row({
    key: 'auth.email_verification.required',
    default: false,
    area: 'auth',
    type: 'boolean',
    meaning: {
      en: 'New accounts must be verified before becoming active',
      ka: 'ახალი ანგარიშები აქტიურდება მხოლოდ ვერიფიკაციის შემდეგ',
    },
    source: 'BR-002',
    tag: 'LEGACY',
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-053': row({
    key: 'auth.email_verification.method',
    default: 'admin' as 'email' | 'admin',
    area: 'auth',
    type: 'enum',
    allowedValues: ['email', 'admin'],
    meaning: {
      en: 'Verification by email link, or manual admin approval',
      ka: 'ვერიფიკაცია ელ-ფოსტის ბმულით ან ადმინისტრატორის ხელით დადასტურებით',
    },
    source: 'BR-003',
    tag: 'LEGACY',
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-054': row({
    key: 'auth.email_verification.link_expiry_minutes',
    default: 60,
    area: 'auth',
    type: 'integer',
    unit: 'minutes',
    minimum: 5,
    maximum: 10080,
    meaning: { en: 'Validity of the verification link', ka: 'ვერიფიკაციის ბმულის მოქმედების ვადა' },
    source: 'BR-003',
    tag: 'LEGACY',
    writePermission: 'settings.auth.write',
  }),
  'S-055': row({
    key: 'auth.password_reset.link_expiry_minutes',
    default: 60,
    area: 'auth',
    type: 'integer',
    unit: 'minutes',
    minimum: 5,
    maximum: 1440,
    meaning: {
      en: 'Validity of the password-reset link',
      ka: 'პაროლის აღდგენის ბმულის მოქმედების ვადა',
    },
    source: 'BR-007',
    tag: 'LEGACY',
    writePermission: 'settings.auth.write',
  }),
  'S-056': row({
    key: 'auth.two_factor.enabled',
    default: true,
    area: 'auth',
    type: 'boolean',
    meaning: {
      en: 'Global email-2FA switch. ON = users may turn 2FA on for their own account. OFF = 2FA option hidden (choices are remembered)',
      ka: 'ელ-ფოსტით ორსაფეხურიანი ავტორიზაციის ზოგადი გადამრთველი. ჩართული = მომხმარებლებს შეუძლიათ საკუთარ ანგარიშზე ჩართვა. გამორთული = ოფცია დამალულია (არჩევანი ინახება)',
    },
    source: 'Q-043, Q-063, Q-072',
    tag: 'NEW',
    critical: true,
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-057': row({
    key: 'auth.two_factor.code_ttl_minutes',
    default: 10,
    area: 'auth',
    type: 'integer',
    unit: 'minutes',
    minimum: 1,
    maximum: 60,
    meaning: {
      en: 'Validity of the emailed code',
      ka: 'ელ-ფოსტით გამოგზავნილი კოდის მოქმედების ვადა',
    },
    source: 'Q-063',
    tag: 'NEW',
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-058': row({
    key: 'auth.two_factor.max_attempts',
    default: 5,
    area: 'auth',
    type: 'integer',
    minimum: 1,
    maximum: 20,
    meaning: {
      en: 'Wrong codes allowed before the code is invalidated',
      ka: 'არასწორი კოდების რაოდენობა, რომლის შემდეგაც კოდი უქმდება',
    },
    source: 'Q-063',
    tag: 'NEW',
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-059': row({
    key: 'auth.two_factor.trusted_device_days',
    default: 30,
    area: 'auth',
    type: 'integer',
    unit: 'days',
    minimum: 1,
    maximum: 365,
    meaning: {
      en: 'How long a device stays trusted after a successful 2FA login',
      ka: 'რამდენ ხანს რჩება მოწყობილობა სანდო წარმატებული ორსაფეხურიანი შესვლის შემდეგ',
    },
    source: 'Q-063',
    tag: 'NEW',
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-060': row({
    key: 'auth.two_factor.staff_required',
    default: true,
    area: 'auth',
    type: 'boolean',
    meaning: {
      en: 'Email 2FA required for staff/admin logins, whatever S-056 says',
      ka: 'ელ-ფოსტით ორსაფეხურიანი ავტორიზაცია სავალდებულოა ადმინისტრატორებისთვის, S-056-ის მიუხედავად',
    },
    source: 'Q-063b, P-4',
    tag: 'NEW',
    critical: true,
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-061': row({
    key: 'auth.recaptcha.enabled',
    default: false,
    area: 'auth',
    type: 'boolean',
    meaning: {
      en: 'reCAPTCHA on register, login, contact (keys in .env)',
      ka: 'reCAPTCHA რეგისტრაციაზე, შესვლაზე და საკონტაქტო ფორმაზე (გასაღებები .env-ში)',
    },
    source: 'BR-001',
    tag: 'LEGACY',
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-062': row({
    key: 'auth.login_throttle.max_attempts',
    default: 5,
    area: 'auth',
    type: 'integer',
    minimum: 1,
    maximum: 50,
    meaning: {
      en: 'Failed user logins (per account + IP) within 15 minutes before a temporary lock',
      ka: 'მომხმარებლის წარუმატებელი შესვლები (ანგარიში + IP) 15 წუთში დროებით დაბლოკვამდე',
    },
    source: 'R-043',
    tag: 'NEW',
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-063': row({
    key: 'auth.login_throttle.lock_minutes',
    default: 15,
    area: 'auth',
    type: 'integer',
    unit: 'minutes',
    minimum: 1,
    maximum: 1440,
    meaning: {
      en: 'Lock duration after S-062 is reached',
      ka: 'დაბლოკვის ხანგრძლივობა S-062-ის მიღწევის შემდეგ',
    },
    source: 'R-043',
    tag: 'NEW',
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-064': row({
    key: 'security.staff_login.ip_ban_threshold',
    default: 3,
    area: 'auth',
    type: 'integer',
    minimum: 1,
    maximum: 100,
    meaning: {
      en: 'Failed staff logins from one IP before the IP is banned from the staff login',
      ka: 'ადმინისტრატორის წარუმატებელი შესვლები ერთი IP-დან, რის შემდეგაც IP იბლოკება',
    },
    source: 'BR-004',
    tag: 'LEGACY',
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-100': row({
    key: 'notifications.admin_recipients',
    default: ['ir.gvazava@gmail.com'] as string[],
    area: 'notifications',
    type: 'email_list',
    meaning: {
      en: 'Email addresses that receive every admin notification',
      ka: 'ელ-ფოსტის მისამართები, რომლებიც იღებენ ყველა ადმინისტრაციულ შეტყობინებას',
    },
    source: 'Q-026',
    tag: 'NEW',
    critical: true,
    stepUp: true,
    writePermission: 'settings.notifications.write',
  }),
  'S-124': row({
    key: 'auth.two_factor.trigger',
    default: 'new_device' as 'new_device' | 'new_device_or_ip',
    area: 'auth',
    type: 'enum',
    allowedValues: ['new_device', 'new_device_or_ip'],
    meaning: {
      en: 'When a 2FA code is asked: new or expired device only, or also on every new IP',
      ka: 'როდის მოითხოვება კოდი: მხოლოდ ახალ ან ვადაგასულ მოწყობილობაზე, თუ ყოველ ახალ IP-ზეც',
    },
    source: 'Q-082',
    tag: 'NEW',
    stepUp: true,
    writePermission: 'settings.auth.write',
  }),
  'S-130': row({
    key: 'mobile.min_app_version',
    default: { ios: '0.0.0', android: '0.0.0' } as { ios: string; android: string },
    area: 'system',
    type: 'structured',
    meaning: {
      en: 'Lowest mobile app version still served, per platform (older apps must update)',
      ka: 'მობილური აპლიკაციის მინიმალური მხარდაჭერილი ვერსია პლატფორმების მიხედვით (ძველმა ვერსიებმა განახლება უნდა გააკეთონ)',
    },
    source: 'Q-153, ADR-018',
    tag: 'NEW',
    writePermission: 'settings.system.write',
  }),
} as const;

export type SettingId = keyof typeof settingsRegistry;
export const settingIdByKey = new Map(
  Object.entries(settingsRegistry).map(([id, m]) => [m.key, id as SettingId]),
);
