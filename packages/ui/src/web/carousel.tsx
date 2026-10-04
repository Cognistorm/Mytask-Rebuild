'use client';
// Carousel (components.md, screen 01-home.md "Accessibility"): a horizontal list with scroll snap, no auto-advance,
// labelled previous/next buttons that scroll by one view, items reachable by Tab in DOM order. On touch screens
// the list scrolls by swipe; the next item peeks.
import { useRef, type ReactNode } from 'react';
import { SiteIcon } from './site';
import './catalog.css';

export function Carousel(props: {
  label: string;
  previous: string;
  next: string;
  children: ReactNode;
  testId?: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  const step = (dir: 1 | -1) =>
    list.current?.scrollBy({ left: dir * list.current.clientWidth * 0.9, behavior: 'smooth' });
  return (
    <div className="mt-carousel" data-testid={props.testId}>
      <div className="mt-carousel-buttons">
        <button
          type="button"
          className="mt-icon-button mt-carousel-prev"
          aria-label={props.previous}
          onClick={() => step(-1)}
        >
          <SiteIcon name="caret" />
        </button>
        <button
          type="button"
          className="mt-icon-button mt-carousel-next"
          aria-label={props.next}
          onClick={() => step(1)}
        >
          <SiteIcon name="caret" />
        </button>
      </div>
      <ul className="mt-carousel-list" ref={list} aria-label={props.label}>
        {props.children}
      </ul>
    </div>
  );
}
