'use strict';

// Pixel primitives. Everything is built from whole-pixel fillRect calls, so nothing is
// anti-aliased and the picture keeps the hard edges of a 16-bit screen.

const rect = (ctx, x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy += 1) {
    const dx = Math.round(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(Math.round(cx) - dx, Math.round(cy) + dy, dx * 2 + 1, 1);
  }
}

function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy += 1) {
    const dx = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
    ctx.fillRect(Math.round(cx) - dx, Math.round(cy) + dy, dx * 2 + 1, 1);
  }
}

// Bresenham line, one pixel wide.
function line(ctx, x0, y0, x1, y1, color) {
  ctx.fillStyle = color;
  const xe = Math.round(x1);
  const ye = Math.round(y1);
  const dx = Math.abs(xe - Math.round(x0));
  const dy = -Math.abs(ye - Math.round(y0));
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let x = Math.round(x0);
  let y = Math.round(y0);
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x, y, 1, 1);
    if (x === xe && y === ye) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mixCache = new Map();
function mix(a, b, t) {
  const key = `${a}|${b}|${t.toFixed(3)}`;
  if (!mixCache.has(key)) {
    const from = hexToRgb(a);
    const to = hexToRgb(b);
    const c = from.map((v, i) => Math.round(v + (to[i] - v) * t));
    mixCache.set(key, `rgb(${c[0]},${c[1]},${c[2]})`);
  }
  return mixCache.get(key);
}

// Vertical gradient in hard bands, like the colour ramps of a SNES backdrop.
function bands(ctx, x, y, w, h, top, bottom, step = 2) {
  for (let i = 0; i < h; i += step) {
    const t = h <= step ? 0 : i / (h - step);
    rect(ctx, x, y + i, w, Math.min(step, h - i), mix(top, bottom, t));
  }
}

// Draws a sprite from rows of characters; '.' is transparent.
function sprite(ctx, rows, palette, x, y, scale = 1) {
  rows.forEach((row, cy) => {
    [...row].forEach((ch, cx) => {
      if (ch !== '.' && palette[ch]) rect(ctx, x + cx * scale, y + cy * scale, scale, scale, palette[ch]);
    });
  });
}

module.exports = { rect, disc, ellipse, line, mix, bands, sprite };
