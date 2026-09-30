/* MyTask design-system preview (P2-C3): minimal vanilla JS, no dependencies, works from file://.
   Everything the Owner can click is here: theme, language, token tables, and the interactive components. */
(function () {
  'use strict';
  var LS_THEME = 'mt-preview-theme';
  var LS_LANG = 'mt-preview-lang';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var reduceMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var lang = 'ka';

  function store(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked (file:// in some browsers): ignore */ } }
  function read(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function T(ka, en) { return lang === 'en' ? en : ka; }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function icon(name, cls) { return '<svg class="ico ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>'; }
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
  function focusables(ctx) { return $$(FOCUSABLE, ctx).filter(function (n) { return n.offsetParent !== null || n === document.activeElement; }); }

  /* ---------- Roving radiogroup (theme, language, frame modes, demo widths) ---------- */
  function initRadioGroup(group, onSelect) {
    var opts = $$('[role="radio"]', group);
    function select(opt, focus) {
      opts.forEach(function (o) { var on = o === opt; o.setAttribute('aria-checked', on ? 'true' : 'false'); o.tabIndex = on ? 0 : -1; });
      if (focus) opt.focus();
      onSelect(opt);
    }
    opts.forEach(function (o, i) {
      o.addEventListener('click', function () { select(o, false); });
      o.addEventListener('keydown', function (e) {
        var k = e.key, idx = i;
        if (k === 'ArrowRight' || k === 'ArrowDown') idx = (i + 1) % opts.length;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') idx = (i - 1 + opts.length) % opts.length;
        else if (k === 'Home') idx = 0;
        else if (k === 'End') idx = opts.length - 1;
        else if (k === ' ' || k === 'Enter') { e.preventDefault(); select(o, false); return; }
        else return;
        e.preventDefault(); select(opts[idx], true);
      });
    });
    return { set: function (val, attr) { var o = opts.filter(function (x) { return x.getAttribute(attr) === val; })[0]; if (o) { opts.forEach(function (x) { var on = x === o; x.setAttribute('aria-checked', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; }); } } };
  }

  /* ---------- Theme: Light (default) / Dark / System (Q-059, Q-093) ---------- */
  var themeGroups = [];
  function applyTheme(pref, persist) {
    if (pref !== 'dark' && pref !== 'system') pref = 'light';
    var t = pref === 'system' ? (mq && mq.matches ? 'dark' : 'light') : pref;
    root.setAttribute('data-theme', t);
    root.setAttribute('data-theme-pref', pref);
    themeGroups.forEach(function (g) { g.set(pref, 'data-theme-opt'); });
    $$('[data-theme-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false'); });
    $$('[data-theme-now]').forEach(function (n) { n.textContent = pref === 'system' ? T('სისტემური → ', 'System → ') + (t === 'dark' ? T('მუქი', 'Dark') : T('ღია', 'Light')) : (t === 'dark' ? T('მუქი', 'Dark') : T('ღია', 'Light')); });
    if (persist) store(LS_THEME, pref);
    refreshSwatchValues();
  }
  if (mq) {
    var onScheme = function () { if (root.getAttribute('data-theme-pref') === 'system') applyTheme('system', false); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme); else if (mq.addListener) mq.addListener(onScheme);
  }

  /* ---------- Language: Georgian first, English via toggle ---------- */
  var ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
  var langGroups = [];
  var langListeners = [];
  function applyLang(l, persist) {
    lang = l === 'en' ? 'en' : 'ka';
    root.setAttribute('lang', lang);
    $$('[data-en]').forEach(function (n) {
      if (n.getAttribute('data-ka') === null) n.setAttribute('data-ka', n.textContent);
      n.textContent = lang === 'en' ? n.getAttribute('data-en') : n.getAttribute('data-ka');
    });
    ATTRS.forEach(function (a) {
      $$('[data-en-' + a + ']').forEach(function (n) {
        var k = 'data-ka-' + a;
        if (!n.hasAttribute(k)) n.setAttribute(k, n.getAttribute(a) || '');
        n.setAttribute(a, lang === 'en' ? n.getAttribute('data-en-' + a) : n.getAttribute(k));
      });
    });
    langGroups.forEach(function (g) { g.set(lang, 'data-lang-opt'); });
    $$('[data-lang-item]').forEach(function (n) { n.setAttribute('aria-checked', n.getAttribute('data-lang-item') === lang ? 'true' : 'false'); });
    if (persist) store(LS_LANG, lang);
    langListeners.forEach(function (fn) { fn(); });
    applyTheme(root.getAttribute('data-theme-pref') || 'light', false);
  }

  /* ---------- Fonts: prove FiraGO 400/500/600/700 loaded from ./fonts ---------- */
  function checkFonts() {
    var out = $('#font-status');
    if (!out || !document.fonts || !document.fonts.load) { if (out) out.textContent = 'Font Loading API not available in this browser.'; return; }
    var weights = [400, 500, 600, 700];
    Promise.all(weights.map(function (w) { return document.fonts.load(w + ' 16px FiraGO', 'აბგ ₾'); }))
      .then(function () {
        var res = weights.map(function (w) { return { w: w, ok: Array.from(document.fonts).some(function (f) { return f.family.replace(/"/g, '') === 'FiraGO' && String(f.weight) === String(w) && f.status === 'loaded'; }) }; });
        out.innerHTML = res.map(function (r) { return '<span class="mt-pill ' + (r.ok ? 'mt-pill--success' : 'mt-pill--danger') + '">' + icon(r.ok ? 'check-circle-fill' : 'warning-circle') + 'FiraGO ' + r.w + (r.ok ? ' loaded' : ' NOT loaded') + '</span>'; }).join(' ');
        out.setAttribute('data-fonts-ok', res.every(function (r) { return r.ok; }) ? 'true' : 'false');
      }).catch(function (e) { out.textContent = 'Font check failed: ' + e; out.setAttribute('data-fonts-ok', 'false'); });
  }

  /* ---------- Token tables (values read live from tokens.css) ---------- */
  function toVar(path) { return '--mt-' + path.split('.').map(function (s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(); }).join('-'); }
  function parseColor(str) {
    str = (str || '').trim();
    var m = str.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      var h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
      return { r: parseInt(h.substr(0, 2), 16), g: parseInt(h.substr(2, 2), 16), b: parseInt(h.substr(4, 2), 16), a: h.length === 8 ? parseInt(h.substr(6, 2), 16) / 255 : 1 };
    }
    m = str.match(/rgba?\(([^)]+)\)/);
    if (m) { var p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    return null;
  }
  function composite(fg, bg) { var a = fg.a; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; }
  function lum(c) { function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); } return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b); }
  function ratio(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
  function hex(c) { return '#' + [c.r, c.g, c.b].map(function (v) { var s = Math.round(v).toString(16).toUpperCase(); return s.length < 2 ? '0' + s : s; }).join(''); }
  var probes = {};
  function probe(theme) {
    if (!probes[theme]) { var p = el('div', { 'data-theme': theme, 'aria-hidden': 'true', hidden: '' }); document.body.appendChild(p); probes[theme] = p; }
    return probes[theme];
  }
  function tokenValue(theme, path) { return getComputedStyle(probe(theme)).getPropertyValue(toVar(path)).trim(); }

  var SCALES = {
    brand: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
    neutral: ['0', '50', '100', '200', '300', '400', '450', '500', '600', '700', '750', '800', '850', '900', '950'],
    orange: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
    coral: ['100', '300', '400', '500', '800'],
    green: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
    amber: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
    red: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
    blue: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
  };
  var SCALE_NOTES = { brand: 'Logo teal family. 700 = primary action (Q-073), 600 = hero, 500 = accent only (never text).', neutral: 'One ramp replaces gray + zinc + slate + 77 hex greys.', orange: 'Logo "A". Promotional only: Featured/Top badge, Premium frame, Premium Buy (Q-078, Q-091).', coral: 'Logo "T". Decorative only (favourite heart).', green: 'Success, Selling role (Q-092).', amber: 'Warning, rating stars.', red: 'Danger, errors.', blue: 'Info, Buying role (Q-092).' };
  function buildScales() {
    var host = $('#scales'); if (!host) return;
    Object.keys(SCALES).forEach(function (name) {
      var wrap = el('div', { class: 'pv-scale' });
      wrap.appendChild(el('h4', { class: 'mt-text-title' }, name + ' <span class="mt-text-caption muted">' + SCALE_NOTES[name] + '</span>'));
      var row = el('div', { class: 'pv-scale-row' });
      SCALES[name].forEach(function (step) {
        var v = '--mt-color-' + name + '-' + step;
        var s = el('div', { class: 'pv-swatch' }, '<div class="pv-swatch-chip" style="background:var(' + v + ')"></div><div class="pv-swatch-meta"><b>' + name + '.' + step + '</b><span class="pv-kv" data-var="' + v + '"></span></div>');
        row.appendChild(s);
      });
      wrap.appendChild(row); host.appendChild(wrap);
    });
  }
  var ROLES = {
    bg: ['canvas', 'surface', 'surfaceRaised', 'subtle', 'hover', 'pressed', 'selected', 'brandSoft', 'inverse', 'hero', 'promo', 'scrim', 'skeleton', 'skeletonHighlight'],
    text: ['primary', 'secondary', 'muted', 'disabled', 'inverse', 'link', 'linkHover', 'brand', 'onHero', 'onPromo', 'onImage', 'danger', 'success', 'warning', 'info'],
    border: ['subtle', 'default', 'strong', 'brand', 'danger', 'featured'],
    action: ['primary', 'primaryHover', 'primaryPressed', 'onPrimary', 'secondary', 'secondaryHover', 'secondaryPressed', 'onSecondary', 'ghostHover', 'ghostPressed', 'onGhost', 'danger', 'dangerHover', 'dangerPressed', 'onDanger', 'accent', 'accentHover', 'accentPressed', 'onAccent', 'disabled', 'onDisabled'],
    feedback: ['successBg', 'successBorder', 'successText', 'successIcon', 'warningBg', 'warningBorder', 'warningText', 'warningIcon', 'dangerBg', 'dangerBorder', 'dangerText', 'dangerIcon', 'infoBg', 'infoBorder', 'infoText', 'infoIcon'],
    badge: ['neutralBg', 'neutralText', 'brandBg', 'brandText', 'successBg', 'successText', 'warningBg', 'warningText', 'dangerBg', 'dangerText', 'infoBg', 'infoText', 'featuredBg', 'featuredText', 'premiumBg', 'premiumText'],
    role: ['buyingBg', 'buyingText', 'buyingAccent', 'sellingBg', 'sellingText', 'sellingAccent'],
    rating: ['star', 'starEmpty'],
    status: ['online', 'offline', 'favourite'],
    chat: ['sentBg', 'sentText', 'receivedBg', 'receivedText', 'systemBg', 'systemText', 'paneBg'],
    focus: ['ring']
  };
  function buildRoles() {
    var host = $('#roles'); if (!host) return;
    var html = '<table class="pv-table"><caption class="sr-only">Semantic colour roles, light and dark values</caption><thead><tr><th scope="col">Role (CSS variable)</th><th scope="col">Light</th><th scope="col">Dark</th></tr></thead><tbody>';
    Object.keys(ROLES).forEach(function (g) {
      html += '<tr><th scope="rowgroup" colspan="3">' + g + '</th></tr>';
      ROLES[g].forEach(function (r) {
        var p = g + '.' + r, v = toVar(p);
        html += '<tr><td><code>' + p + '</code><br><span class="pv-kv">' + v + '</span></td>' +
          '<td><span data-theme="light" class="pv-role-chip" style="background:var(' + v + ')"></span><span class="pv-kv" data-role-hex="light" data-path="' + p + '"></span></td>' +
          '<td><span data-theme="dark" class="pv-role-chip" style="background:var(' + v + ')"></span><span class="pv-kv" data-role-hex="dark" data-path="' + p + '"></span></td></tr>';
      });
    });
    host.innerHTML = html + '</tbody></table>';
    $$('[data-role-hex]', host).forEach(function (n) { n.textContent = tokenValue(n.getAttribute('data-role-hex'), n.getAttribute('data-path')); });
  }
  function refreshSwatchValues() {
    var cs = getComputedStyle(root);
    $$('[data-var]').forEach(function (n) { n.textContent = cs.getPropertyValue(n.getAttribute('data-var')).trim(); });
  }
  function buildContrast() {
    var host = $('#contrast'); var sum = $('#contrast-summary');
    if (!host || !window.MT_PAIRS) return;
    var rows = '', total = 0, fails = 0, min = { light: 99, dark: 99 };
    window.MT_PAIRS.forEach(function (p) {
      var need = p.kind === 'ui' ? 3 : 4.5;
      rows += '<tr><td><code>' + p.fg + '</code><br><span class="muted">on</span> <code>' + p.bg + '</code></td><td>' + p.use + '</td><td>' + (p.kind === 'ui' ? 'UI ≥ 3' : 'Text ≥ 4.5') + '</td>';
      ['light', 'dark'].forEach(function (th) {
        var fgc = parseColor(tokenValue(th, p.fg)), bgc = parseColor(tokenValue(th, p.bg));
        if (!fgc || !bgc) { rows += '<td class="pv-fail">unresolved</td>'; fails++; total++; return; }
        if (bgc.a < 1) bgc = composite(bgc, parseColor(p.over || tokenValue(th, 'bg.surface')));
        if (fgc.a < 1) fgc = composite(fgc, bgc);
        var r = ratio(fgc, bgc); total++;
        var ok = r >= need; if (!ok) fails++;
        if (r < min[th]) min[th] = r;
        rows += '<td><span class="pv-sample" style="color:' + hex(fgc) + ';background:' + hex(bgc) + '">' + (p.kind === 'ui' ? '●' : 'აა Aa') + '</span> <span class="tabnum ' + (ok ? 'pv-pass' : 'pv-fail') + '">' + r.toFixed(2) + (ok ? ' pass' : ' FAIL') + '</span><br><span class="pv-kv">' + hex(fgc) + ' / ' + hex(bgc) + '</span></td>';
      });
      rows += '</tr>';
    });
    host.innerHTML = '<table class="pv-table"><caption class="sr-only">WCAG contrast ratios for every defined pair, both themes</caption><thead><tr><th scope="col">Pair</th><th scope="col">Use</th><th scope="col">Minimum</th><th scope="col">Light</th><th scope="col">Dark</th></tr></thead><tbody>' + rows + '</tbody></table>';
    sum.innerHTML = '<span class="mt-pill ' + (fails ? 'mt-pill--danger' : 'mt-pill--success') + '">' + icon(fails ? 'warning-circle' : 'check-circle-fill') + total + ' checks, ' + fails + ' failures</span> <span class="pv-note">Computed in this browser from the loaded tokens.css (WCAG 2.1 relative luminance). Lowest ratio: light ' + min.light.toFixed(2) + ', dark ' + min.dark.toFixed(2) + '.</span>';
    sum.setAttribute('data-checks', String(total)); sum.setAttribute('data-fails', String(fails));
  }
  var TYPE = [
    ['display', 'Home hero h1', 'იპოვე საუკეთესო ფრილანსერი', 'Find the best freelancer'],
    ['h1', 'Page title', 'ლოგო ანიმაცია და ბრენდინგი', 'Logo animation and branding'],
    ['h2', 'Section title', 'ტოპ განცხადებები', 'Top gigs'],
    ['h3', 'Panel, dialog title', 'პროექტის შეჯამება', 'Project summary'],
    ['title', 'Card title (2-line clamp)', 'შევქმნი ხელოვნური ინტელექტით სარეკლამო ვიდეოს', 'I will create an AI advertising video'],
    ['body-lg', 'Long reading', 'პროექტის ფარგლებში ვეძებთ ადამიანს, რომელიც დაგვეხმარება ვიდეო კონტენტის შექმნაში.', 'We are looking for someone to help us create video content.'],
    ['body', 'Default text 16/24', 'თანხა ხელმისაწვდომი გახდება, როცა სამუშაო დადასტურდება.', 'The money becomes available when the work is accepted.'],
    ['body-sm', 'Meta, help, table cells', 'ბოლოს აქტიური: 2 სთ წინ', 'Last active: 2 h ago'],
    ['label', 'Form labels, tabs', 'სერვისის დასახელება', 'Service title'],
    ['caption', 'Timestamps (minimum 13 px)', '9 თვის წინ · 0 წინადადება', '9 months ago · 0 proposals'],
    ['badge', 'Badges, pills', 'გამორჩეული', 'Featured'],
    ['eyebrow', 'Replaces uppercase labels', 'მიმართულებები', 'Categories'],
    ['button-md', 'Buttons', 'კალათაში დამატება', 'Add to cart'],
    ['price', 'Card price, tabular', '₾1,250.00', '₾1,250.00'],
    ['price-lg', 'Purchase box, balances', '₾12,480.50', '₾12,480.50']
  ];
  function buildType() {
    var host = $('#typescale'); if (!host) return;
    host.innerHTML = TYPE.map(function (t) {
      return '<div class="pv-type-row"><span class="pv-kv">.mt-text-' + t[0] + ' · ' + t[1] + ' · <span data-type-size="' + t[0] + '"></span></span><div class="mt-text-' + t[0] + '" data-en="' + t[3] + '">' + t[2] + '</div></div>';
    }).join('');
    measureType();
  }
  function measureType() { $$('[data-type-size]').forEach(function (n) { var s = getComputedStyle(n.parentNode.nextElementSibling); n.textContent = s.fontSize + ' / ' + s.lineHeight + ' / ' + s.fontWeight; }); }
  function buildSimpleTokens() {
    var sp = $('#spacing');
    if (sp) sp.innerHTML = ['0-5', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'].map(function (k) {
      return '<div class="row-3" style="flex-wrap:nowrap"><span class="pv-kv" style="min-width:var(--mt-space-24)">space.' + k.replace('-', '.') + ' = <span data-var="--mt-space-' + k + '"></span></span><div class="pv-space-bar" style="width:var(--mt-space-' + k + ')"></div></div>';
    }).join('');
    var rd = $('#radii');
    if (rd) rd.innerHTML = [['xs', 'checkbox'], ['sm', 'tooltip, menu item'], ['control', 'button, input, tab (md)'], ['card', 'card, menu, toast (lg)'], ['dialog', 'dialog, sheet, bubble (xl)'], ['2xl', 'hero tiles, plan cards'], ['pill', 'avatar, badge, switch (full)']].map(function (r) {
      return '<div class="pv-state"><div class="pv-radius-box" style="border-radius:var(--mt-radius-' + r[0] + ')"></div><span class="pv-cap">radius.' + r[0] + ' = <span data-var="--mt-radius-' + r[0] + '"></span><br>' + r[1] + '</span></div>';
    }).join('');
  }
  function breakpointNow() {
    var n = $('#bp-now'); if (!n) return;
    var w = window.innerWidth, name = w >= 1440 ? '2xl' : w >= 1280 ? 'xl' : w >= 1024 ? 'lg' : w >= 768 ? 'md' : w >= 640 ? 'sm' : 'base (phone)';
    n.textContent = w + ' px → ' + name;
  }

  /* ---------- Tabs (WAI-ARIA, automatic activation) ---------- */
  function initTabs(list) {
    var tabs = $$('[role="tab"]', list);
    function activate(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1;
        var p = x.getAttribute('aria-controls') && document.getElementById(x.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus) t.focus();
      list.dispatchEvent(new CustomEvent('mt-tab', { detail: t }));
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { activate(t, false); });
      t.addEventListener('keydown', function (e) {
        var idx = null, horiz = list.getAttribute('aria-orientation') !== 'vertical';
        if (e.key === (horiz ? 'ArrowRight' : 'ArrowDown')) idx = (i + 1) % tabs.length;
        else if (e.key === (horiz ? 'ArrowLeft' : 'ArrowUp')) idx = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') idx = 0; else if (e.key === 'End') idx = tabs.length - 1;
        if (idx !== null) { e.preventDefault(); activate(tabs[idx], true); }
      });
    });
  }

  /* ---------- Menu button (ARIA menu, menuitemradio for Sort) ---------- */
  var openPop = null;
  function closeOpen(returnFocus) { if (openPop) { var o = openPop; openPop = null; o.close(returnFocus); } }
  document.addEventListener('click', function (e) { if (openPop && !openPop.contains(e.target)) closeOpen(false); });
  function initMenu(btn) {
    var menu = document.getElementById(btn.getAttribute('aria-controls'));
    var wrap = btn.parentNode;
    var items = function () { return $$('[role^="menuitem"]', menu); };
    var typed = '', typedT;
    var api = {
      contains: function (n) { return wrap.contains(n); },
      close: function (rf) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (rf) btn.focus(); }
    };
    function open(which) {
      closeOpen(false);
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); openPop = api;
      var its = items(); var sel = its.filter(function (x) { return x.getAttribute('aria-checked') === 'true'; })[0];
      var target = which === 'last' ? its[its.length - 1] : (sel || its[0]);
      its.forEach(function (x) { x.tabIndex = -1; });
      if (target) target.focus();
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); if (menu.hidden) open('first'); else closeOpen(true); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open('first'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); open('last'); }
    });
    menu.addEventListener('keydown', function (e) {
      var its = items(), i = its.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); its[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); its[its.length - 1].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeOpen(true); }
      else if (e.key === 'Tab') { closeOpen(false); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i > -1) its[i].click(); }
      else if (e.key.length === 1) {
        clearTimeout(typedT); typed += e.key.toLowerCase(); typedT = setTimeout(function () { typed = ''; }, 500);
        var m = its.filter(function (x) { return x.textContent.trim().toLowerCase().indexOf(typed) === 0; })[0]; if (m) m.focus();
      }
    });
    menu.addEventListener('click', function (e) {
      var it = e.target.closest('[role^="menuitem"]'); if (!it) return;
      if (it.getAttribute('role') === 'menuitemradio') {
        items().forEach(function (x) { if (x.getAttribute('role') === 'menuitemradio') x.setAttribute('aria-checked', x === it ? 'true' : 'false'); });
        var lbl = btn.querySelector('[data-menu-value]'); if (lbl) { var src = it.querySelector('[data-en]'); lbl.setAttribute('data-ka', src.getAttribute('data-ka') || src.textContent); lbl.setAttribute('data-en', src.getAttribute('data-en')); lbl.textContent = src.textContent; }
      }
      if (it.hasAttribute('data-lang-item')) applyLang(it.getAttribute('data-lang-item'), true);
      if (it.hasAttribute('data-toast')) toastFrom(it);
      if (it.tagName === 'A') e.preventDefault();
      closeOpen(true);
    });
  }

  /* ---------- Select (custom listbox, keyboard + type-ahead) ---------- */
  function initSelect(wrap) {
    var btn = $('.mt-select-trigger', wrap), list = $('[role="listbox"]', wrap), valueEl = $('[data-select-value]', btn);
    var opts = $$('[role="option"]', list), active = -1, typed = '', tt;
    var api = { contains: function (n) { return wrap.contains(n); }, close: function (rf) { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); list.removeAttribute('aria-activedescendant'); if (rf) btn.focus(); } };
    function setActive(i) { active = i; opts.forEach(function (o, j) { o.classList.toggle('is-active', j === i); }); if (opts[i]) { list.setAttribute('aria-activedescendant', opts[i].id); opts[i].scrollIntoView({ block: 'nearest' }); } }
    function open() { closeOpen(false); list.hidden = false; btn.setAttribute('aria-expanded', 'true'); openPop = api; var s = opts.findIndex(function (o) { return o.getAttribute('aria-selected') === 'true'; }); setActive(s < 0 ? 0 : s); list.focus(); }
    function choose(i) {
      if (!opts[i] || opts[i].getAttribute('aria-disabled') === 'true') return;
      opts.forEach(function (o, j) { o.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
      var src = $('[data-en]', opts[i]);
      valueEl.setAttribute('data-ka', src.getAttribute('data-ka') || src.textContent); valueEl.setAttribute('data-en', src.getAttribute('data-en')); valueEl.textContent = src.textContent; valueEl.classList.remove('muted');
      btn.removeAttribute('aria-invalid'); var err = wrap.parentNode.querySelector('.mt-error'); if (err) err.hidden = true;
      closeOpen(true);
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); if (list.hidden) open(); else closeOpen(true); });
    btn.addEventListener('keydown', function (e) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) > -1) { e.preventDefault(); open(); } });
    list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(active + 1, opts.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(opts.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); closeOpen(true); }
      else if (e.key === 'Tab') { closeOpen(false); }
      else if (e.key.length === 1) { clearTimeout(tt); typed += e.key.toLowerCase(); tt = setTimeout(function () { typed = ''; }, 500); var m = opts.findIndex(function (o) { return o.textContent.trim().toLowerCase().indexOf(typed) === 0; }); if (m > -1) setActive(m); }
    });
    opts.forEach(function (o, i) { o.addEventListener('click', function (e) { e.stopPropagation(); choose(i); }); o.addEventListener('mousemove', function () { setActive(i); }); });
  }

  /* ---------- Disclosure (Explore menu, MegaMenu, InfoButton, account links) ---------- */
  function initDisclosure(btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls')), wrap = btn.closest('[data-disclosure-wrap]') || btn.parentNode;
    var api = { contains: function (n) { return wrap.contains(n); }, close: function (rf) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (rf) btn.focus(); } };
    btn.addEventListener('click', function (e) { e.stopPropagation(); if (panel.hidden) { closeOpen(false); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); openPop = api; } else closeOpen(false); });
    wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); e.stopPropagation(); closeOpen(true); } });
    wrap.addEventListener('focusout', function (e) { if (!panel.hidden && e.relatedTarget && !wrap.contains(e.relatedTarget)) closeOpen(false); });
  }

  /* ---------- Dialog / BottomSheet / Drawer: native <dialog> + explicit focus trap + Esc ---------- */
  function openDialog(d, opener, asSheet) {
    if (!d || d.open) return;
    d.classList.toggle('is-sheet', !!asSheet);
    d._opener = opener || document.activeElement;
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    var first = d.querySelector('[data-initial-focus]') || focusables(d)[0];
    if (first) first.focus();
  }
  function initDialog(d) {
    d.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = focusables(d); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    d.addEventListener('close', function () { if (d._opener && d._opener.focus) d._opener.focus(); d.classList.remove('is-sheet'); });
    d.addEventListener('click', function (e) {
      if (e.target === d && d.hasAttribute('data-scrim-close')) { var r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); }
    });
    $$('[data-dialog-close]', d).forEach(function (b) { b.addEventListener('click', function () { d.close(); if (b.hasAttribute('data-toast')) toastFrom(b); }); });
  }

  /* ---------- Toast ---------- */
  var TOAST_ICON = { success: 'check-circle-fill', error: 'warning-circle', warning: 'warning', info: 'info' };
  function showToast(type, title, msg, actionLabel) {
    var region = $('#toasts'); if (!region) return;
    var t = el('div', { class: 'mt-toast mt-toast--' + type, role: type === 'error' ? 'alert' : 'status' });
    t.innerHTML = icon(TOAST_ICON[type] || 'info') + '<div class="mt-toast-text"><b></b><span></span>' + (actionLabel ? '<button type="button" class="mt-btn mt-btn--ghost mt-btn--sm mt-toast-action"></button>' : '') + '</div><button type="button" class="mt-icon-btn mt-icon-btn--md" aria-label="' + T('დახურვა', 'Close') + '">' + icon('x') + '</button>';
    $('b', t).textContent = title; $('span', t).textContent = msg || '';
    if (actionLabel) { var ab = $('.mt-toast-action', t); ab.textContent = actionLabel; ab.addEventListener('click', function () { dismiss(); }); }
    region.prepend(t);
    while (region.children.length > 3) region.lastElementChild.remove();
    var ms = actionLabel ? 10000 : (type === 'warning' ? 7000 : 5000), left = ms, started = Date.now(), timer = null;
    function dismiss() { clearTimeout(timer); t.remove(); }
    function run() { started = Date.now(); timer = setTimeout(dismiss, left); }
    function pause() { clearTimeout(timer); left -= Date.now() - started; }
    if (!(type === 'error' && actionLabel)) { run(); t.addEventListener('mouseenter', pause); t.addEventListener('mouseleave', run); t.addEventListener('focusin', pause); t.addEventListener('focusout', run); }
    t.lastElementChild.addEventListener('click', dismiss);
  }
  function toastFrom(n) {
    var ty = n.getAttribute('data-toast');
    showToast(ty, T(n.getAttribute('data-toast-ka') || '', n.getAttribute('data-toast-en') || ''), T(n.getAttribute('data-toast-msg-ka') || '', n.getAttribute('data-toast-msg-en') || ''), n.hasAttribute('data-toast-action-ka') ? T(n.getAttribute('data-toast-action-ka'), n.getAttribute('data-toast-action-en')) : null);
  }

  /* ---------- Small components ---------- */
  function initFavourite(b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? T('რჩეულებიდან წაშლა', 'Remove from favourites') : T('რჩეულებში დამატება', 'Add to favourites'));
      b.setAttribute('data-ka-aria-label', on ? 'რჩეულებიდან წაშლა' : 'რჩეულებში დამატება'); b.setAttribute('data-en-aria-label', on ? 'Remove from favourites' : 'Add to favourites');
      showToast('success', on ? T('რჩეულებში დაემატა', 'Added to favourites') : T('რჩეულებიდან წაიშალა', 'Removed from favourites'), '', on ? null : T('გაუქმება', 'Undo'));
    });
  }
  function initPassword(b) {
    var input = document.getElementById(b.getAttribute('aria-controls'));
    b.addEventListener('click', function () {
      var show = input.type === 'password'; input.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show ? 'true' : 'false');
      b.setAttribute('data-ka-aria-label', show ? 'პაროლის დამალვა' : 'პაროლის ჩვენება'); b.setAttribute('data-en-aria-label', show ? 'Hide password' : 'Show password'); b.setAttribute('aria-label', show ? T('პაროლის დამალვა', 'Hide password') : T('პაროლის ჩვენება', 'Show password'));
    });
  }
  function initCounter(ta) {
    var out = document.getElementById(ta.getAttribute('data-counter')), max = +ta.getAttribute('maxlength');
    function upd() { var n = ta.value.length; out.textContent = n + '/' + max; out.setAttribute('aria-live', n > max * 0.9 ? 'polite' : 'off'); }
    ta.addEventListener('input', upd); upd();
  }
  function initSwitch(s) {
    s.addEventListener('click', function () {
      if (s.disabled) return;
      var on = s.getAttribute('aria-checked') !== 'true';
      var busy = s.parentNode.querySelector('.mt-switch-busy');
      s.setAttribute('aria-checked', on ? 'true' : 'false');
      if (busy) { busy.hidden = false; s.disabled = true; setTimeout(function () { busy.hidden = true; s.disabled = false; s.focus(); showToast('success', T('ცვლილება შენახულია', 'Change saved'), ''); }, 900); }
    });
  }
  function initCode(wrap) {
    var ins = $$('input', wrap), err = document.getElementById(wrap.getAttribute('data-error'));
    function check() {
      var v = ins.map(function (i) { return i.value; }).join('');
      if (v.length < 6) { wrap.classList.remove('is-invalid'); ins.forEach(function (i) { i.removeAttribute('aria-invalid'); }); err.hidden = true; return; }
      var bad = v !== '123456'; wrap.classList.toggle('is-invalid', bad); ins.forEach(function (i) { if (bad) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); }); err.hidden = !bad;
      if (!bad) showToast('success', T('კოდი დადასტურდა', 'Code confirmed'), '');
    }
    ins.forEach(function (inp, i) {
      inp.addEventListener('input', function () { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); check(); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) { ins[i - 1].focus(); ins[i - 1].value = ''; } else if (e.key === 'ArrowLeft' && ins[i - 1]) ins[i - 1].focus(); else if (e.key === 'ArrowRight' && ins[i + 1]) ins[i + 1].focus(); });
      inp.addEventListener('paste', function (e) { var d = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6); if (!d) return; e.preventDefault(); d.split('').forEach(function (c, j) { if (ins[j]) ins[j].value = c; }); (ins[d.length] || ins[5]).focus(); check(); });
    });
  }
  function initDropzone(dz) {
    var input = document.getElementById(dz.getAttribute('data-input')), list = document.getElementById(dz.getAttribute('data-list')), live = document.getElementById(dz.getAttribute('data-live'));
    dz.addEventListener('click', function () { input.click(); });
    ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-drag'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-drag'); if (ev === 'drop' && e.dataTransfer) add(e.dataTransfer.files); }); });
    input.addEventListener('change', function () { add(input.files); input.value = ''; });
    function add(files) {
      Array.prototype.forEach.call(files || [], function (f) {
        var tooBig = f.size > 10 * 1024 * 1024;
        var row = el('div', { class: 'mt-file' + (tooBig ? ' is-error' : '') });
        row.innerHTML = icon(tooBig ? 'warning-circle' : 'file-text', 'ico-24 ico-type') + '<div class="stack-2" style="gap:var(--mt-space-1)"><span class="mt-file-name"></span><span class="mt-file-meta"></span>' + (tooBig ? '' : '<div class="mt-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span style="width:0%"></span></div>') + '</div><button type="button" class="mt-icon-btn mt-icon-btn--md">' + icon('x') + '</button>';
        $('.mt-file-name', row).textContent = f.name;
        var meta = $('.mt-file-meta', row); var btn = row.lastElementChild; btn.setAttribute('aria-label', T('წაშლა: ', 'Remove: ') + f.name);
        btn.addEventListener('click', function () { row.remove(); });
        list.appendChild(row);
        if (tooBig) { meta.textContent = T('ფაილი 10 მბ-ზე დიდია', 'File is larger than 10 MB'); return; }
        var pb = $('.mt-progress', row), bar = $('span', pb), p = 0;
        pb.setAttribute('aria-label', T('ატვირთვა: ', 'Uploading: ') + f.name);
        var iv = setInterval(function () { p = Math.min(100, p + 20); bar.style.width = p + '%'; pb.setAttribute('aria-valuenow', String(p)); meta.textContent = p + '%'; if (p >= 100) { clearInterval(iv); pb.remove(); meta.textContent = T('ატვირთულია', 'Uploaded') + ' · ' + Math.max(1, Math.round(f.size / 1024)) + ' KB'; live.textContent = T('ფაილი ატვირთულია: ', 'File uploaded: ') + f.name; } }, 250);
      });
    }
  }
  function initChip(c) { c.addEventListener('click', function () { c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }); }
  function initRemovable(b) { b.addEventListener('click', function () { var chip = b.closest('.mt-chip'); var next = chip.nextElementSibling || chip.previousElementSibling; chip.remove(); var f = next && next.querySelector('button'); if (f) f.focus(); }); }
  function initRoleGroup(name) {
    var opts = $$('[data-role-group="' + name + '"] [data-role]');
    var panels = $$('[data-role-panel][data-role-for="' + name + '"]');
    opts.forEach(function (o) {
      o.addEventListener('click', function (e) {
        e.preventDefault(); var role = o.getAttribute('data-role');
        opts.forEach(function (x) { if (x.getAttribute('data-role') === role) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
        panels.forEach(function (p) { p.hidden = p.getAttribute('data-role-panel') !== role; });
      });
    });
  }
  function initStepper(host) {
    var steps = $$('[data-step]', host), idx = steps.findIndex(function (s) { return s.getAttribute('aria-current') === 'step'; });
    var label = $('[data-step-label]', host), segs = $$('.mt-seg-progress > span', host), prog = $('[data-step-progress]', host), heading = $('[data-step-heading]', host);
    var back = $('[data-step-back]', host), next = $('[data-step-next]', host);
    function go(i, focus) {
      idx = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (s, j) {
        if (j === idx) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
        if (j < idx && !s.classList.contains('is-error')) s.classList.add('is-done');
      });
      segs.forEach(function (s, j) { s.classList.toggle('is-on', j <= idx); });
      if (label) { label.setAttribute('data-ka', 'ნაბიჯი ' + (idx + 1) + ' / ' + steps.length); label.setAttribute('data-en', 'Step ' + (idx + 1) + ' of ' + steps.length); label.textContent = T(label.getAttribute('data-ka'), label.getAttribute('data-en')); }
      if (heading) { var st = $('[data-step-name]', steps[idx]); heading.setAttribute('data-ka', st.getAttribute('data-ka') || st.textContent); heading.setAttribute('data-en', st.getAttribute('data-en')); heading.textContent = st.textContent; if (focus) heading.focus(); }
      if (prog) { var done = steps.filter(function (s) { return s.classList.contains('is-done'); }).length; $('span', prog).style.width = (done / steps.length * 100) + '%'; prog.setAttribute('aria-valuenow', String(done)); }
      if (back) back.disabled = idx === 0;
      if (next) { var last = idx === steps.length - 1; var nl = $('[data-en]', next); nl.setAttribute('data-ka', last ? 'გამოქვეყნება' : 'შემდეგი'); nl.setAttribute('data-en', last ? 'Publish' : 'Next'); nl.textContent = T(nl.getAttribute('data-ka'), nl.getAttribute('data-en')); }
    }
    steps.forEach(function (s, j) { s.addEventListener('click', function () { go(j, true); }); });
    if (back) back.addEventListener('click', function () { go(idx - 1, true); });
    if (next) next.addEventListener('click', function () { if (idx === steps.length - 1) showToast('success', T('განცხადება გამოქვეყნდა', 'Gig published'), T('ეს მხოლოდ დემოა', 'This is only a demo')); else go(idx + 1, true); });
    langListeners.push(function () { go(idx, false); });
    go(idx < 0 ? 0 : idx, false);
  }
  function initGallery(g) {
    var img = $('.mt-gallery-main img', g), thumbs = $$('.mt-gallery-thumbs button', g), count = $('.mt-gallery-count', g), i = 0;
    function show(n) { i = (n + thumbs.length) % thumbs.length; img.src = $('img', thumbs[i]).src; thumbs.forEach(function (t, j) { t.setAttribute('aria-current', j === i ? 'true' : 'false'); }); count.textContent = (i + 1) + ' / ' + thumbs.length; }
    $('.prev', g).addEventListener('click', function () { show(i - 1); });
    $('.next', g).addEventListener('click', function () { show(i + 1); });
    thumbs.forEach(function (t, j) { t.addEventListener('click', function () { show(j); }); });
    g.addEventListener('keydown', function (e) { if (e.target.closest('.mt-gallery-thumbs') || e.target.closest('.mt-gallery-main')) { if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); } if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); } } });
  }
  function initCarousel(c) {
    var track = $('.mt-carousel-track', c);
    $$('[data-carousel]', c.parentNode).forEach(function (b) { b.addEventListener('click', function () { track.scrollBy({ left: (b.getAttribute('data-carousel') === 'next' ? 1 : -1) * track.clientWidth * 0.9, behavior: reduceMq && reduceMq.matches ? 'auto' : 'smooth' }); }); });
  }
  function initLoading(b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-busy') === 'true') return;
      b.setAttribute('aria-busy', 'true'); var sp = el('span', { class: 'mt-spinner', 'aria-hidden': 'true' }); b.prepend(sp);
      setTimeout(function () { sp.remove(); b.removeAttribute('aria-busy'); showToast('success', T('შენახულია', 'Saved'), ''); }, 1500);
    });
  }
  function initLoadMore(b) {
    var grid = document.getElementById(b.getAttribute('data-loadmore')), status = document.getElementById(b.getAttribute('data-status')), shown = +b.getAttribute('data-shown'), total = +b.getAttribute('data-total');
    function upd() { status.setAttribute('data-ka', 'ნაჩვენებია ' + shown + ' / ' + total); status.setAttribute('data-en', 'Showing ' + shown + ' of ' + total); status.textContent = T(status.getAttribute('data-ka'), status.getAttribute('data-en')); }
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-busy') === 'true') return;
      b.setAttribute('aria-busy', 'true'); grid.setAttribute('aria-busy', 'true'); var sp = el('span', { class: 'mt-spinner', 'aria-hidden': 'true' }); b.prepend(sp);
      setTimeout(function () {
        var src = grid.firstElementChild; for (var k = 0; k < 2; k++) { var c = src.cloneNode(true); $$('[id]', c).forEach(function (n) { n.removeAttribute('id'); }); grid.appendChild(c); $$('.mt-fav', c).forEach(initFavourite); }
        shown = Math.min(total, shown + 2); upd(); sp.remove(); b.removeAttribute('aria-busy'); grid.removeAttribute('aria-busy');
        if (shown >= total) b.disabled = true;
      }, 800);
    });
    langListeners.push(upd); upd();
  }
  function initRatingInput(fs) {
    var labels = $$('label', fs), inputs = $$('input', fs), out = $('[data-rating-out]', fs.parentNode);
    function paint(n) { labels.forEach(function (l, j) { l.classList.toggle('is-on', j < n); }); }
    function cur() { var c = inputs.findIndex(function (i) { return i.checked; }); return c + 1; }
    inputs.forEach(function (inp, j) { inp.addEventListener('change', function () { paint(j + 1); if (out) out.textContent = T((j + 1) + ' ვარსკვლავი', (j + 1) + (j ? ' stars' : ' star')); }); });
    labels.forEach(function (l, j) { l.addEventListener('mouseenter', function () { paint(j + 1); }); });
    fs.addEventListener('mouseleave', function () { paint(cur()); });
  }
  function initRte(bar) {
    $$('[data-cmd]', bar).forEach(function (b) {
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () { try { document.execCommand(b.getAttribute('data-cmd')); } catch (e) { /* not supported */ } b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
    });
  }
  function initFrameModes(group) {
    var target = document.getElementById(group.getAttribute('data-frames'));
    initRadioGroup(group, function (opt) {
      var m = opt.getAttribute('data-mode');
      target.classList.toggle('is-side', m === 'side');
      target.classList.toggle('is-phone', m === 'phone');
    });
  }
  function initWidthModes(group) {
    var target = document.getElementById(group.getAttribute('data-width-target'));
    initRadioGroup(group, function (opt) { target.style.maxWidth = opt.getAttribute('data-width') === 'full' ? '100%' : opt.getAttribute('data-width'); });
  }
  function initTabbar(list) {
    var title = document.getElementById(list.getAttribute('data-title'));
    list.addEventListener('mt-tab', function (e) { var lbl = $('[data-en]', e.detail); title.setAttribute('data-ka', lbl.getAttribute('data-ka') || lbl.textContent); title.setAttribute('data-en', lbl.getAttribute('data-en')); title.textContent = lbl.textContent; });
  }
  function initMotion(btn) {
    btn.addEventListener('click', function () { $$('.pv-motion-track').forEach(function (t) { t.classList.toggle('is-on'); }); });
  }
  function initHeaderScroll(frame) {
    /* Signature behaviour kept: header transparent over the hero turns solid on scroll (here: inside the phone frame). */
    var sc = frame, hd = $('.mt-header', frame);
    sc.addEventListener('scroll', function () { var solid = sc.scrollTop > 8; hd.classList.toggle('mt-header--hero', !solid); });
  }

  /* ---------- Boot ---------- */
  function boot() {
    $$('[data-theme-group]').forEach(function (g) { themeGroups.push(initRadioGroup(g, function (o) { applyTheme(o.getAttribute('data-theme-opt'), true); })); });
    $$('[data-lang-group]').forEach(function (g) { langGroups.push(initRadioGroup(g, function (o) { applyLang(o.getAttribute('data-lang-opt'), true); })); });
    $$('[data-theme-toggle]').forEach(function (b) { b.addEventListener('click', function () { applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true); }); });
    buildScales(); buildRoles(); buildType(); buildSimpleTokens(); buildContrast();
    $$('[role="tablist"]').forEach(initTabs);
    $$('[aria-haspopup="menu"]').forEach(initMenu);
    $$('[data-select]').forEach(initSelect);
    $$('[data-disclosure]').forEach(initDisclosure);
    $$('dialog').forEach(initDialog);
    $$('[data-dialog-open]').forEach(function (b) { b.addEventListener('click', function () { openDialog(document.getElementById(b.getAttribute('data-dialog-open')), b, b.hasAttribute('data-as-sheet')); }); });
    $$('[data-toast]').forEach(function (b) { if (!b.closest('[role="menu"]') && !b.hasAttribute('data-dialog-close')) b.addEventListener('click', function () { toastFrom(b); }); });
    $$('.mt-fav').forEach(initFavourite);
    $$('[data-password-toggle]').forEach(initPassword);
    $$('[data-counter]').forEach(initCounter);
    $$('.mt-switch').forEach(initSwitch);
    $$('[data-code]').forEach(initCode);
    $$('[data-dropzone]').forEach(initDropzone);
    $$('.mt-chip[aria-pressed]').forEach(initChip);
    $$('.mt-chip-remove').forEach(initRemovable);
    var groups = {}; $$('[data-role-group]').forEach(function (g) { groups[g.getAttribute('data-role-group')] = 1; }); Object.keys(groups).forEach(initRoleGroup);
    $$('[data-stepper]').forEach(initStepper);
    $$('[data-gallery]').forEach(initGallery);
    $$('.mt-carousel').forEach(initCarousel);
    $$('[data-loading-demo]').forEach(initLoading);
    $$('[data-loadmore]').forEach(initLoadMore);
    $$('.mt-rating-input').forEach(initRatingInput);
    $$('.mt-rte-bar').forEach(initRte);
    $$('[data-frames]').forEach(initFrameModes);
    $$('[data-width-target]').forEach(initWidthModes);
    $$('[data-radiogroup]').forEach(function (g) { initRadioGroup(g, function () {}); });
    $$('[data-tabbar]').forEach(initTabbar);
    $$('[data-motion-play]').forEach(initMotion);
    $$('[data-header-scroll]').forEach(initHeaderScroll);
    $$('.mt-has-tip').forEach(function (n) { n.addEventListener('keydown', function (e) { if (e.key === 'Escape') n.classList.add('is-tip-closed'); }); n.addEventListener('mouseleave', function () { n.classList.remove('is-tip-closed'); }); n.addEventListener('blur', function () { n.classList.remove('is-tip-closed'); }); });
    $$('a[href="#"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); }); });
    $$('form[data-demo-form]').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); }); });
    var savedLang = read(LS_LANG);
    applyLang(savedLang === 'en' ? 'en' : 'ka', false);
    applyTheme(read(LS_THEME) || 'light', false);
    langListeners.push(measureType);
    breakpointNow(); window.addEventListener('resize', breakpointNow);
    checkFonts();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureType);
    root.setAttribute('data-preview-ready', 'true');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
