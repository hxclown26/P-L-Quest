'use strict';

// The alert of the rescue plan: an alarm lamp that flashes, a zero and a falling arrow. It is not a voice with
// a mood: it sounds the same whatever the answer was. The lower right corner is flat floor, because the label
// of the month sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

// Rays of light from the lamp, as the end of each line; they only show while the lamp is lit.
const RAYS = Object.freeze([[58, 12, 58, 3], [48, 14, 40, 7], [68, 14, 76, 7], [46, 20, 36, 21], [70, 20, 80, 21]]);

function lamp(g, lit) {
  g.box(44, 28, 28, 6, R.metal);
  g.box(48, 14, 20, 15, lit ? R.tie : [R.asphalt[0], R.tie[0], R.tie[0]]);
  g.r(50, 16, 3, 9, lit ? R.tie[2] : R.tie[1]);
  g.box(52, 11, 12, 4, R.metal);
  if (!lit) return;
  g.alpha(0.7);
  RAYS.forEach(([a, b, c, d]) => g.l(a, b, c, d, R.tie[2]));
  g.alpha(1);
}

function arrow(g) {
  g.box(94, 6, 8, 14, R.tie);
  for (let i = 0; i < 7; i += 1) g.r(90 + i, 20 + i, 16 - 2 * i, 1, R.tie[1]);
  g.r(90, 19, 16, 1, INK);
}

const draw = (g, t) => {
  g.sky(...P.sky.alarm);
  g.r(0, 34, 116, 8, R.floor[0]);
  g.r(0, 34, 116, 1, R.floor[1]);
  lamp(g, Math.floor(t * 3) % 2 === 0);
  g.t('0', 10, 12, R.tie[1], 3);
  arrow(g);
};

module.exports = { draw };
