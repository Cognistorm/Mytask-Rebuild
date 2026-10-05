// The signed-in account for the tab screens: loaded once by the tab layout, shared by the tabs. Guests (Owner Q-167)
// browse Home and Explore without it; the Dashboard and Account tabs need it (`RequireMe`).
import { Redirect } from 'expo-router';
import { createContext, useCallback, useContext, type ReactNode } from 'react';
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

/** Account-only screens: a guest goes to the login screen (Q-167); after login the app starts at Home. */
export function RequireMe({ children }: { children: ReactNode }) {
  return useContext(MeContext) ? children : <Redirect href="/login" />;
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
