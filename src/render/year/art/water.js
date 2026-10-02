'use strict';

// Water: a dry riverbed under a hard sun, a stranded boat, a drop that falls and ripples. After an answer, when
// it was good the river fills and the boat floats; when it was bad the earth cracks further and a tumbleweed
// rolls by. The lower right corner is flat earth, because the month label sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

const CRACKS = Object.freeze([[8, 28, 16, 31], [16, 31, 12, 33], [44, 27, 52, 29], [52, 29, 50, 33], [96, 28, 104, 30], [104, 30, 100, 33]]);
const MORE_CRACKS = Object.freeze([[28, 29, 36, 31], [36, 31, 34, 33], [76, 27, 84, 30], [84, 30, 82, 33], [108, 27, 112, 33]]);

function sun(g) {
  g.alpha(0.25);
  g.d(98, 10, 10, R.hazard[2]);
  g.alpha(1);
  g.d(98, 10, 7, INK);
  g.d(98, 10, 6, R.hazard[1]);
  g.d(96, 8, 2, R.hazard[2]);
}

function earth(g, mood) {
  g.r(0, 26, 116, 8, R.sand[1]);
  g.r(0, 26, 116, 1, R.sand[2]);
  g.r(0, 34, 116, 8, R.sand[0]);
  g.r(0, 34, 116, 1, R.sand[1]);
  if (mood === 'good') return;
  [...CRACKS, ...(mood === 'bad' ? MORE_CRACKS : [])].forEach(([a, b, c, d]) => g.l(a, b, c, d, R.sand[0]));
}

// When it went well the river is back, with moving waves.
function river(g, t) {
  g.r(0, 27, 116, 7, R.water[1]);
  g.r(0, 27, 116, 1, R.water[2]);
  for (let k = 0; k < 6; k += 1) g.r(Math.round((k * 20 + t * 10) % 108), 29 + (k % 2) * 2, 8, 1, R.water[2]);
  g.r(0, 33, 116, 1, R.water[0]);
}

function boat(g, t, mood) {
  const dy = mood === 'good' ? Math.round(Math.sin(t * 2)) : 0;
  g.r(73, 11 + dy, 1, 14, INK);
  for (let i = 0; i < 10; i += 1) g.r(74, 13 + dy + i, Math.round(i * 1.2) + 1, 1, R.paper[1]);
  g.box(60, 25 + dy, 28, 6, R.wood);
}

// The drop falls from the sky and ripples where it lands; the ripple stays left of the month label.
function drop(g, t) {
  const y = 3 + ((t * 26) % 22);
  g.box(23, Math.round(y), 3, 4, R.water);
  if (y > 18) {
    const ripple = (y - 18) / 4;
    g.alpha(0.9 - ripple * 0.6);
    g.e(24, 29, 2 + Math.round(ripple * 8), 1, R.water[2]);
    g.alpha(1);
  }
}

function tumbleweed(g, t) {
  const x = 8 + ((t * 12) % 100);
  const y = 29 + Math.round(Math.sin(t * 8));
  g.d(Math.round(x), y, 3, INK);
  g.d(Math.round(x), y, 2, R.sand[2]);
  g.l(Math.round(x) - 2, y - 1, Math.round(x) + 2, y + 1, R.sand[0]);
}

const draw = (g, t, mood = 'neutral') => {
  g.sky(...P.sky.hot);
  sun(g);
  earth(g, mood);
  if (mood === 'good') river(g, t);
  boat(g, t, mood);
  if (mood !== 'good') drop(g, t);
  if (mood === 'bad') tumbleweed(g, t);
};

module.exports = { draw };
