'use strict';

// The client: a man at his desk who talks money, in an office with a window on the city, a chart on the
// wall and a plant. Drawn from the palette's material ramps (shadow, base, light) with a 1 px outline,
// light from the top left. After an answer he wears its mood: he smiles and the bubble shows a tick when
// it was good, he frowns and the bubble shows an alarm when it was bad. The lower right corner is flat
// floor, because the month label sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

// The head, 11x11 from its top left corner: hair, forehead and cheeks. Eyes, brows and mouth are drawn
// on top, so the mood can change them. o outline, h/H/d hair base/light/shadow, s/L/S skin base/light/shadow.
const HEAD = [
  '...ooooo...',
  '..ohHHhho..',
  '.ohHhhhhho.',
  'ohhhhhhhhdo',
  'ohsssssssdo',
  'oLsssssssSo',
  'oLsssssssSo',
  'oLsssssssSo',
  '.oLsssssSo.',
  '..oSsssSo..',
  '...ooooo...',
];
const HEAD_COLORS = Object.freeze({
  o: INK, h: R.hair[1], H: R.hair[2], d: R.hair[0], s: R.skin[1], L: R.skin[2], S: R.skin[0],
});

const HEAD_X = 57;
const HEAD_Y = 8;
// A blink lasts a tenth of a second, every 3.2 seconds.
const BLINK_EVERY = 3.2;
const BLINK_FOR = 0.12;

// Windows panes: [x, y] of the top left of each of the four panes (11 wide, 8 tall).
const PANES = Object.freeze([[7, 5], [20, 5], [7, 15], [20, 15]]);
const SKYLINE = Object.freeze([[0, 5], [3, 7], [6, 4], [8, 6]]);

function background(g) {
  g.sky(R.wall[1], R.wall[0]);
  g.r(0, 31, 116, 3, R.wall[0]);
  g.r(0, 31, 116, 1, R.wall[1]);
  g.r(0, 34, 116, 8, R.floor[1]);
  g.r(0, 34, 116, 1, R.floor[2]);
}

function window(g, t) {
  g.r(5, 3, 27, 22, INK);
  g.r(6, 4, 25, 20, R.paper[0]);
  g.r(6, 4, 25, 1, R.paper[2]);
  PANES.forEach(([x, y], i) => {
    g.r(x, y, 11, 3, R.glass[2]);
    g.r(x, y + 3, 11, 3, R.glass[1]);
    g.r(x, y + 6, 11, 2, R.glass[1]);
    g.r(x + 1, y + 1, 2, 1, P.white);
    if (i >= 2) {
      SKYLINE.forEach(([dx, h], b) => {
        g.r(x + dx, y + 8 - h, 2 + (b % 2), h, R.city[b % 2 === 0 ? 1 : 0]);
        const lit = Math.floor(t * 0.7 + b + i) % 3 !== 0;
        if (lit && h >= 5) g.r(x + dx, y + 8 - h + 1, 1, 1, P.gold);
      });
    }
  });
  g.r(4, 25, 29, 2, R.paper[0]);
  g.r(4, 27, 29, 1, R.wall[0]);
}

function chart(g, t) {
  g.r(37, 5, 21, 13, INK);
  g.r(38, 6, 19, 11, R.wood[1]);
  g.r(38, 6, 19, 1, R.wood[2]);
  g.r(39, 7, 17, 9, R.paper[1]);
  g.r(41, 12, 3, 3, R.city[1]);
  g.r(46, 10, 3, 5, R.city[1]);
  g.r(51, 8, 3, 7, R.leaf[1]);
  g.r(41, 12, 3, 1, R.city[2]);
  g.r(46, 10, 3, 1, R.city[2]);
  g.r(51, 8, 3, 1, R.leaf[2]);
  g.l(41, 11, 53, 7, R.tie[1]);
  if (Math.floor(t * 1.5) % 2 === 0) g.r(53, 6, 2, 2, R.tie[2]);
}

function desk(g) {
  g.r(36, 28, 80, 1, INK);
  g.r(36, 29, 80, 1, R.wood[2]);
  g.r(36, 30, 80, 2, R.wood[1]);
  g.r(36, 32, 80, 1, R.wood[0]);
  g.r(36, 33, 80, 1, INK);
  g.r(37, 34, 5, 8, INK);
  g.r(38, 34, 3, 8, R.wood[0]);
}

function laptop(g, t) {
  g.r(76, 19, 16, 9, INK);
  g.r(77, 20, 14, 7, R.metal[1]);
  g.r(77, 20, 14, 1, R.metal[2]);
  g.r(77, 26, 14, 1, R.metal[0]);
  g.r(82, 22, 4, 3, Math.floor(t * 0.8) % 2 === 0 ? R.glass[2] : P.white);
}

function mug(g, t) {
  g.r(94, 23, 6, 5, INK);
  g.r(95, 24, 4, 3, R.paper[1]);
  g.r(95, 24, 1, 3, R.paper[2]);
  g.r(100, 24, 1, 3, INK);
  [0, 1].forEach((k) => {
    const phase = (t * 0.9 + k * 0.5) % 1;
    g.alpha(0.85 - phase * 0.85);
    g.r(95 + k * 3 + Math.round(Math.sin(t * 3 + k * 2)), 21 - Math.round(phase * 6), 1, 2, R.paper[2]);
  });
  g.alpha(1);
}

function plant(g, t) {
  const sway = Math.round(Math.sin(t * 1.3));
  g.r(102, 24, 9, 4, INK);
  g.r(103, 25, 7, 2, R.clay[1]);
  g.r(103, 25, 7, 1, R.clay[2]);
  [[100, 18], [106, 17], [111, 19], [103, 21], [109, 22]].forEach(([x, y], k) => {
    g.l(106, 24, x + (k % 2 === 0 ? sway : 0), y, R.leaf[0]);
    g.r(x + (k % 2 === 0 ? sway : 0) - 1, y - 1, 3, 2, R.leaf[k % 2 === 0 ? 1 : 2]);
  });
}

// The tie, the shirt and the arms on the desk.
function body(g) {
  g.r(52, 22, 22, 6, R.suit[1]);
  g.r(53, 20, 20, 2, R.suit[1]);
  g.r(55, 19, 16, 1, R.suit[1]);
  g.r(51, 22, 1, 6, INK);
  g.r(74, 22, 1, 6, INK);
  g.r(52, 21, 1, 1, INK);
  g.r(73, 21, 1, 1, INK);
  g.r(53, 20, 1, 1, INK);
  g.r(72, 20, 1, 1, INK);
  g.r(54, 19, 1, 1, INK);
  g.r(71, 19, 1, 1, INK);
  g.r(55, 18, 16, 1, INK);
  g.r(53, 21, 20, 1, R.suit[2]);
  g.r(52, 22, 1, 5, R.suit[2]);
  g.r(72, 22, 2, 6, R.suit[0]);
  g.r(60, 19, 6, 2, R.shirt[1]);
  g.r(61, 21, 4, 1, R.shirt[1]);
  g.r(62, 22, 2, 1, R.shirt[0]);
  g.r(62, 20, 2, 8, R.tie[1]);
  g.r(62, 20, 2, 1, R.tie[2]);
  g.r(62, 27, 2, 1, R.tie[0]);
  g.r(54, 25, 4, 3, R.skin[1]);
  g.r(55, 26, 3, 2, R.skin[2]);
  g.r(67, 25, 4, 3, R.skin[1]);
  g.r(67, 25, 4, 1, R.skin[2]);
}

// Eyes, brows and mouth for the mood: neutral, good (smile) or bad (frown, brows down, a bead of sweat).
function face(g, t, mood, dy) {
  const x = HEAD_X;
  const y = HEAD_Y + dy;
  const blink = t % BLINK_EVERY < BLINK_FOR;
  const mouth = R.tie[0];
  [x + 3, x + 7].forEach((ex) => {
    g.r(ex, y + (blink ? 6 : 5), 1, blink ? 1 : 2, INK);
  });
  if (mood === 'bad') {
    g.r(x + 2, y + 4, 3, 1, R.hair[0]);
    g.r(x + 6, y + 4, 3, 1, R.hair[0]);
    g.r(x + 4, y + 8, 3, 1, mouth);
    g.r(x + 3, y + 9, 1, 1, mouth);
    g.r(x + 7, y + 9, 1, 1, mouth);
    const drip = Math.floor((t * 2) % 3);
    g.r(x + 9, y + 4 + drip, 1, 2, R.glass[2]);
  } else if (mood === 'good') {
    g.r(x + 3, y + 8, 1, 1, mouth);
    g.r(x + 7, y + 8, 1, 1, mouth);
    g.r(x + 4, y + 9, 3, 1, mouth);
    g.r(x + 1, y + 8, 2, 1, R.tie[2]);
    g.r(x + 8, y + 8, 2, 1, R.tie[2]);
  } else {
    g.r(x + 4, y + 8, 3, 1, mouth);
  }
}

function bubble(g, t, mood) {
  g.r(73, 2, 36, 1, INK);
  g.r(73, 15, 36, 1, INK);
  g.r(72, 3, 1, 12, INK);
  g.r(109, 3, 1, 12, INK);
  g.r(73, 3, 36, 12, R.paper[1]);
  g.r(73, 3, 36, 1, R.paper[2]);
  g.r(73, 14, 36, 1, R.paper[0]);
  // The tail is a small arrow on the left edge, pointing at his face.
  [[71, 10], [70, 11], [69, 12], [70, 13], [71, 14]].forEach(([x, y]) => g.r(x, y, 1, 1, INK));
  [[72, 11], [72, 12], [72, 13], [71, 11], [71, 12], [71, 13], [70, 12]].forEach(([x, y]) => g.r(x, y, 1, 1, R.paper[1]));
  if (mood === 'good') {
    [0, 1].forEach((k) => {
      g.l(86 + k, 10, 88 + k, 12, R.leaf[1]);
      g.l(88 + k, 12, 94 + k, 6, R.leaf[1]);
    });
    g.l(89, 11, 94, 6, R.leaf[2]);
  } else if (mood === 'bad') {
    g.t('!', 88, 5, R.tie[1], 1);
    g.t('!', 96, 5, Math.floor(t * 3) % 2 === 0 ? R.tie[1] : R.tie[2], 1);
  } else {
    g.t('$', 88, 5, Math.floor(t * 2) % 2 === 0 ? R.suit[1] : R.tie[1], 1);
  }
}

const draw = (g, t, mood = 'neutral') => {
  const dy = Math.round(Math.sin(t * 2.4));
  background(g);
  window(g, t);
  chart(g, t);
  body(g);
  g.s(HEAD, HEAD_COLORS, HEAD_X, HEAD_Y + dy);
  face(g, t, mood, dy);
  desk(g);
  laptop(g, t);
  mug(g, t);
  plant(g, t);
  bubble(g, t, mood);
};

module.exports = { draw, HEAD, HEAD_COLORS };
