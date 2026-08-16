/**
 * render-cheatsheet.mjs — export the cheat sheet to PNG and PDF.
 *
 * cheatsheet/ai-103-cheatsheet.html holds two fixed 1920 x 2960 boards.
 * Capturing each at deviceScaleFactor 1 gives Full-HD-width images; at 2 it
 * gives 3840 x 5920 images, sharp enough to print at poster size.
 *
 *   npm run render            both sheets at both scales, plus the PDF
 *   npm run render -- --1x    just the Full HD pair
 *
 * Needs Chromium. `npm install` pulls in Puppeteer, which downloads its own.
 */

import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, "docs", "cheatsheet-board.html");
const OUT_DIR = join(ROOT, 'docs', 'assets');

const BOARD_WIDTH = 1920;
const BOARD_HEIGHT = 6800;

const SHEETS = [
  { id: 'board-1', slug: 'ai-103-cheatsheet' },
];

const only1x = process.argv.includes('--1x');
const scales = only1x ? [1] : [1, 2];

if (!existsSync(SOURCE)) {
  console.error(`missing source: ${SOURCE}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--font-render-hinting=none', '--force-color-profile=srgb'],
});

/** A page with the board loaded and its webfonts settled. */
async function openBoard(scale) {
  const page = await browser.newPage();
  await page.setViewport({
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    deviceScaleFactor: scale,
  });
  await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

let clipped = false;

try {
  for (const scale of scales) {
    const page = await openBoard(scale);

    for (const sheet of SHEETS) {
      // Each board is a fixed box with overflow hidden, so content spilling
      // past it would be cropped in silence. Report it instead of shipping a
      // truncated poster.
      const spill = await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const last = el.lastElementChild;
        const used = last
          ? last.getBoundingClientRect().bottom - el.getBoundingClientRect().top
          : 0;
        return Math.round(used - el.clientHeight);
      }, sheet.id);

      const strips = await page.evaluate(() =>
        [...document.querySelectorAll('.strip')]
          .map((el) => {
            const h2 = el.querySelector('h2');
            const hint = el.querySelector('.hint');
            const used =
              (h2 ? h2.getBoundingClientRect().width : 0) +
              (hint ? hint.getBoundingClientRect().width : 0) +
              26;
            return {
              text: h2 ? h2.textContent.trim() : '?',
              over: Math.round(used - el.getBoundingClientRect().width),
            };
          })
          .filter((s) => s.over > -30)
      );

      for (const s of strips) {
        clipped = true;
        console.warn(
          `  strip "${s.text}": heading + hint leave ${-s.over}px for the rule` +
          ` — shorten the hint`
        );
      }

      if (spill === null) {
        console.error(`  no element #${sheet.id} in the source`);
        continue;
      }
      if (spill > 1) {
        clipped = true;
        console.warn(`  ${sheet.id}: content overflows the board by ${spill}px`);
      } else if (scale === 1) {
        console.log(`  ${sheet.id}: ${Math.abs(spill)}px of headroom left`);
      }

      const name = scale === 1 ? `${sheet.slug}.png` : `${sheet.slug}@${scale}x.png`;
      await page.screenshot({
        path: join(OUT_DIR, name),
        clip: { x: 0, y: 0, width: BOARD_WIDTH, height: BOARD_HEIGHT },
        captureBeyondViewport: true,
      });

      console.log(
        `wrote docs/assets/${name}  (${BOARD_WIDTH * scale} x ${BOARD_HEIGHT * scale})`
      );
    }

    await page.close();
  }

  // A two-page vector PDF, for anyone who wants to print rather than post.
  const page = await openBoard(1);
  await page.pdf({
    path: join(OUT_DIR, 'ai-103-cheatsheet.pdf'),
    width: `${BOARD_WIDTH}px`,
    height: `${BOARD_HEIGHT}px`,
    printBackground: true,
  });
  console.log('wrote docs/assets/ai-103-cheatsheet.pdf');
  await page.close();
} finally {
  await browser.close();
}

if (clipped) {
  console.error('\none or more boards overflowed — trim a panel before publishing');
  process.exit(1);
}
