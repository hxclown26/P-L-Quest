'use strict';

// No text is printed over other text on any year screen: the verdict pages of a played (seeded) game, the three screens of
// every problem in both languages, the month closes, the blows and the restructuring plan. A year played from a
// simulation has no game code, so the pages that carry the code must be audited with a seeded one.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/ui/app');
const engine = require('../src/year/engine');
const sim = require('../src/year/simulate');
const view = require('../src/ui/year-view');
const { PROBLEMS } = require('../src/year/problems');
const { textRuns, overlaps } = require('./helpers/screen');

const base = (patch = {}) => ({ ...createApp({ lang: 'es', muted: false, best: 1, bestYear: 4 }), t: 3, phaseT: 8, ...patch });
const inYear = (year, patch = {}) => base({ scene: 'year', year, ...patch });
const report = (name, app) => overlaps(textRuns(app)).map(([a, b]) => `${name}: "${a.text}" over "${b.text}"`);

test('the verdict pages of a played game keep every text apart, in both languages and for every style of play', () => {
  const problems = [];
  for (const lang of ['es', 'en']) {
    for (const profile of Object.keys(sim.PROFILES)) {
      for (const seed of [5933, 1042]) {
        const year = sim.simulate(sim.PROFILES[profile], 3, engine.newYear(seed));
        for (let page = 0; page < 3; page += 1) problems.push(...report(`${profile} seed ${seed} page ${page} ${lang}`, inYear(year, { lang, sim: false, page, yearT: 1300 })));
        problems.push(...report(`${profile} over ${lang}`, inYear(engine.next(year), { lang })));
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('the brief, the answers and the result of every problem keep every text apart, in both languages', () => {
  const problems = [];
  PROBLEMS.forEach((problem, n) => {
    const year = { ...engine.newYear(7), monthIdx: Math.floor(n / 4), problemIdx: n % 4 };
    for (const lang of ['es', 'en']) {
      problems.push(...report(`brief ${problem.id} ${lang}`, inYear(year, { lang })));
      problems.push(...report(`answers ${problem.id} ${lang}`, inYear(year, { lang, briefedSlot: view.slotOf(year), cursor: n % 4 })));
      for (let i = 0; i < 4; i += 1) problems.push(...report(`result ${problem.id}#${i} ${lang}`, inYear(engine.choose(year, i), { lang, phaseT: 0.6 })));
    }
  });
  assert.deepEqual(problems, []);
});

test('the month closes, the blows and the restructuring plan of a whole year keep every text apart', () => {
  const problems = [];
  const rng = sim.mulberry32(5);
  let run = engine.newYear(11);
  for (let guard = 0; guard < 400 && run.phase !== 'final'; guard += 1) {
    if (['monthClose', 'rescue', 'shock'].includes(run.phase)) {
      for (const lang of ['es', 'en']) problems.push(...report(`${run.phase} month ${run.monthIdx + 1} ${lang}`, inYear(run, { lang })));
    }
    run = run.phase === 'problem' ? engine.choose(run, sim.PROFILES.average(run, rng)) : engine.next(run);
  }
  assert.deepEqual(problems, []);
});
