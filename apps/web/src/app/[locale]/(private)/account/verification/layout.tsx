import type { ReactNode } from 'react';
import { titleMetadata } from '../../../../../lib/page-title';

export const generateMetadata = titleMetadata('t_verification_center');

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
