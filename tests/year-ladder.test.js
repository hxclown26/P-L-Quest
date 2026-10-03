'use strict';

// The ladder of a year. A meter at zero is a blow to the P&L, not an ending. A crisis (OI at zero) brings a one-time
// restructuring plan. Only the P&L bankrupts: the gross profit covering 70% of the SG&A or less at two closes in a row.

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const rules = require('../src/year/rules');
const model = require('../src/model');

const near = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);

const pick = (run, a) => engine.options(run).findIndex((o) => o.a === a);
const choose = (run, a) => engine.choose(run, pick(run, a));
const at = (monthIdx, problemIdx, patch = {}) => ({ ...engine.newYear(), monthIdx, problemIdx, ...patch });
// A month close as the engine leaves it before the player presses a key.
const closing = (monthIdx, patch = {}) => ({ ...at(monthIdx, 3, patch), phase: 'monthClose' });

// OI at -0.6%: the gross profit (15.5) still covers 97% of the SG&A, so it is a crisis and no more.
const THIN = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: -15.5 });
// A gross profit of 11.2 against an SG&A of 16: 70% exactly.
const BROKE = { ...model.BASE_PL, cost: 55 + 19.8 };

// ---- a meter at zero
test('a meter at zero after an answer is a blow: the result comes first, then the blow, and the P&L takes it', () => {
  const answered = choose(at(1, 0, { meters: { C: 1, P: 60, E: 60 } }), 'ign');
  assert.equal(answered.phase, 'result');
  assert.equal(answered.shock, 'C');
  const hit = engine.next(answered);
  assert.equal(hit.phase, 'shock');
  assert.equal(hit.shock, null);
  assert.equal(hit.shocks.length, 1);
  const blow = hit.shocks[0];
  assert.deepEqual([blow.meter, blow.monthIdx], ['C', 1]);
  assert.deepEqual(hit.pl, model.applyOps(blow.plBefore, rules.SHOCKS.C.ops));
  near(blow.oiAfter, engine.oiOf(hit));
  assert.ok(blow.oiAfter < blow.oiBefore - 3, 'a client that leaves is not a small matter');
  assert.equal(hit.meters.C, rules.SHOCK_METER);
  assert.equal(hit.rescued, false);
});

test('after the blow the month goes on where it was', () => {
  const hit = engine.next(choose(at(1, 0, { meters: { C: 1, P: 60, E: 60 } }), 'ign'));
  const next = engine.next(hit);
  assert.equal(next.phase, 'problem');
  assert.deepEqual([next.monthIdx, next.problemIdx], [1, 1]);
});

test('each meter has its own blow', () => {
  for (const key of rules.METER_KEYS) {
    const meters = { C: 60, P: 60, E: 60, [key]: 0 };
    const hit = engine.next(choose(at(1, 0, { meters }), 'ign'));
    assert.equal(hit.phase, 'shock', key);
    assert.equal(hit.shocks[0].meter, key);
    assert.equal(hit.meters[key], rules.SHOCK_METER);
  }
});

test('two meters at zero are two blows, one after the other', () => {
  const answered = choose(at(1, 0, { meters: { C: 0.5, P: 0.5, E: 60 } }), 'ign');
  assert.equal(answered.shock, 'C');
  const first = engine.next(answered);
  assert.equal(first.phase, 'shock');
  assert.equal(first.shock, 'P', 'the plant is still at zero');
  const second = engine.next(first);
  assert.equal(second.phase, 'shock');
  assert.equal(second.shocks.length, 2);
  assert.equal(second.shock, null);
  assert.equal(engine.next(second).phase, 'problem');
});

test('the blow of the fourth answer comes before the month closes', () => {
  const answered = choose(at(1, 3, { meters: { C: 1, P: 60, E: 0.5 } }), 'ign');
  const hit = engine.next(answered);
  assert.equal(hit.phase, 'shock');
  const closed = engine.next(hit);
  assert.equal(closed.phase, 'monthClose');
});

test('a meter that falls to zero at the month end takes its blow after the close', () => {
  const answered = choose(at(2, 3, { meters: { C: 1, P: 60, E: 60 } }), 'smart');
  const close = engine.next(answered);
  assert.equal(close.phase, 'monthClose');
  assert.equal(close.shock, 'C');
  const hit = engine.next(close);
  assert.equal(hit.phase, 'shock');
  assert.equal(hit.shocks[0].meter, 'C');
  assert.equal(engine.next(hit).phase, 'problem');
});

test('a meter can hit zero again later and the blow comes again, smaller each time', () => {
  const second = engine.next(choose(at(5, 0, { meters: { C: 0.2, P: 60, E: 60 }, shocks: [{ meter: 'C', monthIdx: 1 }] }), 'ign'));
  assert.equal(second.phase, 'shock');
  assert.equal(second.shocks.length, 2);
  const blow = second.shocks[1];
  assert.deepEqual(second.pl, model.applyOps(blow.plBefore, rules.shockOps('C', 1)));
  const fresh = engine.next(choose(at(5, 0, { meters: { C: 0.2, P: 60, E: 60 } }), 'ign'));
  assert.ok(fresh.shocks[0].oiBefore - fresh.shocks[0].oiAfter > blow.oiBefore - blow.oiAfter, 'the first blow is the heavier one');
});

// ---- a crisis
test('OI at zero after an answer does not stop the month: the crisis is judged at the close', () => {
  const answered = choose(at(3, 0, { pl: THIN }), 'ign');
  assert.ok(engine.oiOf(answered) < 0);
  assert.equal(answered.phase, 'result');
  const next = engine.next(answered);
  assert.equal(next.phase, 'problem');
  assert.equal(next.rescued, false);
});

test('at the close, OI at zero brings the restructuring plan, which keeps the P&L and shakes the meters', () => {
  const plan = engine.next(closing(3, { pl: THIN }));
  assert.equal(plan.phase, 'rescue');
  assert.equal(plan.rescued, true);
  assert.equal(plan.rescueMonth, 4);
  assert.deepEqual(plan.pl, model.applyOps(THIN, rules.restructureOps(THIN)));
  assert.ok(engine.oiOf(plan) > engine.oiOf(closing(3, { pl: THIN })));
  for (const key of rules.METER_KEYS) near(plan.meters[key], 60 - rules.RESTRUCTURING.meters);
  assert.equal(plan.rescues.length, 1);
  assert.equal(plan.rescues[0].cause, 'oi');
  const resumed = engine.next(plan);
  assert.equal(resumed.phase, 'problem');
  assert.deepEqual([resumed.monthIdx, resumed.problemIdx], [4, 0]);
});

test('a crisis after the plan is no new plan: play goes on', () => {
  const next = engine.next(closing(6, { pl: THIN, rescued: true, rescueMonth: 3 }));
  assert.equal(next.phase, 'problem');
  assert.equal(next.monthIdx, 7);
});

test('a crisis after month 9 has no plan either, and it is not bankruptcy', () => {
  const next = engine.next(closing(9, { pl: THIN }));
  assert.equal(next.phase, 'problem');
  assert.equal(next.rescued, false);
  assert.equal(next.outcome, null);
});

test('the last close of the year goes to the verdict, and a loss-making year is graded, not bankrupt', () => {
  const end = engine.next(closing(11, { pl: THIN }));
  assert.equal(end.phase, 'final');
  assert.equal(end.outcome, 'terrible');
});

// ---- bankruptcy
test('the gross profit covering 70% of the SG&A at one close is only a warning', () => {
  const warned = engine.next(closing(9, { pl: BROKE }));
  assert.equal(warned.phase, 'problem');
  assert.equal(warned.distress, 1);
  const recovered = engine.next(closing(10, { pl: model.BASE_PL, distress: 1 }));
  assert.equal(recovered.distress, 0);
});

test('at two closes in a row it is bankruptcy, with the P&L as the cause', () => {
  const over = engine.next(closing(9, { pl: BROKE, distress: 1 }));
  assert.equal(over.phase, 'final');
  assert.equal(over.outcome, 'bankrupt');
  assert.equal(over.bankruptMonth, 10);
  assert.equal(over.bankruptCause, 'pl');
});

test('a gross profit near 10% that still has a plan to try gets it first, and the plan can save the unit', () => {
  const plan = engine.next(closing(5, { pl: BROKE }));
  assert.equal(plan.phase, 'rescue');
  assert.equal(plan.distress, 1);
  const resumed = engine.next(plan);
  assert.equal(resumed.phase, 'problem');
  const later = engine.next(closing(6, { pl: plan.pl, rescued: true, rescueMonth: 6, distress: 1 }));
  assert.equal(later.phase, 'problem', 'after the plan the gross profit covers more than 70% again');
  assert.equal(later.distress, 0);
});

test('a blow at the close is settled before the unit is judged', () => {
  const nearlyBroke = { ...model.BASE_PL, cost: 55 + 18 };
  const hit = engine.next(closing(9, { pl: nearlyBroke, meters: { C: 60, P: 60, E: 0 }, shock: 'E', distress: 1 }));
  assert.equal(hit.phase, 'shock');
  const over = engine.next(hit);
  assert.equal(over.phase, 'final');
  assert.equal(over.outcome, 'bankrupt');
  assert.equal(over.bankruptCause, 'pl');
});

test('a meter at zero alone never bankrupts a healthy unit', () => {
  let run = at(8, 0, { meters: { C: 0.2, P: 60, E: 60 } });
  run = engine.next(choose(run, 'ign'));
  assert.equal(run.phase, 'shock');
  assert.ok(engine.oiOf(run) > 0);
  assert.notEqual(engine.next(run).phase, 'final');
});

// ---- the half year
test('in a half year the plan is possible up to month 4 and a late crisis has none', () => {
  const half = (monthIdx, patch) => ({ ...engine.newYear(null, 6), monthIdx, problemIdx: 3, phase: 'monthClose', ...patch });
  assert.equal(engine.next(half(3, { pl: THIN })).phase, 'rescue');
  assert.equal(engine.next(half(4, { pl: THIN })).phase, 'problem');
});

// ---- red lines
test('a red line is counted, costs more than it earns and leaves no bill for later', () => {
  const run = choose(at(1, 3), 'temp');
  assert.equal(engine.currentProblem(at(1, 3)).id, 'm02s');
  assert.equal(run.last.redLine, true);
  assert.equal(run.redLines, 1);
  assert.deepEqual(run.pending, []);
  assert.ok(run.last.delta.oi < 0, 'the fine is bigger than the gain');
  assert.ok(run.last.notes.includes('redLine'));
});

test('a year with a red line is never better than "bad", even for an expert', () => {
  let run = engine.newYear();
  for (let guard = 0; guard < 400 && run.phase !== 'final'; guard += 1) {
    run = run.phase === 'problem' ? choose(run, engine.currentProblem(run).id === 'm02s' ? 'temp' : 'smart') : engine.next(run);
  }
  assert.equal(run.redLines, 1);
  assert.equal(run.outcome, 'bad');
});

test('the new state of the ladder is never shared with the run it came from', () => {
  const frozen = (value) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(frozen);
      Object.freeze(value);
    }
    return value;
  };
  const run = frozen(closing(3, { pl: THIN }));
  assert.doesNotThrow(() => engine.next(run));
  const answered = frozen(choose(at(1, 0, { meters: { C: 1, P: 60, E: 60 } }), 'ign'));
  assert.doesNotThrow(() => engine.next(engine.next(answered)));
});
