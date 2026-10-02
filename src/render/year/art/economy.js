'use strict';

// Economy: the bars of a market chart that sway, a line through their tops and a spinning coin. After an answer,
// when it was good the bars climb in green with an arrow up; when it was bad they fall in red with an arrow down.
// The lower right corner is flat ground, because the month label sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

const BASE = Object.freeze([10, 16, 12, 24, 18, 28]);
const CLIMB = Object.freeze([8, 12, 16, 20, 24, 28]);
const BAR_X = (k) => 12 + k * 11;
const FLOOR_Y = 33;

function heights(mood) {
  if (mood === 'good') return CLIMB;
  return mood === 'bad' ? [...CLIMB].reverse() : BASE;
}

const barRamp = (mood, k) => (mood === 'good' ? R.leaf : mood === 'bad' ? R.tie : k % 2 === 0 ? R.leaf : R.tie);

function chart(g, t, mood) {
  g.r(0, 34, 116, 8, R.floor[1]);
  g.r(0, 34, 116, 1, R.floor[2]);
  [8, 16, 24].forEach((y) => { g.alpha(0.2); g.r(7, y, 70, 1, R.paper[0]); });
  g.alpha(1);
  g.r(6, 3, 1, 31, R.metal[1]);
  g.r(6, FLOOR_Y, 72, 1, INK);
  const tops = heights(mood).map((h, k) => {
    const sway = Math.round(Math.sin(t * 1.6 + k * 1.1) * 2);
    const height = Math.max(4, h + sway);
    g.box(BAR_X(k), FLOOR_Y - height, 8, height, barRamp(mood, k));
    return [BAR_X(k) + 4, FLOOR_Y - height];
  });
  tops.slice(1).forEach(([x, y], k) => g.l(tops[k][0], tops[k][1] - 2, x, y - 2, R.paper[2]));
  tops.forEach(([x, y]) => g.r(x - 1, y - 3, 3, 3, R.paper[2]));
}

function coin(g, t) {
  const spin = Math.max(1, Math.round(Math.abs(Math.cos(t * 2.2)) * 10));
  g.e(96, 16, spin + 1, 11, INK);
  g.e(96, 16, spin, 10, R.hazard[1]);
  g.e(96 - Math.floor(spin / 3), 16 - 2, Math.max(1, Math.floor(spin / 2)), 6, R.hazard[2]);
  if (spin >= 7) g.t('$', 93, 13, R.hazard[0]);
}

// An arrow beside the coin: up and green when it went well, down and red when it did not.
function trend(g, mood) {
  if (mood === 'neutral') return;
  const up = mood === 'good';
  const ramp = up ? R.leaf : R.tie;
  g.r(107, up ? 11 : 7, 3, 12, ramp[1]);
  g.r(107, up ? 11 : 7, 1, 12, ramp[2]);
  for (let i = 0; i < 4; i += 1) {
    const width = up ? 2 * i + 1 : 7 - 2 * i;
    g.r(108 - Math.floor(width / 2), up ? 7 + i : 19 + i, width, 1, ramp[1]);
  }
}

const draw = (g, t, mood = 'neutral') => {
  g.sky(...P.sky.market);
  chart(g, t, mood);
  coin(g, t);
  trend(g, mood);
};

module.exports = { draw };
