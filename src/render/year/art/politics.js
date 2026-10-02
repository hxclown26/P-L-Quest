'use strict';

// Politics: a government building with a pediment and columns, a flag that waves and a bubble with a question.
// After an answer, when it was good the flag flies high and the bubble shows a tick; when it was bad a storm
// gathers, the flag drops to half mast and the bubble shows an alarm. The lower right corner is flat plaza.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

const COLUMNS = Object.freeze([28, 38, 48, 58, 68]);

function building(g) {
  g.box(22, 30, 62, 4, R.stone);
  g.box(25, 27, 56, 3, R.stone);
  COLUMNS.forEach((x) => g.box(x, 15, 6, 12, R.stone));
  g.box(24, 11, 58, 4, R.stone);
  for (let i = 0; i < 8; i += 1) {
    const half = Math.round(i * 3.5);
    g.r(53 - half - 1, 3 + i, 1, 1, INK);
    g.r(53 + half + 1, 3 + i, 1, 1, INK);
    g.r(53 - half, 3 + i, half + 1, 1, R.stone[2]);
    g.r(54, 3 + i, half, 1, R.stone[1]);
  }
  g.d(53, 8, 2, INK);
  g.d(53, 8, 1, R.hazard[1]);
  g.r(52, 5, 3, 1, R.stone[0]);
}

function flag(g, t, mood) {
  const top = mood === 'bad' ? 15 : 5;
  g.r(11, 3, 3, 30, INK);
  g.r(12, 3, 1, 30, R.metal[2]);
  g.d(12, 2, 1, R.hazard[1]);
  for (let x = 0; x < 16; x += 1) {
    const wave = Math.round(Math.sin(t * 3 + x * 0.5) * (mood === 'bad' ? 1 : 2) * (x / 15));
    g.r(14 + x, top + wave, 1, 4, R.tie[1]);
    g.r(14 + x, top + 4 + wave, 1, 4, R.paper[2]);
    g.r(14 + x, top - 1 + wave, 1, 1, INK);
    g.r(14 + x, top + 8 + wave, 1, 1, INK);
  }
}

// The bubble: a question, a tick or an alarm.
function bubble(g, t, mood) {
  g.box(92, 4, 18, 12, R.paper);
  g.r(95, 16, 3, 2, INK);
  g.r(96, 16, 1, 1, R.paper[1]);
  if (mood === 'good') {
    g.l(97, 10, 99, 12, R.leaf[1]);
    g.l(99, 12, 104, 7, R.leaf[1]);
    g.l(98, 10, 100, 12, R.leaf[1]);
    g.l(100, 12, 105, 7, R.leaf[1]);
  } else if (mood === 'bad') {
    g.t('!', 99, 6, Math.floor(t * 3) % 2 === 0 ? R.tie[1] : R.tie[2]);
  } else {
    g.t('?', 99, 6, Math.floor(t * 2) % 2 === 0 ? R.hazard[0] : R.suit[1]);
  }
}

// A storm gathers over the building when it went badly: dark clouds that drift a little.
const STORM = Object.freeze([[30, 6, 5], [37, 5, 5], [44, 6, 5], [84, 7, 5]]);
function storm(g, t) {
  const dx = Math.round(Math.sin(t * 0.5) * 2);
  STORM.forEach(([x, y, r]) => g.d(x + dx, y + 2, r, R.cloud[0]));
  STORM.forEach(([x, y, r]) => g.d(x + dx, y, r, R.cloud[0]));
  STORM.forEach(([x, y, r]) => g.d(x + dx - 1, y - 2, Math.max(2, r - 3), R.cloud[1]));
}

const draw = (g, t, mood = 'neutral') => {
  g.sky(...P.sky.dusk);
  g.r(0, 34, 116, 8, R.stone[0]);
  g.r(0, 34, 116, 1, R.stone[1]);
  if (mood === 'bad') storm(g, t);
  building(g);
  flag(g, t, mood);
  bubble(g, t, mood);
  if (mood === 'good' && Math.floor(t * 2) % 2 === 0) g.glint(53, 7, P.white);
};

module.exports = { draw };
