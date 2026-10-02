// Email texts for the events of slice 01 (spec 15 catalogue; legacy mail classes kept their keys:
// e.g. legacy/APP/app/Notifications/User/Everyone/VerifyEmail.php:52-60). All texts come from packages/i18n.
import type { Locale } from '@mytask/types';
import { translate } from '../errors/messages';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export interface TemplateInput {
  event: string;
  locale: Locale;
  username: string;
  email: string;
  appUrl: string;
  adminUrl: string;
  params: Record<string, string | number>;
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Georgian URLs are unprefixed, English under /en (ADR-006 §1). */
const link = (base: string, locale: Locale, path: string) =>
  `${base.replace(/\/$/, '')}${locale === 'en' ? '/en' : ''}${path}`;

function layout(
  locale: Locale,
  subject: string,
  greeting: string,
  lines: string[],
  action?: { label: string; url: string },
): RenderedEmail {
  const text = [
    greeting,
    '',
    ...lines,
    ...(action ? ['', `${action.label}: ${action.url}`] : []),
  ].join('\n');
  const html = `<!doctype html><html lang="${locale}"><body style="font-family:FiraGO,Arial,sans-serif;color:#1E1E21;background:#FAFAFA;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:24px">
<p style="font-weight:700;font-size:18px;margin:0 0 16px">MyTask.ge</p>
<p>${esc(greeting)}</p>
${lines.map((l) => `<p>${esc(l)}</p>`).join('\n')}
${action ? `<p><a href="${esc(action.url)}" style="display:inline-block;background:#0D696C;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:8px">${esc(action.label)}</a></p>` : ''}
</div></body></html>`;
  return { subject, text, html };
}

export function renderEmail(i: TemplateInput): RenderedEmail {
  const t = (key: string, params: Record<string, string | number> = {}) =>
    translate(key, i.locale, params);
  const hello = t('t_hello_username', { username: i.username });
  const q = (token: string | number | undefined) =>
    `?token=${encodeURIComponent(String(token ?? ''))}&email=${encodeURIComponent(i.email)}`;

  switch (i.event) {
    case 'EV-01':
      return layout(
        i.locale,
        t('t_subject_everyone_verify_ur_email'),
        hello,
        [t('t_notification_click_btn_to_verify_email')],
        {
          label: t('t_verify_email'),
          url: link(i.appUrl, i.locale, `/auth/verify${q(i.params.token)}`),
        },
      );
    case 'EV-02':
      return layout(
        i.locale,
        t('t_subject_admin_pending_user'),
        t('t_hi_admin'),
        [t('t_notification_admin_pending_user')],
        {
          label: t('t_pending_users'),
          url: `${i.adminUrl.replace(/\/$/, '')}/users`,
        },
      );
    case 'EV-03':
      // legacy/APP/app/Notifications/User/Everyone/AccountActivated.php:45-51
      return layout(
        i.locale,
        t('t_subject_everyone_ur_account_activated'),
        hello,
        [t('t_ur_account_has_been_successfully_verified_email')],
        { label: t('t_start_exploring'), url: link(i.appUrl, i.locale, '/') },
      );
    case 'EV-04':
      return layout(
        i.locale,
        t('t_subject_everyone_reset_ur_password'),
        hello,
        [t('t_notification_click_button_to_reset_password')],
        {
          label: t('t_reset_password'),
          url: link(i.appUrl, i.locale, `/auth/password/update${q(i.params.token)}`),
        },
      );
    case 'EV-05':
      return layout(
        i.locale,
        t('t_subject_everyone_password_changed'),
        hello,
        [t('t_notification_ur_password_updated')],
        {
          label: t('t_account_settings'),
          url: link(i.appUrl, i.locale, '/account/settings'),
        },
      );
    case 'EV-06':
      return layout(i.locale, t('t_2fa_email_subject'), hello, [t('t_2fa_email_body', i.params)]);
    case 'EV-07':
      // legacy/APP/app/Mail/Admin/Users/RestrictEmail.php:26-39 (subject + the staff message)
      return layout(
        i.locale,
        t('t_subject_admin_account_restricted'),
        hello,
        [String(i.params.message ?? '')],
        {
          label: t('t_restrictions_removal_center'),
          url: link(i.appUrl, i.locale, '/restricted'),
        },
      );
    case 'EV-08':
      // legacy/APP/app/Notifications/Admin/NewRestrictionAppeal.php:38-44
      return layout(
        i.locale,
        t('t_subject_admin_new_restriction_appeal'),
        t('t_hi_admin'),
        [String(i.params.message ?? '')],
        {
          label: t('t_user_restrictions'),
          url: `${i.adminUrl.replace(/\/$/, '')}/restrictions?userId=${encodeURIComponent(String(i.params.userId ?? ''))}`,
        },
      );
    case 'EV-09':
    case 'EV-10': {
      // legacy/APP/app/Notifications/User/Everyone/AppealAccepted.php, AppealRejected.php:40-46
      const ok = i.event === 'EV-09';
      return layout(
        i.locale,
        t(ok ? 't_subject_user_appeal_accepted' : 't_subject_user_appeal_rejected'),
        hello,
        [t(ok ? 't_ur_appeal_has_been_accepted' : 't_ur_appeal_has_been_rejected')],
        { label: t('t_restrictions_removal_center'), url: link(i.appUrl, i.locale, '/restricted') },
      );
    }
    case 'EV-13':
      // legacy/APP/app/Notifications/Admin/ProfileReported.php:44-51
      return layout(
        i.locale,
        t('t_subject_admin_profile_reported'),
        t('t_hi_admin'),
        [t('t_notification_admin_reported_profile')],
        { label: t('t_reported_users'), url: `${i.adminUrl.replace(/\/$/, '')}/reports` },
      );
    case 'EV-124':
      return layout(i.locale, t('t_subject_admin_critical_setting_changed'), t('t_hi_admin'), [
        t('t_admin_critical_setting_changed_body', i.params),
      ]);
    case 'EV-128':
      return layout(i.locale, t('t_subject_security_many_failed_logins'), hello, [
        t('t_security_many_failed_logins_body'),
      ]);
    case 'EV-129':
      return layout(i.locale, t('t_subject_security_2fa_locked'), hello, [
        t('t_security_2fa_locked_body', i.params),
      ]);
    default:
      throw new Error(`no email template for ${i.event}`);
  }
}
