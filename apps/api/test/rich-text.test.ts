// The one HTML sanitiser (CONVENTIONS §19, SEC-22): profile rules, URL rules (SEC-32(d)) and an XSS corpus
// (OWASP XSS filter-evasion cheat sheet vectors and mutation-XSS cases) against every profile.
import allowList from '@mytask/rich-text/allow-list.json';
import { describe, expect, it } from 'vitest';
import {
  richTextPlainText,
  sanitizeRichText,
  type RichTextProfileName,
} from '../src/platform/rich-text/rich-text';

const MEDIA = 'https://media.example/public-media';
const PROFILES = Object.keys(allowList.profiles) as RichTextProfileName[];
const staff = (html: string) => sanitizeRichText(html, 'staff_content', MEDIA);
const links = (html: string) => sanitizeRichText(html, 'user_text_links', MEDIA);
const text = (html: string) => sanitizeRichText(html, 'user_text', MEDIA);

describe('rich text: profiles', () => {
  it('user_text keeps its formatting elements and unwraps everything else', () => {
    expect(text('<p>a <strong>b</strong> <em>c</em><br>d</p><ul><li>e</li></ul>')).toBe(
      '<p>a <strong>b</strong> <em>c</em><br />d</p><ul><li>e</li></ul>',
    );
    expect(text('<h2>Title</h2><a href="https://x.example">link</a><img src="x">')).toBe(
      'Titlelink',
    );
  });

  it('user_text_links adds http(s) links with the user rel, no mailto or relative links', () => {
    expect(links('<a href="https://x.example/a?b=1">x</a>')).toBe(
      '<a href="https://x.example/a?b=1" rel="nofollow ugc noopener noreferrer">x</a>',
    );
    expect(links('<a href="mailto:a@b.example">m</a> <a href="/about">r</a>')).toBe('m r');
  });

  it('staff_content keeps headings, tables, mailto, site paths and media-library images', () => {
    expect(staff('<h2>A</h2><h3>B</h3><table><thead><tr><th colspan="2">h</th></tr></thead>')).toBe(
      '<h2>A</h2><h3>B</h3><table><thead><tr><th colspan="2">h</th></tr></thead></table>',
    );
    expect(staff('<a href="mailto:info@mytask.ge">m</a><a href="/ka/blog#top">r</a>')).toBe(
      '<a href="mailto:info@mytask.ge" rel="noopener">m</a><a href="/ka/blog#top" rel="noopener">r</a>',
    );
    expect(
      staff(`<img src="${MEDIA}/a/b.webp" alt="ლოგო" width="120" height="80px" onload="x()">`),
    ).toBe(`<img src="${MEDIA}/a/b.webp" alt="ლოგო" width="120" />`);
    expect(staff('<h1>top</h1><div class="x"><span style="color:red">t</span></div>')).toBe('topt');
  });

  it('removes every attribute outside the profile and replaces a given rel', () => {
    expect(
      staff(
        '<p id="a" class="b" style="c" data-x="d" onclick="e()">t</p><a href="https://x.example" target="_blank" rel="opener">l</a>',
      ),
    ).toBe('<p>t</p><a href="https://x.example/" rel="noopener">l</a>');
    expect(staff('<td rowspan="0">a</td><th colspan="2 onclick=x">b</th>')).toBe(
      '<td>a</td><th>b</th>',
    );
  });

  it('drops comments and the dangerous elements together with their content', () => {
    const VOID = ['embed', 'input', 'base', 'meta', 'link'];
    for (const tag of allowList.dropWithContent) {
      // A void element has no content: the text after it is ordinary text. `plaintext` has no end tag in HTML, so
      // since sanitize-html 2.17.7 (SEC-77) everything after it is dropped, as a browser would swallow it.
      const expected = VOID.includes(tag) ? 'asecretb' : tag === 'plaintext' ? 'a' : 'ab';
      expect(staff(`a<${tag}>secret</${tag}>b`), tag).toBe(expected);
    }
    expect(staff('a<!-- <img src=x onerror=alert(1)> -->b')).toBe('ab');
  });

  // Security review 08 SEC-77: the two published sanitize-html advisories, as regression cases for every profile.
  it.each([
    [
      'GHSA-jxwj-j7wr-gfrw textarea mutation',
      '<textarea></textarea><img src=x onerror=alert(1)>ok',
    ],
    ['GHSA-jxwj-j7wr-gfrw textarea content', '<textarea><img src=x onerror=alert(1)></textarea>ok'],
    [
      'GHSA-g8qq-57p8-ggw5 SVG SMIL scheme',
      '<svg><a><animate attributeName="href" values="javascript:alert(1)"/><text y="20">x</text></a></svg>ok',
    ],
    [
      'GHSA-g8qq-57p8-ggw5 SVG set',
      '<svg><set attributeName="href" to="javascript:alert(1)"/></svg>ok',
    ],
  ])('%s: no script, event handler or script URL survives', (_name, payload) => {
    for (const profile of PROFILES) {
      const out = sanitizeRichText(payload, profile, MEDIA);
      expect(out, profile).not.toMatch(/javascript:|onerror|<svg|<textarea|<animate|<set|<img/i);
      expect(out, profile).toContain('ok');
    }
  });
});

describe('rich text: links', () => {
  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'java&#x09;script:alert(1)',
    '&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)',
    '&#x6A;avascript:alert(1)',
    'javascript&colon;alert(1)',
    '\u0001javascript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'file:///etc/passwd',
    'ftp://x.example',
    '//evil.example/path',
    '/\\evil.example/path',
    '\\\\evil.example',
    'https:\\\\evil.example',
    '/\u0009/evil.example',
    'https://mytask.ge@evil.example/',
    'https://user:pass@x.example/',
    'page.html',
    '?q=1',
    '',
  ])('removes the link but keeps its text: %s', (href) => {
    expect(staff(`<a href="${href}">text</a>`)).toBe('text');
  });

  it('a refused link or image does not change the elements after it', () => {
    expect(staff('<p><a href="javascript:1">a</a><a href="https://x.example">b</a>c</p>')).toBe(
      '<p>a<a href="https://x.example/" rel="noopener">b</a>c</p>',
    );
    expect(
      staff(
        `<p><img src="x"><img src="${MEDIA}/a.png"><a href="/x">a</a><a>b</a><a href="/y">c</a></p>`,
      ),
    ).toBe(
      `<p><img src="${MEDIA}/a.png" /><a href="/x" rel="noopener">a</a>b<a href="/y" rel="noopener">c</a></p>`,
    );
    expect(staff('<ul><li><a href="//e.example">a</a></li><li><a href="/b">b</a></li></ul>')).toBe(
      '<ul><li>a</li><li><a href="/b" rel="noopener">b</a></li></ul>',
    );
  });

  it('a link without href is unwrapped', () => {
    expect(staff('<a name="x">t</a>')).toBe('t');
  });
});

describe('rich text: images (SEC-32(d))', () => {
  it.each([
    'https://media.example.evil/public-media/a.png',
    'https://media.example/public-media-evil/a.png',
    'https://media.example/public-media',
    'https://media.example/public-media/../private/a.png',
    'https://media.example/public-media/%2e%2e/private/a.png',
    'https://media.example:8443/public-media/a.png',
    'http://media.example/public-media/a.png',
    'https://x@media.example/public-media/a.png',
    'https://evil.example/https://media.example/public-media/a.png',
    '//media.example/public-media/a.png',
    '/public-media/a.png',
    'data:image/png;base64,iVBORw0KGgo=',
    'javascript:alert(1)',
  ])('removes an image outside the media library: %s', (src) => {
    expect(staff(`a<img src="${src}">b`)).toBe('ab');
  });

  it('removes every image when PUBLIC_MEDIA_BASE_URL is not set', () => {
    expect(sanitizeRichText(`<img src="${MEDIA}/a.png">x`, 'staff_content', undefined)).toBe('x');
  });

  it('keeps an image under a base URL with a trailing slash', () => {
    expect(sanitizeRichText(`<img src="${MEDIA}/a.png">`, 'staff_content', `${MEDIA}/`)).toBe(
      `<img src="${MEDIA}/a.png" />`,
    );
  });
});

// OWASP XSS filter-evasion cheat sheet and mutation-XSS (mXSS) vectors.
const CORPUS = [
  '<script>alert(1)</script>',
  '<SCRIPT SRC=https://xss.example/xss.js></SCRIPT>',
  '<IMG SRC="javascript:alert(\'XSS\');">',
  "<IMG SRC=javascript:alert('XSS')>",
  "<IMG SRC=JaVaScRiPt:alert('XSS')>",
  '<IMG SRC=`javascript:alert("RSnake says, \'XSS\'")`>',
  '<a onmouseover="alert(document.cookie)">xxs link</a>',
  '<a onmouseover=alert(document.cookie)>xxs link</a>',
  '<IMG """><SCRIPT>alert("XSS")</SCRIPT>"\\>',
  '<IMG SRC=# onmouseover="alert(\'xxs\')">',
  '<IMG SRC= onmouseover="alert(\'xxs\')">',
  '<IMG onmouseover="alert(\'xxs\')">',
  '<IMG SRC=/ onerror="alert(String.fromCharCode(88,83,83))"></img>',
  '<img src=x onerror="&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058&#0000097&#0000108&#0000101&#0000114&#0000116&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041">',
  '<IMG SRC=&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;>',
  '<IMG SRC=&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74&#x3A&#x61&#x6C&#x65&#x72&#x74&#x28&#x27&#x58&#x53&#x53&#x27&#x29>',
  '<IMG SRC="jav\tascript:alert(\'XSS\');">',
  '<IMG SRC="jav&#x09;ascript:alert(\'XSS\');">',
  '<IMG SRC="jav&#x0A;ascript:alert(\'XSS\');">',
  '<IMG SRC=" &#14;  javascript:alert(\'XSS\');">',
  '<SCRIPT/XSS SRC="https://xss.example/xss.js"></SCRIPT>',
  '<BODY onload!#$%&()*~+-_.,:;?@[/|\\]^`=alert("XSS")>',
  '<<SCRIPT>alert("XSS");//\\<</SCRIPT>',
  '<SCRIPT SRC=https://xss.example/xss.js?< B >',
  '<IMG SRC="`<javascript:alert>`(\'XSS\')"',
  '</TITLE><SCRIPT>alert("XSS");</SCRIPT>',
  '<INPUT TYPE="IMAGE" SRC="javascript:alert(\'XSS\');">',
  '<BODY BACKGROUND="javascript:alert(\'XSS\')">',
  "<svg/onload=alert('XSS')>",
  '<BGSOUND SRC="javascript:alert(\'XSS\');">',
  '<LINK REL="stylesheet" HREF="javascript:alert(\'XSS\');">',
  "<STYLE>@import'https://xss.example/xss.css';</STYLE>",
  '<META HTTP-EQUIV="refresh" CONTENT="0;url=javascript:alert(\'XSS\');">',
  '<IFRAME SRC="javascript:alert(\'XSS\');"></IFRAME>',
  '<TABLE BACKGROUND="javascript:alert(\'XSS\')">',
  '<TABLE><TD BACKGROUND="javascript:alert(\'XSS\')">',
  '<DIV STYLE="background-image: url(javascript:alert(\'XSS\'))">',
  '<DIV STYLE="width: expression(alert(\'XSS\'));">',
  '<BASE HREF="javascript:alert(\'XSS\');//">',
  '<OBJECT TYPE="text/x-scriptlet" DATA="https://xss.example/scriptlet.html"></OBJECT>',
  '<EMBED SRC="data:image/svg+xml;base64,PHN2ZyB4bWxuczpzdmc9Imh0dH A6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcv">',
  '<a href="javas&#99;ript:alert(1)">x</a>',
  '<a href="&#x6a;avascript&#x3a;alert(1)">x</a>',
  '<a href="javascript&colon;alert(1)">x</a>',
  '<a href=" &#x20; javascript:alert(1)">x</a>',
  '<a href="data:text/html,<script>alert(1)</script>">x</a>',
  '<form><button formaction="javascript:alert(1)">x</button></form>',
  '<details open ontoggle=alert(1)>',
  '<video><source onerror="alert(1)">',
  '<audio src=x onerror=alert(1)>',
  '<marquee onstart=alert(1)>',
  '<isindex type=image src=1 onerror=alert(1)>',
  // mutation XSS
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
  '<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">',
  '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=1 onerror=alert(1)&gt;">',
  '<math><mi><mglyph><svg><mtext><textarea><path id="</textarea><img onerror=alert(1) src=1>">',
  '<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>',
  '<xmp><p title="</xmp><img src=x onerror=alert(1)>">',
  '<template><p title="</template><img src=x onerror=alert(1)>">',
  '<textarea><p title="</textarea><img src=x onerror=alert(1)>">',
  '<title><p title="</title><img src=x onerror=alert(1)>">',
  '<p title="&lt;/p&gt;&lt;img src=x onerror=alert(1)&gt;">t</p>',
  '<a href="https://x.example" title="&quot;onmouseover=alert(1)">x</a>',
  '<img src="https://media.example/public-media/a.png" alt="&quot; onerror=&quot;alert(1)">',
  '<img src="https://media.example/public-media/a.png?x=&quot;onerror=alert(1)//">',
  '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
  '<!--><img src=x onerror=alert(1)>-->',
  '<![CDATA[<img src=x onerror=alert(1)>]]>',
  '<?xml version="1.0"?><img src=x onerror=alert(1)>',
  '<a href="https://x.example"><a href="javascript:alert(1)">nested</a></a>',
  '<p><a href="javascript:alert(1)">a</a><a href="https://x.example">b</a><img src=x><b>c</b></p>',
  '<p><img src=x onerror=alert(1)><a href="/ok">a</a><a>b</a><a href="/ok">c</a></p>',
];

/** Every element and attribute in the output, read from the serialised HTML (values are escaped, so `>` is safe). */
function tagsOf(html: string): { tag: string; attrs: string[] }[] {
  return [...html.matchAll(/<\/?([a-zA-Z][^\s/>]*)([^>]*)>/g)].map((m) => ({
    tag: m[1]!.toLowerCase(),
    // The serialiser writes every value as `name="…"` with `"` escaped.
    attrs: [...m[2]!.matchAll(/([^\s="'/]+)(?:="[^"]*")?/g)].map((a) => a[1]!.toLowerCase()),
  }));
}

describe('rich text: XSS corpus', () => {
  for (const profileName of PROFILES) {
    const profile = allowList.profiles[profileName];
    const allowed = profile.attributes as Record<string, string[]>;
    it(`${profileName}: only allow-listed elements and attributes, no script URLs, stable on a second pass`, () => {
      for (const vector of CORPUS) {
        const out = sanitizeRichText(vector, profileName, MEDIA);
        for (const { tag, attrs } of tagsOf(out)) {
          expect(profile.elements, `${vector} → ${out}`).toContain(tag);
          for (const attr of attrs) {
            expect(
              [...(allowed[tag] ?? []), ...(tag === 'a' ? ['rel'] : [])],
              `${vector} → ${out}`,
            ).toContain(attr);
          }
        }
        expect(out, vector).not.toMatch(/javascript:|vbscript:|data:|<script|<style|<svg|<math/i);
        // A second pass changes nothing: the output parses the same way it was written (mXSS).
        expect(sanitizeRichText(out, profileName, MEDIA), vector).toBe(out);
      }
    });
  }
});

describe('rich text: plain text', () => {
  it('decodes entities, drops markup and dangerous content, collapses whitespace', () => {
    expect(richTextPlainText('<p>a &amp; b &lt;c&gt;</p>\n\n<p>  ბ  </p><script>x</script>')).toBe(
      'a & b <c> ბ',
    );
    expect(richTextPlainText(staff('<h2>სათაური</h2><p>ტექსტი</p>'))).toBe('სათაურიტექსტი');
  });
});
