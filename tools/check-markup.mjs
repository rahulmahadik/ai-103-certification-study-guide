/**
 * check-markup.mjs — verify the generated pages are well-formed.
 *
 * The study guide is produced by cutting one long document at
 * `break-before:page` markers. Those markers sit INSIDE the source's wrapper
 * divs, so a naive cut leaves a fragment that opens tags it never closes, or
 * closes tags it never opened. A browser recovers by ending the enclosing
 * element early — which silently pushes the rest of the page out of
 * <doc-page> and into <body>, where none of the site's layout rules reach it.
 *
 * That is invisible to a link check and to an overflow check. It shows up only
 * as content that mysteriously ignores its own stylesheet. Hence this.
 *
 * Run with: npm run check:markup  (also part of npm run check)
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Elements the HTML parser may close implicitly, so imbalance is not a bug. */
const OPTIONAL_CLOSE = new Set(['li', 'td', 'th', 'tr', 'thead', 'tbody', 'p', 'option']);

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** Unclosed opens and orphan closes in a fragment, ignoring optional-close tags. */
function imbalance(html) {
  const stack = [];
  const orphans = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  let m;

  while ((m = re.exec(html))) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (VOID_TAGS.has(tag) || m[3] === '/' || OPTIONAL_CLOSE.has(tag)) continue;

    if (!closing) {
      stack.push(tag);
      continue;
    }
    const at = stack.lastIndexOf(tag);
    if (at === -1) orphans.push(tag);
    else stack.length = at;
  }

  return { unclosed: stack, orphans };
}

const problems = [];
let checked = 0;

for (const file of htmlFiles(DOCS)) {
  const rel = relative(DOCS, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');

  const open = html.indexOf('<doc-page');
  if (open === -1) continue;
  const close = html.lastIndexOf('</doc-page>');
  checked++;

  const inner = html.slice(html.indexOf('>', open) + 1, close);
  const { unclosed, orphans } = imbalance(inner);

  if (unclosed.length) {
    problems.push(`${rel}: ${unclosed.length} unclosed inside <doc-page> — ${[...new Set(unclosed)].join(', ')}`);
  }
  if (orphans.length) {
    problems.push(`${rel}: ${orphans.length} orphan closing tag(s) inside <doc-page> — ${[...new Set(orphans)].join(', ')}`);
  }

  // Only the page chrome legitimately follows </doc-page>: the pager, the
  // "on this page" rail and the footer. Anything else means the element closed
  // early and document content escaped into the chrome.
  const after = html.slice(close + '</doc-page>'.length, html.indexOf('</body>'));
  const stray = after
    .replace(/<nav class="pager[\s\S]*?<\/nav>/g, '')
    .replace(/<aside class="toc[\s\S]*?<\/aside>/g, '')
    .replace(/<footer class="pagefoot[\s\S]*?<\/footer>/g, '')
    .replace(/<\/?(div|main|aside)[^>]*>/g, '')
    .trim();
  if (stray) {
    problems.push(`${rel}: content escaped past </doc-page> — "${stray.replace(/\s+/g, ' ').slice(0, 70)}"`);
  }
}

if (problems.length) {
  console.error(`${problems.length} markup problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(`markup: ${checked} pages, every element inside <doc-page> opens and closes`);
