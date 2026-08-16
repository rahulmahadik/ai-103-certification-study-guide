/**
 * check-links.mjs — verify every internal link in docs/ resolves to a real file.
 *
 * Two rules, both learned the hard way:
 *
 *  1. A link must point at a FILE, not a directory. "guide/" works on GitHub
 *     Pages, where the server resolves the directory to index.html, and fails
 *     when the same page is opened off disk with file:// — the browser shows a
 *     directory listing instead of the page. Naming the file works everywhere.
 *
 *  2. A link must not point at the wrong page. The check catches dead targets;
 *     it cannot catch a live link to the wrong place, so the nav is also
 *     asserted against an expected map below.
 *
 * Run with: npm run check
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** Each page's site-bar links, by the page's path relative to docs/. */
const EXPECTED_NAV = {
  'index.html': { Home: null, 'Study guide': 'guide/index.html', 'Cheat sheet': 'cheatsheet.html', Glossary: 'glossary.html' },
  'cheatsheet.html': { Home: 'index.html', 'Study guide': 'guide/index.html', 'Cheat sheet': null, Glossary: 'glossary.html' },
  'glossary.html': { Home: 'index.html', 'Study guide': 'guide/index.html', 'Cheat sheet': 'cheatsheet.html', Glossary: null },
  'guide/index.html': { Home: '../index.html', 'Study guide': null, 'Cheat sheet': '../cheatsheet.html', Glossary: '../glossary.html' },
};

const files = htmlFiles(DOCS);
const problems = [];
let checked = 0, fragments = 0, external = 0;

/** Every id defined in each page, so fragments can be resolved. */
const idsByFile = new Map();
for (const file of files) {
  idsByFile.set(
    file,
    new Set([...readFileSync(file, 'utf8').matchAll(/id="([^"]+)"/g)].map((m) => m[1]))
  );
}

for (const file of files) {
  const rel = relative(DOCS, file).split('\\').join('/');
  const html = readFileSync(file, 'utf8');

  // External links must open in a new tab, and must carry rel="noopener" —
  // without it the opened page gets a handle on this one via window.opener.
  for (const match of html.matchAll(/<a\s([^>]*href="https?:\/\/[^"]*"[^>]*)>/g)) {
    external++;
    const attrs = match[1];
    const href = attrs.match(/href="([^"]+)"/)[1];
    if (!/target="_blank"/.test(attrs)) {
      problems.push(`${rel}: external link "${href}" does not open in a new tab`);
    } else if (!/rel="[^"]*noopener/.test(attrs)) {
      problems.push(`${rel}: external link "${href}" is target=_blank without rel="noopener"`);
    }
  }

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = match[1];
    if (/^(https?:|mailto:|data:|\/\/)/.test(raw)) continue;

    const [path, fragment] = raw.split('#');

    // A bare "#id" must resolve on this page. Splitting one long document into
    // many left fragments whose target had moved, and a fragment with no
    // matching id does nothing at all when clicked — no navigation, no scroll.
    if (!path) {
      if (!fragment) continue;
      fragments++;
      if (!idsByFile.get(file).has(fragment)) {
        problems.push(`${rel}: "#${fragment}" has no matching id on this page`);
      }
      continue;
    }

    checked++;

    if (path.endsWith('/')) {
      problems.push(`${rel}: "${raw}" points at a directory — name the file (…/index.html)`);
      continue;
    }

    const target = resolve(dirname(file), path.split('?')[0]);
    if (!existsSync(target)) {
      problems.push(`${rel}: "${raw}" does not exist`);
    } else if (statSync(target).isDirectory()) {
      problems.push(`${rel}: "${raw}" resolves to a directory`);
    } else if (fragment && idsByFile.has(target)) {
      fragments++;
      if (!idsByFile.get(target).has(fragment)) {
        problems.push(`${rel}: "${raw}" — target page has no id "${fragment}"`);
      }
    }
  }

  // SEO metadata. Not style policing — each of these changes what a search
  // result or a shared link actually looks like.
  if (rel !== 'cheatsheet-board.html') {
    const tag = (re) => (html.match(re) || [])[1];
    const title = tag(/<title>([^<]*)<\/title>/);
    const desc = tag(/<meta name="description" content="([^"]*)"/);

    if (!title) problems.push(`${rel}: no <title>`);
    else if (title.length > 62) problems.push(`${rel}: title is ${title.length} chars — search results cut around 60`);

    if (!desc) problems.push(`${rel}: no meta description`);
    else if (desc.length < 70 || desc.length > 200)
      problems.push(`${rel}: description is ${desc.length} chars — aim for 70 to 200`);

    for (const [what, re] of [
      ['canonical', /<link rel="canonical" href="([^"]+)"/],
      ['og:title', /<meta property="og:title" content="([^"]+)"/],
      ['og:image', /<meta property="og:image" content="([^"]+)"/],
      ['twitter:card', /<meta name="twitter:card" content="([^"]+)"/],
      ['structured data', /<script type="application\/ld\+json">([\s\S]+?)<\/script>/],
    ]) {
      if (!tag(re)) problems.push(`${rel}: missing ${what}`);
    }

    const ld = tag(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
    if (ld) {
      try {
        const parsed = JSON.parse(ld);
        if (!parsed['@context'] || !Array.isArray(parsed['@graph']))
          problems.push(`${rel}: structured data has no @context/@graph`);
      } catch {
        problems.push(`${rel}: structured data is not valid JSON`);
      }
    }
  }

  // Nav correctness: a link can exist and still go somewhere wrong.
  const expected = EXPECTED_NAV[rel];
  if (expected) {
    const nav = html.match(/<div class="links">([\s\S]*?)<\/div>/);
    if (!nav) {
      problems.push(`${rel}: no site-bar links block found`);
    } else {
      for (const [label, href] of Object.entries(expected)) {
        if (href === null) {
          if (!nav[1].includes(`<span class="here">${label}</span>`))
            problems.push(`${rel}: "${label}" should be the current page, not a link`);
        } else if (!nav[1].includes(`href="${href}">${label}<`)) {
          problems.push(`${rel}: "${label}" should link to "${href}"`);
        }
      }
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} link problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(
  `links: ${checked} file links + ${fragments} fragments across ${files.length} pages all resolve; ` +
  `${external} external links open in a new tab`
);
