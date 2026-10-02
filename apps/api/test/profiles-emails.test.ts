// Spec 02 email templates (ROADMAP 4.1.15; spec 15 EV-11…EV-18, EV-126): every event renders in both
// languages with the parameters its service queues, no placeholder is left unfilled, the link points to the
// right app, and user text is escaped in the HTML part. Queueing itself is tested per feature
// (account-settings, profiles, portfolio, kyc).
import { describe, expect, it } from 'vitest';
import { renderEmail } from '../src/platform/mail/templates';

const base = {
  username: 'nino',
  email: 'nino@example.com',
  appUrl: 'https://mytask.ge',
  adminUrl: 'https://admin.mytask.ge',
};

// The params each service puts in the outbox payload.
const cases: { event: string; params: Record<string, string | number>; link?: string }[] = [
  {
    event: 'EV-11',
    params: { token: 'abc', email: 'new@example.com', minutes: 60, username: 'nino' },
    link: '/auth/email-change?token=abc',
  },
  { event: 'EV-12', params: { email: 'new@example.com', username: 'nino' } },
  { event: 'EV-13', params: { username: 'giorgi' }, link: 'https://admin.mytask.ge/reports' },
  { event: 'EV-14', params: { title: 'Logo' }, link: 'https://admin.mytask.ge/portfolio' },
  { event: 'EV-15', params: { title: 'Logo' }, link: '/seller/portfolio' },
  { event: 'EV-16', params: {}, link: 'https://admin.mytask.ge/kyc' },
  { event: 'EV-17', params: {}, link: '/account/verification' },
  { event: 'EV-18', params: { reason: 'Blurry photo' }, link: '/account/verification' },
  {
    event: 'EV-126',
    params: { title: 'Logo', reason: 'Not your work' },
    link: '/seller/portfolio',
  },
];

describe('spec 02 emails (EV-11…EV-18, EV-126)', () => {
  for (const locale of ['ka', 'en'] as const) {
    for (const c of cases) {
      it(`${c.event} renders in ${locale}`, () => {
        const mail = renderEmail({ ...base, locale, event: c.event, params: c.params });
        expect(mail.subject.trim()).not.toBe('');
        expect(mail.subject).not.toMatch(/^t_/);
        // No key fell through untranslated and no {placeholder} stayed empty.
        expect(mail.text).not.toMatch(/\bt_[a-z0-9_]+\b/);
        expect(mail.text).not.toMatch(/\{[a-z_]+\}/);
        expect(mail.html).toContain(`lang="${locale}"`);
        if (c.link) expect(mail.text).toContain(c.link);
      });
    }
  }

  it('user links follow the locale (ka unprefixed, /en for English)', () => {
    const ka = renderEmail({ ...base, locale: 'ka', event: 'EV-17', params: {} });
    const en = renderEmail({ ...base, locale: 'en', event: 'EV-17', params: {} });
    expect(ka.text).toContain('https://mytask.ge/account/verification');
    expect(en.text).toContain('https://mytask.ge/en/account/verification');
  });

  it('EV-11 carries the new address and the link lifetime; EV-12 names the new address', () => {
    const confirm = renderEmail({
      ...base,
      locale: 'en',
      event: 'EV-11',
      params: cases[0]!.params,
    });
    expect(confirm.text).toContain('new@example.com');
    expect(confirm.text).toContain('60');
    const notice = renderEmail({ ...base, locale: 'en', event: 'EV-12', params: cases[1]!.params });
    expect(notice.text).toContain('new@example.com');
  });

  it('escapes user text in the HTML part (EV-126 title and reason)', () => {
    const mail = renderEmail({
      ...base,
      locale: 'ka',
      event: 'EV-126',
      params: { title: '<script>x</script>', reason: 'a & "b"' },
    });
    expect(mail.html).not.toContain('<script>x</script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('a &amp; &quot;b&quot;');
  });
});
