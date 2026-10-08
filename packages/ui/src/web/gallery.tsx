'use client';
// Gallery + Lightbox (components.md §7.12; screen 02; spec 04 AC-26; legacy splide main + thumbnail carousels of
// `service.blade.php`): main image 3:2 with previous/next overlay buttons and the counter "2 / 6", a thumbnail strip
// below (buttons with `aria-current`), Arrow keys inside the gallery, swipe on touch; a press on the image opens it
// full screen (Dialog `full`: focus trap, Esc closes, the same controls). One image: no buttons, no strip, no counter.
// Texts arrive translated; styles use design tokens only (gallery.css).
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Dialog } from './profile';
import { SiteIcon } from './site';
import './gallery.css';

export interface GalleryImage {
  id: string;
  /** Large variant: main image and lightbox. */
  src: string;
  /** Small variant: the strip. */
  thumb: string;
  width?: number | null;
  height?: number | null;
}

export interface GalleryLabels {
  /** Name of the gallery region, e.g. "Gallery". */
  region: string;
  previous: string;
  next: string;
  /** Name of the thumbnail strip. */
  thumbnails: string;
  /** Name of the button on the main image that opens the lightbox. */
  enlarge: string;
  close: string;
  /** "Image 2 of 6": thumbnail names and image alt texts. */
  imageOf: (n: number, total: number) => string;
}

/** A horizontal swipe of at least this many CSS pixels changes the image. */
const SWIPE = 40;

export function Gallery(props: {
  images: GalleryImage[];
  /** What the images show (the gig title), at the start of every alt text and the lightbox title. */
  alt: string;
  /** Language of `alt` when it differs from the page (Georgian fallback). */
  lang?: string;
  labels: GalleryLabels;
  testId?: string;
}) {
  const { images, labels } = props;
  const total = images.length;
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const strip = useRef<HTMLUListElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const many = total > 1;
  const current = images[Math.min(index, total - 1)];
  if (!current) return null;

  const alt = (i: number) => (many ? `${props.alt}, ${labels.imageOf(i + 1, total)}` : props.alt);

  /** Shows image `i` (wrapping round); `focusThumb` keeps the keyboard focus on the strip. */
  const go = (i: number, focusThumb = false) => {
    const next = (i + total) % total;
    setIndex(next);
    const thumb = strip.current?.querySelectorAll<HTMLButtonElement>('button')[next];
    if (thumb) {
      thumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (focusThumb) thumb.focus();
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (!many || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const inStrip = strip.current?.contains(document.activeElement) ?? false;
    go(index + (e.key === 'ArrowRight' ? 1 : -1), inStrip);
  };

  const onDown = (e: PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };
  const onUp = (e: PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || !many) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) >= SWIPE && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      swiped.current = true; // the click that follows does not open the lightbox
      go(index + (dx < 0 ? 1 : -1));
    }
  };

  const arrows = (
    <>
      <button
        type="button"
        className="mt-icon-button mt-gallery-arrow mt-gallery-prev"
        aria-label={labels.previous}
        onClick={() => go(index - 1)}
      >
        <SiteIcon name="caret" />
      </button>
      <button
        type="button"
        className="mt-icon-button mt-gallery-arrow mt-gallery-next"
        aria-label={labels.next}
        onClick={() => go(index + 1)}
      >
        <SiteIcon name="caret" />
      </button>
      <p className="mt-gallery-counter" aria-live="polite" data-testid="gallery-counter">
        <span aria-hidden="true">
          {index + 1} / {total}
        </span>
        <span className="mt-visually-hidden">{labels.imageOf(index + 1, total)}</span>
      </p>
    </>
  );

  return (
    <section
      className="mt-gallery"
      aria-label={labels.region}
      onKeyDown={onKey}
      data-testid={props.testId}
    >
      <div
        className="mt-gallery-stage"
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <button
          type="button"
          className="mt-gallery-open"
          aria-label={`${labels.enlarge}: ${alt(index)}`}
          onClick={() => {
            if (swiped.current) {
              swiped.current = false;
              return;
            }
            setOpen(true);
          }}
        >
          <img
            src={current.src}
            alt={alt(index)}
            lang={props.lang}
            width={current.width ?? undefined}
            height={current.height ?? undefined}
            draggable={false}
            data-testid="gallery-image"
          />
        </button>
        {many && arrows}
      </div>

      {many && (
        <ul className="mt-gallery-strip" ref={strip} aria-label={labels.thumbnails}>
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                className="mt-gallery-thumb"
                aria-label={labels.imageOf(i + 1, total)}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
              >
                <img src={image.thumb} alt="" loading="lazy" draggable={false} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={props.alt}
        closeLabel={labels.close}
        size="full"
        testId="gallery-lightbox"
      >
        <div
          className="mt-gallery-stage mt-gallery-lightbox"
          // Arrow keys reach the section's handler: the dialog is its DOM child.
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={() => (swipe.current = null)}
        >
          <img
            src={current.src}
            alt={alt(index)}
            lang={props.lang}
            draggable={false}
            data-testid="lightbox-image"
          />
          {many && arrows}
        </div>
      </Dialog>
    </section>
  );
}
