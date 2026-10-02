// Selling → Portfolio → + (spec 02 AC-24, AC-25; web `/seller/portfolio/create`): "Add a new work" with the shared
// form. Signed-in only; a restricted account goes to its notice.
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { SecondaryButton, Skeleton } from '../../../components/dashboard';
import { Notice, Screen } from '../../../components/form';
import { PortfolioForm } from '../../../components/portfolio-edit/portfolio-form';
import { loadSession, mobileApi } from '../../../lib/api';
import { createT } from '../../../lib/i18n';
import { usePublicConfig } from '../../../lib/public-config';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type State = 'loading' | 'signed-out' | 'restricted' | 'error' | 'ready';

export default function CreatePortfolioScreen() {
  const config = usePublicConfig(locale);
  const [state, setState] = useState<State>('loading');

  const load = async () => {
    setState('loading');
    if (!(await loadSession())) return setState('signed-out');
    const me = await api.GET('/me').catch(() => undefined);
    if (!me?.data) return setState(me?.response.status === 401 ? 'signed-out' : 'error');
    setState(me.data.isRestricted ? 'restricted' : 'ready');
  };

  useEffect(() => void load(), []);

  if (state === 'signed-out') return <Redirect href="/login" />;
  if (state === 'restricted') return <Redirect href="/restricted" />;

  return (
    <Screen title={t('t_add_new_work')}>
      {state === 'loading' ? <Skeleton label={t('t_ui_loading')} tiles={0} rows={5} /> : null}
      {state === 'error' ? (
        <>
          <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
        </>
      ) : null}
      {state === 'ready' ? <PortfolioForm api={api} t={t} config={config} /> : null}
    </Screen>
  );
}
