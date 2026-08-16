/**
 * build-seo.mjs — the site-level SEO artefacts.
 *
 * Generates, into docs/:
 *   sitemap.xml     every page, so crawlers do not have to guess
 *   robots.txt      pointing at the sitemap
 *   assets/favicon.svg
 *   assets/og-card.png   1200x630 social card
 *
 * The social card matters more than it looks: the cheat sheet PNG is 1920x7520,
 * and handing that to a link preview produces an unreadable sliver. A purpose-
 * built card at the ratio every platform actually crops to is the difference
 * between a shared link that reads and one that does not.
 *
 * Run with: npm run seo
 */

import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './browser.mjs';
import { SITE, url } from './seo.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const ASSETS = join(DOCS, 'assets');

/* --------------------------------------------------------------- sitemap */

/** Pages that exist but should not be advertised to crawlers. */
const EXCLUDE = new Set(['cheatsheet-board.html']);

/** Rough priority: the entry points matter more than a mid-module page. */
function priority(path) {
  if (path === 'index.html') return '1.0';
  if (path === 'guide/index.html' || path === 'cheatsheet.html') return '0.9';
  if (path === 'glossary.html') return '0.8';
  return '0.7';
}

function htmlPages(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlPages(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function buildSitemap(stamp) {
  const pages = htmlPages(DOCS)
    .map((f) => relative(DOCS, f).split(sep).join('/'))
    .filter((p) => !EXCLUDE.has(p))
    .sort();

  const entries = pages
    .map(
      (p) =>
        `  <url>\n` +
        `    <loc>${url(p)}</loc>\n` +
        `    <lastmod>${stamp}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>${priority(p)}</priority>\n` +
        `  </url>`
    )
    .join('\n');

  writeFileSync(
    join(DOCS, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
  );
  console.log(`sitemap: ${pages.length} pages -> docs/sitemap.xml`);
}

function buildRobots() {
  writeFileSync(
    join(DOCS, 'robots.txt'),
    `# ${SITE.name}\n` +
      `User-agent: *\n` +
      `Allow: /\n\n` +
      `Sitemap: ${url('sitemap.xml')}\n`
  );
  console.log('robots: -> docs/robots.txt');
}

/* --------------------------------------------------------------- favicon */

function buildFavicon() {
  mkdirSync(ASSETS, { recursive: true });
  writeFileSync(
    join(ASSETS, 'favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="AI-103">
  <rect width="64" height="64" rx="12" fill="#0B2136"/>
  <text x="32" y="27" text-anchor="middle" font-family="Segoe UI,Helvetica,Arial,sans-serif"
        font-size="19" font-weight="700" fill="#FFC53D">AI</text>
  <text x="32" y="48" text-anchor="middle" font-family="Segoe UI,Helvetica,Arial,sans-serif"
        font-size="19" font-weight="700" fill="#FFFFFF">103</text>
</svg>\n`
  );
  console.log('favicon: -> docs/assets/favicon.svg');
}

/* --------------------------------------------------------------- og card */

const CARD = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="assets/fonts.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#0B2136;overflow:hidden;
       font-family:'Inter',system-ui,sans-serif;display:flex;flex-direction:column;
       justify-content:center;padding:0 70px;position:relative}
  .glow{position:absolute;right:-160px;top:-160px;width:620px;height:620px;border-radius:50%;
        background:radial-gradient(circle,rgba(255,197,61,.16),transparent 68%)}
  .badge{display:inline-flex;align-self:flex-start;gap:10px;border:2px solid #2E4A66;border-radius:9px;
         padding:9px 18px;font-size:19px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
         color:#FFC53D;margin-bottom:26px}
  h1{font-family:'Barlow Condensed','Inter',sans-serif;font-size:118px;font-weight:700;line-height:.88;
     letter-spacing:.008em;text-transform:uppercase;color:#fff}
  h1 em{font-style:normal;color:#FFC53D}
  p{font-size:31px;color:#A9BED1;margin-top:22px;line-height:1.3}
  .facts{display:flex;gap:11px;margin-top:34px;flex-wrap:wrap}
  .facts span{background:rgba(255,255,255,.09);border-radius:9px;padding:10px 18px;font-size:21px;color:#D6E2EC}
  .facts b{color:#fff}
  .by{position:absolute;bottom:38px;left:70px;right:70px;display:flex;justify-content:space-between;
      font-size:20px;color:#6F8AA3}
</style></head>
<body>
  <div class="glow"></div>
  <span class="badge">Microsoft Certified · Associate</span>
  <h1>AI-103 <em>Study Guide</em></h1>
  <p>Developing AI Apps and Agents on Azure — module notes,<br>a one-page cheat sheet and a glossary.</p>
  <div class="facts">
    <span><b>120</b> minutes</span>
    <span>Pass <b>700</b>/1000</span>
    <span><b>5</b> skill areas</span>
    <span>Replaces <b>AI-102</b></span>
  </div>
  <div class="by"><span>${SITE.author}</span><span>rahulmahadik.github.io</span></div>
</body></html>`;

async function buildCard() {
  const tmp = join(DOCS, '.og-card.html');
  writeFileSync(tmp, CARD);

  const browser = await launch({ args: ['--force-color-profile=srgb'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);

    const spill = await page.evaluate(() => document.body.scrollHeight - 630);
    if (spill > 1) console.warn(`  og card content overflows by ${spill}px`);

    await page.screenshot({ path: join(ASSETS, 'og-card.png') });
    console.log('og card: -> docs/assets/og-card.png  (1200 x 630)');
  } finally {
    await browser.close();
    const { unlinkSync } = await import('node:fs');
    unlinkSync(tmp);
  }
}

if (!existsSync(join(ASSETS, 'fonts.css'))) {
  console.error('missing docs/assets/fonts.css — run `npm run assets` first');
  process.exit(1);
}

// A fixed date keeps the sitemap reproducible; pass SITEMAP_DATE to override.
const stamp = process.env.SITEMAP_DATE || new Date().toISOString().slice(0, 10);

buildFavicon();
buildSitemap(stamp);
buildRobots();
await buildCard();
