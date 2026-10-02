'use strict';

const { rect, disc, ellipse, line, bands, sprite } = require('../../draw');
const { text } = require('../../ui');
const P = require('../../palette');

// Every scene is 116x42 and paints its own sky and ground; the lower right corner stays calm because
// the month label sits there.
const W = 116;
const H = 42;

// Local helpers so every scene can use coordinates from its own top-left corner. `s` draws a sprite
// given as rows of letters ('.' is transparent) with a map from letter to colour.
const toolsFor = (ctx, ox, oy) => ({
  r: (x, y, w, h, c) => rect(ctx, ox + x, oy + y, w, h, c),
  d: (x, y, radius, c) => disc(ctx, ox + x, oy + y, radius, c),
  e: (x, y, rx, ry, c) => ellipse(ctx, ox + x, oy + y, rx, ry, c),
  l: (x0, y0, x1, y1, c) => line(ctx, ox + x0, oy + y0, ox + x1, oy + y1, c),
  s: (rows, colors, x, y) => sprite(ctx, rows, colors, ox + x, oy + y),
  // A rectangle with a 1 px outline, its base tone inside, the light tone along its top and left edges and
  // the shadow tone along its bottom and right edges (light falls from the top left).
  box: (x, y, w, h, ramp) => {
    rect(ctx, ox + x, oy + y, w, h, P.ink);
    rect(ctx, ox + x + 1, oy + y + 1, w - 2, h - 2, ramp[1]);
    rect(ctx, ox + x + 1, oy + y + 1, w - 2, 1, ramp[2]);
    rect(ctx, ox + x + 1, oy + y + 1, 1, h - 2, ramp[2]);
    rect(ctx, ox + x + 1, oy + y + h - 2, w - 2, 1, ramp[0]);
    rect(ctx, ox + x + w - 2, oy + y + 1, 1, h - 2, ramp[0]);
  },
  // A small cross of light, for a glint.
  glint: (x, y, color) => {
    rect(ctx, ox + x - 1, oy + y, 3, 1, color);
    rect(ctx, ox + x, oy + y - 1, 1, 3, color);
  },
  sky: (top, bottom) => bands(ctx, ox, oy, W, H, top, bottom, 2),
  t: (str, x, y, c, scale = 1) => text(ctx, str, ox + x, oy + y, c, { scale }),
  alpha: (a) => { ctx.globalAlpha = a; },
});

// A triangle pointing up, base on row `base`, `height` rows tall.
const peak = (g, cx, base, height, color) => {
  for (let i = 0; i < height; i += 1) g.r(cx - Math.round(i * 0.9), base - i, Math.round(i * 1.8) + 1, 1, color);
};

module.exports = { W, H, toolsFor, peak };
