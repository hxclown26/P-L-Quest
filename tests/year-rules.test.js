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

test('a red line caps the year at "bad", whatever the numbers say', () => {
  const healthy = { C: 90, P: 90, E: 90 };
  assert.equal(rules.classify(25, healthy, false, 0), 'excellent');
  assert.equal(rules.classify(25, healthy, false, 1), 'bad');
  assert.equal(rules.classify(25, healthy, false, 3), 'bad');
  assert.equal(rules.classify(9, healthy, true, 1), 'bad');
  assert.equal(rules.classify(5, healthy, false, 1), 'terrible', 'a worse year stays worse');
});

// ---- the ladder: alert, crisis, bankruptcy; and what a meter at zero costs
test('a meter at zero is the first one found at or below zero, in the order client, plant, strategy', () => {
  assert.equal(rules.zeroMeter({ C: 50, P: 50, E: 50 }), null);
  assert.equal(rules.zeroMeter({ C: 1, P: 1, E: 1 }), null);
  assert.equal(rules.zeroMeter({ C: 0, P: 50, E: 50 }), 'C');
  assert.equal(rules.zeroMeter({ C: 5, P: 0, E: -1 }), 'P');
  assert.equal(rules.zeroMeter({ C: 5, P: 9, E: 0 }), 'E');
});

test('every meter has its own blow on the P&L, and the meter that took it restarts above the drag line', () => {
  assert.ok(rules.SHOCK_METER >= rules.CRISIS && rules.SHOCK_METER <= rules.DRAG_BELOW);
  const after = (key) => model.applyOps(model.BASE_PL, rules.SHOCKS[key].ops);
  near(model.salesGrowth(after('C')), rules.SHOCKS.C.ops[0].pct, 1e-6);
  assert.ok(rules.SHOCKS.C.ops[0].pct < 0, 'the client that leaves takes volume with him');
  assert.ok(model.operatingIncome(after('P')) < model.operatingIncome(model.BASE_PL), 'a stopped plant loses orders and spends in emergencies');
  assert.ok(model.salesGrowth(after('E')) < 0, 'a market that stops respecting you pays less');
  for (const key of rules.METER_KEYS) {
    const loss = model.operatingMargin(model.BASE_PL) - model.operatingMargin(after(key));
    assert.ok(loss >= 3 && loss <= 8, `${key}: the blow is ${loss.toFixed(1)} points of margin: heavy but not the end`);
  }
});

test('the blow of a meter that already hit zero is smaller: the next client is a smaller one', () => {
  const first = model.applyOps(model.BASE_PL, rules.shockOps('C', 0));
  const second = model.applyOps(model.BASE_PL, rules.shockOps('C', 1));
  const third = model.applyOps(model.BASE_PL, rules.shockOps('C', 2));
  assert.deepEqual(rules.shockOps('C', 0), rules.SHOCKS.C.ops);
  near(model.salesGrowth(second), rules.SHOCKS.C.ops[0].pct * rules.SHOCK_FADE, 1e-6);
  assert.ok(model.operatingMargin(first) < model.operatingMargin(second));
  assert.ok(model.operatingMargin(second) < model.operatingMargin(third));
  assert.ok(model.operatingMargin(third) < model.operatingMargin(model.BASE_PL), 'but it never becomes nothing');
  assert.ok(rules.SHOCK_FADE > 0 && rules.SHOCK_FADE < 1);
});

test('the OI is in crisis at zero or less, and the unit is in distress when the gross profit covers 70% of the SG&A or less', () => {
  assert.equal(rules.inCrisis(0), true);
  assert.equal(rules.inCrisis(-3), true);
  assert.equal(rules.inCrisis(0.1), false);
  assert.equal(rules.BANKRUPT_COVERAGE, 0.7);
  assert.equal(rules.BANKRUPT_CLOSES, 2);
  assert.equal(rules.distressed(model.BASE_PL), false);
  // gross profit 11.2 against SG&A 16 is exactly 70%: with a gross margin near 10% the SG&A eats it all
  assert.equal(rules.distressed({ ...model.BASE_PL, cost: 55 + 19.8 }), true);
  assert.equal(rules.distressed({ ...model.BASE_PL, cost: 55 + 19 }), false);
});

test('a restructuring plan cuts the SG&A and the cost and shakes every meter, and it keeps the P&L it found', () => {
  const plan = rules.restructureOps(model.BASE_PL);
  const after = model.applyOps(model.BASE_PL, plan);
  near(after.sga, 16 * (1 - rules.RESTRUCTURING.sga));
  near(after.cost, 55 * (1 - rules.RESTRUCTURING.cost));
  near(after.sales, model.BASE_PL.sales);
  assert.ok(rules.RESTRUCTURING.meters > 0);
  assert.ok(model.operatingMargin(after) > model.operatingMargin(model.BASE_PL));
});

test('a restructuring plan is possible once, up to month 9', () => {
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
