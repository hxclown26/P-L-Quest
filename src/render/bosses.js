'use strict';

const { rect, disc, ellipse, line } = require('./draw');
const { text } = require('./ui');

// The five P&L bosses and the hero, all drawn from rectangles and discs so the game needs
// no image files. Each draws around (cx, cy) and reacts to the mood: 'hit' blinks, 'happy'
// grins (the boss just took a bite out of your margin).

const INK = '#101020';

function eyes(ctx, x, y, gap, mood) {
  const h = mood === 'happy' ? 3 : 5;
  [-gap, gap].forEach((dx) => {
    rect(ctx, x + dx - 3, y, 6, h, '#ffffff');
    rect(ctx, x + dx - 1, y + 1, 3, Math.min(3, h - 1), INK);
  });
  line(ctx, x - gap - 4, y - 3, x - gap + 2, y - 1, INK);
  line(ctx, x + gap + 4, y - 3, x + gap - 2, y - 1, INK);
}

function grin(ctx, x, y, w, mood) {
  rect(ctx, x - w / 2, y, w, 2, INK);
  if (mood === 'happy') rect(ctx, x - w / 2 + 1, y + 2, w - 2, 2, '#ffffff');
}

const BOSSES = {
  order(ctx, cx, cy, t, mood) {
    rect(ctx, cx - 25, cy + 13, 50, 5, '#c0c4d4');
    rect(ctx, cx - 23, cy + 9, 46, 5, '#e4e6f0');
    rect(ctx, cx - 21, cy - 23, 42, 34, '#8890a8');
    rect(ctx, cx - 20, cy - 22, 40, 32, '#f8f8fc');
    for (let k = 0; k < 3; k += 1) rect(ctx, cx - 15, cy + 4 + k * 2, 30, 1, '#c8d0e0');
    rect(ctx, cx + 9, cy - 20, 9, 7, '#d84848');
    rect(ctx, cx + 11, cy - 18, 5, 1, '#ffffff');
    eyes(ctx, cx - 2, cy - 14, 6, mood);
    grin(ctx, cx - 2, cy - 2, 12, mood);
    line(ctx, cx + 22, cy - 20, cx + 30, cy - 8, '#f8d048');
  },
  rebate(ctx, cx, cy, t, mood) {
    disc(ctx, cx, cy, 25, '#a87410');
    disc(ctx, cx, cy, 22, '#f8d048');
    disc(ctx, cx, cy, 17, '#f0b830');
    rect(ctx, cx - 17, cy - 12, 3, 9, '#fff6c0');
    disc(ctx, cx - 7, cy - 15, 3, '#fff6c0');
    disc(ctx, cx + 7, cy - 6, 3, '#fff6c0');
    line(ctx, cx + 8, cy - 16, cx - 8, cy - 5, '#fff6c0');
    eyes(ctx, cx, cy + 3, 7, mood);
    grin(ctx, cx, cy + 14, 14, mood);
  },
  cost(ctx, cx, cy, t, mood) {
    rect(ctx, cx - 19, cy - 18, 38, 38, '#9a6a3a');
    ellipse(ctx, cx, cy - 18, 19, 5, '#b8884a');
    ellipse(ctx, cx, cy + 20, 19, 5, '#7a5028');
    rect(ctx, cx - 19, cy - 8, 38, 3, '#58606c');
    rect(ctx, cx - 19, cy + 9, 38, 3, '#58606c');
    rect(ctx, cx - 8, cy - 18, 1, 38, '#7a5028');
    rect(ctx, cx + 8, cy - 18, 1, 38, '#7a5028');
    eyes(ctx, cx, cy - 2, 6, mood);
    grin(ctx, cx, cy + 14, 12, mood);
    rect(ctx, cx + 19, cy + 2, 7, 4, '#c0c8d0');
    for (let j = 0; j < 3; j += 1) {
      const phase = (t * 0.7 + j / 3) % 1;
      ctx.globalAlpha = 0.9 - phase * 0.9;
      disc(ctx, cx + 6 + phase * 6, cy - 26 - phase * 14, 2 + Math.round(phase * 3), '#e8f0f8');
    }
    ctx.globalAlpha = 1;
  },
  truck(ctx, cx, cy, t, mood) {
    rect(ctx, cx - 30, cy - 18, 36, 30, '#d8d8e0');
    rect(ctx, cx - 30, cy - 4, 36, 3, '#58a0e0');
    rect(ctx, cx + 6, cy - 8, 24, 20, '#d85850');
    rect(ctx, cx + 14, cy - 4, 14, 10, '#88c8e8');
    eyes(ctx, cx + 21, cy - 3, 3, mood);
    rect(ctx, cx + 28, cy + 4, 4, 7, '#303040');
    rect(ctx, cx + 29, cy + 5, 2, 1, '#ffffff');
    rect(ctx, cx + 29, cy + 8, 2, 1, '#ffffff');
    [[-18, 13], [14, 13]].forEach(([dx, dy]) => {
      disc(ctx, cx + dx, cy + dy, 7, '#202028');
      disc(ctx, cx + dx, cy + dy, 3, '#a0a8b8');
    });
    for (let j = 0; j < 3; j += 1) {
      const phase = (t * 0.8 + j / 3) % 1;
      ctx.globalAlpha = 0.8 - phase * 0.8;
      disc(ctx, cx - 34 - phase * 10, cy + 8 - phase * 6, 2 + Math.round(phase * 3), '#9098a8');
    }
    ctx.globalAlpha = 1;
  },
  fixed(ctx, cx, cy, t, mood) {
    ellipse(ctx, cx, cy + 4, 27, 21, '#6a7698');
    ellipse(ctx, cx, cy + 4, 24, 18, '#7a86a8');
    ellipse(ctx, cx - 9, cy - 8, 9, 4, '#aab6d6');
    [-8, 8].forEach((dx) => {
      rect(ctx, cx + dx - 3, cy - 2, 6, 5, '#ffffff');
      rect(ctx, cx + dx - 1, cy, 3, 3, INK);
      rect(ctx, cx + dx - 3, cy - 3, 6, 3, '#6a7698');
    });
    grin(ctx, cx, cy + 12, 14, mood);
    text(ctx, 'z', cx + 20, cy - 24 + Math.round(Math.sin(t * 2) * 2), '#e8f0ff');
    text(ctx, 'z', cx + 27, cy - 31 + Math.round(Math.sin(t * 2 + 1) * 2), '#e8f0ff');
    [[0, 0], [4, 3], [8, 6]].forEach(([dx, dy]) => rect(ctx, cx + 27 + dx, cy + 14 + dy, 3, 3, '#58606c'));
    disc(ctx, cx + 38, cy + 24, 8, '#303040');
    rect(ctx, cx + 34, cy + 19, 3, 2, '#8088a0');
  },
};

function drawBoss(ctx, id, cx, cy, t = 0, mood = 'idle') {
  if (mood === 'hit' && Math.floor(t * 18) % 2 === 0) return;
  const bob = Math.round(Math.sin(t * 2.2) * 2);
  BOSSES[id](ctx, Math.round(cx), Math.round(cy) + bob, t, mood);
}

// A small hard-hatted manager; (x, y) is the middle of the feet.
function drawHero(ctx, x, y, t = 0) {
  const bob = Math.round(Math.sin(t * 3));
  rect(ctx, x - 4, y - 8, 3, 8, '#2a3a6a');
  rect(ctx, x + 1, y - 8, 3, 8, '#2a3a6a');
  rect(ctx, x - 5, y - 19 + bob, 10, 11, '#3a62c0');
  rect(ctx, x - 1, y - 18 + bob, 2, 6, '#f8f8f8');
  rect(ctx, x - 6, y - 18 + bob, 2, 8, '#f0c8a0');
  rect(ctx, x + 4, y - 18 + bob, 2, 8, '#f0c8a0');
  rect(ctx, x - 4, y - 27 + bob, 8, 8, '#f0c8a0');
  rect(ctx, x - 5, y - 29 + bob, 10, 4, '#f8d048');
  rect(ctx, x - 6, y - 26 + bob, 12, 1, '#d8a820');
  rect(ctx, x - 2, y - 24 + bob, 1, 1, INK);
  rect(ctx, x + 1, y - 24 + bob, 1, 1, INK);
}

module.exports = { drawBoss, drawHero };
