'use strict';

const { SUPPORTED_CHARS, CELL_W, CELL_H, pixelsOf } = require('./font');
const { wrapText } = require('../text');
const P = require('./palette');
const { rect, bands } = require('./draw');

const INDEX = new Map([...SUPPORTED_CHARS].map((ch, i) => [ch, i]));
const FALLBACK = INDEX.get('?');

// One pre-rendered strip of glyphs per colour; drawing text is then one drawImage per letter.
const atlases = new Map();
function atlasFor(color) {
  if (!atlases.has(color)) {
    const canvas = document.createElement('canvas');
    canvas.width = SUPPORTED_CHARS.length * CELL_W;
    canvas.height = CELL_H;
    const g = canvas.getContext('2d');
    g.fillStyle = color;
    [...SUPPORTED_CHARS].forEach((ch, i) => {
      pixelsOf(ch).forEach(([x, y]) => g.fillRect(i * CELL_W + x, y, 1, 1));
    });
    atlases.set(color, canvas);
  }
  return atlases.get(color);
}

// The top rows of a slanted letter (the two accent rows and the first three rows of the body)
// lean one pixel to the right, which is all the italics a 5x7 font needs.
const SLANT_ROWS = 5;

function drawGlyph(ctx, atlas, idx, x, y, scale, slant) {
  const sx = idx * CELL_W;
  if (!slant) {
    ctx.drawImage(atlas, sx, 0, CELL_W, CELL_H, x, y, CELL_W * scale, CELL_H * scale);
    return;
  }
  ctx.drawImage(atlas, sx, 0, CELL_W, SLANT_ROWS, x + scale, y, CELL_W * scale, SLANT_ROWS * scale);
  ctx.drawImage(atlas, sx, SLANT_ROWS, CELL_W, CELL_H - SLANT_ROWS, x, y + SLANT_ROWS * scale, CELL_W * scale, (CELL_H - SLANT_ROWS) * scale);
}

// y is the top of the capital letters; the glyph cell reserves two rows above for accents.
// `bold` strikes every letter a second time one pixel to the right; `slant` leans it.
function text(ctx, str, x, y, color = P.white, { scale = 1, shadow = null, bold = false, slant = false } = {}) {
  if (shadow) text(ctx, str, x + scale, y + scale, shadow, { scale, bold, slant });
  if (bold) text(ctx, str, x + scale, y, color, { scale, slant });
  const atlas = atlasFor(color);
  ctx.imageSmoothingEnabled = false;
  [...str].forEach((ch, i) => {
    const idx = INDEX.has(ch) ? INDEX.get(ch) : FALLBACK;
    drawGlyph(ctx, atlas, idx, Math.round(x) + i * CELL_W * scale, Math.round(y) - 2 * scale, scale, slant);
  });
}

const textWidth = (str, scale = 1) => [...str].length * CELL_W * scale;
// A bold line starts one pixel further left, so its second strike ends where plain text would.
const textRight = (ctx, str, xRight, y, color, opts = {}) =>
  text(ctx, str, xRight - textWidth(str, opts.scale || 1) + (opts.scale || 1) - (opts.bold ? 1 : 0), y, color, opts);
const textCenter = (ctx, str, cx, y, color, opts = {}) =>
  text(ctx, str, cx - Math.round(textWidth(str, opts.scale || 1) / 2), y, color, opts);

// Wraps tagged lines ({ text, tone }) to a column width, keeping the tone on every row.
const wrapLines = (items, cols) =>
  items.flatMap((item) => wrapText(item.text, cols).map((row) => ({ text: row, tone: item.tone || 'white' })));

function paragraph(ctx, rows, x, y, lineH = 10) {
  rows.forEach((row, i) => text(ctx, row.text, x, y + i * lineH, P[row.tone] || P.white));
}

// A blue gradient window with a light frame and cut corners, like a Final Fantasy menu.
function windowBox(ctx, x, y, w, h, { selected = false, alpha = 1 } = {}) {
  ctx.globalAlpha = alpha;
  bands(ctx, x + 1, y + 1, w - 2, h - 2, selected ? P.selTop : P.winTop, selected ? P.selBottom : P.winBottom, 2);
  ctx.globalAlpha = 1;
  const edge = selected ? P.gold : P.winEdge;
  rect(ctx, x + 1, y, w - 2, 1, edge);
  rect(ctx, x + 1, y + h - 1, w - 2, 1, edge);
  rect(ctx, x, y + 1, 1, h - 2, edge);
  rect(ctx, x + w - 1, y + 1, 1, h - 2, edge);
  rect(ctx, x + 2, y + 1, w - 4, 1, selected ? P.winEdge : P.winShade);
}

function bar(ctx, x, y, w, h, fraction, fg, bg = '#10142c') {
  rect(ctx, x, y, w, h, bg);
  rect(ctx, x, y, Math.round(w * Math.max(0, Math.min(1, fraction))), h, fg);
}

function triangle(ctx, x, y, dir, color) {
  if (dir > 0) {
    rect(ctx, x + 2, y, 1, 1, color);
    rect(ctx, x + 1, y + 1, 3, 1, color);
    rect(ctx, x, y + 2, 5, 1, color);
  } else {
    rect(ctx, x, y, 5, 1, color);
    rect(ctx, x + 1, y + 1, 3, 1, color);
    rect(ctx, x + 2, y + 2, 1, 1, color);
  }
}

const STAR = ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'];
function star(ctx, x, y, filled) {
  const color = filled ? P.gold : P.dim;
  STAR.forEach((row, cy) => {
    [...row].forEach((ch, cx) => {
      if (ch === '#') rect(ctx, x + cx, y + cy, 1, 1, color);
    });
  });
}

module.exports = {
  text,
  textRight,
  textCenter,
  textWidth,
  paragraph,
  wrapLines,
  windowBox,
  bar,
  triangle,
  star,
};
