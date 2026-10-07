// Stored HTML in the app (CONVENTIONS §19, SEC-22): the API sanitises every write with `@mytask/rich-text`; the app
// draws the same profile with native `Text` (no WebView, nothing is ever run). Elements outside the profile are
// left out and their text kept, as the sanitiser does; `dropWithContent` elements are left out with their text.
// Whitespace collapses as in a browser; `<br>` is a line break. Used for the gig description (`user_text`).
import { Fragment, type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import { richTextAllowList, type RichTextProfileName } from '@mytask/rich-text';

export type Node = string | { tag: string; children: Node[] };
interface Span {
  text: string;
  bold: boolean;
  italic: boolean;
}

const BLOCKS = new Set(['p', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'h5', 'h6']);
const DROP = new Set(richTextAllowList.dropWithContent);
const TOKEN = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>|[^<]+|</g;
const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (all, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all;
    }
    return NAMED[code.toLowerCase()] ?? all;
  });
}

/** The element tree of `html`, keeping only the profile's elements (others are unwrapped). */
export function parseRichText(html: string, profile: RichTextProfileName): Node[] {
  const allowed = new Set(richTextAllowList.profiles[profile].elements);
  const root: { tag: string; children: Node[] } = { tag: '', children: [] };
  const stack = [root];
  let dropping: string | null = null;
  for (const m of html.matchAll(TOKEN)) {
    const token = m[0];
    const tag = m[1]?.toLowerCase();
    if (token.startsWith('<!--')) continue;
    if (dropping) {
      if (tag === dropping && token.startsWith('</')) dropping = null;
      continue;
    }
    if (!tag) {
      stack[stack.length - 1]!.children.push(decode(token));
      continue;
    }
    if (token.startsWith('</')) {
      const at = stack.map((n) => n.tag).lastIndexOf(tag);
      if (at > 0) stack.length = at;
      continue;
    }
    if (DROP.has(tag)) {
      if (!token.endsWith('/>')) dropping = tag;
      continue;
    }
    if (!allowed.has(tag)) continue;
    const node = { tag, children: [] as Node[] };
    stack[stack.length - 1]!.children.push(node);
    if (tag !== 'br' && !token.endsWith('/>')) stack.push(node);
  }
  return root.children;
}

function collect(nodes: Node[], bold: boolean, italic: boolean, out: Span[]): void {
  for (const n of nodes) {
    if (typeof n === 'string') out.push({ text: n.replace(/[ \t\n\r\f]+/g, ' '), bold, italic });
    else if (n.tag === 'br') out.push({ text: '\n', bold, italic });
    else {
      const b = bold || n.tag === 'strong' || n.tag === 'b';
      collect(n.children, b, italic || n.tag === 'em' || n.tag === 'i', out);
    }
  }
}

/** Inline content as styled spans, whitespace collapsed (`&nbsp;` kept), trimmed at the run's edges. */
export function inlineSpans(nodes: Node[]): Span[] {
  const out: Span[] = [];
  collect(nodes, false, false, out);
  let text = '';
  for (const sp of out) {
    // A space right after a space or a line break, or at the start, is dropped (as a browser does).
    if (text === '' || text.endsWith(' ') || text.endsWith('\n'))
      sp.text = sp.text.replace(/^ /, '');
    sp.text = sp.text.replace(/ \n/g, '\n').replace(/\n /g, '\n');
    text += sp.text;
  }
  for (let i = out.length - 1; i >= 0; i--) {
    out[i]!.text = out[i]!.text.replace(/ $/, '');
    if (out[i]!.text) break;
  }
  return out.filter((sp) => sp.text);
}

function Run({ nodes, lang }: { nodes: Node[]; lang?: string }) {
  const list = inlineSpans(nodes);
  if (list.length === 0) return null;
  return (
    <Text style={s.text} accessibilityLanguage={lang}>
      {list.map((sp, i) => (
        <Text key={i} style={[sp.bold ? s.bold : null, sp.italic ? s.italic : null]}>
          {sp.text}
        </Text>
      ))}
    </Text>
  );
}

/** Blocks in order: runs of inline content become paragraphs; lists get their bullet or number. */
function blocks(nodes: Node[], lang: string | undefined, key: string): ReactElement[] {
  const out: ReactElement[] = [];
  let run: Node[] = [];
  const flush = () => {
    if (run.length) out.push(<Run key={`${key}-${out.length}`} nodes={run} lang={lang} />);
    run = [];
  };
  nodes.forEach((n, i) => {
    if (typeof n === 'string' || !BLOCKS.has(n.tag)) return run.push(n);
    flush();
    const k = `${key}-${i}`;
    if (n.tag === 'ul' || n.tag === 'ol') {
      const items = n.children.filter(
        (c): c is Exclude<Node, string> => typeof c !== 'string' && c.tag === 'li',
      );
      out.push(
        <View key={k} style={s.list}>
          {items.map((li, j) => (
            <View key={j} style={s.item}>
              <Text style={s.text} accessibilityElementsHidden importantForAccessibility="no">
                {n.tag === 'ol' ? `${j + 1}.` : '•'}
              </Text>
              <View style={s.itemBody}>{blocks(li.children, lang, `${k}-${j}`)}</View>
            </View>
          ))}
        </View>,
      );
    } else out.push(<Fragment key={k}>{blocks(n.children, lang, k)}</Fragment>);
  });
  flush();
  return out;
}

export function RichText(props: {
  html: string;
  profile: RichTextProfileName;
  /** BCP 47 language of the text when it differs from the app's (Georgian fallback). */
  lang?: string;
  testID?: string;
}) {
  return (
    <View style={s.root} testID={props.testID}>
      {blocks(parseRichText(props.html, props.profile), props.lang, 'b')}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: theme.space[3] },
  text: { ...theme.text.body, color: theme.colors.text.primary },
  bold: { fontFamily: theme.fonts.family['700'] },
  italic: { fontStyle: 'italic' },
  list: { gap: theme.space[1] },
  item: { flexDirection: 'row', gap: theme.space[2] },
  itemBody: { flex: 1, gap: theme.space[2] },
});
