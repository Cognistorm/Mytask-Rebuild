// `/auth/{provider}/callback` (url-map §5): only the five providers of the contract exist; anything else is
// a real 404 from the server. The exchange itself runs in the browser (callback.tsx).
import { notFound } from 'next/navigation';
import type { SocialProvider } from '../../../../../lib/public-config';
import { SocialCallback } from './callback';

const PROVIDERS = [
  'google',
  'facebook',
  'github',
  'linkedin',
  'twitter',
] as const satisfies readonly SocialProvider[];

export default async function SocialCallbackPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  if (!(PROVIDERS as readonly string[]).includes(provider)) notFound();
  return <SocialCallback provider={provider as SocialProvider} />;
}
