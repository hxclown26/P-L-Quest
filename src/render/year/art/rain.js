'use strict';

// Rain: storm clouds, streaks of rain that fall, a wet road with puddles. After an answer, when it was good the
// rain thins out and the sun comes through; when it was bad it pours and lightning strikes. The lower right
// corner is flat road, because the month label sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

// Cloud puffs as [x, y, radius]: three overlapping discs make one cloud.
const CLOUDS = Object.freeze([[[30, 9, 6], [38, 7, 7], [46, 10, 6]], [[64, 8, 5], [72, 6, 6], [80, 9, 5]]]);
const DROPS = Object.freeze({ neutral: 16, good: 7, bad: 26 });

function cloud(g, t, parts, drift, tone) {
  const dx = Math.round(Math.sin(t * 0.4 + drift) * 3);
  parts.forEach(([x, y, r]) => g.d(x + dx, y + 2, r, tone[0]));
  parts.forEach(([x, y, r]) => g.d(x + dx, y, r, tone[1]));
  parts.forEach(([x, y, r]) => g.d(x + dx - 1, y - 2, Math.max(2, r - 3), tone[2]));
}

// The sun comes through the gap when it went well, with turning rays.
function sun(g, t) {
  g.d(98, 10, 7, INK);
  g.d(98, 10, 6, R.hazard[1]);
  g.d(96, 8, 2, R.hazard[2]);
  for (let k = 0; k < 8; k += 1) {
    const a = t * 0.5 + (k * Math.PI) / 4;
    g.l(98 + Math.round(Math.cos(a) * 8), 10 + Math.round(Math.sin(a) * 8), 98 + Math.round(Math.cos(a) * 10), 10 + Math.round(Math.sin(a) * 10), R.hazard[1]);
  }
}

function road(g, t) {
  g.r(0, 27, 116, 7, R.asphalt[1]);
  g.r(0, 27, 116, 1, R.asphalt[2]);
  g.r(0, 34, 116, 8, R.asphalt[0]);
  g.r(0, 34, 116, 1, R.asphalt[1]);
  [[18, 30, 9], [36, 31, 7]].forEach(([x, y, rx], k) => {
    g.e(x, y, rx, 2, R.water[1]);
    g.e(x - 2, y - 1, Math.max(2, rx - 4), 1, R.water[2]);
    const ripple = (t * 1.2 + k * 0.5) % 1;
    g.alpha(0.8 - ripple * 0.8);
    g.e(x, y, 2 + Math.round(ripple * (rx - 3)), 1 + Math.round(ripple), R.paper[2]);
  });
  g.alpha(1);
}

function rain(g, t, mood) {
  const color = mood === 'bad' ? R.glass[2] : R.glass[1];
  for (let k = 0; k < DROPS[mood]; k += 1) {
    const x = 2 + ((k * 9 + t * 8) % 112);
    const y = 15 + ((k * 7 + t * 36) % 12);
    g.l(Math.round(x), Math.round(y), Math.round(x) - 2, Math.round(y) + 4, color);
  }
}

// A bolt for a tenth of a second every three seconds.
function lightning(g, t) {
  if (t % 3.1 > 0.12) return;
  [[30, 12, 25, 19], [25, 19, 30, 21], [30, 21, 23, 30]].forEach(([a, b, c, d]) => {
    g.l(a, b, c, d, R.hazard[2]);
    g.l(a + 1, b, c + 1, d, R.hazard[1]);
  });
}

const draw = (g, t, mood = 'neutral') => {
  g.sky(...(mood === 'good' ? P.sky.dusk : P.sky.storm));
  if (mood === 'good') sun(g, t);
  const tone = mood === 'bad' ? [R.cloud[0], R.cloud[0], R.cloud[1]] : [R.cloud[0], R.cloud[1], R.cloud[2]];
  CLOUDS.forEach((parts, k) => cloud(g, t, parts, k * 2, tone));
  road(g, t);
  rain(g, t, DROPS[mood] ? mood : 'neutral');
  if (mood === 'bad') lightning(g, t);
};

module.exports = { draw };
