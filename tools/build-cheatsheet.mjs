/**
 * build-cheatsheet.mjs — assemble the cheat sheet board for publishing.
 *
 * cheatsheet/ai-103-cheatsheet.html is the editable source: markup, styles and
 * inline SVG diagrams in one file. It carries an <!--ICON-SPRITE--> placeholder
 * rather than 44 inlined <symbol> definitions, so the source stays readable and
 * the icon set stays a build input.
 *
 * This step swaps the placeholder for the sprite that tools/build-assets.mjs
 * generates, and writes docs/cheatsheet-board.html. That output is what the
 * renderer screenshots and what "Open as a web page" links to. It is
 * self-contained apart from the self-hosted fonts alongside it — nothing is
 * fetched from a CDN at any point.
 *
 * Run with: npm run cheatsheet
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'cheatsheet', 'ai-103-cheatsheet.html');
const SPRITE = join(ROOT, 'docs', 'assets', 'icons.svg');
const OUTPUT = join(ROOT, 'docs', 'cheatsheet-board.html');

const PLACEHOLDER = '<!--ICON-SPRITE-->';

if (!existsSync(SOURCE)) {
  console.error(`missing source: ${SOURCE}`);
  process.exit(1);
}

if (!existsSync(SPRITE)) {
  console.error('missing docs/assets/icons.svg — run `npm run assets` first');
  process.exit(1);
}

const source = readFileSync(SOURCE, 'utf8');

if (!source.includes(PLACEHOLDER)) {
  console.error(`the source no longer contains ${PLACEHOLDER} — icons would be blank`);
  process.exit(1);
}

const html = source.replace(PLACEHOLDER, readFileSync(SPRITE, 'utf8').trim());

writeFileSync(OUTPUT, html);
console.log(`built docs/cheatsheet-board.html  (${(html.length / 1024).toFixed(0)} KB)`);
