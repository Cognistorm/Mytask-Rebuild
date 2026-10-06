// M-10 entrance (visual-refresh.md §7; ROADMAP 3X.11/3X.12): the inline script of @mytask/ui/web with this request's
// CSP nonce. Render it as the FIRST child of the element whose `.mt-motion-entrance` items should rise in; that element
// gets `data-motion` from the script, so give it `suppressHydrationWarning`.
import { headers } from 'next/headers';
import { MOTION_ENTRANCE_SCRIPT } from '@mytask/ui/web';

export async function MotionEntrance() {
  const nonce = (await headers()).get('x-nonce') ?? '';
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: MOTION_ENTRANCE_SCRIPT }} />;
}
