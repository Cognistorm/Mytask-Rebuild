// Selling → Portfolio → Edit (spec 02 AC-27, AC-42; web `/seller/portfolio/{uid}/edit`): loads the owner's item by
// its public uid (`lookupPortfolioItem`), then shows the shared form with the current images. Someone else's item,
// or one that does not exist, is "Page not found" (the API answers 404 for others' pending/rejected items; an
// active one of someone else is not editable). Signed-in only; a restricted account goes to its notice.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SecondaryButton, Skeleton } from '../../../../components/dashboard';
import { Notice, Screen } from '../../../../components/form';
import { MY_PORTFOLIO, PortfolioForm } from '../../../../components/portfolio-edit/portfolio-form';
import { loadSession, mobileApi } from '../../../../lib/api';
import { createT } from '../../../../lib/i18n';
import type { PortfolioItem } from '../../../../lib/profile';
import { usePublicConfig } from '../../../../lib/public-config';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'restricted' }
  | { kind: 'error' }
  | { kind: 'not-found' }
  | { kind: 'ready'; item: PortfolioItem };

export default function EditPortfolioScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const config = usePublicConfig(locale);
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    if (!(await loadSession())) return setState({ kind: 'signed-out' });
    // `getMe` first: it refreshes an expired token, so the lookup reads as the owner.
    const me = await api.GET('/me').catch(() => undefined);
    if (!me?.data) {
      return setState(me?.response.status === 401 ? { kind: 'signed-out' } : { kind: 'error' });
    }
    if (me.data.isRestricted) return setState({ kind: 'restricted' });
    const res = await api
      .GET('/portfolio-items/lookup', { params: { query: { uid } } })
      .catch(() => undefined);
    if (res?.data) {
      return setState(res.data.isOwn ? { kind: 'ready', item: res.data } : { kind: 'not-found' });
    }
    const status = res?.response.status;
    setState(status === 404 || status === 400 ? { kind: 'not-found' } : { kind: 'error' });
  }, [uid]);

  useEffect(() => void load(), [load]);

  if (state.kind === 'signed-out') return <Redirect href="/login" />;
  if (state.kind === 'restricted') return <Redirect href="/restricted" />;

  return (
    <Screen title={t('t_edit_my_work')}>
      {state.kind === 'loading' ? <Skeleton label={t('t_ui_loading')} tiles={0} rows={5} /> : null}
      {state.kind === 'error' ? (
        <>
          <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
        </>
      ) : null}
      {state.kind === 'not-found' ? (
        <>
          <Notice kind="info" text={t('t_page_not_fount')} />
          <SecondaryButton
            label={t('t_back_to_my_works')}
            onPress={() => router.dismissTo(MY_PORTFOLIO)}
          />
        </>
      ) : null}
      {state.kind === 'ready' ? (
        <PortfolioForm api={api} t={t} config={config} item={state.item} />
      ) : null}
    </Screen>
  );
}
