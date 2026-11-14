/**
 * check-practice.mjs — gates for authored practice items.
 *
 * Empty sections are fine (status: coming). Non-empty sections must pass
 * syllabus, Learn URL, and explanation rules before the build links them.
 *
 * Run: node tools/check-practice.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'practice-source');
const problems = [];

const outline = JSON.parse(readFileSync(join(SRC, 'outline.json'), 'utf8'));
const bulletSet = new Set();
for (const area of outline.skillAreas) {
  for (const sub of area.subsections) {
    for (const b of sub.bullets) bulletSet.add(`${area.name}||${sub.name}||${b}`);
  }
}

const sectionFiles = readdirSync(join(SRC, 'sections')).filter((f) => f.endsWith('.json'));
let itemCount = 0;

for (const file of sectionFiles) {
  const path = join(SRC, 'sections', file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const label = `sections/${file}`;

  if (!data.sectionId || !data.skillArea || !Array.isArray(data.items)) {
    problems.push(`${label}: missing sectionId, skillArea, or items[]`);
    continue;
  }

  if (data.outlineAsOf !== outline.outlineAsOf) {
    problems.push(
      `${label}: outlineAsOf ${data.outlineAsOf} != outline.json ${outline.outlineAsOf}`
    );
  }

  if (data.status === 'coming' && data.items.length) {
    problems.push(`${label}: status is coming but items[] is not empty`);
  }

  if (data.status === 'ready' && !data.items.length) {
    problems.push(`${label}: status is ready but items[] is empty`);
  }

  const keys = { A: 0, B: 0, C: 0, D: 0 };

  for (const [i, item] of data.items.entries()) {
    itemCount++;
    const id = item.id || `#${i}`;
    const where = `${label} ${id}`;

    if (item.origin !== 'original') {
      problems.push(`${where}: origin must be "original"`);
    }
    if (item.outlineAsOf !== outline.outlineAsOf) {
      problems.push(`${where}: outlineAsOf mismatch`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.rechecked || '')) {
      problems.push(`${where}: rechecked must be YYYY-MM-DD`);
    }
    if (!bulletSet.has(`${item.skillArea}||${item.subsection}||${item.bullet}`)) {
      problems.push(`${where}: skillArea/subsection/bullet not in outline.json`);
    }
    if (!/^https:\/\/learn\.microsoft\.com\//.test(item.learnUrl || '')) {
      problems.push(`${where}: learnUrl must be https://learn.microsoft.com/...`);
    }
    if (/learn\.microsoft\.com\/.*(search|blog)/i.test(item.learnUrl || '')) {
      problems.push(`${where}: learnUrl looks like search/blog, not a docs page`);
    }
    if (!item.stem || item.stem.length < 40) {
      problems.push(`${where}: stem too short`);
    }
    if (!Array.isArray(item.options) || item.options.length !== 4) {
      problems.push(`${where}: need exactly 4 options`);
      continue;
    }

    const letters = item.options.map((o) => o.id);
    if (letters.join('') !== 'ABCD') {
      problems.push(`${where}: options must be A B C D in order`);
    }
    if (!['A', 'B', 'C', 'D'].includes(item.answer)) {
      problems.push(`${where}: answer must be A–D`);
    } else {
      keys[item.answer]++;
    }

    for (const opt of item.options) {
      const minWhy = opt.id === item.answer ? 15 : 20;
      if (!opt.text || !opt.why || opt.why.length < minWhy) {
        problems.push(`${where} option ${opt.id}: need text and why (≥${minWhy} chars)`);
      }
    }

    if (item.answer) {
      const key = item.options.find((o) => o.id === item.answer);
      if (key && (!key.why || key.why.length < 15)) {
        problems.push(`${where}: correct option needs a short why`);
      }
    }

    if (!item.concept || item.concept.length < 40) {
      problems.push(`${where}: need concept explanation (≥40 chars) after the short why`);
    }
  }

  if (data.items.length >= 5) {
    const total = data.items.length;
    for (const [letter, n] of Object.entries(keys)) {
      if (n / total > 0.4) {
        problems.push(`${label}: answer ${letter} is ${(100 * n) / total}% of keys (cap ~40%)`);
      }
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} practice problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(
  `practice: outline ${outline.outlineAsOf}; ${sectionFiles.length} sections; ${itemCount} item(s); all gates passed`
);
