import type { ReactNode } from 'react';
import { titleMetadata } from '../../../../lib/page-title';

export const generateMetadata = titleMetadata('t_signup');

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
