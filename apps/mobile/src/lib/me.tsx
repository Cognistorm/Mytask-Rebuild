// The signed-in account for the tab screens: loaded once by the tab layout (session gate), shared by the tabs.
import { createContext, useCallback, useContext } from 'react';
import type { ApiClient } from '@mytask/api-client';
import type { components } from '@mytask/types';
import { setDashboardSide, type DashboardSide } from './dashboard';

export type Me = components['schemas']['Me'];

export const MeContext = createContext<{ me: Me; setMe: (me: Me) => void } | undefined>(undefined);

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe outside the tab layout');
  return ctx;
}

/**
 * Switch the dashboard side (AC-2): shown at once, saved on the account (`lastDashboard`, AC-3) so web and app
 * open the same side next time. A failed save keeps the switch (the next one saves again).
 */
export function useSwitchDashboard(api: ApiClient) {
  const { setMe } = useMe();
  return useCallback(
    (side: DashboardSide) => {
      setDashboardSide(side);
      void api.PATCH('/me/preferences', { body: { lastDashboard: side } }).then((res) => {
        if (res.data) setMe(res.data);
      });
    },
    [api, setMe],
  );
}
