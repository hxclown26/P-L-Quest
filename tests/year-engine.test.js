'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const rules = require('../src/year/rules');

const near = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const pick = (run, a) => engine.options(run).findIndex((o) => o.a === a);
const choose = (run, a) => engine.choose(run, pick(run, a));
const step = (run, a) => engine.next(choose(run, a));          // answer and leave the result screen

// Plays the first n problems with the same character of answer.
const playMany = (run, a, n) => {
  let r = run;
  for (let i = 0; i < n; i += 1) {
    r = step(r, a);
    while (!['problem', 'final', 'over'].includes(r.phase)) r = engine.next(r);
  }
  return r;
};

// A run standing at the start of a given month/problem with a chosen state.
const at = (monthIdx, problemIdx, patch = {}) => ({ ...engine.newYear(), monthIdx, problemIdx, ...patch });

test('a new year starts at month 1, problem 1, with OI 15 and every meter at 60', () => {
  const run = engine.newYear();
  assert.equal(run.phase, 'problem');
  assert.equal(run.monthIdx, 0);
  assert.equal(run.problemIdx, 0);
  assert.equal(run.attempt, 1);
  assert.equal(run.rescued, false);
  near(engine.oiOf(run), 15);
  assert.deepEqual(run.meters, { C: 60, P: 60, E: 60 });
});

test('a problem shows four answers of four different characters, always in the same order', () => {
  const run = engine.newYear();
  const shown = engine.options(run);
  assert.equal(shown.length, 4);
  assert.deepEqual(shown.map((o) => o.a).sort(), ['ign', 'plac', 'smart', 'temp']);
  assert.deepEqual(engine.options(run), shown);
});

test('a smart answer moves OI and the meters as the rules say, and shows its result', () => {
  const run = choose(engine.newYear(), 'smart');
  assert.equal(run.phase, 'result');
  near(engine.oiOf(run), (15.1 / 100.1) * 100);
  near(run.meters.C, 63.5);
  near(run.meters.P, 60.4);
  near(run.history.length, 1);
  assert.equal(run.last.a, 'smart');
  near(run.last.delta.oi, (15.1 / 100.1) * 100 - 15);
  assert.equal(run.last.problemId, 'm01c');
  // The balanced answer of month 1's renewal wins sales and pays a small rebate for them: two lines move, in two directions.
  near(run.pl.sales, 102.2);
  near(run.pl.incentives, 2.1);
});

test('each month has four problems, then the month closes with decay and meter effects', () => {
  let run = engine.newYear();
  const seen = [];
  for (let i = 0; i < 4; i += 1) {
    seen.push(engine.currentProblem(run).id);
    run = step(run, 'smart');
  }
  assert.deepEqual(seen, ['m01c', 'm01p', 'm01e', 'm01s']);
  assert.equal(run.phase, 'monthClose');
  assert.equal(run.closes.length, 1);
  near(run.closes[0].meters.C, run.meters.C);
  assert.ok(run.closes[0].adjustments.length > 0);
  const after = engine.next(run);
  assert.equal(after.phase, 'problem');
  assert.equal(after.monthIdx, 1);
  assert.equal(after.problemIdx, 0);
});

test('month end decays the meters by 1.8', () => {
  let run = engine.newYear();
  for (let i = 0; i < 3; i += 1) run = step(run, 'ign');
  const before = run.meters.E;
  run = choose(run, 'ign');
  const afterChoice = run.meters.E;
  run = engine.next(run);
  near(run.meters.E, afterChoice - 1.8, 1e-9);
  assert.ok(before > afterChoice);
});

test('the measuring answer of month 1 sets the value-measured flag, which helps later client answers', () => {
  let run = playMany(engine.newYear(), 'ign', 3);
  assert.equal(run.flags.valueMeasured, false);
  run = choose(run, 'smart');
  assert.equal(run.flags.valueMeasured, true);
  const flagged = at(4, 0, { flags: { valueMeasured: true } });
  const plain = at(4, 0);
  near(engine.preview(flagged, pick(flagged, 'smart')).oi - engine.preview(plain, pick(plain, 'smart')).oi, 0.2 * 1, 1e-9);
  assert.ok(engine.choose(flagged, pick(flagged, 'smart')).last.delta.oi > engine.choose(plain, pick(plain, 'smart')).last.delta.oi);
});

test('a shortcut bills half of its meter damage now and half two months later', () => {
  const run = choose(engine.newYear(), 'temp');
  assert.equal(run.pending.length, 1);
  assert.equal(run.pending[0].dueMonth, 2);
  near(run.meters.C, 60 - 2.75);
  let r = engine.next(run);
  while (r.monthIdx < 3) {
    r = step(r, 'ign');
    while (!['problem', 'final', 'over'].includes(r.phase)) r = engine.next(r);
  }
  assert.ok(r.closes[2].delayedApplied.some((d) => d.because === 'm01c'));
  assert.equal(r.pending.length, 0);
});

test('finishing month 12 reaches the final phase with a graded outcome, then game over', () => {
  let run = engine.newYear();
  for (let guard = 0; guard < 400 && run.phase !== 'final'; guard += 1) {
    run = run.phase === 'problem' ? choose(run, 'smart') : engine.next(run);
  }
  assert.equal(run.phase, 'final');
  assert.equal(run.outcome, 'excellent');
  assert.equal(run.closes.length, 12);
  assert.equal(run.history.length, 48);
  const over = engine.next(run);
  assert.equal(over.phase, 'over');
  assert.equal(engine.next(over).phase, 'over');
});

test('choose rejects a bad index or the wrong phase', () => {
  const run = engine.newYear();
  assert.throws(() => engine.choose(run, 4), /option/);
  assert.throws(() => engine.choose(choose(run, 'smart'), 0), /phase/);
});

test('engine functions never mutate their input', () => {
  const run = deepFreeze(engine.newYear());
  const chosen = engine.choose(run, 0);
  assert.notEqual(chosen, run);
  assert.equal(run.history.length, 0);
  deepFreeze(chosen);
  assert.doesNotThrow(() => engine.next(chosen));
});

test('the same answers always produce the same year', () => {
  const play = () => {
    let run = engine.newYear();
    for (let guard = 0; guard < 400 && run.phase !== 'final'; guard += 1) {
      run = run.phase === 'problem' ? engine.choose(run, guard % 4) : engine.next(run);
    }
    return run;
  };
  const a = play();
  const b = play();
  assert.equal(a.outcome, b.outcome);
  near(engine.oiOf(a), engine.oiOf(b));
});

test('preview shows what each answer would do without touching the run', () => {
  const run = deepFreeze(engine.newYear());
  const smart = engine.preview(run, pick(run, 'smart'));
  near(smart.oi, 0.1);
  assert.deepEqual(smart.notes, []);
  const temp = engine.preview(run, pick(run, 'temp'));
  assert.ok(temp.oi > 0 && temp.delayed);
  assert.equal(run.phase, 'problem');
  assert.equal(run.history.length, 0);
});

test('preview agrees with what choose then does', () => {
  const run = engine.newYear();
  for (const a of ['smart', 'temp', 'plac', 'ign']) {
    const index = pick(run, a);
    const shown = engine.preview(run, index);
    const done = engine.choose(run, index);
    near(done.last.delta.oi, shown.pp);
    assert.equal(done.last.a, a);
  }
});

test('preview rejects a bad index', () => {
  assert.throws(() => engine.preview(engine.newYear(), 9), /No option/);
});

test('a year started without a seed keeps the authored calendar', () => {
  const run = engine.newYear();
  assert.equal(run.seed, null);
  assert.equal(engine.currentProblem(run).id, 'm01c');
  assert.equal(run.schedule.order[47], 'm12s');
});

test('a seeded year plays its shuffled problems in schedule order, each exactly once', () => {
  const first = engine.newYear(7);
  const played = [];
  let run = first;
  while (run.phase !== 'final') {
    if (run.phase === 'problem') {
      played.push(engine.currentProblem(run).id);
      run = engine.choose(run, 0);
    } else {
      run = engine.next(run);
    }
  }
  assert.deepEqual(played, first.schedule.order);
  assert.equal(new Set(played).size, 48);
  assert.deepEqual(run.history.map((h) => h.problemId), first.schedule.order);
  assert.equal(run.seed, 7);
});

test('a seeded year shows the answers in its own scatter, still four different kinds', () => {
  for (let n = 0; n < 4; n += 1) {
    const run = { ...engine.newYear(7), monthIdx: 2, problemIdx: n };
    const problem = engine.currentProblem(run);
    const slot = 2 * 4 + n;
    assert.deepEqual(engine.options(run).map((o) => o.a), run.schedule.perms[slot].map((i) => problem.options[i].a));
    assert.deepEqual(engine.options(run).map((o) => o.a).sort(), ['ign', 'plac', 'smart', 'temp']);
  }
});

test('two seeds give two different years and the same seed gives the same year', () => {
  assert.notEqual(engine.newYear(1).schedule.order.join(), engine.newYear(2).schedule.order.join());
  assert.deepEqual(engine.newYear(5).schedule, engine.newYear(5).schedule);
  assert.notEqual(engine.currentProblem(engine.newYear(1)).id, undefined);
});

test('the content of a problem follows the problem, not the month it landed in', () => {
  const run = engine.newYear(3);
  const first = engine.currentProblem(run);
  const smart = engine.preview(run, engine.options(run).findIndex((o) => o.a === 'smart'));
  assert.ok(smart.oi > 0);
  assert.equal(first.id, run.schedule.order[0]);
  const answered = engine.choose(run, 0);
  assert.equal(answered.last.problemId, first.id);
});

test('shuffled years never mutate their input either', () => {
  const run = deepFreeze(engine.newYear(11));
  assert.doesNotThrow(() => engine.next(engine.choose(run, 1)));
});

// ---- the half year: six months at double pace
const atHalf = (monthIdx, problemIdx, patch = {}) => ({ ...engine.newYear(null, 6), monthIdx, problemIdx, ...patch });

test('a year is 12 months at normal pace unless it is asked to be a half year', () => {
  const full = engine.newYear(5);
  assert.equal(full.months, 12);
  assert.equal(full.pace, 1);
  const half = engine.newYear(5, 6);
  assert.equal(half.months, 6);
  assert.equal(half.pace, 2);
  assert.equal(half.schedule.order.length, 24);
  assert.equal(engine.newYear(null, 6).schedule.order.length, 24);
});

test('a half year has six months of four problems and then the verdict', () => {
  let run = engine.newYear(null, 6);
  for (let guard = 0; guard < 400 && run.phase !== 'final'; guard += 1) {
    run = run.phase === 'problem' ? choose(run, 'smart') : engine.next(run);
  }
  assert.equal(run.phase, 'final');
  assert.equal(run.closes.length, 6);
  assert.equal(run.history.length, 24);
  assert.equal(run.outcome, 'excellent');
});

test('at double pace every answer weighs twice as much on OI and the meters', () => {
  const normal = engine.preview(engine.newYear(), pick(engine.newYear(), 'smart'));
  const half = engine.newYear(null, 6);
  const fast = engine.preview(half, pick(half, 'smart'));
  near(fast.oi, 2 * normal.oi);
  near(fast.meters.C, 2 * normal.meters.C);
});

test('at double pace the month end wears the meters 3.6 and a shortcut bills its second half a month later', () => {
  const half = engine.newYear(null, 6);
  const chosen = choose(half, 'temp');
  assert.equal(chosen.pending.length, 1);
  assert.equal(chosen.pending[0].dueMonth, 1);
  let r = engine.next(chosen);
  r = step(step(step(r, 'ign'), 'ign'), 'ign');
  while (r.phase !== 'monthClose') r = engine.next(r);
  assert.ok(r.lastClose.meters.P < 60 - 3.6 - 3, 'the bill landed with the first close of the next month or earlier');
  const closed = engine.next(r);
  assert.equal(closed.phase, 'problem');
  let later = closed;
  for (let i = 0; i < 4; i += 1) later = step(later, 'ign');
  while (later.phase !== 'monthClose') later = engine.next(later);
  assert.ok(later.lastClose.delayedApplied.some((d) => d.because === 'm01c'));
});

