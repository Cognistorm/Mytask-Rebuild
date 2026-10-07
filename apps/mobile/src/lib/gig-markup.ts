// Gig descriptions in the app (components.md §5.5 "Native": a plain multiline field with Markdown-like lists; the API
// stores one format, the `user_text` HTML). The field holds simple marks that turn into the same HTML the web editor
// sends, and stored HTML turns back into them for an edit (ROADMAP 4.3.15d), so nothing on the allow-list is lost:
//   a line starting with "- " (or "• ", "* ") = bulleted list item, "1. " (or "1) ") = numbered list item,
//   a blank line = new paragraph, a single line break = <br>, **bold**, *italic* (not inside a word: 2*3 stays),
//   ***both***.
// Everything else is text (`<`, `>`, `&` escaped). The API sanitises and checks it again.
import { inlineSpans, parseRichText, type Node } from '../components/rich-text';

const BULLET = /^\s*[-•*]\s+(.*)$/;
const NUMBERED = /^\s*\d{1,3}[.)]\s+(.*)$/;

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ITALIC = /(^|[^*\p{L}\p{N}])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?![*\p{L}\p{N}])/gu;

/** One line of text with its bold / italic marks as HTML. */
function inline(line: string): string {
  // Italic inside and outside the bold parts separately, so the two never cross (`<strong><em></strong></em>`).
  return escape(line)
    .replace(/\*\*\*(?=\S)(.+?)(?<=\S)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>')
    .split(/(<\/?(?:strong|em)>)/)
    .map((part) => (part.startsWith('<') ? part : part.replace(ITALIC, '$1<em>$2</em>')))
    .join('');
}

/** The field's text as the stored HTML ('' when there is nothing but spaces). */
export function markupToHtml(source: string): string {
  const out: string[] = [];
  let paragraph: string[] = [];
  // In an object: the closures below change it, which narrowing of a plain `let` would not see.
  const open: { list: { tag: 'ul' | 'ol'; items: string[] } | null } = { list: null };
  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    const list = open.list;
    if (list) {
      const items = list.items.map((i) => `<li>${inline(i)}</li>`).join('');
      out.push(`<${list.tag}>${items}</${list.tag}>`);
    }
    open.list = null;
  };
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const item = bullet ?? numbered;
    if (item) {
      flushParagraph();
      const tag = bullet ? 'ul' : 'ol';
      if (open.list?.tag !== tag) {
        flushList();
        open.list = { tag, items: [] };
      }
      open.list!.items.push(item[1]!.trim());
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return out.join('');
}

/** Plain text of stored HTML for the length and language checks (tags out, entities decoded, spaces collapsed). */
export function htmlPlainText(html: string): string {
  const lines: string[] = [];
  const walk = (nodes: Node[]) => {
    let run: Node[] = [];
    const flush = () => {
      const text = inlineSpans(run)
        .map((s) => s.text)
        .join('');
      if (text) lines.push(text);
      run = [];
    };
    for (const n of nodes) {
      if (typeof n !== 'string' && ['p', 'ul', 'ol', 'li'].includes(n.tag)) {
        flush();
        walk(n.children);
      } else run.push(n);
    }
    flush();
  };
  walk(parseRichText(html, 'user_text'));
  return lines.join('\n');
}

/** Inline nodes back as marked-up text. */
function marks(nodes: Node[]): string {
  return inlineSpans(nodes)
    .map((s) => {
      // Marks go round the words; the spaces at the edges stay outside them.
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s.text)!;
      if (!m[2]) return s.text;
      let text = m[2];
      if (s.italic) text = `*${text}*`;
      if (s.bold) text = `**${text}**`;
      return `${m[1]}${text}${m[3]}`;
    })
    .join('');
}

/** Stored HTML (`user_text`) as the field's text: paragraphs apart by a blank line, list items one per line. */
export function htmlToMarkup(html: string): string {
  const blocks: string[] = [];
  let run: Node[] = [];
  const flush = () => {
    const text = marks(run).trim();
    if (text) blocks.push(text);
    run = [];
  };
  const visit = (nodes: Node[]) => {
    for (const n of nodes) {
      if (typeof n === 'string' || !['p', 'ul', 'ol', 'li'].includes(n.tag)) {
        run.push(n);
        continue;
      }
      flush();
      if (n.tag === 'ul' || n.tag === 'ol') {
        const items = n.children
          .filter((c): c is Exclude<Node, string> => typeof c !== 'string' && c.tag === 'li')
          .map((li) =>
            marks(li.children)
              .replace(/\s*\n\s*/g, ' ')
              .trim(),
          )
          .filter(Boolean);
        if (items.length) {
          blocks.push(
            items.map((i, j) => (n.tag === 'ol' ? `${j + 1}. ${i}` : `- ${i}`)).join('\n'),
          );
        }
      } else visit(n.children);
    }
  };
  visit(parseRichText(html, 'user_text'));
  flush();
  return blocks.join('\n\n');
}
