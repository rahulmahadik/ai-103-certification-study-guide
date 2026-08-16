/**
 * diagram-kit.mjs — helpers for hand-built SVG diagrams.
 *
 * SVG has no layout engine. Text does not wrap, boxes do not grow to fit their
 * contents, and nothing tells you when a label is wider than the rectangle it
 * sits in — it just draws over the edge. Hand-placing labels produced 41
 * overflows and collisions across eleven diagrams.
 *
 * So: estimate the width of every label up front, size the box to the widest
 * one, and shrink the type only if the box is fixed. tools/check-diagrams.mjs
 * renders the result and fails the build on anything that still overflows,
 * crowds an edge, or collides — the estimate is the plan, the render is the
 * proof.
 */

/** Shared palette, matching the guide. */
export const C = {
  ink: '#16202B',
  red: '#C0392B',
  blue: '#1B5E8C',
  teal: '#0E7C63',
  plum: '#6D3A9E',
  amber: '#AD4410',   // darkened from #BC4B10, which sat at 4.48:1 on the warm tints
  rule: '#E3D9C4',
  grey: '#B6C6D3',
  mute: '#6F6555',
  fill: '#F6F1E2',
  paper: '#FFFFFF',
  tintBlue: '#EEF4FA',
  tintTeal: '#EAF7F3',
  tintRed: '#FBEFE7',
  tintPlum: '#F7F2FA',
  tintGrey: '#F5F8FB',
};

/**
 * Conservative width estimate for a run of Inter.
 *
 * Per-character advances differ enormously — an "i" is a third of an "M" — so
 * the estimate buckets characters rather than using one average. It runs
 * deliberately wide: over-estimating costs a few pixels of padding, while
 * under-estimating puts text through the side of a box.
 */
export function textWidth(text, size = 13, weight = 400) {
  const s = String(text).replace(/&[a-z]+;/g, 'x');
  let em = 0;
  for (const ch of s) {
    if ('iljI.,:;\'!|`'.includes(ch)) em += 0.30;
    else if ('ftr()[]{}-/\\ '.includes(ch)) em += 0.38;
    else if ('MW@%'.includes(ch)) em += 0.92;
    else if (ch >= 'A' && ch <= 'Z') em += 0.68;
    else if (ch >= '0' && ch <= '9') em += 0.58;
    else em += 0.54;
  }
  const bold = weight >= 600 ? 1.045 : 1;
  return em * size * bold * 1.06; // 6% safety margin
}

/** The widest of several labels, at their own sizes. */
export const widestOf = (runs) => Math.max(...runs.map(([t, s, w]) => textWidth(t, s, w)));

/** Largest font size at which `text` fits `maxWidth`, never below `min`. */
export function fitSize(text, maxWidth, preferred = 13, min = 9.5) {
  let size = preferred;
  while (size > min && textWidth(text, size) > maxWidth) size -= 0.5;
  return size;
}

/* ------------------------------------------------------------- primitives */

export const rect = (x, y, w, h, fill, stroke, dash) =>
  `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="7" fill="${fill}"` +
  (stroke ? ` stroke="${stroke}" stroke-width="2"` : '') +
  (dash ? ` stroke-dasharray="${dash}"` : '') + '/>';

export const text = (x, y, t, { size = 13, weight = 400, fill = C.ink, anchor = 'start' } = {}) =>
  `<text x="${r(x)}" y="${r(y)}" font-size="${size}" font-weight="${weight}" fill="${fill}"` +
  (anchor === 'start' ? '' : ` text-anchor="${anchor}"`) + `>${t}</text>`;

/** A horizontal arrow. */
export const arrowH = (x1, x2, y, fill = C.grey) =>
  `<path d="M${r(x1)} ${r(y)}H${r(x2 - 7)}" stroke="${fill}" stroke-width="2" fill="none"/>` +
  `<path d="M${r(x2 - 8)} ${r(y - 5)}L${r(x2)} ${r(y)}L${r(x2 - 8)} ${r(y + 5)}z" fill="${fill}"/>`;

/** A vertical arrow. */
export const arrowV = (x, y1, y2, fill = C.grey) =>
  `<path d="M${r(x)} ${r(y1)}V${r(y2 - 7)}" stroke="${fill}" stroke-width="2" fill="none"/>` +
  `<path d="M${r(x - 5)} ${r(y2 - 8)}L${r(x)} ${r(y2)}L${r(x + 5)} ${r(y2 - 8)}z" fill="${fill}"/>`;

/**
 * A labelled box that sizes itself to its contents.
 *
 * Give it a title, an optional subtitle and a minimum width; it returns the
 * markup and the width it actually used, so the caller can lay the next box
 * beside it without guessing.
 */
export function card(x, y, { title, sub, w, h = sub ? 58 : 40, fill = C.paper, stroke = C.rule, dash, titleSize = 13, subSize = 10.5, colour, subColour }) {
  const pad = 14;
  // A card drawn in a solid colour asks for a white title. Its subtitle was
  // still painted in the grey used on tinted cards, which on a solid teal
  // ground came out dark-on-dark and unreadable.
  const subFill = subColour ?? (colour === '#fff' ? '#FFFFFF' : C.mute);
  const needed = Math.max(
    textWidth(title, titleSize, 700),
    sub ? textWidth(sub, subSize, 400) : 0
  ) + pad * 2;
  const width = Math.max(w ?? 0, Math.ceil(needed));
  const cx = x + width / 2;

  return {
    width,
    markup:
      rect(x, y, width, h, fill, stroke, dash) +
      text(cx, y + (sub ? 24 : h / 2 + 5), title, { size: titleSize, weight: 700, fill: colour ?? C.ink, anchor: 'middle' }) +
      (sub ? text(cx, y + 44, sub, { size: subSize, fill: subFill, anchor: 'middle' }) : ''),
  };
}

/** Lay cards out in a row with arrows between them, wrapping nothing. */
export function flow(x, y, items, { gap = 34, colour = C.grey } = {}) {
  let cursor = x;
  let markup = '';
  items.forEach((item, i) => {
    const c = card(cursor, y, item);
    markup += c.markup;
    if (i < items.length - 1) markup += arrowH(cursor + c.width + 6, cursor + c.width + gap - 4, y + (item.sub ? 29 : 20), colour);
    cursor += c.width + gap;
  });
  return { markup, width: cursor - gap - x, end: cursor - gap };
}

/** Wrap a diagram in a figure with its caption and accessible label. */
export function figure(viewBox, body, caption, label, id) {
  // Grow the box by the inset on each axis and shift the content in, so
  // nothing sits on the border.
  const INSET = 14;
  const [, , vw, vh] = viewBox.trim().split(/\s+/).map(Number);
  if (!Number.isFinite(vw) || !Number.isFinite(vh)) {
    // A NaN viewBox silently strips the SVG of its intrinsic size: it renders
    // at a default 300x150 box and clips everything outside. Fail loudly.
    throw new Error(`figure(): could not parse viewBox "${viewBox}"`);
  }
  const padded = `0 0 ${vw + INSET * 2} ${vh + INSET * 2}`;
  const inner = `<g transform="translate(${INSET},${INSET})">${body}</g>`;

  return (
    `<figure${id ? ` data-diagram="${id}"` : ''} style="margin:0 0 14px;break-inside:avoid">` +
    `<svg viewBox="${padded}" role="img" aria-label="${label}"${id ? ` data-diagram="${id}"` : ''} ` +
    `style="width:100%;height:auto;display:block;background:#fff;border:1px solid ${C.rule};border-radius:8px">` +
    `<g font-family="Inter,system-ui,sans-serif">${inner}</g></svg>` +
    `<figcaption style="font-size:12.5px;color:${C.mute};margin-top:6px;line-height:1.4">${caption}</figcaption>` +
    `</figure>`
  );
}

const r = (n) => Math.round(n * 10) / 10;
