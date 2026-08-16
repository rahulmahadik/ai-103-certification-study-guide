/**
 * balance-tags.mjs — repair an HTML fragment cut from the middle of a document.
 *
 * The study guide is produced by cutting one long document at
 * `break-before:page` markers, and those markers sit INSIDE the source's
 * wrapper divs. So a fragment routinely begins with a stray `</div>` belonging
 * to the previous module, or ends with a div it never closes.
 *
 * Browsers recover from that by closing the enclosing element early — which
 * silently pushes the rest of the page out of <doc-page> and into <body>,
 * where none of the site's layout rules reach it. It is invisible to a link
 * check and to an overflow check; it shows up only as content that ignores its
 * own stylesheet. Measured before this existed: 9 of 12 pages unbalanced, one
 * of them by four tags.
 */

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Tags the HTML parser closes implicitly. The source leaves these open freely
 * and browsers handle it correctly, so forcing them closed would change the
 * document rather than repair it.
 */
const OPTIONAL_CLOSE = new Set(['li', 'td', 'th', 'tr', 'thead', 'tbody', 'p', 'option']);

const TAG = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;

/** Walk the fragment, returning what is left open and which closers match nothing. */
function scan(html) {
  const stack = [];
  const orphans = [];
  TAG.lastIndex = 0;

  let m;
  while ((m = TAG.exec(html))) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const selfClosing = m[3] === '/';

    if (VOID_TAGS.has(tag) || selfClosing || OPTIONAL_CLOSE.has(tag)) continue;

    if (!closing) {
      stack.push({ tag, at: m.index });
      continue;
    }

    // Match the nearest open of the same name; anything nested inside it was
    // left unclosed and is closed implicitly by this tag.
    let i = stack.length - 1;
    while (i >= 0 && stack[i].tag !== tag) i--;

    if (i === -1) orphans.push({ at: m.index, length: m[0].length });
    else stack.length = i;
  }

  return { stack, orphans };
}

/** Drop orphan closers, then close whatever is still open. */
export function balanceTags(html) {
  let out = html;

  const { orphans } = scan(out);
  for (let i = orphans.length - 1; i >= 0; i--) {
    const o = orphans[i];
    out = out.slice(0, o.at) + out.slice(o.at + o.length);
  }

  const { stack } = scan(out);
  for (let i = stack.length - 1; i >= 0; i--) {
    out += `</${stack[i].tag}>`;
  }

  return out;
}

/** For tests and checks: is this fragment already well-formed? */
export function tagBalance(html) {
  const { stack, orphans } = scan(html);
  return { unclosed: stack.map((s) => s.tag), orphans: orphans.length };
}
