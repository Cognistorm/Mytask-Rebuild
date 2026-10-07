// Edit an own gig `/seller/gigs/{uid}/edit` in the app (spec 04 AC-18, AC-21…AC-25; screen 03 "Edit mode uses the
// same page"; web `/seller/gigs/{uid}/edit`, 4.3.10d), opened by the gig screen's "Edit gig". Signed-in only; `getMe`
// first (it also refreshes an expired token, so the owner's pending or rejected gig is not read as a guest), then the
// public uid → `lookupGig` → owner only (`viewer.isOwner`) → `getGigOwnerView` (both languages, file ids, rejection
// reason). Someone else's gig, a deleted one or an unknown uid is "Page not found". The plan limit never blocks an
// edit (AC-25), so there is no eligibility check.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { EmptyState, SecondaryButton, Skeleton } from '../../../../components/dashboard';
import { Notice, Screen } from '../../../../components/form';
import { GigWizard, MY_GIGS } from '../../../../components/gig-wizard/gig-wizard';
import { loadSession, mobileApi } from '../../../../lib/api';
import { createT } from '../../../../lib/i18n';
import { usePublicConfig } from '../../../../lib/public-config';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type CategoryNode = components['schemas']['CategoryNode'];
type GigOwnerView = components['schemas']['GigOwnerView'];
type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'restricted' }
  | { kind: 'error' }
  | { kind: 'not-found' }
  | { kind: 'ready'; gig: GigOwnerView; categories: CategoryNode[] };

export default function EditGigScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const config = usePublicConfig(locale);
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    if (!(await loadSession())) return setState({ kind: 'signed-out' });
    const me = await api.GET('/me').catch(() => undefined);
    if (me?.response.status === 401) return setState({ kind: 'signed-out' });
    if (!me?.data) return setState({ kind: 'error' });
    if (me.data.isRestricted) return setState({ kind: 'restricted' });
    if (!uid || uid.length > 40) return setState({ kind: 'not-found' });

    const [found, categories] = await Promise.all([
      api.GET('/gigs/lookup', { params: { query: { uid } } }).catch(() => undefined),
      api.GET('/categories').catch(() => undefined),
    ]);
    const status = found?.response.status;
    if (status === 404 || status === 400 || (found?.data && !found.data.viewer?.isOwner)) {
      return setState({ kind: 'not-found' });
    }
    if (!found?.data || !categories?.data) return setState({ kind: 'error' });
    const own = await api
      .GET('/gigs/{gigId}/owner-view', { params: { path: { gigId: found.data.id } } })
      .catch(() => undefined);
    if (own?.response.status === 404) return setState({ kind: 'not-found' });
    if (!own?.data) return setState({ kind: 'error' });
    setState({ kind: 'ready', gig: own.data, categories: categories.data.categories });
  }, [uid]);

  useEffect(() => void load(), [load]);

  if (state.kind === 'signed-out') return <Redirect href="/login" />;
  if (state.kind === 'restricted') return <Redirect href="/restricted" />;
  if (state.kind === 'ready') {
    return (
      <GigWizard api={api} t={t} categories={state.categories} config={config} gig={state.gig} />
    );
  }

  return (
    <Screen title={t('t_edit_gig')}>
      {state.kind === 'loading' ? <Skeleton label={t('t_ui_loading')} tiles={0} rows={6} /> : null}
      {state.kind === 'error' ? (
        <>
          <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
        </>
      ) : null}
      {state.kind === 'not-found' ? (
        <EmptyState
          title={t('t_page_not_fount')}
          action={
            <SecondaryButton label={t('t_my_gigs')} onPress={() => router.dismissTo(MY_GIGS)} />
          }
        />
      ) : null}
    </Screen>
  );
}
