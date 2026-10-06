// Keyword rule of spec 03 (AC-19, EC-5, EC-6, R-S5, R-S9, P-28): the separators - _ ' " / \ ` + count as spaces,
// letters compare case-insensitively (Latin and Mtavruli/Mkhedruli as typed, no transliteration), the keyword is cut
// to 100 characters, and every word must appear as a substring. The stored `search_documents.search_text` and the
// query words go through the same normalisation, so "every word appears" is a plain substring test.

const SEPARATORS = /[-_'"/\\`+]/g;
const KEYWORD_MAX = 100;

/** Lower-cased, separators and whitespace runs as one space, trimmed. */
export function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(SEPARATORS, ' ').replace(/\s+/g, ' ').trim();
}

/** The distinct words of a keyword; empty when it has only separators (AC-20). */
export function keywordWords(q: string | undefined): string[] {
  if (!q) return [];
  const words = normalizeSearchText(q.slice(0, KEYWORD_MAX)).split(' ').filter(Boolean);
  return [...new Set(words)];
}

/** `%word%` for LIKE, with the LIKE wildcards of the word escaped (backslash is the default escape). */
export function containsPattern(word: string): string {
  return `%${word.replace(/[\\%_]/g, '\\$&')}%`;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Visible text of a sanitised HTML description (tags → spaces, the common entities decoded). */
export function htmlToText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1));
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}
