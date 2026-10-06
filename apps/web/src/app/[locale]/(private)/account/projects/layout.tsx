import type { ReactNode } from 'react';
import { titleMetadata } from '../../../../../lib/page-title';

export const generateMetadata = titleMetadata('t_buyer_dashboard');

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
