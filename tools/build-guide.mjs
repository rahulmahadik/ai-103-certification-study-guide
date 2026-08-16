/**
 * build-guide.mjs — split the long-form study guide into one page per module.
 *
 * design-source/AI-103 Notes.dc.html is authored as a single continuous
 * document. That is the right shape for printing and for the PDF, but a wrong
 * one for a website: a quarter-megabyte page is slow, impossible to link into,
 * and hopeless to navigate on a phone.
 *
 * Each module in the source opens with a header block carrying
 * `break-before:page`, so those markers are the natural split points. This
 * script cuts there, wraps each part in shared chrome — a sticky nav, a
 * contents rail, prev/next links — and writes docs/guide/NN-slug.html.
 *
 * Run with: npm run guide
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { metaTags } from './seo.mjs';
import { balanceTags } from './balance-tags.mjs';
import { externalLinksInNewTab, wrapTables, remapFonts, hoistFiguresOutOfGrids, collapseUnderfilledGrids } from './html-transforms.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'design-source', 'AI-103 Notes.dc.html');
const OUT_DIR = join(ROOT, 'docs', 'guide');

/** The wrapper that opens every module in the source. */
const SPLIT_MARKER = 'break-before:page';

/**
 * One entry per section the source produces, in order. `slug` fixes the URL,
 * `nav` is what appears in the contents rail, and `blurb` is the page's meta
 * description and its card text on the index.
 */
const SECTIONS = [
  {
    slug: 'overview',
    heading: 'Developing AI Apps and Agents on Azure',
    keywords: ['AI-103 exam format','AI-103 passing score','AI-103 prerequisites','AI-901','AI-102 retired'],
    nav: 'The exam at a glance',
    title: 'The AI-103 exam at a glance',
    blurb: 'What AI-103 covers, how it is weighted, and what the exam assumes you already know.',
  },
  {
    slug: 'plan-and-prepare',
    seoTitle: 'Plan and manage an Azure AI solution',
    keywords: ['Microsoft Foundry project','Foundry resource','Foundry Tools','responsible AI principles'],
    nav: '1 · Plan and prepare',
    title: 'Plan and prepare to develop AI solutions on Azure',
    blurb: 'Picking the right Azure service for a capability, how Microsoft Foundry is organised, the developer tooling, and the six responsible AI principles.',
  },
  {
    slug: 'models',
    seoTitle: 'Choose, deploy and evaluate models',
    keywords: ['Foundry model catalog','Azure model deployment types','Global Standard','provisioned throughput','model benchmarks'],
    nav: '2 · Choose and deploy models',
    title: 'Select, deploy and evaluate Foundry models',
    blurb: 'Reading the model catalog, comparing models on quality, safety, cost and speed, choosing a deployment type, and evaluating what you deployed.',
  },
  {
    slug: 'chat-app',
    seoTitle: 'Build a generative AI chat app',
    keywords: ['Responses API','ChatCompletions API','Foundry SDK','Azure OpenAI endpoint','DefaultAzureCredential'],
    nav: '3 · Build a chat app',
    title: 'Develop a generative AI chat app with Foundry',
    blurb: 'Endpoints, SDKs and authentication, then the two chat APIs: the stateful Responses API and the older ChatCompletions.',
  },
  {
    slug: 'tools',
    seoTitle: 'Give the model tools',
    keywords: ['code_interpreter','web_search','file_search','function calling','Azure AI agent tools'],
    nav: '4 · Give the model tools',
    title: 'Develop generative AI apps that use tools',
    blurb: 'The four tools — code_interpreter, web_search, file_search and function calling — and which job each one is for.',
  },
  {
    slug: 'optimize',
    keywords: ['prompt engineering','RAG','retrieval augmented generation','fine-tuning','LoRA','hybrid search'],
    nav: '5 · Make it work better',
    title: 'Optimize generative AI model performance',
    blurb: 'Prompt engineering, grounding with RAG, and fine-tuning: what each one fixes, what it costs, and when to combine them.',
  },
  {
    slug: 'responsible-ai',
    seoTitle: 'Responsible generative AI',
    keywords: ['content filters','prompt shields','harm categories','red teaming','responsible AI'],
    nav: '6 · Keep it safe',
    title: 'Implement a responsible generative AI solution',
    blurb: 'Map, measure, mitigate, manage — the four-stage process, the four mitigation layers, and content filters.',
  },
  {
    slug: 'computer-vision',
    keywords: ['image generation','video generation','inpainting','Content Understanding','multimodal'],
    nav: '7 · Computer vision',
    title: 'Implement computer vision solutions',
    blurb: 'Generating and editing images and video, multimodal understanding, and responsible AI for visual content.',
  },
  {
    slug: 'text-analysis',
    keywords: ['Azure AI Language','Azure AI Speech','PII detection','speaker diarization','Azure Translator'],
    nav: '8 · Text and speech',
    title: 'Implement text analysis solutions',
    blurb: 'Azure Language and Azure Speech against language models: which one a scenario is actually asking for.',
  },
  {
    slug: 'information-extraction',
    seoTitle: 'Information extraction solutions',
    keywords: ['Document Intelligence','OCR','Azure AI Search','vector search','document extraction'],
    nav: '9 · Information extraction',
    title: 'Implement information extraction solutions',
    blurb: 'Turning documents, forms, images and recordings into structured fields a system can act on.',
  },
  {
    slug: 'agents-and-operations',
    seoTitle: 'Agents and running them in production',
    keywords: ['Foundry Agent Service','multi-agent orchestration','tool approval','agent evaluators','managed identity','RBAC','TPM RPM quota','tracing','Application Insights','CI/CD'],
    nav: '10 · Agents and operations',
    title: 'Build agents, then run them in production',
    blurb: 'The two objective groups the Learn path does not reach: building and orchestrating agents, and managing, monitoring and securing a solution in production.',
  },
  {
    slug: 'labs',
    seoTitle: 'Practice labs',
    keywords: ['AI-103 labs','Azure AI practice','hands-on Foundry'],
    nav: 'Practice labs',
    title: 'Lab practice, and what survives the vendor race',
    blurb: 'An eight-lab ladder that ends with something that actually runs, plus which skills transfer to any vendor.',
  },
  {
    slug: 'glossary',
    keywords: ['AI-103 glossary','Azure AI terms','Microsoft Foundry glossary'],
    nav: 'Glossary',
    title: 'Glossary',
    blurb: 'Every term the AI-103 outline names, one line each, in the order you meet them.',
    standalone: 'docs/glossary.html',
  },
];

/* ------------------------------------------------------------------ split */

function splitSource(src) {
  const start = src.indexOf('</helmet>') + '</helmet>'.length;
  const end = src.lastIndexOf('</x-dc>');
  const body = src.slice(start, end);

  // Walk to each marker, then back up to the opening '<' of the tag carrying
  // it. Slicing on the marker itself would cut mid-attribute.
  const cuts = [0];
  let at = body.indexOf(SPLIT_MARKER);
  while (at !== -1) {
    cuts.push(body.lastIndexOf('<', at));
    at = body.indexOf(SPLIT_MARKER, at + 1);
  }
  cuts.push(body.length);

  return cuts.slice(0, -1).map((from, i) => balanceTags(body.slice(from, cuts[i + 1]).trim()));
}

/* ------------------------------------------------------------------ chrome */

function escapeAttr(v) {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * The site bar, with hrefs resolved for the page's own depth.
 *
 * `depth` is 1 for pages under docs/guide/ and 0 for pages at docs/ root.
 * Every href names a file rather than a directory: a bare "guide/" needs a web
 * server to resolve the directory to index.html, and opened straight off disk
 * with file:// the browser shows a directory listing instead.
 */
function sitebar(active, depth = 1) {
  const up = depth ? '../' : '';
  const items = [
    [`${up}index.html`, 'Home', 'home'],
    [depth ? 'index.html' : 'guide/index.html', 'Study guide', 'guide'],
    [`${up}cheatsheet.html`, 'Cheat sheet', 'cheatsheet'],
    [`${up}glossary.html`, 'Glossary', 'glossary'],
  ];

  const links = items
    .map(([href, label, key]) =>
      key === active
        ? `<span class="here">${label}</span>`
        : `<a href="${href}">${label}</a>`
    )
    .join('');

  return `<nav class="sitebar no-print">
  <a class="wordmark" href="${up}index.html">AI&#8209;103 <span>Study Guide</span></a>
  <div class="links">${links}</div>
  <a class="gh" href="https://github.com/rahulmahadik/ai-103-certification-study-guide" target="_blank" rel="noopener">GitHub</a>
  <button type="button" onclick="window.print()">Print</button>
</nav>`;
}


/**
 * The page footer.
 *
 * The 11 module pages and the glossary had none, and they are the pages that
 * carry the ~33 screenshots served from learn.microsoft.com. Someone landing
 * on one from a search result needs to know who wrote it and that this is not
 * a Microsoft site.
 */
function pageFooter(up = '../') {
  return `<footer class="pagefoot no-print">
  <p>Compiled by <a href="https://www.linkedin.com/in/rahulmahadik" target="_blank" rel="noopener">Rahul Mahadik</a>
     from the official <a href="https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-103" target="_blank" rel="noopener">Microsoft Learn AI-103 study guide</a>
     and Azure product documentation. Verified August 2026 — re-check learn.microsoft.com before you book.</p>
  <p>Text licensed <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.
     Microsoft, Azure and Microsoft Foundry are trademarks of Microsoft Corporation.
     This project is not affiliated with, endorsed by, or sponsored by Microsoft.
     <a href="${up}index.html">Home</a> ·
     <a href="https://github.com/rahulmahadik/ai-103-certification-study-guide" target="_blank" rel="noopener">Source and corrections</a></p>
</footer>`;
}

function contentsRail(current) {
  const items = SECTIONS.filter((s) => !s.standalone)
    .map((s) =>
      s.slug === current
        ? `<li class="on"><span>${s.nav}</span></li>`
        : `<li><a href="${s.slug}.html">${s.nav}</a></li>`
    )
    .join('\n      ');

  return `<aside class="rail no-print">
    <p class="rail-title">Study guide</p>
    <ol>
      ${items}
    </ol>
    <p class="rail-title" style="margin-top:1.4rem">Also</p>
    <ul class="plain">
      <li><a href="../cheatsheet.html">Cheat sheet</a></li>
      <li><a href="../glossary.html">Glossary</a></li>
    </ul>
  </aside>`;
}

/**
 * The "on this page" rail.
 *
 * The source already anchors every unit: `<h2 id="m2u3">Unit 3</h2>` followed
 * by `<h3>Select models using benchmarks</h3>`. The id is on the h2 but the
 * readable title is in the h3, so pair them — the number alone would make a
 * useless list of "Unit 2, Unit 3, Unit 4".
 *
 * Returns null when a page has fewer than two anchored units (the overview,
 * the labs and the glossary), so those pages drop the column instead of
 * showing an empty one.
 */
function onThisPage(content) {
  const entries = [];
  const used = new Set();

  // Collect first, splice second. A single regex cannot reach the h3 that
  // supplies the readable title — it sits after the h2, and any lookahead that
  // stops at the next heading stops at that very h3. So find each h2, then
  // look forward for the first h3 before the following h2.
  const found = [];
  const h2 = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/g;
  let match;

  while ((match = h2.exec(content))) {
    const after = content.slice(match.index + match[0].length);
    const nextH2 = after.search(/<h2\b/);
    const window = nextH2 === -1 ? after : after.slice(0, nextH2);
    const title = text((window.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/) || [])[1] ?? '');

    found.push({
      at: match.index,
      length: match[0].length,
      attrs: match[1],
      labelHtml: match[2],
      label: text(match[2]),
      title,
      id: (match[1].match(/id="([^"]+)"/) || [])[1] ?? '',
    });
  }

  // The module pages already carry ids like "m2u3". The three specialist pages
  // label their sections "Skill area 1" with no id at all, so mint a
  // descriptive one from the title.
  for (const unit of found) {
    if (!unit.id) unit.id = slug(unit.title || unit.label);
    while (unit.id && used.has(unit.id)) unit.id += '-2';
    if (unit.id) used.add(unit.id);
  }

  const usable = found.filter((u) => u.id);
  if (usable.length < 2) return { content, toc: null };

  // Splice back to front so earlier offsets stay valid.
  let anchored = content;
  for (const unit of [...found].reverse()) {
    if (!unit.id || /id="/.test(unit.attrs)) continue;
    const tag = `<h2${unit.attrs} id="${unit.id}">${unit.labelHtml}</h2>`;
    anchored = anchored.slice(0, unit.at) + tag + anchored.slice(unit.at + unit.length);
  }

  entries.push(...usable);

  const items = entries
    .map(
      (e) =>
        `<li><a href="#${e.id}">` +
        (e.title ? `<span class="u">${escapeAttr(e.label)}</span>${e.title}` : e.label) +
        `</a></li>`
    )
    .join('\n      ');

  const toc = `<aside class="toc no-print">
    <p class="rail-title">On this page</p>
    <ul>
      ${items}
    </ul>
  </aside>`;

  return { content: anchored, toc };
}

/** Title to url fragment. */
function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** Tag soup to plain text. */
function text(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pager(index, pages) {
  const prev = pages[index - 1];
  const next = pages[index + 1];

  const left = prev
    ? `<a class="pg prev" href="${prev.slug}.html"><span>Previous</span><b>${prev.nav}</b></a>`
    : '<span></span>';
  const right = next
    ? `<a class="pg next" href="${next.slug}.html"><span>Next</span><b>${next.nav}</b></a>`
    : `<a class="pg next" href="../cheatsheet.html"><span>Finished — now revise</span><b>Cheat sheet</b></a>`;

  return `<nav class="pager no-print">${left}${right}</nav>`;
}

function page({ title, blurb, head, body, depth, path, type = 'module', extraKeywords = [] }) {
  const up = depth ? '../' : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${metaTags({ path, title, description: blurb, type, up, extraKeywords })}
<link rel="stylesheet" href="${up}assets/fonts.css">
<link rel="stylesheet" href="${up}assets/sheet.css">
${head}
</head>
<body>
${body}
</body>
</html>
`;
}

/* ------------------------------------------------------------------ build */

/**
 * The source's <helmet> carries three things the site does not want: the
 * editor's runtime <script>, Google Fonts <link>s (this site loads nothing
 * from a CDN), and a <style> block of print hygiene and typography.
 *
 * The style block is dropped rather than kept, because sheet.css already
 * covers every rule in it — and keeping it would win the cascade, since the
 * helmet lands after the stylesheet link in the head. That is exactly how a
 * `doc-page code { white-space: nowrap }` in the source ended up pushing long
 * endpoints off the side of a phone screen.
 */
function extractHelmet(src) {
  const match = src.match(/<helmet>([\s\S]*?)<\/helmet>/);
  if (!match) throw new Error('no <helmet> block found');
  return match[1]
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<link\b[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>/g, '')
    .trim();
}

if (!existsSync(SOURCE)) {
  console.error(`missing source: ${SOURCE}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const src = readFileSync(SOURCE, 'utf8');
const head = remapFonts(extractHelmet(src));
const parts = splitSource(src).map(remapFonts).map(hoistFiguresOutOfGrids).map(collapseUnderfilledGrids).map(externalLinksInNewTab).map(wrapTables);

if (parts.length !== SECTIONS.length) {
  console.error(
    `  the source split into ${parts.length} parts but SECTIONS lists ` +
    `${SECTIONS.length} — check the split markers`
  );
  process.exit(1);
}

// Each part must actually contain the heading SECTIONS claims for it. An
// insertion landing inside the wrong wrapper once shifted every part by one,
// publishing the agents content under the labs slug and leaving the agents
// page empty — with no error anywhere.
const misplaced = [];
SECTIONS.forEach((section, i) => {
  const heading = (parts[i] ?? '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!heading) return;
  const text = heading[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  // `heading` when the source's <h1> differs from the display title — the
  // front matter's h1 is the document title, not this section's label.
  const want = (section.heading ?? section.title).replace(/\s+/g, ' ').trim();
  const key = want.split(/[,:—]/)[0].trim().slice(0, 24);
  if (key && !text.includes(key)) {
    misplaced.push(`  "${section.slug}" holds "${text.slice(0, 46)}" but should hold "${want.slice(0, 46)}"`);
  }
});
if (misplaced.length) {
  console.error('section order does not match the source:');
  for (const m of misplaced) console.error(m);
  process.exit(1);
}

const guidePages = SECTIONS.filter((s) => !s.standalone);

/* ---------------------------------------------- cross-page anchor rewriting */

/**
 * The source is one document, so its internal links are bare fragments:
 * `href="#p2"` jumps to the models module. Splitting the document leaves those
 * targets on other pages, and a bare fragment with no matching id on the
 * current page does nothing at all when clicked — no navigation, no scroll.
 *
 * So: anchor every section first, work out which page now owns each id, then
 * rewrite each fragment that points somewhere else into a real page link.
 */

/** Where a section is written, as a path relative to docs/. */
function pageHref(section) {
  return section.standalone
    ? section.standalone.replace(/^docs\//, '')
    : `guide/${section.slug}.html`;
}

/** A link from one docs-relative page to another, plus its fragment. */
function linkBetween(fromHref, toHref, id) {
  const from = fromHref.split('/').slice(0, -1);
  const to = toHref.split('/');
  const file = to.pop();
  const up = '../'.repeat(Math.max(0, from.length - to.length));
  const down = to.slice(from.length).join('/');
  return `${up}${down ? down + '/' : ''}${file}#${id}`;
}

// Anchor first, so ids minted for the specialist pages are in the map too.
const prepared = SECTIONS.map((section, i) => {
  const raw = parts[i];
  if (raw === undefined) return null;
  const { content, toc } = onThisPage(raw);
  return { section, content, toc, href: pageHref(section) };
}).filter(Boolean);

const idOwner = new Map();
for (const entry of prepared) {
  for (const m of entry.content.matchAll(/id="([^"]+)"/g)) {
    if (!idOwner.has(m[1])) idOwner.set(m[1], entry.href);
  }
}

let rewritten = 0;
const orphans = new Set();

for (const entry of prepared) {
  const own = new Set([...entry.content.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));

  entry.content = entry.content.replace(/href="#([^"]+)"/g, (whole, id) => {
    if (own.has(id)) return whole;

    const target = idOwner.get(id);
    if (!target) {
      orphans.add(id);
      return whole;
    }

    rewritten++;
    return `href="${linkBetween(entry.href, target, id)}"`;
  });
}

if (rewritten) console.log(`rewrote ${rewritten} cross-page anchors`);
if (orphans.size) {
  console.warn(`  ${orphans.size} fragment(s) point at no id anywhere: ${[...orphans].join(', ')}`);
}

prepared.forEach(({ section, content, toc }) => {
  if (section.standalone) {
    writeFileSync(
      join(ROOT, section.standalone),
      page({
        title: section.title,
        blurb: section.blurb,
        head,
        depth: 0,
        path: 'glossary.html',
        type: 'page',
        extraKeywords: ['AI-103 glossary', 'Azure AI terms', 'Microsoft Foundry glossary'],
        body:
          sitebar('glossary', 0) +
          `\n<div class="sheet-wrap">\n<doc-page class="solo">\n${content}\n</doc-page>\n` +
          pageFooter('') +
          `\n</div>\n`,
      })
    );
    console.log(`built ${section.standalone}`);
    return;
  }

  const index = guidePages.findIndex((p) => p.slug === section.slug);

  writeFileSync(
    join(OUT_DIR, `${section.slug}.html`),
    page({
      title: section.seoTitle ?? section.title,
      blurb: section.blurb,
      head,
      depth: 1,
      path: `guide/${section.slug}.html`,
      type: 'module',
      extraKeywords: section.keywords ?? [],
      body:
        sitebar('guide') +
        `\n<div class="layout${toc ? '' : ' no-toc'}">\n${contentsRail(section.slug)}\n  <main>\n` +
        `<doc-page class="solo">\n${content}\n</doc-page>\n` +
        pager(index, guidePages) +
        pageFooter('../') +
        `\n  </main>\n${toc ?? ''}\n</div>\n`,
    })
  );
  console.log(
    `built docs/guide/${section.slug}.html` + (toc ? '' : '  (no unit anchors — two columns)')
  );
});

/* ------------------------------------------------------- guide index page */

/**
 * The roadmap.
 *
 * Grouped into four stages rather than listed flat, because the order matters
 * more than the inventory: skill areas 1 and 2 are 55-65% of the exam, and a
 * reader with two weeks needs to know that before they pick a page. Each stage
 * carries its exam weight, a time estimate and what to do when it is done.
 */
const STAGES = [
  {
    n: '1',
    name: 'Get your bearings',
    time: 'one evening',
    weight: null,
    why: 'What the exam is, what it assumes, and what the platform is called this year.',
    slugs: ['overview', 'plan-and-prepare'],
    then: 'Create a Foundry project and find its endpoint before you read further.',
  },
  {
    n: '2',
    name: 'Build something that answers',
    time: 'two weeks',
    weight: '30–35%',
    why: 'The largest skill area. Models, the two chat APIs, tools, and the three ways to make output better.',
    slugs: ['models', 'chat-app', 'tools', 'optimize'],
    then: 'Do the matching lab as you finish each page — reading these without building is wasted time.',
  },
  {
    n: '3',
    name: 'Make it safe and run it',
    time: 'four evenings',
    weight: '25–30%',
    why: 'Responsible AI is short, heavily tested and mostly lists. Agents and operations is the part the Learn path skips.',
    slugs: ['responsible-ai', 'agents-and-operations'],
    then: 'Memorise the four stages, the four layers and the four harm categories. They are free marks.',
  },
  {
    n: '4',
    name: 'The three specialist areas',
    time: 'one week',
    weight: '30–45%',
    why: 'Vision, text and extraction. Mostly “which service does this scenario want”, rather than code.',
    slugs: ['computer-vision', 'text-analysis', 'information-extraction'],
    then: 'Drill the scenario cues on the cheat sheet until the wording alone gives you the answer.',
  },
];

const bySlug = Object.fromEntries(guidePages.map((g) => [g.slug, g]));

const stageMarkup = STAGES.map((stage) => {
  const steps = stage.slugs
    .map((slug) => {
      const g = bySlug[slug];
      if (!g) return '';
      return `      <a class="step" href="${g.slug}.html">
        <span class="step-nav">${g.nav}</span>
        <span class="step-title">${g.title}</span>
        <span class="step-blurb">${g.blurb}</span>
      </a>`;
    })
    .join('\n');

  return `  <section class="stage">
    <div class="stage-head">
      <span class="stage-n">${stage.n}</span>
      <div>
        <h2>${stage.name}</h2>
        <p class="stage-meta">${stage.time}${stage.weight ? ` · <b>${stage.weight}</b> of the exam` : ''}</p>
      </div>
    </div>
    <p class="stage-why">${stage.why}</p>
    <div class="steps" data-n="${stage.slugs.length}">
${steps}
    </div>
    <p class="stage-then"><span>Before you move on</span>${stage.then}</p>
  </section>`;
}).join('\n');

const extras = guidePages
  .filter((g) => !STAGES.some((st) => st.slugs.includes(g.slug)))
  .map((g) => `    <a class="side" href="${g.slug}.html"><b>${g.title}</b><span>${g.blurb}</span></a>`)
  .join('\n');

writeFileSync(
  join(OUT_DIR, 'index.html'),
  page({
    title: 'Study roadmap',
    blurb:
      'A four-stage route through AI-103: get your bearings, build something that answers, make it safe and run it, then the three specialist skill areas. With exam weights and timings.',
    head,
    depth: 1,
    path: 'guide/index.html',
    type: 'page',
    extraKeywords: ['AI-103 study plan', 'AI-103 roadmap', 'AI-103 syllabus', 'AI-103 skills measured'],
    body: `${sitebar('guide')}
<div class="sheet-wrap roadmap">
  <div class="intro">
    <p class="eyebrow">Exam AI-103 · Developing AI Apps and Agents on Azure</p>
    <h1>Study roadmap</h1>
    <p class="lede">Four stages, in the order that makes sense. The weights are Microsoft's published ones, so if your time is short you can see exactly where it is worth spending. Read it through once, then revise from the <a href="../cheatsheet.html">cheat sheet</a>.</p>
  </div>

  <div class="weightbar" role="img" aria-label="Skill area weights: plan and manage 25 to 30 percent, generative AI and agents 30 to 35 percent, and the three specialist areas 10 to 15 percent each.">
    <span style="flex:27.5;background:#1B5FA8">Plan and manage<b>25–30%</b></span>
    <span style="flex:32.5;background:#6D3A9E">Generative AI and agents<b>30–35%</b></span>
    <span style="flex:12.5;background:#0F766E">Vision<b>10–15%</b></span>
    <span style="flex:12.5;background:#BC4B10">Text<b>10–15%</b></span>
    <span style="flex:12.5;background:#AB2733">Extraction<b>10–15%</b></span>
  </div>

${stageMarkup}

  <section class="stage stage-side">
    <div class="stage-head">
      <span class="stage-n">·</span>
      <div><h2>Alongside all of it</h2><p class="stage-meta">use these throughout, not at the end</p></div>
    </div>
    <div class="sides">
${extras}
      <a class="side" href="../cheatsheet.html"><b>Cheat sheet</b><span>One page: every decision table and the scenario cues. For revision, and for looking one thing up.</span></a>
      <a class="side" href="../glossary.html"><b>Glossary</b><span>Every term the outline names, one line each, plus all 38 abbreviations spelled out.</span></a>
    </div>
  </section>
</div>
`,
  })
);
console.log('built docs/guide/index.html');
