'use strict';

// Which screens have feedback of their own, and what it is: a result (tested in result-fx-render), a month close,
// the rescue plan and the first page of the verdict. All of it is read from the state of the game, the same
// every time, and calm mode takes it away.

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const showcase = require('../src/year/showcase');
const fx = require('../src/ui/fx');
const screenFx = require('../src/ui/screen-fx');
const { createApp } = require('../src/ui/app');

const app = (run, extra = {}) => ({
  ...createApp({ lang: 'es', muted: false, best: 0, seed: 5 }),
  scene: 'year',
  year: run,
  t: 3,
  phaseT: fx.IMPACT_AT + 0.05,
  page: 0,
  ...extra,
});

// A month close: the four problems of month 1 answered with the given kind of answer, then the close.
function closeOf(kind, seed = null) {
  let run = engine.newYear(seed);
  for (let i = 0; i < engine.PROBLEMS_PER_MONTH; i += 1) {
    run = engine.next(engine.choose(run, engine.options(run).findIndex((o) => o.a === kind)));
  }
  return run;
}

test('a month close has a plan of its own, graded by the bills that fall due and the OI it moved', () => {
  const run = closeOf('smart');
  assert.equal(run.phase, 'monthClose');
  const plan = screenFx.closePlan(app(run));
  assert.ok(plan && ['small', 'medium', 'large'].includes(plan.tier));
  assert.deepEqual(plan, screenFx.closePlan(app(run)), 'the same every time');
  assert.equal(screenFx.closePlan(app({ ...run, phase: 'problem' })), null, 'only while the close is on screen');
  assert.equal(screenFx.closePlan(app(run, { sim: true })), null, 'not in a simulated year');
});

test('the bills of old shortcuts that fall due make a close hit harder than a quiet one', () => {
  const quiet = closeOf('smart');
  const billed = { ...quiet, lastClose: { ...quiet.lastClose, delayedApplied: [{ because: 'm01c', meters: { C: -8.5, P: -1, E: -1 } }] } };
  const big = screenFx.closePlan(app(billed));
  assert.equal(big.tier, 'large');
  assert.ok(big.trauma > 0);
  assert.ok(screenFx.closePlan(app(quiet)).trauma === 0, 'a quiet close does not shake');
});

test('the rescue plan arrives like a blow, and calm mode softens it', () => {
  const run = { ...engine.newYear(7), phase: 'rescue', rescueMonth: 4 };
  const plan = screenFx.rescuePlan(app(run));
  assert.ok(plan.trauma > 0 && plan.flash.color === 'red');
  assert.deepEqual([screenFx.rescuePlan(app(run, { calm: true })).trauma, screenFx.rescuePlan(app(run, { calm: true })).flash], [0, null]);
  assert.equal(screenFx.rescuePlan(app({ ...run, phase: 'problem' })), null);
});

test('the first page of the verdict has the weather of its ending, and the other pages have none', () => {
  const excellent = showcase.showcaseRun(0);
  assert.equal(screenFx.verdictPlan(app(excellent, { sim: true })).ambient.kind, 'confetti');
  assert.equal(screenFx.verdictPlan(app(excellent, { sim: true, page: 1 })), null, 'the report page is calm');
  assert.equal(screenFx.verdictPlan(app(excellent, { sim: true, page: 2 })), null);
  const ruin = showcase.showcaseRun(showcase.SHOWCASE.findIndex((entry) => entry.outcome === 'bankrupt'));
  assert.equal(ruin.outcome, 'bankrupt');
  const plan = screenFx.verdictPlan(app(ruin, { sim: true }));
  assert.equal(plan.ambient.kind, 'embers');
  assert.ok(plan.trauma > 0);
  assert.equal(screenFx.verdictPlan(app(ruin, { sim: true, calm: true })).ambient, null, 'calm mode takes the weather away');
  assert.equal(screenFx.verdictPlan(app({ ...ruin, phase: 'problem' })), null);
});

test('the scene is shaken by whichever plan is on screen, and only while its impact lasts', () => {
  const ruin = showcase.showcaseRun(showcase.SHOWCASE.findIndex((entry) => entry.outcome === 'bankrupt'));
  const moved = [0.02, 0.05, 0.08, 0.11].map((dt) => app(ruin, { sim: true, phaseT: fx.IMPACT_AT + dt }))
    .some((a) => { const s = screenFx.screenShake(a); return s.dx !== 0 || s.dy !== 0; });
  assert.ok(moved, 'ruin shakes the verdict');
  assert.deepEqual(screenFx.screenShake(app(ruin, { sim: true, phaseT: 5 })), { dx: 0, dy: 0 });
  assert.deepEqual(screenFx.screenShake(app(ruin, { sim: true, calm: true })), { dx: 0, dy: 0 });
  const rescue = { ...engine.newYear(7), phase: 'rescue', rescueMonth: 4 };
  assert.ok([0.02, 0.05, 0.08, 0.11].some((dt) => { const s = screenFx.screenShake(app(rescue, { phaseT: fx.IMPACT_AT + dt })); return s.dx !== 0 || s.dy !== 0; }), 'and the rescue plan');
});
