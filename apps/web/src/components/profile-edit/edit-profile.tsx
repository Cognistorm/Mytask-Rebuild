'use client';
// Edit profile `/account/profile` (spec 02 AC-15…AC-23, P-23; screens table "per-block saving, inline errors,
// success message"; legacy `Account/Profile/ProfileComponent.php`, `account/profile/profile.blade.php`).
// Reads `getMyProfile` once; every block saves on its own. Layout as the public profile (left card, main
// column): the legacy page had all blocks in a narrow left column and only the "Update profile" note on the
// right, so the blocks move to the wide column and the note + links go under the card.
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Field, Skeleton, TextArea } from '@mytask/ui/web';
import type { TFunction } from 'i18next';
import { href, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import type { Locale } from '@mytask/i18n';
import { useDashboard } from '../dashboard/shell';
import { LINKED } from '../profile/levels';
import { AvailabilityBlock } from './availability';
import { Block, BlockMessage, EditButton, useBlockState } from './block';
import { AccountLinks, ProfileCard } from './card';
import { LanguagesBlock, SkillsBlock } from './entries';
import './edit.css';

type MeProfile = components['schemas']['MeProfile'];
type LinkedAccounts = components['schemas']['ProfileLinkedAccounts'];

export function EditProfile() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const { me } = useDashboard();
  const [profile, setProfile] = useState<MeProfile>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const res = await api.GET('/me/profile');
    // 401 / restricted are handled by the shell (redirect); anything else offers a retry.
    if (res.data) setProfile(res.data);
    else if (res.response.status !== 401 && res.response.status !== 403) setFailed(true);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(
    (p: Partial<MeProfile>) => setProfile((current) => current && { ...current, ...p }),
    [],
  );

  if (failed) {
    return (
      <div className="mt-dash-error">
        <Alert kind="error">{t('t_toast_something_went_wrong')}</Alert>
        <button type="button" className="mt-button" onClick={() => void load()}>
          {t('t_ui_retry')}
        </button>
      </div>
    );
  }

  if (!me || !profile) return <Skeleton label={t('t_ui_loading')} rows={6} />;

  return (
    <div className="mt-edit" data-testid="edit-profile">
      <h1 className="mt-edit-title">{t('t_edit_profile')}</h1>
      <div className="mt-edit-layout">
        <div className="mt-edit-side">
          <ProfileCard t={t} locale={locale} me={me} profile={profile} onChange={patch} />
          <AccountLinks
            t={t}
            links={[
              // Account settings move to /account/settings with task 4.1.20 (verification centre too).
              { href: href(locale, '/account'), label: t('t_account_settings') },
              { href: href(locale, '/account/password'), label: t('t_change_password') },
              { href: href(locale, '/account/verification'), label: t('t_get_verified') },
              { href: href(locale, `/profile/${me.username}`), label: t('t_view_profile') },
            ]}
          />
        </div>
        <div className="mt-edit-main">
          <AvailabilityBlock
            t={t}
            locale={locale}
            availability={profile.availability}
            onChange={(availability) => patch({ availability })}
          />
          <AboutBlock
            t={t}
            locale={locale}
            about={profile.about}
            onSaved={(about) => patch({ about })}
          />
          {profile.linkedAccountsEnabled && (
            <LinkedAccountsBlock
              t={t}
              locale={locale}
              accounts={profile.linkedAccounts}
              onSaved={(linkedAccounts) => patch({ linkedAccounts })}
            />
          )}
          <SkillsBlock t={t} locale={locale} skills={profile.skills} />
          <LanguagesBlock t={t} locale={locale} languages={profile.languages} />
        </div>
      </div>
    </div>
  );
}

/** About me (AC-18): 1–1,500 characters; legacy "Description" block with Edit → textarea → Cancel / Update. */
function AboutBlock(props: {
  t: TFunction;
  locale: Locale;
  about: string | null;
  onSaved: (about: string) => void;
}) {
  const { t } = props;
  const api = useApi(props.locale);
  const state = useBlockState();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  function open() {
    setValue(props.about ?? '');
    state.reset();
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    state.start();
    const res = await api.PATCH('/me/profile', { body: { about: value.trim() } });
    if (res.error) return state.done({ err: res.error as ApiErrorBody });
    props.onSaved(res.data.about ?? '');
    setEditing(false);
    state.done({ ok: t('t_profile_description_updated') });
  }

  return (
    <Block
      title={t('t_about_me')}
      hint={t('t_tell_us_more_about_ur_self')}
      testId="about-block"
      action={
        !editing && (
          <EditButton
            label={t('t_edit')}
            ariaLabel={`${t('t_edit')}: ${t('t_about_me')}`}
            onClick={open}
            testId="about-edit"
          />
        )
      }
    >
      {editing ? (
        <form onSubmit={save} noValidate className="mt-edit-form">
          <TextArea
            label={t('t_about_me')}
            name="about"
            placeholder={t('t_pls_tell_us_about_ur_hobbies_etc')}
            maxLength={1500}
            rows={6}
            value={value}
            onChange={setValue}
            error={state.fields.about}
          />
          <BlockMessage general={state.general} />
          <div className="mt-edit-buttons">
            <button type="button" className="mt-button" onClick={() => setEditing(false)}>
              {t('t_cancel')}
            </button>
            <button type="submit" className="mt-button mt-button-primary" disabled={state.busy}>
              {t('t_update')}
            </button>
          </div>
        </form>
      ) : (
        <>
          <BlockMessage ok={state.ok} />
          {props.about && <p className="mt-edit-about">{props.about}</p>}
        </>
      )}
    </Block>
  );
}

/** Linked accounts (AC-21, S-123): seven optional URLs saved together; an empty field clears that one. */
function LinkedAccountsBlock(props: {
  t: TFunction;
  locale: Locale;
  accounts: LinkedAccounts;
  onSaved: (accounts: LinkedAccounts) => void;
}) {
  const { t } = props;
  const api = useApi(props.locale);
  const state = useBlockState();
  const [values, setValues] = useState(() =>
    Object.fromEntries(LINKED.map(([key]) => [key, props.accounts[key] ?? ''])),
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    state.start();
    const body = Object.fromEntries(
      LINKED.map(([key]) => [key, values[key]?.trim() || null]),
    ) as LinkedAccounts;
    const res = await api.PUT('/me/linked-accounts', { body });
    if (res.error) return state.done({ err: res.error as ApiErrorBody });
    props.onSaved(res.data);
    setValues(Object.fromEntries(LINKED.map(([key]) => [key, res.data[key] ?? ''])));
    state.done({ ok: t('t_linked_accounts_has_been_updated') });
  }

  return (
    <Block
      title={t('t_linked_accounts')}
      hint={t('t_connect_ur_social_media_accounts')}
      testId="linked-accounts-block"
    >
      <form onSubmit={save} noValidate className="mt-edit-form">
        <div className="mt-edit-grid">
          {LINKED.map(([key, label]) => (
            <Field
              key={key}
              label={t(label)}
              name={key}
              type="url"
              autoComplete="url"
              placeholder="https://"
              maxLength={160}
              value={values[key] ?? ''}
              onChange={(v) => setValues((current) => ({ ...current, [key]: v }))}
              error={state.fields[key]}
            />
          ))}
        </div>
        <BlockMessage ok={state.ok} general={state.general} />
        <div className="mt-edit-buttons">
          <button type="submit" className="mt-button mt-button-primary" disabled={state.busy}>
            {t('t_update')}
          </button>
        </div>
      </form>
    </Block>
  );
}
