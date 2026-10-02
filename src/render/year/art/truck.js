'use strict';

// The truck: a delivery truck on a road, wheels turning, lane marks sliding by and exhaust puffing. After an
// answer, when it was good a green tick shines on its side and the exhaust is clean; when it was bad the hood
// smokes dark and a red lamp blinks on the cab. The lower right corner is flat verge, because the month label sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

const WHEELS = Object.freeze([22, 58]);
const ROAD_Y = 27;

function road(g, t) {
  g.r(0, ROAD_Y, 116, 7, R.asphalt[1]);
  g.r(0, ROAD_Y, 116, 1, R.asphalt[2]);
  for (let k = 0; k < 6; k += 1) {
    const x = Math.round(((k * 22 - t * 30) % 132 + 132) % 132) - 14;
    g.r(Math.max(0, x), 30, Math.min(10, Math.max(0, 116 - Math.max(0, x)), x < 0 ? 10 + x : 10), 1, R.hazard[2]);
  }
  g.r(0, 34, 116, 8, R.asphalt[0]);
  g.r(0, 34, 116, 1, R.asphalt[1]);
}

function wheel(g, x, t) {
  g.d(x, 27, 5, INK);
  g.d(x, 27, 4, R.asphalt[2]);
  g.d(x, 27, 2, R.metal[1]);
  const a = t * 6;
  g.l(x - Math.round(Math.cos(a) * 3), 27 - Math.round(Math.sin(a) * 3), x + Math.round(Math.cos(a) * 3), 27 + Math.round(Math.sin(a) * 3), R.metal[0]);
}

function body(g, mood) {
  g.box(10, 9, 38, 17, R.paper);
  g.r(11, 17, 36, 3, R.city[1]);
  g.box(48, 13, 18, 13, R.tie);
  g.r(56, 15, 8, 6, INK);
  g.r(57, 16, 6, 4, R.glass[1]);
  g.r(57, 16, 6, 1, R.glass[2]);
  g.r(10, 25, 56, 2, INK);
  if (mood === 'good') {
    g.l(24, 12, 26, 14, R.leaf[1]);
    g.l(26, 14, 32, 8, R.leaf[1]);
    g.l(25, 12, 27, 14, R.leaf[1]);
    g.l(27, 14, 33, 8, R.leaf[1]);
  }
}

function exhaust(g, t, mood) {
  const puffs = mood === 'bad' ? 5 : 3;
  const tone = mood === 'bad' ? R.asphalt[2] : mood === 'good' ? P.white : R.cloud[1];
  g.r(53, 9, 3, 5, R.metal[0]);
  for (let j = 0; j < puffs; j += 1) {
    const phase = (t * 0.8 + j / puffs) % 1;
    g.alpha(0.85 - phase * 0.85);
    g.d(54 - Math.round(phase * 5), 8 - Math.round(phase * 4), 1 + Math.round(phase * 2), tone);
  }
  g.alpha(1);
}

const draw = (g, t, mood = 'neutral') => {
  g.sky(...P.sky.day);
  g.r(0, 22, 116, 5, R.rock[1]);
  road(g, t);
  WHEELS.forEach((x) => wheel(g, x, t));
  body(g, mood);
  exhaust(g, t, mood);
  if (mood === 'bad') {
    g.box(53, 10, 4, 3, Math.floor(t * 3) % 2 === 0 ? R.tie : R.hazard);
  }
};

module.exports = { draw };
