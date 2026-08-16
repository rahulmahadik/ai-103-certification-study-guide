/**
 * html-transforms.mjs — the per-fragment rewrites the guide build applies.
 *
 * Kept out of build-guide.mjs so each one is independently testable, and so
 * the regexes live somewhere they can be read without hunting through the
 * build script.
 */

/**
 * Send off-site links to a new tab.
 *
 * Nearly every external link in the guide goes to Microsoft Learn, and a
 * reader following one mid-module should not lose their place. rel="noopener"
 * is required alongside target="_blank": without it the opened page gets a
 * handle on this one through window.opener.
 */
export function externalLinksInNewTab(html) {
  return html.replace(/<a\s([^>]*href="https?:\/\/[^"]*"[^>]*)>/g, (whole, attrs) =>
    /target=/.test(attrs) ? whole : `<a ${attrs} target="_blank" rel="noopener">`
  );
}

/**
 * Wrap every table in a scroll container.
 *
 * A wide comparison table has a floor width no phone can meet. Making the
 * table itself `display: block; overflow-x: auto` lets it scroll, but it also
 * lets the auto table layout squeeze cells to fit the viewport first —
 * measured at 95px for a cell of running text. A wrapper scrolls without
 * touching the table's own layout, so columns keep a readable width.
 */
export function wrapTables(html) {
  return html
    .replace(/<table\b/g, '<div class="tscroll"><table')
    .replace(/<\/table>/g, '</table></div>');
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Containers a diagram should never be trapped inside. */
const TRAPS = new Set(['ul', 'ol', 'li']);

/**
 * Move diagrams out of the containers they are nested in.
 *
 * The source pairs a drawing with a column of prose, which reads well on
 * paper. On screen the column is around 418px, and a diagram drawn on a
 * 788-unit canvas scales to 0.53 there — its 12px labels land at 6px. Worse,
 * a tall diagram beside short prose leaves a column of dead space. One diagram
 * was also authored inside an `<li>`, so the browser drew a bullet beside its
 * caption.
 *
 * So each diagram is lifted out of its grid, column or list item and
 * re-inserted directly after it, where it gets the full text width. The prose
 * keeps its columns; the drawing gets a band of its own beneath them.
 *
 * One move per pass, repeated: each move shifts the offsets a single pass
 * would have collected, and lifting out of an `<li>` leaves the figure inside
 * the `<ul>`, which the next pass then lifts out of in turn.
 */
export function hoistFiguresOutOfGrids(html) {
  for (let pass = 0; pass < 40; pass++) {
    const next = hoistOne(html);
    if (!next) return html;
    html = next;
  }
  throw new Error('hoistFiguresOutOfGrids: still moving figures after 40 passes');
}

function hoistOne(html) {
  const tag = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  const stack = [];
  let figure = null; // { start, depth } once we are inside one worth moving

  for (let m; (m = tag.exec(html)); ) {
    const [whole, slash, rawName, attrs, selfClose] = m;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || selfClose) continue;

    if (!slash) {
      if (!figure && name === 'figure') {
        // Only worth moving if it is trapped in something.
        const trap = [...stack].reverse().find((f) => f.isTrap);
        if (trap) figure = { start: m.index, depth: stack.length, grid: trap };
      }
      stack.push({ name, isTrap: TRAPS.has(name) || /display:\s*(grid|flex)/.test(attrs), start: m.index });
      continue;
    }

    // Closing tag.
    const open = stack.pop();
    if (figure && open && open.name === 'figure' && stack.length === figure.depth) {
      figure.end = m.index + whole.length;
    }
    if (figure && figure.end && open === figure.grid) {
      const gridEnd = m.index + whole.length;
      const fig = html.slice(figure.start, figure.end);
      return html.slice(0, figure.start) + html.slice(figure.end, gridEnd) + fig + html.slice(gridEnd);
    }
  }
  return null;
}

/**
 * Collapse a grid that has nothing to put in all of its columns.
 *
 * Two ways one arises. The source declares `1.05fr 1fr` and then supplies a
 * single child, leaving the right half of a unit blank down its whole height —
 * the model playground unit was blank for 450px. And hoistFiguresOutOfGrids
 * causes the rest: pull a diagram out of a two-column block and the column it
 * occupied is left empty, so the prose keeps half the width for no reason.
 *
 * A grid with fewer filled children than declared columns is rewritten to a
 * single column. A grid with as many children as columns, or more (content
 * that flows over several rows), is left alone.
 */
export function collapseUnderfilledGrids(html) {
  for (let pass = 0; pass < 200; pass++) {
    const next = collapseOne(html);
    if (!next) return html;
    html = next;
  }
  throw new Error('collapseUnderfilledGrids: still collapsing grids after 200 passes');
}

/** Does this element hold anything a reader would see? */
const hasContent = (inner) =>
  inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0 ||
  /<(svg|img|pre|hr|canvas)\b/i.test(inner);

function collapseOne(html) {
  const tag = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  const stack = [];

  for (let m; (m = tag.exec(html)); ) {
    const [whole, slash, rawName, attrs, selfClose] = m;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || selfClose) continue;

    if (!slash) {
      const cols = /display:\s*grid/.test(attrs) && attrs.match(/grid-template-columns:([^;"]+)/);
      const frame = { name, start: m.index, openEnd: m.index + whole.length, kids: [], attrs };
      if (cols) {
        const tracks = cols[1].trim().split(/\s+/).filter(Boolean);
        // Already one column, or a repeat()/auto-fill track list we should not
        // second-guess.
        if (tracks.length > 1 && !/repeat|auto-/.test(cols[1])) frame.tracks = tracks.length;
      }
      const parent = stack[stack.length - 1];
      if (parent) parent.kids.push({ name, start: m.index, openEnd: m.index + whole.length });
      stack.push(frame);
      continue;
    }

    const open = stack.pop();
    if (!open) continue;
    const parent = stack[stack.length - 1];
    if (parent && parent.kids.length) parent.kids[parent.kids.length - 1].end = m.index;

    if (!open.tracks) continue;
    const filled = open.kids.filter((k) => hasContent(html.slice(k.openEnd, k.end ?? k.openEnd)));
    if (filled.length >= open.tracks) continue;

    const fixed = open.attrs.replace(/grid-template-columns:[^;"]+/, 'grid-template-columns:1fr');
    return html.slice(0, open.start) + `<${open.name}${fixed}>` + html.slice(open.openEnd);
  }
  return null;
}

/**
 * The source names its fonts by their Google Fonts families. The self-hosted
 * set is a different but equivalent trio, so remap the names rather than ship
 * four more font files.
 */
export function remapFonts(html) {
  return html
    .replace(/'Gabarito',\s*sans-serif/g, "'Barlow Condensed','Inter',sans-serif")
    .replace(/'Newsreader',\s*Georgia,\s*serif/g, "'Inter',system-ui,sans-serif")
    .replace(/'Caveat',\s*cursive/g, "'Barlow Condensed','Inter',sans-serif")
    .replace(/'JetBrains Mono'/g, "'JetBrains Mono',ui-monospace,monospace");
}
