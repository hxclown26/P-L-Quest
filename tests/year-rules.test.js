'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/model');
const rules = require('../src/year/rules');

const near = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);

test('the plan is OI 15 and every meter starts at 60', () => {
  assert.equal(rules.PLAN_OI, 15);
  assert.deepEqual(rules.START_METERS, { C: 60, P: 60, E: 60 });
  near(model.operatingIncome(rules.START_PL), 15);
});

test('meters stay between 0 and 100', () => {
  assert.equal(rules.clampMeter(-4), 0);
  assert.equal(rules.clampMeter(120), 100);
  assert.equal(rules.clampMeter(55), 55);
});

test('every meter decays by 1.8 at month end', () => {
  const end = rules.monthEnd({ C: 60, P: 50, E: 45 });
  near(end.meters.C, 58.2);
  near(end.meters.P, 48.2);
  near(end.meters.E, 43.2);
});

test('a meter below 42 drags OI through its own line; above 70 it adds', () => {
  const end = rules.monthEnd({ C: 20, P: 90, E: 60 });
  const by = Object.fromEntries(end.adjustments.map((a) => [a.because, a]));
  assert.equal(by.C.line, 'incentives');
  near(by.C.pts, -(42 - 20) * 0.015);
  assert.equal(by.P.line, 'cost');
  near(by.P.pts, (90 - 70) * 0.01);
  assert.equal(by.E, undefined);
});

test('a loyal client lifts sales instead of cutting incentives, which cannot go below zero', () => {
  const end = rules.monthEnd({ C: 90, P: 60, E: 60 });
  const client = end.adjustments.find((a) => a.because === 'C');
  assert.equal(client.line, 'sales');
  near(client.pts, (90 - 70) * 0.01);
  const strategy = rules.monthEnd({ C: 60, P: 60, E: 85 }).adjustments.find((a) => a.because === 'E');
  assert.equal(strategy.line, 'sales');
});

test('no line of the P&L ever goes negative in a simulated year, so the report always reads like a real one', () => {
  const sim = require('../src/year/simulate');
  const engine = require('../src/year/engine');
  for (const name of ['expert', 'careful', 'average', 'weak', 'pleaser', 'halfPleaser']) {
    for (let seed = 1; seed <= 60; seed += 1) {
      const rng = sim.mulberry32(seed);
      let run = engine.newYear((seed * 37) % 10000);
      for (let guard = 0; guard < 400 && !['final', 'over'].includes(run.phase); guard += 1) {
        for (const line of ['incentives', 'cost', 'freight', 'direct', 'sga']) {
          assert.ok(run.pl[line] >= 0, `${name} seed ${seed} month ${run.monthIdx + 1}: ${line} is ${run.pl[line]}`);
        }
        assert.ok(run.pl.sales > 0, `${name} seed ${seed}: sales ${run.pl.sales}`);
        run = run.phase === 'problem' ? engine.choose(run, sim.PROFILES[name](run, rng)) : engine.next(run);
      }
    }
  }
});

test('all three meters at 60 or more start a virtuous circle worth 0.08 on sales', () => {
  const fly = rules.monthEnd({ C: 60, P: 60, E: 60 }).adjustments.find((a) => a.because === 'fly');
  assert.equal(fly.line, 'sales');
  near(fly.pts, 0.08);
  assert.equal(rules.monthEnd({ C: 59, P: 60, E: 60 }).adjustments.find((a) => a.because === 'fly'), undefined);
});

test('the outcome is the lower of the OI grade and the weakest-meter grade', () => {
  const m = (v) => ({ C: v, P: v + 5, E: v + 10 });
  assert.equal(rules.classify(25, m(55), false), 'excellent');
  assert.equal(rules.classify(21.5, m(55), false), 'excellent');
  assert.equal(rules.classify(21.4, m(60), false), 'good');
  assert.equal(rules.classify(25, m(45), false), 'good');
  assert.equal(rules.classify(17, m(45), false), 'good');
  assert.equal(rules.classify(16.9, m(60), false), 'fair');
  assert.equal(rules.classify(25, m(36), false), 'fair');
  assert.equal(rules.classify(13, m(36), false), 'fair');
  assert.equal(rules.classify(12.9, m(60), false), 'bad');
  assert.equal(rules.classify(25, m(24), false), 'bad');
  assert.equal(rules.classify(8, m(24), false), 'bad');
  assert.equal(rules.classify(7.9, m(60), false), 'terrible');
  assert.equal(rules.classify(25, m(23), false), 'terrible');
});

test('a company that went through a rescue plan can never beat "fair"', () => {
  assert.equal(rules.classify(25, { C: 90, P: 90, E: 90 }, true), 'fair');
  assert.equal(rules.classify(13.5, { C: 60, P: 60, E: 60 }, true), 'fair');
  assert.equal(rules.classify(9, { C: 60, P: 60, E: 60 }, true), 'bad');
});

test('zero means OI or any meter at or below zero', () => {
  assert.equal(rules.isZero(0, { C: 50, P: 50, E: 50 }), true);
  assert.equal(rules.isZero(-1, { C: 50, P: 50, E: 50 }), true);
  assert.equal(rules.isZero(5, { C: 0, P: 50, E: 50 }), true);
  assert.equal(rules.isZero(5, { C: 1, P: 1, E: 1 }), false);
});

test('a rescue resets to a fragile but alive company', () => {
  const rescued = rules.rescueState({ C: 0, P: 55, E: 20 });
  near(model.operatingIncome(rescued.pl), 2);
  assert.deepEqual(rescued.meters, { C: 38, P: 55, E: 38 });
});

test('a rescue is possible once, up to month 9', () => {
  assert.equal(rules.canRescue(5, false), true);
  assert.equal(rules.canRescue(9, false), true);
  assert.equal(rules.canRescue(10, false), false);
  assert.equal(rules.canRescue(5, true), false);
});

test('the rescue goal is a double-digit OI', () => {
  assert.equal(rules.RESCUE_GOAL, 10);
});

test('the thresholds the screens draw are exported as numbers', () => {
  for (const name of ['DECAY', 'DRAG_BELOW', 'BONUS_ABOVE', 'FLYWHEEL', 'CRISIS']) {
    assert.equal(typeof rules[name], 'number', name);
  }
  assert.ok(rules.CRISIS < rules.DRAG_BELOW && rules.DRAG_BELOW < rules.FLYWHEEL && rules.FLYWHEEL < rules.BONUS_ABOVE);
});

// The half year is the year at double speed: the same rules, every monthly effect twice as big.
test('at double pace the meters wear twice as fast and every monthly adjustment doubles', () => {
  const normal = rules.monthEnd({ C: 60, P: 50, E: 38 });
  const fast = rules.monthEnd({ C: 60, P: 50, E: 38 }, 2);
  near(fast.meters.C, 56.4);
  near(fast.meters.P, 46.4);
  near(fast.meters.E, 34.4);
  const drag = (end) => end.adjustments.find((a) => a.because === 'E').pts;
  near(drag(fast), 2 * drag(normal));
});

test('the virtuous circle and the bonus of a strong meter double at double pace', () => {
  const normal = rules.monthEnd({ C: 80, P: 61, E: 61 });
  const fast = rules.monthEnd({ C: 80, P: 61, E: 61 }, 2);
  assert.equal(fast.adjustments.length, normal.adjustments.length);
  fast.adjustments.forEach((adjustment, i) => near(adjustment.pts, 2 * normal.adjustments[i].pts));
});

test('a rescue is possible up to month 4 at double pace, and once only', () => {
  assert.equal(rules.canRescue(4, false, 2), true);
  assert.equal(rules.canRescue(5, false, 2), false);
  assert.equal(rules.canRescue(3, true, 2), false);
  assert.equal(rules.canRescue(9, false, 1), true);
});
