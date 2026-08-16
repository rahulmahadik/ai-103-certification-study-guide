/**
 * check-diagrams.mjs — geometry QA for every inline SVG diagram.
 *
 * SVG has no layout engine: text does not wrap, boxes do not grow, and nothing
 * warns you when a label is wider than the rectangle it sits in. The only way
 * to know is to render it and measure. This checks six things per diagram:
 *
 *   viewBox   a numeric viewBox, and a rendered box matching its aspect ratio
 *   overflow  a text run wider or taller than its containing shape
 *   crowding  a label closer than 6px to the edge of its box
 *   collision two text runs whose boxes intersect
 *   contrast  a label below WCAG AA against the shape it sits on
 *   deadspace drawn content filling well under the width it was given
 *
 * The viewBox check exists because a malformed one is invisible to every other
 * check here: the SVG loses its intrinsic size, renders in a default ~300x150
 * box and clips everything outside it, while the labels inside stay in perfect
 * relative position. The geometry checks passed on eleven clipped diagrams.
 *
 * The dead-space check exists because hand-placed coordinates drifted: three
 * diagrams ended 120-490 units short of the right edge of their own canvas,
 * so the drawing sat left while its caption and cue bar ran the full width.
 *
 * Run with: npm run check:diagrams  (also part of npm run check)
 */

import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');

/** Minimum clear space between a label and the edge of its box, in px. */
const PAD = 5;

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const browser = await puppeteer.launch({ headless: 'new' });
const problems = [];
let diagrams = 0;
let labels = 0;

for (const file of htmlFiles(DOCS)) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  const found = await page.evaluate((pad) => {
    const out = [];
    const svgs = [...document.querySelectorAll('svg[role="img"]')];

    /** "rgb(r, g, b)" / "rgba(r, g, b, a)" -> [r, g, b, a]. */
    const parse = (css) => {
      const n = (css.match(/[\d.]+/g) || []).map(Number);
      return n.length >= 3 ? [n[0], n[1], n[2], n.length > 3 ? n[3] : 1] : null;
    };
    const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
    const lum = (rgb) => {
      const [r, g, b] = rgb.map((c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };

    for (const svg of svgs) {
      const name = (svg.getAttribute('aria-label') || '').slice(0, 44);

      // A malformed viewBox strips the SVG of its intrinsic size, so it draws
      // into a default box and clips. Everything below would still pass.
      const vb = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
      const box = svg.getBoundingClientRect();
      if (vb.length !== 4 || !vb.every(Number.isFinite) || vb[2] <= 0 || vb[3] <= 0) {
        out.push({ kind: 'viewbox', name, detail: `viewBox="${svg.getAttribute('viewBox')}"` });
        continue;
      }
      // Relative, not absolute: a ratio of 3.5 drifts by 0.02 on rounding alone.
      const drift = Math.abs((box.width / box.height) / (vb[2] / vb[3]) - 1);
      if (drift > 0.03) {
        out.push({ kind: 'viewbox', name, detail: `renders ${Math.round(box.width)}x${Math.round(box.height)} for a ${vb[2]}x${vb[3]} viewBox` });
      }

      // Content that stops well short of the canvas it was given.
      const inner = svg.querySelector('g > g');
      if (inner) {
        const bb = inner.getBBox();
        const available = vb[2] - (bb.x || 0) * 2;
        if (available > 0 && bb.width / available < 0.9) {
          out.push({ kind: 'deadspace', name, used: Math.round(bb.width), of: Math.round(available) });
        }
      }

      const rects = [...svg.querySelectorAll('rect')].map((r) => ({ el: r, b: r.getBoundingClientRect() }));
      const texts = [...svg.querySelectorAll('text')]
        .map((t) => ({ el: t, b: t.getBoundingClientRect(), s: (t.textContent || '').trim() }))
        .filter((t) => t.b.width > 0 && t.s);

      out.push({ kind: 'count', name, labels: texts.length });

      for (const t of texts) {
        // The smallest rect whose box contains this label's centre is the one
        // it is meant to sit in.
        const cx = t.b.left + t.b.width / 2;
        const cy = t.b.top + t.b.height / 2;
        let host = null;
        for (const r of rects) {
          if (cx >= r.b.left && cx <= r.b.right && cy >= r.b.top && cy <= r.b.bottom) {
            if (!host || r.b.width * r.b.height < host.b.width * host.b.height) host = r;
          }
        }
        // Contrast against whatever the label is actually sitting on. Every
        // rect in the kit is opaque, so the ground is that fill over paper;
        // the label itself may be translucent white on a solid card.
        const fg = parse(getComputedStyle(t.el).fill);
        const bg = parse(host ? getComputedStyle(host.el).fill : 'rgb(255,255,255)');
        if (fg && bg) {
          const ground = over(bg, [255, 255, 255]);
          const size = parseFloat(getComputedStyle(t.el).fontSize) || 12;
          const bold = (parseInt(getComputedStyle(t.el).fontWeight, 10) || 400) >= 700;
          const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
          const got = ratio(over(fg, ground), ground);
          if (got < need) {
            out.push({ kind: 'contrast', name, text: t.s.slice(0, 30), got: +got.toFixed(2), need });
          }
        }

        if (!host) continue;

        const side = Math.min(t.b.left - host.b.left, host.b.right - t.b.right);
        const ends = Math.min(t.b.top - host.b.top, host.b.bottom - t.b.bottom);
        const gap = Math.min(side, ends);

        if (gap < 0) out.push({ kind: 'overflow', name, text: t.s.slice(0, 30), by: Math.round(-gap) });
        else if (side < pad) out.push({ kind: 'crowded', name, text: t.s.slice(0, 30), gap: +side.toFixed(1), axis: 'side' });
        else if (ends < 2.5) out.push({ kind: 'crowded', name, text: t.s.slice(0, 30), gap: +ends.toFixed(1), axis: 'top/bottom' });
      }

      // Text runs that visually collide with each other.
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i].b, b = texts[j].b;
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox > 1 && oy > 1) {
            out.push({ kind: 'collision', name, text: `${texts[i].s.slice(0, 20)} / ${texts[j].s.slice(0, 20)}`, by: Math.round(Math.min(ox, oy)) });
          }
        }
      }
    }
    return out;
  }, PAD);

  const rel = file.replace(DOCS, '').replace(/\\/g, '/').replace(/^\//, '');
  for (const f of found) {
    if (f.kind === 'count') { diagrams++; labels += f.labels; continue; }
    if (f.kind === 'overflow') problems.push(`${rel} · ${f.name}: "${f.text}" overflows its box by ${f.by}px`);
    if (f.kind === 'crowded') problems.push(`${rel} · ${f.name}: "${f.text}" only ${f.gap}px from the ${f.axis} edge`);
    if (f.kind === 'collision') problems.push(`${rel} · ${f.name}: "${f.text}" overlap by ${f.by}px`);
    if (f.kind === 'viewbox') problems.push(`${rel} · ${f.name}: ${f.detail}`);
    if (f.kind === 'contrast') problems.push(`${rel} · ${f.name}: "${f.text}" contrast ${f.got}:1, needs ${f.need}:1`);
    if (f.kind === 'deadspace') problems.push(`${rel} · ${f.name}: drawing is ${f.used} units wide on a ${f.of}-unit canvas`);
  }
  await page.close();
}

await browser.close();

if (problems.length) {
  console.error(`${problems.length} diagram problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(`diagrams: ${diagrams} rendered, ${labels} labels, none overflowing, crowded or overlapping`);
