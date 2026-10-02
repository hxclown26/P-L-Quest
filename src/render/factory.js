'use strict';

const { rect, disc, line, bands, mix } = require('./draw');
const { text } = require('./ui');
const { LOOKS } = require('./looks');

// The factory is drawn in a 120x66 box. Each state repaints the same building: cleaner and
// brighter as OI rises, then rusty, cracked and finally in ruins as it falls.

function drawSky(ctx, x, y, w, h, tier, t = 0) {
  const look = LOOKS[tier];
  bands(ctx, x, y, w, h, look.sky[0], look.sky[1], 4);
  const gloomy = ['worn', 'edge', 'collapse'].includes(tier);
  [[20, 8, 1], [110, 16, 0.7], [180, 6, 1.2]].forEach(([cx, cy, s]) => {
    const px = ((cx + t * 3 * s) % (w + 60)) - 30 + x;
    ctx.globalAlpha = gloomy ? 0.55 : 0.85;
    rect(ctx, px, y + cy, 22 * s, 4, gloomy ? '#5a5260' : '#ffffff');
    rect(ctx, px + 4, y + cy - 3, 14 * s, 4, gloomy ? '#5a5260' : '#ffffff');
    ctx.globalAlpha = 1;
  });
}

function body(ctx, look) {
  rect(ctx, -6, 60, 132, 8, look.ground);
  rect(ctx, -6, 61, 132, 1, mix(look.ground, '#ffffff', 0.18));
  rect(ctx, 6, 26, 108, 34, look.wall);
  rect(ctx, 6, 54, 108, 6, look.shade);
  rect(ctx, 6, 26, 108, 2, look.shade);
  for (let x = 24; x < 110; x += 18) rect(ctx, x, 28, 1, 26, mix(look.wall, look.shade, 0.5));
}

function roofs(ctx, look) {
  [8, 44, 80].forEach((x0) => {
    for (let k = 0; k < 28; k += 2) {
      const h = 2 + Math.floor(k / 3);
      rect(ctx, x0 + k, 26 - h, 2, h, look.roof);
      rect(ctx, x0 + k, 26 - h, 2, 1, look.roofHi);
    }
    rect(ctx, x0 + 28, 15, 4, 11, look.glass);
  });
}

function smoke(ctx, look, tier, t) {
  const puffs = { hightech: 2, modern: 2, normal: 3, worn: 4, edge: 6 }[tier] || 3;
  [[20, 3], [100, 8]].forEach(([cx, top], c) => {
    for (let j = 0; j < puffs; j += 1) {
      const phase = (t * 0.5 + j / puffs + c * 0.37) % 1;
      const radius = tier === 'hightech' ? 1 + phase * 2 : 2 + phase * 4;
      ctx.globalAlpha = Math.max(0, 0.95 - phase);
      disc(ctx, cx + Math.sin(t * 1.3 + j * 2 + c) * 2 + phase * 7, top - phase * 24, Math.round(radius), look.smoke);
    }
    ctx.globalAlpha = 1;
  });
}

function chimneys(ctx, look, tier, t) {
  rect(ctx, 16, 4, 9, 22, look.shade);
  rect(ctx, 15, 3, 11, 3, look.roofHi);
  rect(ctx, 96, 9, 8, 17, look.shade);
  rect(ctx, 95, 8, 10, 3, look.roofHi);
  if (tier === 'hightech' || tier === 'modern') {
    rect(ctx, 16, 12, 9, 2, look.accent);
    rect(ctx, 96, 15, 8, 2, look.accent);
  }
  smoke(ctx, look, tier, t);
}

const WINDOW_PATTERN = { hightech: 'LLLLLL', modern: 'LLLLLL', normal: 'LDLDLD', worn: 'DxDLxD', edge: 'DxxDxD' };

function windows(ctx, look, tier, t) {
  [...(WINDOW_PATTERN[tier] || 'DDDDDD')].forEach((state, i) => {
    const x = 12 + i * 17;
    const flicker = tier === 'edge' && Math.floor(t * 6 + i) % 5 === 0;
    rect(ctx, x, 34, 11, 9, state === 'L' && !flicker ? look.glassHi : look.glass);
    rect(ctx, x, 34, 11, 1, look.shade);
    rect(ctx, x, 42, 11, 1, look.shade);
    rect(ctx, x + 5, 34, 1, 9, look.shade);
    if (state === 'x') {
      line(ctx, x + 1, 35, x + 9, 41, look.shade);
      line(ctx, x + 9, 35, x + 3, 41, look.shade);
    }
  });
}

function door(ctx, look, tier) {
  const [x, y, w, h] = [50, 44, 20, 16];
  if (tier === 'hightech') {
    rect(ctx, x, y, w, h, look.glass);
    rect(ctx, x + 9, y, 2, h, look.shade);
    rect(ctx, x, y, w, 1, look.accent);
    return;
  }
  rect(ctx, x, y, w, h, look.shade);
  for (let k = 3; k < h; k += 3) rect(ctx, x, y + k, w, 1, mix(look.shade, look.wall, 0.4));
  if (tier === 'edge') {
    for (let k = 0; k < 7; k += 1) rect(ctx, x + k * 3, y + 3, 2, 3, k % 2 ? '#f8d048' : '#14141c');
  }
}

function sign(ctx, look, tier, t) {
  const crooked = tier === 'worn' || tier === 'edge';
  const y = 3 + (crooked ? 1 : 0);
  const plate = { hightech: '#10202c', modern: '#14243c', normal: '#6a4a30', worn: '#4a3828', edge: '#2a2220' }[tier];
  rect(ctx, 44, y, 32, 12, tier === 'hightech' || tier === 'modern' ? look.accent : look.shade);
  rect(ctx, 45, y + 1, 30, 10, plate);
  const label = tier === 'edge' && Math.floor(t * 4) % 3 === 0 ? 'P  ' : 'P&L';
  text(ctx, label, 51, y + 3, tier === 'normal' ? '#f8e098' : '#ffffff');
}

function hightechExtras(ctx, look, t) {
  rect(ctx, 6, 25, 108, 1, look.accent);
  [[0, 56], [120, 56]].forEach(([x, y]) => {
    rect(ctx, x - 1, y + 2, 2, 4, '#6a4a30');
    disc(ctx, x, y, 4, '#3fbf78');
  });
  const dx = 60 + Math.sin(t * 1.2) * 30;
  const dy = 0 + Math.sin(t * 2) * 2;
  rect(ctx, dx - 3, dy, 6, 2, '#f4f9ff');
  rect(ctx, dx - 6, dy - 1, 4, 1, Math.floor(t * 20) % 2 ? '#9fb0c8' : '#ffffff');
  rect(ctx, dx + 2, dy - 1, 4, 1, Math.floor(t * 20) % 2 ? '#ffffff' : '#9fb0c8');
  if (Math.floor(t * 3) % 2) rect(ctx, dx, dy + 2, 1, 1, look.accent);
  rect(ctx, 104, 52, 8, 8, look.shade);
  line(ctx, 108, 52, 114, 42, look.roofHi);
  line(ctx, 114, 42, 110, 34, look.roofHi);
  disc(ctx, 114, 42, 1, look.accent);
}

function modernExtras(ctx, look, t) {
  rect(ctx, 6, 25, 108, 1, look.accent);
  [[0, 57], [120, 57]].forEach(([x, y]) => {
    rect(ctx, x - 1, y + 2, 2, 3, '#6a4a30');
    disc(ctx, x, y, 3, '#3fa868');
  });
  rect(ctx, 112, 10, 1, 18, '#c8d0e0');
  rect(ctx, 113, 10, 6 + Math.round(Math.sin(t * 3)), 4, look.accent);
}

function normalExtras(ctx) {
  rect(ctx, 28, 52, 9, 8, '#a87848');
  rect(ctx, 28, 55, 9, 1, '#7a5028');
  rect(ctx, 76, 50, 8, 10, '#8a6a3a');
  rect(ctx, 76, 53, 8, 1, '#5a6070');
}

function wornExtras(ctx, look) {
  [[12, 46, 6, 4], [88, 30, 8, 3], [100, 50, 5, 5], [32, 40, 4, 2]].forEach(([x, y, w, h]) => {
    rect(ctx, x, y, w, h, look.accent);
  });
  [[6, 58], [40, 59], [84, 58], [108, 59]].forEach(([x, y]) => rect(ctx, x, y, 4, 2, '#6a6a72'));
  [[2, 58], [112, 58], [64, 59]].forEach(([x, y]) => {
    rect(ctx, x, y, 1, 3, '#4a8a48');
    rect(ctx, x + 2, y + 1, 1, 2, '#4a8a48');
  });
}

function edgeExtras(ctx, look, t) {
  line(ctx, 30, 26, 38, 54, '#14101a');
  line(ctx, 38, 54, 34, 58, '#14101a');
  line(ctx, 90, 26, 82, 40, '#14101a');
  line(ctx, 82, 40, 88, 52, '#14101a');
  rect(ctx, 56, 18, 12, 8, look.sky[0]);
  [[22, 30], [74, 34], [96, 46], [48, 28]].forEach(([x, y], i) => {
    if (Math.floor(t * 8 + i * 3) % 4 === 0) rect(ctx, x, y, 2, 2, '#f8d048');
  });
  if (Math.floor(t * 2) % 2) {
    disc(ctx, 60, 20, 2, look.accent);
    rect(ctx, 59, 18, 3, 1, '#ffb0a0');
  }
}

function ruins(ctx, look, t) {
  rect(ctx, -6, 60, 132, 8, look.ground);
  rect(ctx, 6, 38, 26, 22, look.wall);
  rect(ctx, 6, 38, 26, 2, look.shade);
  rect(ctx, 11, 44, 7, 7, look.glass);
  rect(ctx, 96, 46, 18, 14, look.wall);
  rect(ctx, 96, 46, 18, 2, look.shade);
  rect(ctx, 100, 51, 6, 6, look.glass);
  line(ctx, 18, 38, 24, 56, look.shade);
  line(ctx, 104, 46, 98, 58, look.shade);
  ctx.globalAlpha = 0.28 + 0.1 * Math.sin(t * 6);
  disc(ctx, 62, 52, 15, '#f88830');
  ctx.globalAlpha = 1;
  disc(ctx, 40, 58, 9, look.wall);
  disc(ctx, 64, 59, 13, look.shade);
  disc(ctx, 84, 58, 10, look.wall);
  rect(ctx, 38, 50, 32, 7, look.roofHi);
  rect(ctx, 38, 50, 32, 1, look.wall);
  line(ctx, 46, 44, 56, 58, look.roof);
  line(ctx, 80, 42, 68, 58, look.roof);
  [30, 62, 94].forEach((cx, c) => {
    for (let j = 0; j < 5; j += 1) {
      const phase = (t * 0.4 + j / 5 + c * 0.3) % 1;
      ctx.globalAlpha = Math.max(0, 0.85 - phase);
      disc(ctx, cx + Math.sin(t + j) * 3, 50 - phase * 36, 3 + Math.round(phase * 5), look.smoke);
    }
    ctx.globalAlpha = 1;
  });
  for (let k = 0; k < 8; k += 1) {
    rect(ctx, 14 + k * 13 + Math.sin(t * 3 + k) * 3, 54 - ((t * 20 + k * 9) % 30), 1, 1, '#f8c040');
  }
}

const EXTRAS = { hightech: hightechExtras, modern: modernExtras, normal: normalExtras, worn: wornExtras, edge: edgeExtras };

// Draws the factory with its top-left corner at (ox, oy). Scale must be a whole number.
function drawFactory(ctx, tier, ox, oy, t = 0, scale = 1) {
  const look = LOOKS[tier];
  ctx.save();
  ctx.translate(Math.round(ox), Math.round(oy));
  ctx.scale(scale, scale);
  if (tier === 'collapse') {
    ruins(ctx, look, t);
  } else {
    body(ctx, look);
    roofs(ctx, look);
    chimneys(ctx, look, tier, t);
    windows(ctx, look, tier, t);
    door(ctx, look, tier);
    sign(ctx, look, tier, t);
    EXTRAS[tier](ctx, look, t);
  }
  ctx.restore();
}

module.exports = { drawSky, drawFactory };
