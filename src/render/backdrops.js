'use strict';

const { rect, disc, line, bands, mix } = require('./draw');
const { text } = require('./ui');
const { LOOKS } = require('./looks');

// The room behind each floor, repainted with the factory state. The ladder covers the left
// half of the screen, so the props live on the right, where the boss stands.

function room(ctx, look, tier, t) {
  bands(ctx, 0, 0, 256, 58, look.wall, mix(look.wall, look.shade, 0.35), 4);
  rect(ctx, 0, 0, 256, 6, look.shade);
  bands(ctx, 0, 58, 256, 28, look.ground, mix(look.ground, '#000000', 0.35), 4);
  rect(ctx, 0, 58, 256, 1, mix(look.wall, '#000000', 0.4));
  for (let x = 0; x < 256; x += 32) rect(ctx, x, 6, 1, 52, mix(look.wall, look.shade, 0.5));
  [30, 110, 190].forEach((x, i) => {
    const lit = !(tier === 'edge' && Math.floor(t * 5 + i * 2) % 4 === 0);
    rect(ctx, x, 6, 18, 3, lit ? '#fff6c8' : '#5a5050');
    if (lit) {
      ctx.globalAlpha = 0.14;
      rect(ctx, x - 6, 9, 30, 18, '#fff6c8');
      ctx.globalAlpha = 1;
    }
  });
  if (tier === 'hightech' || tier === 'modern') {
    rect(ctx, 0, 40, 256, 2, look.accent);
  }
  if (tier === 'worn' || tier === 'edge') {
    ctx.globalAlpha = 0.35;
    [[140, 12, 18, 14], [212, 22, 22, 10], [170, 40, 14, 12]].forEach(([x, y, w, h]) => rect(ctx, x, y, w, h, '#201810'));
    ctx.globalAlpha = 1;
  }
  if (tier === 'edge') {
    line(ctx, 150, 6, 160, 30, '#14101a');
    line(ctx, 160, 30, 154, 48, '#14101a');
    line(ctx, 226, 6, 218, 26, '#14101a');
  }
}

const screenColor = (tier) => ({ hightech: '#4cf0a0', modern: '#68d8f8', normal: '#98b8d8', worn: '#6a7078', edge: '#c04c3c' }[tier]);

const PROPS = {
  1(ctx, look, tier) {
    rect(ctx, 138, 44, 112, 14, look.shade);
    rect(ctx, 138, 44, 112, 2, look.roofHi);
    rect(ctx, 146, 38, 16, 6, '#f4f4f8');
    rect(ctx, 148, 40, 12, 1, '#a0a8b8');
    rect(ctx, 218, 22, 22, 28, '#f4f4f8');
    rect(ctx, 218, 22, 22, 5, '#d85858');
    for (let k = 0; k < 4; k += 1) rect(ctx, 221, 30 + k * 5, 16, 1, '#a0a8b8');
    if (tier === 'hightech') rect(ctx, 196, 30, 12, 10, screenColor(tier));
  },
  2(ctx, look, tier) {
    rect(ctx, 136, 50, 114, 6, '#8a6a3a');
    rect(ctx, 136, 50, 114, 1, '#b08a4a');
    rect(ctx, 142, 56, 4, 14, '#6a4a28');
    rect(ctx, 240, 56, 4, 14, '#6a4a28');
    rect(ctx, 204, 12, 44, 26, '#f4f4f8');
    rect(ctx, 204, 12, 44, 2, '#a0a8b8');
    text(ctx, '%', 220, 20, '#d85858', { scale: 2 });
    rect(ctx, 148, 40, 14, 10, look.shade);
    rect(ctx, 150, 36, 10, 4, tier === 'hightech' ? look.accent : '#c8a070');
  },
  3(ctx, look, tier, t) {
    [18, 34].forEach((y) => rect(ctx, 138, y, 112, 2, look.shade));
    [[144, 8], [168, 8], [196, 24], [222, 8], [232, 24]].forEach(([x, y]) => {
      rect(ctx, x, y + 2, 12, 14, '#8a5a30');
      rect(ctx, x, y + 6, 12, 2, '#58606c');
    });
    rect(ctx, 130, 56, 126, 5, '#303040');
    for (let k = 0; k < 12; k += 1) rect(ctx, 130 + ((k * 11 + t * 18) % 126), 57, 4, 3, '#808090');
  },
  4(ctx, look, tier, t) {
    rect(ctx, 140, 14, 86, 42, '#242434');
    for (let k = 0; k < 7; k += 1) rect(ctx, 140, 16 + k * 6, 86, 1, '#3a3a4c');
    rect(ctx, 232, 38, 16, 18, '#a87848');
    rect(ctx, 232, 46, 16, 1, '#7a5028');
    rect(ctx, 236, 28, 12, 10, '#a87848');
    rect(ctx, 130, 56, 126, 4, look.accent);
    const x = 130 + ((t * 24) % 120);
    rect(ctx, x, 57, 6, 2, '#ffffff');
  },
  5(ctx, look, tier, t) {
    rect(ctx, 136, 50, 52, 6, '#8a6a3a');
    rect(ctx, 150, 38, 18, 12, '#202838');
    rect(ctx, 152, 40, 14, 8, screenColor(tier));
    rect(ctx, 156, 50, 6, 2, '#58606c');
    rect(ctx, 214, 24, 18, 32, '#808898');
    for (let k = 0; k < 3; k += 1) rect(ctx, 216, 28 + k * 9, 14, 6, '#a0a8b8');
    disc(ctx, 244, 48, 6, tier === 'worn' || tier === 'edge' ? '#6a7a48' : '#3fa868');
    rect(ctx, 243, 52, 3, 6, '#6a4a28');
    if (Math.floor(t * 2) % 2) rect(ctx, 162, 42, 2, 1, '#ffffff');
  },
};

function drawBackdrop(ctx, floorId, tier, t = 0) {
  const look = LOOKS[tier === 'collapse' ? 'edge' : tier];
  room(ctx, look, tier, t);
  PROPS[floorId](ctx, look, tier, t);
}

module.exports = { drawBackdrop };
