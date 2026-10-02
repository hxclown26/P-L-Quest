'use strict';

const { rect, disc, ellipse, line, bands } = require('../draw');
const { text } = require('../ui');

// The picture on top of each problem: one small pixel scene per theme, drawn from rectangles
// and discs like everything else. Each scene is 116x42 and paints its own sky and ground;
// the lower right corner stays calm because the month label sits there.

const W = 116;
const H = 42;

// Local helpers so every scene can use coordinates from its own top-left corner.
const toolsFor = (ctx, ox, oy) => ({
  r: (x, y, w, h, c) => rect(ctx, ox + x, oy + y, w, h, c),
  d: (x, y, radius, c) => disc(ctx, ox + x, oy + y, radius, c),
  e: (x, y, rx, ry, c) => ellipse(ctx, ox + x, oy + y, rx, ry, c),
  l: (x0, y0, x1, y1, c) => line(ctx, ox + x0, oy + y0, ox + x1, oy + y1, c),
  sky: (top, bottom) => bands(ctx, ox, oy, W, H, top, bottom, 2),
  t: (str, x, y, c, scale = 1) => text(ctx, str, ox + x, oy + y, c, { scale }),
  alpha: (a) => { ctx.globalAlpha = a; },
});

// A triangle pointing up, base on row `base`, `height` rows tall.
const peak = (g, cx, base, height, color) => {
  for (let i = 0; i < height; i += 1) g.r(cx - Math.round(i * 0.9), base - i, Math.round(i * 1.8) + 1, 1, color);
};

const SCENES = {
  client(g, t) {
    const nod = Math.round(Math.sin(t * 2.4));
    g.sky('#5a6a9a', '#3a4670');
    g.r(8, 6, 24, 18, '#2a3050');
    g.r(10, 8, 20, 14, '#8fd0f0');
    g.r(19, 8, 2, 14, '#2a3050');
    g.r(10, 14, 20, 2, '#2a3050');
    g.r(0, 34, W, 8, '#2a3050');
    g.r(40, 30, 64, 4, '#8a6a3a');
    g.r(44, 34, 4, 8, '#6a4a28');
    g.r(96, 34, 4, 8, '#6a4a28');
    g.r(50, 21, 18, 13, '#2a3a6a');
    g.r(58, 22, 2, 8, '#d84848');
    g.d(59, 14 + nod, 5, '#f0c8a0');
    g.r(53, 8 + nod, 13, 4, '#5a3a20');
    g.r(76, 25, 14, 9, '#6a4a28');
    g.r(80, 23 + (Math.floor(t * 3) % 2), 6, 2, '#3a2a18');
    g.r(70, 3, 38, 15, '#f8f8f8');
    g.r(72, 18, 4, 3, '#f8f8f8');
    g.t('$', 84, 8, Math.floor(t * 2) % 2 === 0 ? '#2a3a6a' : '#d84848');
  },
  plant(g, t) {
    g.sky('#78a8d8', '#c8dcec');
    g.r(0, 34, W, 8, '#505060');
    g.r(10, 18, 66, 16, '#b9805a');
    for (let k = 0; k < 3; k += 1) {
      for (let i = 0; i < 20; i += 2) g.r(12 + k * 22 + i, 18 - 2 - Math.floor(i / 4), 2, 2 + Math.floor(i / 4), '#5a5a6c');
    }
    g.r(62, 6, 8, 14, '#8d5e44');
    g.r(14, 24, 8, 6, '#f6e09a');
    g.r(34, 24, 8, 6, '#f6e09a');
    g.r(54, 24, 8, 6, '#f6e09a');
    for (let j = 0; j < 3; j += 1) {
      const phase = (t * 0.5 + j / 3) % 1;
      g.alpha(0.9 - phase * 0.9);
      g.d(66 + phase * 8, 6 - phase * 8, 2 + Math.round(phase * 3), '#e8f0f8');
    }
    g.alpha(1);
    g.d(96, 22, 9, '#8a92a8');
    g.d(96, 22, 4, '#505868');
    for (let k = 0; k < 8; k += 1) {
      const a = t * 1.2 + (k * Math.PI) / 4;
      g.r(Math.round(96 + Math.cos(a) * 10) - 1, Math.round(22 + Math.sin(a) * 10) - 1, 3, 3, '#8a92a8');
    }
  },
  safety(g, t) {
    g.sky('#2a2a40', '#14142a');
    const run = Math.floor(t * 8) % 12;
    for (let x = -12; x < W; x += 12) {
      g.r(x + run, 34, 6, 8, '#f8d048');
      g.r(x + run + 6, 34, 6, 8, '#14142a');
    }
    const flash = Math.floor(t * 2.5) % 2 === 0 ? '#f8d048' : '#ffe88a';
    peak(g, 76, 32, 26, flash);
    peak(g, 76, 29, 20, '#14142a');
    peak(g, 76, 28, 18, flash);
    g.t('!', 73, 17, '#14142a', 2);
    g.r(20, 18, 12, 2, '#f8d048');
    g.r(18, 20, 16, 2, '#f8d048');
    g.r(17, 22, 18, 2, '#f8d048');
    g.r(16, 24, 20, 3, '#f8d048');
    g.r(14, 27, 24, 2, '#d8a820');
    g.r(24, 18, 2, 9, '#d8a820');
  },
  rain(g, t) {
    g.sky('#4a5a78', '#7a8aa0');
    [[38, 12, 8], [50, 9, 10], [64, 12, 8], [56, 16, 9]].forEach(([x, y, radius]) => g.d(x, y, radius, '#d0d8e4'));
    g.r(30, 18, 44, 4, '#b4bccc');
    for (let k = 0; k < 16; k += 1) {
      const x = (k * 9 + t * 8) % W;
      const y = 22 + ((k * 7 + t * 36) % 14);
      g.l(x, y, x - 2, y + 4, '#a8d8f8');
    }
    g.e(58, 38, 34, 3, '#6a98c0');
    g.r(0, 39, W, 3, '#3a4a60');
  },
  snow(g, t) {
    g.sky('#6a7aa0', '#c0d0e8');
    peak(g, 34, 36, 28, '#7a8aa8');
    peak(g, 34, 36, 10, '#f4f8ff');
    peak(g, 76, 36, 22, '#8a98b4');
    peak(g, 76, 36, 8, '#f4f8ff');
    g.r(0, 36, W, 6, '#f4f8ff');
    for (let k = 0; k < 18; k += 1) {
      const x = (k * 13 + Math.sin(t * 1.5 + k) * 3) % W;
      const y = (k * 5 + t * 12) % 36;
      g.r(Math.round(x), Math.round(y), 2, 2, '#ffffff');
    }
  },
  water(g, t) {
    const bob = Math.round(Math.sin(t * 2.2) * 2);
    const ripple = (t * 5) % 10;
    g.sky('#8a6a40', '#c09a60');
    g.d(100, 9, 6, '#f8d048');
    g.r(0, 34, W, 8, '#7a5a38');
    [[6, 36, 22, 40], [22, 40, 34, 35], [60, 35, 74, 40], [74, 40, 96, 36]].forEach(([a, b, c, d]) => g.l(a, b, c, d, '#4a3420'));
    g.alpha(1 - ripple / 10);
    g.e(58, 38, 6 + ripple * 2, 2 + Math.round(ripple / 4), '#9fd0f8');
    g.alpha(1);
    peak(g, 58, 30 + bob, 14, '#3a8ae0');
    g.d(58, 24 + bob, 9, '#3a8ae0');
    g.d(55, 22 + bob, 2, '#bfe4ff');
    g.r(56, 29 + bob, 4, 2, '#2a6ac0');
  },
  politics(g, t) {
    g.sky('#4a5a8a', '#8a9ac0');
    peak(g, 58, 18, 10, '#e8e8f0');
    g.r(30, 18, 56, 3, '#f4f4fa');
    for (let k = 0; k < 5; k += 1) g.r(34 + k * 12, 21, 5, 13, '#f4f4fa');
    g.r(26, 34, 64, 3, '#d4d4e0');
    g.r(22, 37, 72, 5, '#b4b4c4');
    g.r(58, 0, 1, 9, '#a0a8b8');
    const wave = Math.round(Math.sin(t * 3));
    g.r(59, 1, 9, 3 + wave, '#d84848');
    g.r(59, 4 + wave, 9, 2, '#f8f8f8');
    g.t('?', 98, 6, '#f8d048');
  },
  economy(g, t) {
    g.sky('#1c3a4a', '#0c1c26');
    g.r(6, 4, 1, 36, '#5a7a8a');
    g.r(6, 39, 70, 1, '#5a7a8a');
    const heights = [10, 16, 12, 24, 18, 28].map((height, k) => height + Math.round(Math.sin(t * 1.6 + k * 1.1) * 2));
    heights.forEach((height, k) => {
      g.r(12 + k * 11, 39 - height, 8, height, k % 2 === 0 ? '#58e088' : '#f05858');
    });
    heights.slice(1).forEach((height, k) => g.l(14 + k * 11, 36 - heights[k], 25 + k * 11, 36 - height, '#f8f8f8'));
    const spin = Math.max(1, Math.round(Math.abs(Math.cos(t * 2.2)) * 10));
    g.e(96, 18, spin, 10, '#a87410');
    g.e(96, 18, Math.max(1, spin - 2), 8, '#f8d048');
    if (spin >= 7) g.t('$', 93, 15, '#a87410');
  },
  protest(g, t) {
    g.sky('#58506a', '#2a2638');
    g.r(0, 36, W, 6, '#1c1826');
    [[16, 0], [38, 1], [62, 0], [84, 1]].forEach(([x, phase], k) => {
      const sway = Math.round(Math.sin(t * 2 + k)) ;
      g.d(x, 24, 4, '#14101c');
      g.r(x - 5, 28, 10, 12, '#14101c');
      g.r(x + sway, 4 + (phase ? 3 : 0), 1, 20, '#a08860');
      g.r(x - 8 + sway, 2 + (phase ? 3 : 0), 17, 10, '#f4f4f8');
      g.t('!', x - 1 + sway, 5 + (phase ? 3 : 0), '#d84848');
    });
  },
  truck(g, t) {
    g.sky('#78a8d8', '#c8dcec');
    g.r(0, 30, W, 12, '#404050');
    g.r(0, 30, W, 1, '#a0a0b0');
    for (let k = 0; k < 7; k += 1) g.r(((k * 20 - t * 30) % 140 + 140) % 140 - 12, 37, 10, 2, '#e8e0a0');
    g.r(14, 10, 38, 20, '#d8d8e0');
    g.r(14, 20, 38, 3, '#58a0e0');
    g.r(52, 16, 20, 14, '#d85850');
    g.r(60, 18, 10, 7, '#88c8e8');
    g.d(26, 31, 5, '#202028');
    g.d(26, 31, 2, '#a0a8b8');
    g.d(62, 31, 5, '#202028');
    g.d(62, 31, 2, '#a0a8b8');
    for (let j = 0; j < 3; j += 1) {
      const phase = (t * 0.8 + j / 3) % 1;
      g.alpha(0.8 - phase * 0.8);
      g.d(10 - phase * 8, 28 - phase * 6, 2 + Math.round(phase * 3), '#9098a8');
    }
    g.alpha(1);
  },
  alert(g, t) {
    g.sky('#4a1018', '#14040a');
    const lit = Math.floor(t * 4) % 2 === 0;
    const lamp = lit ? '#ff5040' : '#7a2020';
    g.r(46, 32, 24, 6, '#58606c');
    g.r(50, 22, 16, 10, lamp);
    g.r(53, 19, 10, 3, lamp);
    if (lit) {
      g.alpha(0.6);
      [[58, 18, 58, 4], [50, 20, 38, 10], [66, 20, 78, 10], [48, 26, 34, 28], [68, 26, 82, 28]].forEach(([a, b, c, d]) => g.l(a, b, c, d, '#ff9080'));
      g.alpha(1);
    }
    g.t('0', 10, 12, '#f05858', 3);
    g.r(98, 8, 6, 14, '#f05858');
    for (let i = 0; i < 6; i += 1) g.r(95 + i, 22 + i, 12 - i * 2, 1, '#f05858');
  },
  strategy(g, t) {
    g.sky('#2a2a58', '#12122e');
    const swap = Math.floor(t * 1.5) % 2;
    [[17, 0], [13, 1], [9, 2], [5, 3], [2, 4]].forEach(([radius, ring]) => g.d(46, 21, radius, (ring + swap) % 2 === 0 ? '#d85858' : '#f8f8f8'));
    // The arrow flies in, sticks in the bullseye for a while and shivers, then leaves and comes again.
    const cycle = t % 2.6;
    const flight = Math.min(1, cycle / 1.2);
    const eased = 1 - (1 - flight) ** 2;
    const shiver = flight >= 1 && cycle < 1.5 ? Math.round(Math.sin(cycle * 40)) : 0;
    const tipX = Math.round(46 + (1 - eased) * 84);
    const tipY = Math.round(21 - (1 - eased) * 52) + shiver;
    g.l(tipX, tipY, tipX + 38, tipY - 18, '#f8d048');
    g.l(tipX + 38, tipY - 18, tipX + 34, tipY - 18, '#f8d048');
    g.l(tipX + 38, tipY - 18, tipX + 38, tipY - 14, '#f8d048');
    g.l(tipX + 34, tipY - 15, tipX + 40, tipY - 21, '#f8d048');
    [[8, 36], [18, 32], [28, 34], [34, 28]].forEach(([x, y]) => g.r(x, y, 2, 2, '#68d8f8'));
    g.t('X', 94, 26, '#f05858');
  },
};

const THEMES = Object.freeze(Object.keys(SCENES));

// Draws the scene of `theme` with its top-left corner at (x, y).
function drawArt(ctx, theme, x, y, t = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, W, H);
  ctx.clip();
  SCENES[theme](toolsFor(ctx, x, y), t);
  ctx.restore();
}

module.exports = { drawArt, THEMES, ART_W: W, ART_H: H };
