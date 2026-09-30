// Fixed values of ADR-002 and spec 01 that are NOT register rows (register rows come from SettingsService).

/** Cookie names (ADR-002 §2): host-only, browser-enforced prefixes. */
export const COOKIE_ACCESS = '__Host-mt_at';
export const COOKIE_DEVICE = '__Host-mt_did';
export const COOKIE_REFRESH = '__Secure-mt_rt';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Access token 15 minutes; user refresh 30 days sliding (ADR-002 §1). */
export const ACCESS_TOKEN_SECONDS = 15 * 60;
export const USER_REFRESH_DAYS = 30;
/** Device cookie lives as long as browsers allow (400 days). */
export const DEVICE_COOKIE_DAYS = 400;

/** Slow mode (ADR-002 §6, spec 01 AC-53, SEC-02). */
export const SLOW_MODE_FAILURES = 20;
export const SLOW_MODE_WINDOW_SECONDS = 60 * 60;
export const SLOW_MODE_SLOT_SECONDS = 30;

/** Code cap across challenges (ADR-002 §5, spec 01 AC-54, SEC-03). */
export const CODE_CAP_FAILURES = 10;
export const CODE_CAP_WINDOW_SECONDS = 60 * 60;

/** Code resend (spec 01 R-A6, AC-27). */
export const CODE_RESEND_COOLDOWN_SECONDS = 60;
export const CODE_SENDS_PER_WINDOW = 5;
export const CODE_SENDS_WINDOW_SECONDS = 15 * 60;

/** Email-sending endpoints (spec 01 R-A9, P-19). */
export const LINK_EMAILS_PER_HOUR = 3;

/** Per-account + IP login window (spec 01 AC-16: S-062 attempts per 15 minutes). */
export const LOGIN_WINDOW_SECONDS = 15 * 60;
