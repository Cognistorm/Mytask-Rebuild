// M-10 first-view entrance (visual-refresh.md §7, foundation.css; ROADMAP 3X.11). No 'use client': server components
// render it as an inline <script nonce=…> that is the FIRST child of the container whose `.mt-motion-entrance` items
// should rise in. The script marks that container `data-motion="ready"` (CSS then hides not-yet-seen items) and
// reveals each item once when it scrolls into view. Without JS, without IntersectionObserver / MutationObserver, or
// under reduced motion it does nothing, so nothing is ever hidden. The MutationObserver also catches items that are
// parsed after the script or rendered later by React (a refresh, a client navigation inside the container).
import type { CSSProperties } from 'react';

export const MOTION_ENTRANCE_SCRIPT = `(function () {
  var root = document.currentScript && document.currentScript.parentElement;
  if (
    !root ||
    !('IntersectionObserver' in window) ||
    !('MutationObserver' in window) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) return;
  root.setAttribute('data-motion', 'ready');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.setAttribute('data-seen', '');
      io.unobserve(e.target);
    });
  });
  function watch() {
    root.querySelectorAll('.mt-motion-entrance:not([data-seen])').forEach(function (el) {
      io.observe(el);
    });
  }
  watch();
  new MutationObserver(watch).observe(root, { childList: true, subtree: true });
})();`;

/** Props for one entrance item: its class and its place in the stagger (0-based). */
export function motionEntrance(index: number): { className: string; style: CSSProperties } {
  return {
    className: 'mt-motion-entrance',
    style: { '--mt-motion-index': index } as CSSProperties,
  };
}
