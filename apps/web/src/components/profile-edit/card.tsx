'use client';
// Left card of the edit-profile page (legacy `account/profile/profile.blade.php` "Profile header" + "Quick
// stats"): avatar with Change / Remove (AC-16), username, full name, headline edited in place (AC-17), status,
// member since, country.
import { useRef, useState } from 'react';
import { declaredType, fileExtension, uploadFile } from '@mytask/api-client';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { Avatar, Field, Pill } from '@mytask/ui/web';
import type { TFunction } from 'i18next';
import { useApi, type ApiErrorBody } from '../../lib/client';
import { formatDate } from '../../lib/format';
import { VerifiedMark } from '../profile/parts';
import { Block, BlockMessage, EditButton, useBlockState } from './block';

type Me = components['schemas']['Me'];
type MeProfile = components['schemas']['MeProfile'];

/** AC-16 / P-24: the avatar purpose has a fixed rule (not in the public config); the API checks it again. */
const AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function ProfileCard(props: {
  t: TFunction;
  locale: Locale;
  me: Me;
  profile: MeProfile;
  onChange: (patch: Partial<MeProfile>) => void;
}) {
  const { t, locale, me, profile } = props;
  const country = me.countryCode ? regionName(locale, me.countryCode) : undefined;
  return (
    <div className="mt-edit-card" data-testid="profile-card">
      <AvatarEditor
        t={t}
        locale={locale}
        name={me.username}
        avatar={profile.avatar}
        onChange={(avatar) => props.onChange({ avatar })}
      />
      <div className="mt-edit-identity">
        <p className="mt-edit-username">
          {me.username}
          {me.kycStatus === 'verified' && <VerifiedMark label={t('t_account_verified')} />}
        </p>
        <p className="mt-edit-muted">{me.fullName}</p>
      </div>
      <HeadlineEditor
        t={t}
        locale={locale}
        headline={profile.headline}
        onSaved={(headline) => props.onChange({ headline })}
      />
      <dl className="mt-edit-stats">
        {profile.availability && (
          <div>
            <dt>{t('t_availability')}</dt>
            <dd>
              <Pill tone="danger">{t('t_unavailable')}</Pill>
            </dd>
          </div>
        )}
        <div>
          <dt>{t('t_member_since')}</dt>
          <dd>{formatDate(me.createdAt)}</dd>
        </div>
        <div>
          <dt>{t('t_country')}</dt>
          <dd>{country ?? t('t_n_a')}</dd>
        </div>
      </dl>
    </div>
  );
}

function regionName(locale: Locale, code: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function AvatarEditor(props: {
  t: TFunction;
  locale: Locale;
  name: string;
  avatar: MeProfile['avatar'];
  onChange: (avatar: MeProfile['avatar']) => void;
}) {
  const { t } = props;
  const api = useApi(props.locale);
  const state = useBlockState();
  const [phase, setPhase] = useState<'uploading' | 'processing'>();
  const input = useRef<HTMLInputElement>(null);

  const fail = (message: string, fileId?: string) => {
    // The upload is the user's own and not attached to anything: delete it (best effort).
    if (fileId) void api.DELETE('/files/{fileId}', { params: { path: { fileId } } });
    setPhase(undefined);
    state.done({ err: { code: 'AVATAR', message } });
  };

  async function pick(file: File | undefined) {
    if (input.current) input.current.value = '';
    if (!file) return;
    state.start();
    // Client pre-checks only, so no upload starts for a file that cannot pass (AC-16).
    if (!AVATAR_EXTENSIONS.includes(fileExtension(file.name))) {
      return fail(t('t_selected_file_extension_is_not_allowed'));
    }
    if (file.size > AVATAR_MAX_BYTES) return fail(t('t_validator_max_file_size_2mb'));
    setPhase('uploading');
    const res = await uploadFile(
      api,
      {
        purpose: 'avatar',
        fileName: file.name,
        sizeBytes: file.size,
        contentType: declaredType(file.type),
        body: file,
      },
      { onScanning: () => setPhase('processing') },
    );
    if (res.error) {
      return fail(res.error.message ?? t('t_toast_something_went_wrong'), res.error.fileId);
    }
    if (res.file.status !== 'ready') {
      return fail(res.file.rejectReason ?? t('t_toast_something_went_wrong'), res.file.id);
    }
    const put = await api.PUT('/me/avatar', { body: { fileId: res.file.id } });
    if (put.error) {
      return fail((put.error as ApiErrorBody).message, res.file.id);
    }
    setPhase(undefined);
    props.onChange(put.data.avatar);
    state.done({ ok: t('t_avatar_updated_successfully') });
  }

  async function remove() {
    state.start();
    const res = await api.DELETE('/me/avatar');
    if (res.error) return state.done({ err: res.error as ApiErrorBody });
    props.onChange(null);
    state.done({ ok: t('t_avatar_updated_successfully') });
  }

  const busy = state.busy || phase !== undefined;

  return (
    <div className="mt-edit-avatar" data-testid="avatar-editor" aria-busy={busy}>
      <Avatar image={props.avatar} name={props.name} size="xl" alt={props.name} />
      <div className="mt-edit-avatar-actions">
        <label className="mt-button mt-edit-file" data-disabled={busy || undefined}>
          {t('t_change')}
          <input
            ref={input}
            type="file"
            className="mt-visually-hidden"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            disabled={busy}
            data-testid="avatar-input"
            onChange={(e) => void pick(e.target.files?.[0])}
          />
        </label>
        {props.avatar && (
          <button
            type="button"
            className="mt-button"
            disabled={busy}
            onClick={() => void remove()}
            data-testid="avatar-remove"
          >
            {t('t_remove')}
          </button>
        )}
      </div>
      {phase && (
        <p className="mt-edit-muted" role="status">
          {t(phase === 'uploading' ? 't_uploading' : 't_processing')}
        </p>
      )}
      <BlockMessage ok={state.ok} general={state.general} />
    </div>
  );
}

function HeadlineEditor(props: {
  t: TFunction;
  locale: Locale;
  headline: string | null;
  onSaved: (headline: string) => void;
}) {
  const { t } = props;
  const api = useApi(props.locale);
  const state = useBlockState();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  function open() {
    setValue(props.headline ?? '');
    state.reset();
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    state.start();
    const res = await api.PATCH('/me/profile', { body: { headline: value.trim() } });
    if (res.error) return state.done({ err: res.error as ApiErrorBody });
    props.onSaved(res.data.headline ?? '');
    setEditing(false);
    state.done({ ok: t('t_headline_updated_successfully') });
  }

  return (
    <div className="mt-edit-headline" data-testid="headline">
      {editing ? (
        <form onSubmit={save} noValidate className="mt-edit-form">
          <Field
            label={t('t_headline')}
            name="headline"
            value={value}
            onChange={setValue}
            maxLength={100}
            error={state.fields.headline}
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
          <p className={props.headline ? 'mt-edit-headline-text' : 'mt-edit-muted'}>
            {props.headline || t('t_headline')}
          </p>
          <EditButton
            label={t('t_edit')}
            ariaLabel={`${t('t_edit')}: ${t('t_headline')}`}
            onClick={open}
            testId="headline-edit"
          />
          <BlockMessage ok={state.ok} />
        </>
      )}
    </div>
  );
}

/** "Update profile" note and the links to the other account pages (legacy right column). */
export function AccountLinks(props: { t: TFunction; links: { href: string; label: string }[] }) {
  return (
    <Block
      title={props.t('t_update_profile')}
      hint={props.t('t_these_info_will_appear_on_ur_public_profile')}
    >
      <nav aria-label={props.t('t_update_profile')}>
        <ul className="mt-edit-links">
          {props.links.map((l) => (
            <li key={l.href}>
              {/* Plain links: some of them cross into the public layout (full page load, ADR-019 §2). */}
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </Block>
  );
}
