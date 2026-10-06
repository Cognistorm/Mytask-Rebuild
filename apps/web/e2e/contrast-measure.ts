// Measured text contrast on gradients (ROADMAP 3X.18c), for the text axe leaves as "needs review": worst case against
// every colour stop of the background painted under the text. Used by e2e/contrast.spec.ts and the admin's
// e2e/contrast.spec.ts. Thresholds: 4.5, or 3 for large text and for graphics hidden from assistive tech.
// No `@playwright/test` import: the admin's Docker image installs only the admin's packages and still type-checks
// this file through its e2e import, so a Playwright `Page` is accepted by shape.
type Evaluates = { evaluate<R, A>(fn: (arg: A) => R, arg: A): Promise<R> };

/** Worst contrast of each selector's text against the stops of its nearest opaque background (in the page). */
export const measure = (page: Evaluates, selectors: string[]) =>
  page.evaluate((sels: string[]) => {
    type RGBA = [number, number, number, number];
    const parse = (s: string): RGBA[] =>
      (s.match(/rgba?\([^)]+\)|color\(srgb [^)]+\)/g) ?? []).map((c) => {
        const n = (c.match(/-?[\d.]+(e-?\d+)?/g) ?? []).map(Number);
        return c.startsWith('color(')
          ? [n[0]! * 255, n[1]! * 255, n[2]! * 255, n[3] ?? 1]
          : [n[0]!, n[1]!, n[2]!, n[3] ?? 1];
      });
    const lum = ([r, g, b]: RGBA) => {
      const f = (v: number) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: RGBA, b: RGBA) => {
      const [x, y] = [lum(a), lum(b)];
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const over = (fg: RGBA, bg: RGBA): RGBA => [
      fg[0] * fg[3] + bg[0] * (1 - fg[3]),
      fg[1] * fg[3] + bg[1] * (1 - fg[3]),
      fg[2] * fg[3] + bg[2] * (1 - fg[3]),
      1,
    ];
    /** Splits a comma list at the top level only (gradients have commas inside). */
    const layers = (s: string) => {
      const out: string[] = [];
      let depth = 0;
      let start = 0;
      [...s].forEach((ch, i) => {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === ',' && depth === 0) {
          out.push(s.slice(start, i).trim());
          start = i + 1;
        }
      });
      out.push(s.slice(start).trim());
      return out;
    };
    /** The colour stops of one box's own background; null = a photo. A thin layer (the 4 px brand strip along a
     * card's top: background-size under 16 px) is decoration, and a border-box layer under a padding-box fill (the
     * avatar ring) only shows in the border: neither is behind the text. */
    const own = (cs: CSSStyleDeclaration): RGBA[] | null => {
      if (cs.backgroundImage.includes('url(')) return null;
      const sizes = layers(cs.backgroundSize);
      const clips = layers(cs.backgroundClip);
      const filled = clips.some((c) => c !== 'border-box');
      const behind = layers(cs.backgroundImage).filter((_, i) => {
        const size = sizes[i % sizes.length] ?? 'auto';
        if ((size.match(/[\d.]+px/g) ?? []).some((v) => parseFloat(v) < 16)) return false;
        return !(filled && clips[i % clips.length] === 'border-box');
      });
      return [
        ...parse(behind.join(',')),
        ...parse(cs.backgroundColor).filter((c) => c[3] > 0),
      ].filter((c) => c[3] > 0.6);
    };
    /** The first opaque background painted under the text, in paint order at its centre (so a sibling under it
     * counts too: the header over the home hero), including a visible pseudo-element fill. */
    const background = (el: Element): RGBA[] | null => {
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
      const y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
      const stack = r.bottom > 0 && r.top < innerHeight ? document.elementsFromPoint(x, y) : [];
      // Off screen (below the fold): the ancestors are the stack.
      const chain = stack.includes(el) ? stack.slice(stack.indexOf(el)) : [];
      if (!chain.length) for (let e: Element | null = el; e; e = e.parentElement) chain.push(e);
      for (const e of chain) {
        // A visible ::before / ::after fill (hero gradient, the filled current category pill) covers the box's own.
        for (const pseudo of ['::after', '::before']) {
          const p = getComputedStyle(e, pseudo);
          if (p.content === 'none' || Number(p.opacity) <= 0.5) continue;
          // An underline or strip is not a fill: the layer must cover at least half the box's height.
          if (!(parseFloat(p.height) >= e.getBoundingClientRect().height / 2)) continue;
          const fill = own(p);
          if (fill?.length) return fill;
        }
        const stops = own(getComputedStyle(e));
        if (stops === null) return null;
        if (stops.length) return stops;
      }
      return [[255, 255, 255, 1]];
    };
    return sels.map((sel) => {
      const el = document.querySelector(sel);
      if (!el || !(el.textContent ?? '').trim()) return { sel, skip: 'empty' };
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) return { sel, skip: 'hidden' };
      const stops = background(el);
      if (!stops) return { sel, skip: 'photo' };
      const text = parse(cs.color)[0]!;
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      const worst = Math.min(...stops.map((bg) => ratio(over(text, bg), bg)));
      // Hidden from assistive tech (rating stars, avatar initials): a graphic next to its text, 3:1 (WCAG 1.4.11).
      const graphic = el.closest('[aria-hidden="true"]') !== null;
      return { sel, worst: Math.round(worst * 100) / 100, need: large || graphic ? 3 : 4.5 };
    });
  }, selectors);
