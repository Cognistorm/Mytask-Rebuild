'use client';
// The signed-in visitor for client parts of public pages (ROADMAP 4.3.20b): the `(public)` layout puts the
// username of `getViewer` here, so a gig card knows a guest (login message) and the visitor's own gigs (no heart,
// spec 04 AC-35 / R-G10). Nothing but the username reaches the browser.
import { createContext, useContext, type ReactNode } from 'react';

const ViewerContext = createContext<{ username: string | null }>({ username: null });

export function ViewerProvider(props: { username: string | null; children: ReactNode }) {
  return (
    <ViewerContext.Provider value={{ username: props.username }}>
      {props.children}
    </ViewerContext.Provider>
  );
}

export function useViewer() {
  return useContext(ViewerContext);
}
