'use strict';

// Draws a screen on a recording canvas and reads back what it put on it: the letters as text, in
// the box of the screen asked for, and the rectangles (with the alpha they were painted at).

const { SUPPORTED_CHARS } = require('../../src/render/font');
const { drawFrame } = require('../../src/render/index');

const CELL_W = 6;

function recorder() {
  const glyphs = [];
  const fills = [];
  // save() and restore() keep the paint state, as a real canvas does, so an effect that sets its own alpha
  // inside a save cannot leak it into what is drawn after.
  const saved = [];
  // A canvas starts opaque and black.
  const ctx = new Proxy({ globalAlpha: 1, fillStyle: '#000000' }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'save') return () => saved.push({ globalAlpha: target.globalAlpha, fillStyle: target.fillStyle });
      if (prop === 'restore') return () => Object.assign(target, saved.pop());
      if (prop === 'fillRect') return (x, y, w, h) => fills.push({ x, y, w, h, alpha: target.globalAlpha, color: target.fillStyle });
      if (prop === 'drawImage') {
        return (...args) => {
          if (args.length === 9) glyphs.push({ ch: SUPPORTED_CHARS[args[1] / CELL_W], x: args[5], y: args[6] + 2, w: args[7], h: args[8] });
        };
      }
      return () => undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  // The canvases of the font atlas are separate from the screen.
  global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => undefined, set: () => true }) }) };
  return { ctx, glyphs, fills };
}

// The text drawn inside a box of the screen, one string per row (rows are told apart by their top).
function textIn(glyphs, box) {
  const inside = glyphs.filter((g) => g.x >= box.x && g.x < box.x + box.w && g.y >= box.y && g.y < box.y + box.h);
  const rows = new Map();
  for (const g of inside) rows.set(g.y, [...(rows.get(g.y) || []), g]);
  return [...rows.entries()].sort(([a], [b]) => a - b).map(([, row]) => row.sort((a, b) => a.x - b.x).map((g) => g.ch).join(''));
}

function draw(app) {
  const { ctx, glyphs, fills } = recorder();
  drawFrame(ctx, app);
  return { glyphs, fills };
}

// The boxes of every text call a screen makes (x, y, width, height of what is written), so a test can find text that is
// printed over other text. The text helpers of the renderer are wrapped for the length of one frame.
function textRuns(app) {
  const ui = require('../../src/render/ui');
  const original = { text: ui.text, textRight: ui.textRight, textCenter: ui.textCenter, paragraph: ui.paragraph };
  const runs = [];
  const width = (str, scale = 1) => [...str].length * CELL_W * scale;
  const add = (str, x, y, scale = 1) => runs.push({ text: str, x: Math.round(x), y, w: width(str, scale), h: 8 * scale });
  ui.text = (ctx, str, x, y, color, opts = {}) => { add(str, x, y, opts.scale || 1); return original.text(ctx, str, x, y, color, opts); };
  ui.textRight = (ctx, str, xRight, y, color, opts = {}) => {
    const scale = opts.scale || 1;
    add(str, xRight - width(str, scale) + scale - (opts.bold ? 1 : 0), y, scale);
    return original.textRight(ctx, str, xRight, y, color, opts);
  };
  ui.textCenter = (ctx, str, cx, y, color, opts = {}) => {
    const scale = opts.scale || 1;
    add(str, cx - Math.round(width(str, scale) / 2), y, scale);
    return original.textCenter(ctx, str, cx, y, color, opts);
  };
  ui.paragraph = (ctx, rows, x, y, lineH = 10) => {
    rows.forEach((row, i) => add(row.text, x, y + i * lineH));
    return original.paragraph(ctx, rows, x, y, lineH);
  };
  try {
    draw(app);
  } finally {
    Object.assign(ui, original);
  }
  return runs;
}

// Pairs of text runs that share more than a pixel across and two rows down: letters on top of letters.
function overlaps(runs) {
  const found = [];
  runs.forEach((a, i) => runs.slice(i + 1).forEach((b) => {
    if (!a.text.trim() || !b.text.trim()) return;
    const across = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const down = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (across > 1 && down > 2 && !(a.text === b.text && a.x === b.x && a.y === b.y)) found.push([a, b]);
  }));
  return found;
}

module.exports = { recorder, textIn, draw, textRuns, overlaps };
