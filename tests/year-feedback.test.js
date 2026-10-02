'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const rules = require('../src/year/rules');
const sim = require('../src/year/simulate');
const model = require('../src/model');
const { walk, feedback, countAnswers } = require('../src/year/feedback');

const near = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);

const year = (profile, seed = 3) => sim.simulate(sim.PROFILES[profile], seed);

test('the walk adds up from the plan to the final OI, whatever happened', () => {
  for (const profile of Object.keys(sim.PROFILES)) {
    for (const seed of [1, 2, 3]) {
      const run = year(profile, seed);
      const w = walk(run);
      near(w.start, 15);
      near(w.end, engine.oiOf(run));
    }
  }
});

test('the walk swaps one P&L line at a time from the plan to the final P&L', () => {
  const run = year('expert');
  const w = walk(run);
  assert.deepEqual(w.steps.map((s) => s.id), ['sales', 'incentives', 'cost', 'freight', 'direct', 'sga']);
  const total = w.steps.reduce((sum, s) => sum + s.pts, 0);
  near(w.start + total, w.end, 1e-9);
});

test('a plan that only changed one line shows only that step', () => {
  const costlier = { ...engine.newYear(), pl: model.applyOp(model.BASE_PL, { op: 'add', line: 'cost', pts: 3 }) };
  const w = walk(costlier);
  near(w.steps.find((s) => s.id === 'cost').pts, -3);
  for (const id of ['sales', 'incentives', 'freight', 'direct', 'sga']) near(w.steps.find((s) => s.id === id).pts, 0);
});

test('the sales step carries the dilution: more sales over the same costs lifts the margin', () => {
  const bigger = { ...engine.newYear(), pl: model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: 10 }) };
  const w = walk(bigger);
  near(w.steps.find((s) => s.id === 'sales').pts, (25 / 110) * 100 - 15, 1e-9);
  near(w.end, (25 / 110) * 100, 1e-9);
});

test('a rescued year bridges from the plan to the stressed P&L it ended with', () => {
  const run = year('short');
  assert.equal(run.rescued, true);
  const w = walk(run);
  near(w.end, engine.oiOf(run));
  assert.ok(w.steps.every((s) => s.id !== 'rescue'), 'the rescue is just a P&L reset, visible in the lines');
});

test('an expert gets a clean year with a tip to keep going', () => {
  const run = year('expert');
  const f = feedback(run);
  assert.equal(f.outcome, 'excellent');
  assert.equal(f.lines[0].key, 'year.fb.sum.excellent');
  assert.equal(f.lines[1].key, 'year.fb.clean');
  assert.equal(f.lines[2].key, 'year.fb.tip.keep');
  assert.equal(f.lines[3].key, 'year.fb.value');
});

test('a player who gives in names the OI that pleasing everyone cost', () => {
  const f = feedback(year('pleaser'));
  assert.equal(f.lines[1].key, 'year.fb.plac');
  assert.ok(f.lines[1].params.oiLost > 5);
  assert.ok(f.lines[1].params.n >= 40);
});

test('a bankrupt shortcut-taker gets the month, the cause and their costliest shortcut', () => {
  const run = year('short');
  const f = feedback(run);
  assert.equal(f.lines[0].key, 'year.fb.sum.bankrupt');
  assert.equal(f.lines[0].params.month, run.bankruptMonth);
  assert.ok(['oi', 'C', 'P', 'E'].includes(f.lines[0].params.cause));
  assert.equal(f.lines[1].key, 'year.fb.temp');
  assert.ok(f.lines[1].params.problem.startsWith('m'));
  assert.ok(f.lines[1].params.oiGain > 0);
  assert.ok(['C', 'P', 'E'].includes(f.lines[1].params.meter));
});

test('doing nothing is called out by its count', () => {
  const f = feedback(year('passive'));
  assert.equal(f.lines[1].key, 'year.fb.ign');
});

test('the tip points at the weakest meter when it is below 45', () => {
  const run = year('pleaser');
  const f = feedback(run);
  const weakest = rules.weakest(run.meters);
  if (run.meters[weakest] < 45) assert.equal(f.lines[2].key, `year.fb.tip.${weakest}`);
  else assert.equal(f.lines[2].key, 'year.fb.tip.keep');
  const shaky = feedback({ ...run, meters: { C: 90, P: 90, E: 30 } });
  assert.equal(shaky.lines[2].key, 'year.fb.tip.E');
});

test('a rescue gets its own closing line, with or without reaching the goal', () => {
  const run = sim.simulate(sim.PROFILES.random, 12);
  const rescued = Array.from({ length: 80 }, (_, i) => sim.simulate(sim.PROFILES.random, 100 + i))
    .find((r) => r.rescued && r.outcome !== 'bankrupt');
  assert.ok(rescued, 'the sweep should include a rescued survivor');
  const f = feedback(rescued);
  assert.match(f.lines[3].key, /^year\.fb\.rescued\.(yes|no)$/);
  assert.equal(f.lines[3].params.month, rescued.rescueMonth);
  assert.ok(run);
});

test('countAnswers tallies the four characters of answer', () => {
  const counts = countAnswers(year('expert'));
  assert.equal(counts.smart + counts.temp + counts.plac + counts.ign, 48);
});
