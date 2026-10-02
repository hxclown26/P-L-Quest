'use strict';

// Draws a screen on a recording canvas and reads back what it put on it: the letters as text, in
// the box of the screen asked for, and the rectangles (with the alpha they were painted at).

const { SUPPORTED_CHARS } = require('../../src/render/font');
const { drawFrame } = require('../../src/render/index');

const CELL_W = 6;

function recorder() {
  const glyphs = [];
  const fills = [];
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
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

module.exports = { recorder, textIn, draw };
