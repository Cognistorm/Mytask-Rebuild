import type { ReactNode } from 'react';
import { titleMetadata } from '../../../../../lib/page-title';

export const generateMetadata = titleMetadata('t_seller_dashboard');

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
