// Gig create wizard `/create` in the app (spec 04 AC-1…AC-3; screen 03 "native app"; web `/create`, 4.3.9), also
// `mytask://create`. Signed-in only (a guest goes to login, AC-1); opening asks `getGigCreationEligibility`: a
// restricted account goes to its notice (spec 01 AC-19), a reached plan limit shows the limit and "Upgrade to
// Premium" instead of the form (AC-2; the subscription page is on the website until its slice). The category tree
// is the public `listCategories`.
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { EmptyState, SecondaryButton, Skeleton } from '../components/dashboard';
import { Notice, Screen } from '../components/form';
import { GigWizard } from '../components/gig-wizard/gig-wizard';
import { loadSession, mobileApi } from '../lib/api';
import { createT } from '../lib/i18n';
import { usePublicConfig } from '../lib/public-config';
import { openWebPage, subscriptionUrl } from '../lib/web-pages';
import { Button } from '../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type CategoryNode = components['schemas']['CategoryNode'];
type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'restricted' }
  | { kind: 'error' }
  | { kind: 'limit'; limit: number }
  | { kind: 'ready'; categories: CategoryNode[] };

export default function CreateGigScreen() {
  const config = usePublicConfig(locale);
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    if (!(await loadSession())) return setState({ kind: 'signed-out' });
    const [eligibility, categories] = await Promise.all([
      api.GET('/gigs/creation-eligibility').catch(() => undefined),
      api.GET('/categories').catch(() => undefined),
    ]);
    if (eligibility?.response.status === 401) return setState({ kind: 'signed-out' });
    if ((eligibility?.error as { code?: string } | undefined)?.code === 'ACCOUNT_RESTRICTED') {
      return setState({ kind: 'restricted' });
    }
    if (!eligibility?.data) return setState({ kind: 'error' });
    // AC-2: the form is not shown at all, so no work is lost.
    if (!eligibility.data.canCreate) {
      return setState({ kind: 'limit', limit: eligibility.data.gigLimit ?? 0 });
    }
    if (!categories?.data) return setState({ kind: 'error' });
    setState({ kind: 'ready', categories: categories.data.categories });
  }, []);

  useEffect(() => void load(), [load]);

  if (state.kind === 'signed-out') return <Redirect href="/login" />;
  if (state.kind === 'restricted') return <Redirect href="/restricted" />;
  if (state.kind === 'ready') {
    return <GigWizard api={api} t={t} categories={state.categories} config={config} />;
  }

  return (
    <Screen title={t('t_create_new_gig')}>
      {state.kind === 'loading' ? <Skeleton label={t('t_ui_loading')} tiles={0} rows={6} /> : null}
      {state.kind === 'error' ? (
        <>
          <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
        </>
      ) : null}
      {state.kind === 'limit' ? (
        <EmptyState
          title={t('t_plan_gig_limit_reached', { limit: state.limit })}
          action={
            <Button
              label={t('t_upgrade_to_premium')}
              onPress={() => openWebPage(subscriptionUrl({ gigs: true }))}
              accessibilityRole="link"
              testID="gig-upgrade"
            />
          }
        />
      ) : null}
    </Screen>
  );
}
