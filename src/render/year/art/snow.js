'use strict';

// Snow: two snowy peaks with pines, flakes that fall and drifts on the ground. After an answer, when it was good
// the sun comes up behind the peaks and the snow glints; when it was bad the blizzard thickens and the wind
// blows. The lower right corner is flat snow, because the month label sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

const FLAKES = Object.freeze({ neutral: 18, good: 9, bad: 36 });

// A peak: its left face in the light, its right face in shadow, a snow cap, a 1 px outline.
function mountain(g, cx, base, height, cap) {
  for (let i = 0; i < height; i += 1) {
    const half = Math.round(i * 0.9);
    const y = base - height + 1 + i;
    const snowy = i < cap + (i % 3 === 0 ? 1 : 0);
    g.r(cx - half - 1, y, 1, 1, INK);
    g.r(cx + half + 1, y, 1, 1, INK);
    g.r(cx - half, y, half + 1, 1, snowy ? R.snow[2] : R.rock[2]);
    g.r(cx + 1, y, half, 1, snowy ? R.snow[0] : R.rock[0]);
    if (!snowy) g.r(cx - half, y, Math.max(0, half - 1), 1, R.rock[1]);
  }
  g.r(cx - Math.round(height * 0.9) - 1, base, Math.round(height * 1.8) + 3, 1, INK);
}

function pine(g, x, base, size) {
  g.r(x, base - 2, 2, 2, R.wood[0]);
  for (let i = 0; i < 3; i += 1) {
    const half = size - i;
    g.r(x + 1 - half - 1, base - 3 - i * 3, 2 * half + 2, 1, INK);
    g.r(x + 1 - half, base - 4 - i * 3, 2 * half, 3, i % 2 === 0 ? R.leaf[0] : R.leaf[1]);
  }
  g.r(x, base - 12, 2, 1, R.snow[2]);
}

function ground(g) {
  g.r(0, 30, 116, 4, R.snow[2]);
  g.r(0, 34, 116, 8, R.snow[1]);
  g.r(0, 34, 116, 1, R.snow[2]);
  [[14, 30], [40, 31], [70, 30], [92, 31]].forEach(([x, y]) => g.r(x, y, 9, 1, R.snow[0]));
}

function flakes(g, t, mood) {
  for (let k = 0; k < FLAKES[mood]; k += 1) {
    const wind = mood === 'bad' ? t * 6 : 0;
    const x = (((k * 13 + Math.sin(t * 1.5 + k) * 3 + wind) % 112) + 112) % 112;
    const y = (k * 5 + t * (mood === 'bad' ? 20 : 12)) % 30;
    g.r(Math.round(x), Math.round(y), 2, 2, P.white);
  }
}

const draw = (g, t, mood = 'neutral') => {
  g.sky(...(mood === 'bad' ? P.sky.dusk : P.sky.cold));
  if (mood === 'good') {
    g.d(14, 26, 8, R.hazard[1]);
    g.d(14, 26, 5, R.hazard[2]);
  }
  mountain(g, 34, 33, 25, 9);
  mountain(g, 80, 33, 20, 7);
  pine(g, 10, 33, 3);
  pine(g, 17, 33, 2);
  pine(g, 102, 33, 3);
  ground(g);
  flakes(g, t, FLAKES[mood] ? mood : 'neutral');
  if (mood === 'good' && Math.floor(t * 2) % 2 === 0) g.glint(34, 12, P.white);
  if (mood === 'good' && Math.floor(t * 2 + 1) % 2 === 0) g.glint(80, 17, P.white);
};

module.exports = { draw };
