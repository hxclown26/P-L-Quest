'use strict';

// Safety: a hazard sign that flashes over a factory floor and a worker in a hard hat and vest. After an answer,
// when it was good the sign turns green with a tick and the worker gives a thumbs up; when it was bad it blinks
// red, sparks fly and the worker clutches his head. The lower right corner is flat floor, because the month
// label sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

const SIGN = Object.freeze({ x: 76, top: 3, height: 25 });

function floor(g, t) {
  g.r(0, 29, 116, 5, INK);
  const run = Math.floor(t * 8) % 12;
  for (let x = -12; x < 116; x += 12) {
    const left = Math.max(0, x + run);
    const right = Math.min(116, x + run + 6);
    if (right > left) g.r(left, 30, right - left, 3, R.hazard[1]);
  }
  g.r(0, 34, 116, 8, R.asphalt[1]);
  g.r(0, 34, 116, 1, R.asphalt[2]);
}

// A warning triangle: black outline, a coloured field and a mark in the middle.
function sign(g, t, mood) {
  const ramp = mood === 'good' ? R.leaf : mood === 'bad' ? R.tie : R.hazard;
  const rate = mood === 'bad' ? 2 : 1.25;
  const lit = Math.floor(t * rate) % 2 === 0;
  for (let i = 0; i < SIGN.height; i += 1) {
    const half = Math.round(i * 0.8);
    const y = SIGN.top + i;
    g.r(SIGN.x - half - 1, y, 2 * half + 3, 1, INK);
    g.r(SIGN.x - half + 1, y, Math.max(0, 2 * half - 1), 1, lit ? ramp[2] : ramp[1]);
  }
  g.r(SIGN.x - 20, SIGN.top + SIGN.height, 41, 1, INK);
  if (mood === 'good') {
    g.l(SIGN.x - 6, 19, SIGN.x - 2, 23, INK);
    g.l(SIGN.x - 2, 23, SIGN.x + 6, 13, INK);
    g.l(SIGN.x - 5, 19, SIGN.x - 1, 23, INK);
    g.l(SIGN.x - 1, 23, SIGN.x + 7, 13, INK);
  } else {
    g.t('!', SIGN.x - 2, 13, INK, 2);
  }
}

// The worker, from the left: hard hat, face, a vest with a reflective band, trousers.
function worker(g, t, mood) {
  const shake = mood === 'bad' ? Math.round(Math.sin(t * 25)) : 0;
  g.box(8, 18, 16, 11, R.hazard);
  g.r(9, 22, 14, 2, R.paper[2]);
  g.box(10, 28, 5, 5, R.suit);
  g.box(17, 28, 5, 5, R.suit);
  g.d(16 + shake, 11, 6, INK);
  g.d(16 + shake, 11, 5, R.hazard[1]);
  g.d(14 + shake, 9, 2, R.hazard[2]);
  g.d(16 + shake, 15, 4, INK);
  g.d(16 + shake, 15, 3, R.skin[1]);
  g.r(10 + shake, 12, 13, 1, INK);
  g.r(11 + shake, 13, 11, 1, R.hazard[0]);
  g.r(14 + shake, 14, 1, 2, INK);
  g.r(18 + shake, 14, 1, 2, INK);
  g.r(14 + shake, 17, 5, 1, mood === 'bad' ? INK : R.tie[0]);
  if (mood === 'good') {
    g.box(25, 17, 4, 7, R.skin);
    g.r(26, 14, 2, 4, R.skin[1]);
  }
  if (mood === 'bad') {
    g.box(24 + shake, 6, 4, 6, R.skin);
    if (Math.floor(t * 6) % 2 === 0) g.glint(32, 10, R.hazard[2]);
    if (Math.floor(t * 6 + 1) % 2 === 0) g.glint(4, 8, R.hazard[2]);
  }
}

const draw = (g, t, mood = 'neutral') => {
  g.sky(...P.sky.dark);
  floor(g, t);
  sign(g, t, mood);
  worker(g, t, mood);
};

module.exports = { draw };
