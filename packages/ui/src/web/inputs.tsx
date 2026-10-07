'use client';
// Wizard inputs (docs/05-design/components.md §5.3 PriceInput and QuantityInput, §5.5 RichTextEditor; first used
// by the gig wizard, spec 04 AC-4, AC-8, AC-9). Same field anatomy as `Field` (visible label, hint, announced
// error); texts arrive translated. Styles use design tokens only (inputs.css).
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import './form.css';
import './inputs.css';

function FieldShell(props: {
  id: string;
  label: string;
  labelId?: string;
  hint?: string;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="auth-field">
      <div className="mt-input-label-row">
        {/* The editor is no form control: it names itself with aria-labelledby instead. */}
        <label id={props.labelId} htmlFor={props.labelId ? undefined : props.id}>
          {props.label}
        </label>
        {props.aside}
      </div>
      {props.children}
      {props.hint && (
        <p id={`${props.id}-hint`} className="auth-hint">
          {props.hint}
        </p>
      )}
      {props.error && (
        <p id={`${props.id}-err`} className="auth-error" role="alert">
          {props.error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;

/**
 * Amount in GEL as typed (§5.3): `₾` prefix, decimal keypad, `,` accepted as the decimal mark. On blur a valid
 * amount is written with 2 decimals; the app turns the text into tetri and checks it, the component does not.
 */
export function PriceInput(props: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  /** Character counter or other text on the label row. */
  aside?: ReactNode;
}) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={props.label}
      hint={props.hint}
      error={props.error}
      aside={props.aside}
    >
      <div className="mt-input-affix">
        <span className="mt-input-prefix" aria-hidden="true">
          ₾
        </span>
        <input
          id={id}
          name={props.name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={props.placeholder}
          value={props.value}
          aria-invalid={!!props.error}
          aria-describedby={describedBy(id, props.hint, props.error)}
          onChange={(e) => props.onChange(e.target.value)}
          onBlur={() => {
            const text = props.value.trim().replace(',', '.');
            if (/^\d+(\.\d{0,2})?$/.test(text)) props.onChange(Number(text).toFixed(2));
          }}
        />
      </div>
    </FieldShell>
  );
}

/**
 * Whole number with − / + buttons (§5.3), e.g. the number of revisions 0…S-041. The value is the typed text, so
 * an empty or invalid entry reaches the app's check; the buttons and Arrow keys stay within min…max.
 */
export function QuantityInput(props: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  decreaseLabel: string;
  increaseLabel: string;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const current = /^\d+$/.test(props.value.trim()) ? Number(props.value.trim()) : null;
  const step = (by: number) => {
    const from = current ?? (by > 0 ? props.min - 1 : props.max + 1);
    props.onChange(String(Math.min(props.max, Math.max(props.min, from + by))));
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      step(e.key === 'ArrowUp' ? 1 : -1);
    }
  };
  return (
    <FieldShell id={id} label={props.label} hint={props.hint} error={props.error}>
      <div className="mt-quantity">
        <button
          type="button"
          className="mt-quantity-button"
          aria-label={props.decreaseLabel}
          aria-controls={id}
          disabled={current !== null && current <= props.min}
          onClick={() => step(-1)}
        >
          −
        </button>
        <input
          id={id}
          name={props.name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          role="spinbutton"
          aria-valuemin={props.min}
          aria-valuemax={props.max}
          aria-valuenow={current ?? undefined}
          value={props.value}
          aria-invalid={!!props.error}
          aria-describedby={describedBy(id, props.hint, props.error)}
          onKeyDown={onKey}
          onChange={(e) => props.onChange(e.target.value)}
        />
        <button
          type="button"
          className="mt-quantity-button"
          aria-label={props.increaseLabel}
          aria-controls={id}
          disabled={current !== null && current >= props.max}
          onClick={() => step(1)}
        >
          +
        </button>
      </div>
    </FieldShell>
  );
}

// ------------------------------------------------------------------ RichTextEditor

/** What the editor writes and keeps (§5.5 scope; the API's `user_text` profile stores the same elements). */
const KEPT = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI']);
const BLOCKS = new Set(['P', 'DIV', 'UL', 'OL', 'LI']);

/**
 * Rebuilds HTML with only the kept elements and no attributes. It is parsed in an inert document (no scripts, no
 * loads), so a stored value never runs anything when it is put into the editor. Other elements keep their text.
 */
function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const out = document.createElement('div');
  const copy = (from: Node, to: Node) => {
    for (const node of Array.from(from.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        to.appendChild(document.createTextNode(node.textContent ?? ''));
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as Element).tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE') continue;
        const target = KEPT.has(tag)
          ? to.appendChild(document.createElement(tag))
          : tag === 'DIV'
            ? to.appendChild(document.createElement('P'))
            : to;
        copy(node, target);
      }
    }
  };
  copy(doc.body, out);
  return out.innerHTML;
}

/** The text without formatting, blocks and line breaks as new lines (length and letter checks). */
function plainText(root: HTMLElement): string {
  let text = '';
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? '';
      else if ((child as Element).tagName === 'BR') text += '\n';
      else {
        const block = BLOCKS.has((child as Element).tagName);
        if (block && text && !text.endsWith('\n')) text += '\n';
        walk(child);
        if (block && !text.endsWith('\n')) text += '\n';
      }
    }
  };
  walk(root);
  return text.trim();
}

type Command = 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList';

/**
 * Restricted rich text (§5.5): bold, italic, bulleted and numbered lists, paragraphs and line breaks; no links,
 * colours, sizes or images. Ctrl/Cmd+B and I work as in any editor; pasted content arrives as plain text. The value
 * is HTML; `onChange` also gives the plain text for the app's length and language checks. The API sanitises.
 */
export function RichTextEditor(props: {
  label: string;
  name: string;
  /** HTML. Changes from outside (a loaded gig) replace the content; the editor's own edits do not. */
  value: string;
  onChange: (html: string, text: string) => void;
  labels: {
    toolbar: string;
    bold: string;
    italic: string;
    bulletedList: string;
    numberedList: string;
  };
  error?: string;
  hint?: string;
  aside?: ReactNode;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const ref = useRef<HTMLDivElement>(null);
  const emitted = useRef<string | null>(null);
  const [active, setActive] = useState<Record<Command, boolean>>({
    bold: false,
    italic: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || props.value === emitted.current) return;
    el.innerHTML = cleanHtml(props.value);
    emitted.current = props.value;
  }, [props.value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const text = plainText(el);
    // An emptied editor keeps a stray <br> or empty paragraph: that is no content.
    const html = text ? el.innerHTML : '';
    emitted.current = html;
    props.onChange(html, text);
  };

  const refreshActive = () => {
    if (!ref.current?.contains(document.activeElement)) return;
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    });
  };

  const run = (command: Command) => {
    ref.current?.focus();
    document.execCommand(command);
    emit();
    refreshActive();
  };

  const tools: { command: Command; label: string; icon: ReactNode }[] = [
    { command: 'bold', label: props.labels.bold, icon: <b>B</b> },
    { command: 'italic', label: props.labels.italic, icon: <i>I</i> },
    { command: 'insertUnorderedList', label: props.labels.bulletedList, icon: <ListIcon /> },
    { command: 'insertOrderedList', label: props.labels.numberedList, icon: <ListIcon numbered /> },
  ];

  return (
    <FieldShell
      id={id}
      labelId={labelId}
      label={props.label}
      hint={props.hint}
      error={props.error}
      aside={props.aside}
    >
      <div className="mt-rte" data-invalid={props.error ? 'true' : undefined}>
        <div
          className="mt-rte-toolbar"
          role="toolbar"
          aria-label={props.labels.toolbar}
          aria-controls={id}
        >
          {tools.map((tool) => (
            <button
              key={tool.command}
              type="button"
              className="mt-rte-tool"
              aria-label={tool.label}
              title={tool.label}
              aria-pressed={active[tool.command]}
              // Keeps the text selection in the editor while the button is pressed.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(tool.command)}
            >
              {tool.icon}
            </button>
          ))}
        </div>
        <div
          ref={ref}
          id={id}
          className="mt-rte-area"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelId}
          aria-invalid={!!props.error}
          aria-describedby={describedBy(id, props.hint, props.error)}
          data-name={props.name}
          tabIndex={0}
          onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
          onInput={emit}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
          }}
          onDrop={(e) => e.preventDefault()}
        />
      </div>
    </FieldShell>
  );
}

function ListIcon({ numbered }: { numbered?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      {[4, 9, 14].map((y, i) =>
        numbered ? (
          <text key={y} x="1" y={y + 2} fontSize="6" fill="currentColor">
            {i + 1}
          </text>
        ) : (
          <circle key={y} cx="3" cy={y} r="1.5" fill="currentColor" />
        ),
      )}
      {[4, 9, 14].map((y) => (
        <line key={y} x1="7" y1={y} x2="17" y2={y} stroke="currentColor" strokeWidth="1.6" />
      ))}
    </svg>
  );
}
