// Gig screen actions (ROADMAP 4.3.14b; spec 04 AC-30, AC-35, AC-37, AC-38; screen 02 "Native app": Share and ♡ in
// the header, Report in the ⋯ bottom sheet), the same rules and legacy texts as the web `GigActions` (4.3.11d):
// Share = the native share sheet with the gig's web address; favourite = `putFavorite` / `deleteFavorite` with the
// legacy messages (the owner has "Edit gig" in the purchase box instead); Report = `createGigReport` (reason 6…500,
// trimmed), guest / session ended → login, owner refused, already reported (`viewer.hasReported` or 409); other
// errors (403 restricted, 404, 429) show the API message.
import type { TFunction } from 'i18next';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { ApiClient } from '@mytask/api-client';
import { gigUrl } from '../lib/web-pages';
import { Button, Input, Notice } from './form';
import type { Gig } from './gig-page';
import { BottomSheet, OutlineButton } from './profile';
import { splitError, type ApiError } from './reauth';
import { IconButton } from '../ui';

/** Spec 04 AC-37: the reason is 6…500 characters (contract `GigReportCreateRequest`). */
const REASON_MIN = 6;
const REASON_MAX = 500;

// Phosphor (256 grid): ShareNetwork, Heart regular / fill (as the web), DotsThree bold.
const ICON = {
  share:
    'M176 160a39.89 39.89 0 0 0-28.62 12.09l-46.1-29.63a39.8 39.8 0 0 0 0-28.92l46.1-29.63a40 40 0 1 0-8.66-13.45l-46.1 29.63a40 40 0 1 0 0 55.82l46.1 29.63A40 40 0 1 0 176 160Zm0-128a24 24 0 1 1-24 24 24 24 0 0 1 24-24ZM64 152a24 24 0 1 1 24-24 24 24 0 0 1-24 24Zm112 72a24 24 0 1 1 24-24 24 24 0 0 1-24 24Z',
  heart:
    'M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62Zm-50 174.8C109.74 204.16 32 155.69 32 102a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8Z',
  heartFill:
    'M240 102c0 70-103.79 126.66-108.21 129a8 8 0 0 1-7.58 0C119.79 228.66 16 172 16 102a62.07 62.07 0 0 1 62-62c20.65 0 38.73 8.88 50 23.89C139.27 48.88 157.35 40 178 40a62.07 62.07 0 0 1 62 62Z',
  more: 'M144 128a16 16 0 1 1-16-16 16 16 0 0 1 16 16Zm-84-16a16 16 0 1 0 16 16 16 16 0 0 0-16-16Zm136 0a16 16 0 1 0 16 16 16 16 0 0 0-16-16Z',
} as const;

function Glyph({ name, color }: { name: keyof typeof ICON; color: string }) {
  const px = theme.size.icon.md;
  return (
    <Svg width={px} height={px} viewBox="0 0 256 256" accessible={false}>
      <Path d={ICON[name]} fill={color} />
    </Svg>
  );
}

type Note = { text: string; kind: 'info' | 'success' | 'error'; login?: boolean };

/**
 * The header actions: Share, favourite (not for the owner) and ⋯ → Report. The favourite's messages show in a
 * status line under the row (the legacy toasts), with Login for guests.
 */
export function GigActions({ gig, t, api }: { gig: Gig; t: TFunction; api: ApiClient }) {
  const isOwner = gig.viewer?.isOwner ?? false;
  const [favorite, setFavorite] = useState(gig.viewer?.isFavorite ?? false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>();
  const [reportOpen, setReportOpen] = useState(false);

  const share = () => {
    const url = gigUrl(gig.slug);
    // iOS shares the link as a URL; Android only takes text.
    void Share.share(
      Platform.OS === 'ios' ? { url, title: gig.title } : { message: url, title: gig.title },
      { dialogTitle: t('t_share_this_gig') },
    );
  };

  async function toggleFavorite() {
    const loginNote: Note = {
      text: t('t_pls_login_or_register_to_add_to_favovorite'),
      kind: 'info',
      login: true,
    };
    if (!gig.viewer) return setNote(loginNote);
    setBusy(true);
    const path = { params: { path: { gigId: gig.id } } };
    const res = await (
      favorite ? api.DELETE('/favorites/{gigId}', path) : api.PUT('/favorites/{gigId}', path)
    ).catch(() => undefined);
    setBusy(false);
    if (res?.response.status === 401) return setNote(loginNote);
    if (!res || res.error) {
      const message = (res?.error as ApiError | undefined)?.message;
      return setNote({ text: message || t('t_toast_something_went_wrong'), kind: 'error' });
    }
    setFavorite(!favorite);
    setNote({
      text: t(
        favorite ? 't_gig_removed_from_ur_favorite_list' : 't_gig_has_been_added_to_favorite_list',
      ),
      kind: 'success',
    });
  }

  return (
    <View style={s.actions} testID="gig-actions">
      <View style={s.row}>
        <IconButton accessibilityLabel={t('t_share_this_gig')} onPress={share} testID="share-gig">
          <Glyph name="share" color={theme.colors.text.primary} />
        </IconButton>
        {isOwner ? null : (
          <IconButton
            accessibilityLabel={t(favorite ? 't_remove_from_favorite' : 't_add_to_favorite')}
            accessibilityState={{ busy, selected: favorite }}
            onPress={() => {
              if (!busy) void toggleFavorite();
            }}
            testID="favorite-gig"
          >
            <Glyph
              name={favorite ? 'heartFill' : 'heart'}
              color={favorite ? theme.colors.feedback.dangerText : theme.colors.text.primary}
            />
          </IconButton>
        )}
        <IconButton
          accessibilityLabel={t('t_report_this_gig')}
          onPress={() => setReportOpen(true)}
          testID="report-gig"
        >
          <Glyph name="more" color={theme.colors.text.primary} />
        </IconButton>
      </View>
      {note ? (
        <View style={s.note} testID="favorite-note">
          <Notice kind={note.kind} text={note.text} />
          {note.login ? (
            <OutlineButton label={t('t_login')} onPress={() => router.push('/login')} />
          ) : null}
        </View>
      ) : null}
      <ReportSheet
        gig={gig}
        t={t}
        api={api}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </View>
  );
}

function ReportSheet(props: {
  gig: Gig;
  t: TFunction;
  api: ApiClient;
  open: boolean;
  onClose: () => void;
}) {
  const { gig, t, api } = props;
  const [reason, setReason] = useState('');
  const [check, setCheck] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  // What the sheet shows instead of the form: the login message, a refusal, or the thank-you.
  const [state, setState] = useState<'form' | 'login' | 'owner' | 'reported' | 'done'>(
    !gig.viewer
      ? 'login'
      : gig.viewer.isOwner
        ? 'owner'
        : gig.viewer.hasReported
          ? 'reported'
          : 'form',
  );
  const { field, general } = splitError(error);

  async function send() {
    const text = reason.trim();
    // Pre-check with the API's rule; the API checks again.
    if (!text) return setCheck(t('t_validator_required'));
    if (text.length < REASON_MIN) return setCheck(t('t_validator_min', { min: REASON_MIN }));
    setCheck(undefined);
    setBusy(true);
    setError(undefined);
    const res = await api
      .POST('/gigs/{gigId}/reports', {
        params: { path: { gigId: gig.id } },
        body: { reason: text },
      })
      .catch(() => undefined);
    setBusy(false);
    if (!res) return setError({ code: 'NETWORK', message: t('t_toast_something_went_wrong') });
    // The session ended since the screen loaded: as a guest.
    if (res.response.status === 401) return setState('login');
    if (res.response.status === 409) return setState('reported');
    if (res.error) return setError(res.error as ApiError);
    setReason('');
    setState('done');
  }

  const close = () => {
    setError(undefined);
    setCheck(undefined);
    // Opened again after the thank-you, the sheet reads "already reported".
    if (state === 'done') setState('reported');
    props.onClose();
  };

  const message = {
    login: t('t_pls_login_or_register_to_report_this_gig'),
    owner: t('t_gig_owner_cant_report_his_gig'),
    reported: t('t_looks_like_alrdy_reported_this_gig'),
  };

  return (
    <BottomSheet
      open={props.open}
      onClose={close}
      title={t('t_report_this_gig')}
      closeLabel={t('t_ui_close')}
      testID="report-sheet"
    >
      {state === 'form' ? (
        <>
          {general ? <Notice kind="error" text={general} /> : null}
          <Input
            label={t('t_reason')}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={REASON_MAX}
            placeholder={t('t_let_us_know_why_u_report_this_gig')}
            error={check ?? field('reason')}
          />
          <View style={s.buttons}>
            <View style={s.button}>
              <OutlineButton label={t('t_cancel')} onPress={close} />
            </View>
            <View style={s.button}>
              <Button label={t('t_report')} onPress={() => void send()} busy={busy} />
            </View>
          </View>
        </>
      ) : (
        <>
          <Notice
            kind={state === 'done' ? 'success' : 'info'}
            text={state === 'done' ? t('t_gig_reported_successfully') : message[state]}
          />
          {state === 'login' ? (
            <Button
              label={t('t_login')}
              onPress={() => {
                close();
                router.push('/login');
              }}
            />
          ) : null}
          <OutlineButton label={t('t_ui_close')} onPress={close} />
        </>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  actions: { gap: theme.space[2] },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.space[2] },
  note: { gap: theme.space[2] },
  buttons: { flexDirection: 'row', gap: theme.space[3] },
  button: { flex: 1 },
});
