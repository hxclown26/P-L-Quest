'use strict';

// Protest: a street at night with a skyline, a lamp and a crowd with signs that sway. After an answer, when it was
// good the crowd thins out and the signs show a tick; when it was bad it grows, the signs shout and the horizon
// glows red. The lower right corner is flat street, because the month label sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

const CROWD = Object.freeze({ neutral: [14, 34, 54, 74], good: [24, 52, 80], bad: [10, 26, 42, 58, 74, 90] });
const COATS = Object.freeze([R.tie, R.suit, R.leaf, R.hazard, R.city, R.clay]);
const SKYLINE = Object.freeze([[0, 14, 12], [12, 20, 10], [22, 11, 14], [36, 18, 9], [45, 13, 12], [57, 21, 10], [67, 12, 13], [80, 17, 10], [90, 10, 12], [102, 19, 14]]);

function skyline(g, t) {
  SKYLINE.forEach(([x, top, w], k) => {
    g.r(x, top, w, 34 - top, R.roof[0]);
    g.r(x, top, w, 1, R.roof[1]);
    for (let y = top + 3; y < 30; y += 5) {
      if ((x + y + Math.floor(t * 0.3 + k)) % 3 === 0) g.r(x + 3, y, 2, 2, P.gold);
    }
  });
}

function lamp(g) {
  g.r(106, 8, 2, 26, R.metal[0]);
  g.box(102, 5, 10, 4, R.metal);
  g.alpha(0.18);
  g.e(107, 13, 8, 7, P.gold);
  g.alpha(1);
  g.r(104, 9, 6, 1, P.gold);
}

// One person with a sign on a stick, swaying. Calm crowds hold ticks; angry ones hold alarms.
function person(g, x, t, k, mood) {
  const sway = Math.round(Math.sin(t * 2 + k));
  const coat = COATS[k % COATS.length];
  g.r(x + sway, 10, 1, 12, R.wood[0]);
  g.box(x - 6 + sway, 2, 13, 9, R.paper);
  if (mood === 'good') {
    g.l(x - 3 + sway, 7, x - 1 + sway, 9, R.leaf[1]);
    g.l(x - 1 + sway, 9, x + 3 + sway, 4, R.leaf[1]);
  } else {
    g.t('!', x - 2 + sway, 4, R.tie[1]);
  }
  g.d(x, 22, 3, INK);
  g.d(x, 22, 2, R.skin[1]);
  g.l(x - 4, 27, x + sway - 1, 21, coat[1]);
  g.l(x + 4, 27, x + sway + 1, 21, coat[1]);
  g.box(x - 5, 25, 11, 9, coat);
}

const draw = (g, t, mood = 'neutral') => {
  g.sky(...P.sky.street);
  if (mood === 'bad') {
    g.alpha(0.3);
    g.r(0, 20, 116, 14, R.tie[1]);
    g.alpha(1);
  }
  skyline(g, t);
  lamp(g);
  (CROWD[mood] || CROWD.neutral).forEach((x, k) => person(g, x, t, k, mood));
  g.r(0, 34, 116, 8, R.asphalt[0]);
  g.r(0, 34, 116, 1, R.asphalt[1]);
};

module.exports = { draw };
