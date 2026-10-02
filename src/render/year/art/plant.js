'use strict';

// The plant: a brick factory with sawtooth roofs, a chimney that smokes and a big gear, with a status lamp
// on the roof. After an answer it wears the mood: when it was good the smoke is white, the windows are lit
// and the lamp is green; when it was bad the smoke is dark, the windows go out, the gear stutters and the lamp
// blinks red. The lower right corner is flat ground, because the month label sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

const WINDOWS = Object.freeze([12, 28, 44, 60]);
const GEAR = Object.freeze({ x: 96, y: 20, r: 8 });

function background(g, mood) {
  g.sky(...(mood === 'bad' ? P.sky.dusk : P.sky.day));
  g.r(0, 34, 116, 8, R.asphalt[1]);
  g.r(0, 34, 116, 1, R.asphalt[2]);
  g.r(0, 33, 116, 1, INK);
}

// Three sawtooth teeth on the roof: a slope rising to the right and a glass wall that drops straight down.
function roof(g) {
  [8, 31, 54].forEach((x0) => {
    for (let k = 0; k < 20; k += 2) {
      const h = 2 + Math.floor(k / 3);
      g.r(x0 + k, 15 - h, 2, h, R.roof[1]);
      g.r(x0 + k, 15 - h, 2, 1, R.roof[2]);
      g.r(x0 + k, 14 - h, 2, 1, INK);
    }
    g.r(x0 + 20, 7, 3, 9, R.glass[1]);
    g.r(x0 + 20, 7, 3, 1, R.glass[2]);
    g.r(x0 + 23, 7, 1, 9, INK);
  });
}

function building(g, t, mood) {
  g.box(6, 15, 72, 19, R.brick);
  const lit = mood === 'bad' ? [false, false, true, false] : [true, true, true, true];
  WINDOWS.forEach((x, i) => {
    g.r(x - 1, 20, 11, 9, INK);
    const on = lit[i] && !(mood === 'bad' && Math.floor(t * 4) % 2 === 0);
    g.r(x, 21, 9, 7, on ? P.gold : R.city[0]);
    if (on) g.r(x, 21, 9, 1, R.hazard[2]);
    g.r(x + 4, 21, 1, 7, INK);
  });
  g.box(38, 26, 5, 8, R.roof);
}

function chimney(g, t, mood) {
  g.box(63, 6, 9, 10, R.brick);
  g.r(62, 5, 11, 2, INK);
  g.r(63, 5, 9, 1, R.brick[2]);
  const puffs = mood === 'bad' ? 5 : 3;
  const tone = mood === 'bad' ? R.asphalt[2] : mood === 'good' ? P.white : R.cloud[2];
  for (let j = 0; j < puffs; j += 1) {
    const phase = (t * 0.5 + j / puffs) % 1;
    g.alpha(0.9 - phase * 0.9);
    g.d(68 + Math.round(phase * 9 + Math.sin(t * 1.3 + j * 2)), 3 - Math.round(phase), 1 + Math.round(phase), tone);
  }
  g.alpha(1);
}

// A gear whose spoke turns; when things go badly it advances in jerks.
function gear(g, t, mood) {
  const angle = mood === 'bad' ? Math.floor(t * 3) * 0.5 : t * 1.2;
  for (let k = 0; k < 8; k += 1) {
    const a = angle + (k * Math.PI) / 4;
    const x = Math.round(GEAR.x + Math.cos(a) * (GEAR.r + 1));
    const y = Math.round(GEAR.y + Math.sin(a) * (GEAR.r + 1));
    g.r(x - 2, y - 2, 5, 5, INK);
    g.r(x - 1, y - 1, 3, 3, R.metal[2]);
  }
  g.d(GEAR.x, GEAR.y, GEAR.r, INK);
  g.d(GEAR.x, GEAR.y, GEAR.r - 1, R.metal[1]);
  g.d(GEAR.x - 2, GEAR.y - 2, 2, R.metal[2]);
  g.l(GEAR.x, GEAR.y, Math.round(GEAR.x + Math.cos(angle) * (GEAR.r - 2)), Math.round(GEAR.y + Math.sin(angle) * (GEAR.r - 2)), R.metal[0]);
  g.d(GEAR.x, GEAR.y, 2, R.metal[0]);
}

// A lamp on the wall tells the state of the plant; when it goes well two glints twinkle over the roof.
function lamp(g, t, mood) {
  g.r(79, 16, 5, 6, INK);
  const color = mood === 'good' ? R.leaf[2] : mood === 'bad' ? (Math.floor(t * 3) % 2 === 0 ? R.tie[1] : R.tie[0]) : R.hazard[1];
  g.r(80, 17, 3, 4, color);
  if (mood !== 'good') return;
  if (Math.floor(t * 1.5) % 2 === 0) g.glint(86, 8, P.white);
  if (Math.floor(t * 1.5 + 1) % 2 === 0) g.glint(14, 8, P.white);
}

const draw = (g, t, mood = 'neutral') => {
  background(g, mood);
  gear(g, t, mood);
  building(g, t, mood);
  roof(g);
  chimney(g, t, mood);
  lamp(g, t, mood);
};

module.exports = { draw };
