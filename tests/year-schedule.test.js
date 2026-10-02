'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PROBLEMS, VOICES, PERMUTATIONS, AUTHORING } = require('../src/year/problems');
const { authoredSchedule, buildSchedule } = require('../src/year/schedule');

const byId = Object.fromEntries(PROBLEMS.map((p) => [p.id, p]));
const monthOf = (schedule, id) => Math.floor(schedule.order.indexOf(id) / 4) + 1;
// The first four problems of seed 1, as the 12-month year dealt them before the half year existed.
const PINNED_ORDER_SEED_1 = ['m01p', 'm03c', 'm02e', 'm05s'];

test('the authored schedule is the original calendar: month by month, client, plant, environment, strategy', () => {
  const schedule = authoredSchedule();
  assert.deepEqual(schedule.order, PROBLEMS.map((p) => p.id));
  assert.equal(schedule.perms.length, 48);
  assert.ok(Object.isFrozen(schedule));
});

test('every random schedule plays all 48 problems once, four per month, one of each voice', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const schedule = buildSchedule(seed);
    assert.equal(schedule.order.length, 48);
    assert.equal(new Set(schedule.order).size, 48, `seed ${seed} repeats a problem`);
    for (let month = 0; month < 12; month += 1) {
      const voices = schedule.order.slice(month * 4, month * 4 + 4).map((id) => byId[id].voice).sort();
      assert.deepEqual(voices, [...VOICES].sort(), `seed ${seed} month ${month + 1}`);
    }
  }
});

test('problems tied to the calendar never leave their months', () => {
  const windows = PROBLEMS.filter((p) => p.window[0] > 1 || p.window[1] < 12);
  assert.ok(windows.length >= 8, 'the calendar-bound problems are marked');
  for (let seed = 1; seed <= 2000; seed += 1) {
    const schedule = buildSchedule(seed);
    for (const problem of windows) {
      const month = monthOf(schedule, problem.id);
      assert.ok(month >= problem.window[0] && month <= problem.window[1], `seed ${seed}: ${problem.id} fell in month ${month}`);
    }
  }
});

test('the year-end and year-start problems stay at the ends of the year', () => {
  for (let seed = 1; seed <= 500; seed += 1) {
    const schedule = buildSchedule(seed);
    assert.ok(monthOf(schedule, 'm12s') >= 11, 'closing the year comes at the end');
    assert.ok(monthOf(schedule, 'm12p') >= 11);
    assert.ok(monthOf(schedule, 'm01p') <= 2, 'starting the year comes at the start');
    assert.ok(monthOf(schedule, 'm01s') <= 3, 'the measuring problem comes early enough to pay off');
  }
});

test('the answers are scattered: each kind of answer sits in each position exactly 12 times a year', () => {
  for (const seed of [1, 2, 3, 99, 12345]) {
    const schedule = buildSchedule(seed);
    const counts = Object.fromEntries(AUTHORING.map((a) => [a, [0, 0, 0, 0]]));
    schedule.perms.forEach((perm) => {
      perm.forEach((authoredIndex, position) => { counts[AUTHORING[authoredIndex]][position] += 1; });
    });
    for (const a of AUTHORING) assert.deepEqual(counts[a], [12, 12, 12, 12], `${a} with seed ${seed}`);
    assert.equal(new Set(schedule.perms.map((perm) => perm.join())).size, 24, 'every arrangement is used');
  }
  assert.equal(PERMUTATIONS.length, 24);
});

test('the same seed gives the same year and different seeds give different orders', () => {
  assert.deepEqual(buildSchedule(42), buildSchedule(42));
  const orders = new Set();
  for (let seed = 1; seed <= 50; seed += 1) orders.add(buildSchedule(seed).order.join());
  assert.equal(orders.size, 50, 'no two of 50 games share an order');
  assert.notDeepEqual(buildSchedule(1).perms, buildSchedule(2).perms);
});

test('nothing is predictable from the first game: the first problem and the voice order vary', () => {
  const firsts = new Set();
  const firstVoice = Object.fromEntries(VOICES.map((v) => [v, 0]));
  for (let seed = 1; seed <= 400; seed += 1) {
    const schedule = buildSchedule(seed);
    firsts.add(schedule.order[0]);
    firstVoice[byId[schedule.order[0]].voice] += 1;
  }
  assert.ok(firsts.size >= 8, `${firsts.size} different opening problems`);
  for (const v of VOICES) assert.ok(firstVoice[v] > 60 && firstVoice[v] < 140, `${v} opens ${firstVoice[v]} of 400 games`);
});

test('a schedule is frozen so a run can share it safely', () => {
  const schedule = buildSchedule(5);
  assert.ok(Object.isFrozen(schedule) && Object.isFrozen(schedule.order) && Object.isFrozen(schedule.perms));
});

// ---- the half year: 6 months, 24 of the problems that fit its months
const monthOfIn = (schedule, id) => Math.floor(schedule.order.indexOf(id) / 4) + 1;

test('the 12-month schedule of a seed is exactly what it was before the half year existed', () => {
  assert.deepEqual(buildSchedule(1).order.slice(0, 4), PINNED_ORDER_SEED_1);
  assert.deepEqual(buildSchedule(1, 12).order, buildSchedule(1).order);
});

test('a half-year schedule plays 24 different problems, four a month, one of each voice', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const schedule = buildSchedule(seed, 6);
    assert.equal(schedule.order.length, 24);
    assert.equal(new Set(schedule.order).size, 24, `seed ${seed} repeats a problem`);
    assert.equal(schedule.perms.length, 24, 'every arrangement of the answers once');
    for (let month = 0; month < 6; month += 1) {
      const voices = schedule.order.slice(month * 4, month * 4 + 4).map((id) => byId[id].voice).sort();
      assert.deepEqual(voices, [...VOICES].sort(), `seed ${seed} month ${month + 1}`);
    }
  }
});

test('a half year only deals problems that can happen in its first six months, inside their windows', () => {
  for (let seed = 1; seed <= 1000; seed += 1) {
    const schedule = buildSchedule(seed, 6);
    for (const id of schedule.order) {
      const problem = byId[id];
      const month = monthOfIn(schedule, id);
      assert.ok(problem.window[0] <= 6, `seed ${seed}: ${id} belongs to the end of the year`);
      assert.ok(month >= problem.window[0] && month <= Math.min(problem.window[1], 6), `seed ${seed}: ${id} fell in month ${month}`);
    }
  }
});

test('different seeds pick different problems for a half year, and the same seed the same ones', () => {
  const picks = (seed) => [...buildSchedule(seed, 6).order].sort().join();
  assert.equal(picks(7), picks(7));
  assert.ok(new Set(Array.from({ length: 50 }, (_, i) => picks(i + 1))).size > 25);
  assert.deepEqual(buildSchedule(7, 6).order, buildSchedule(7, 6).order);
});

test('the authored half year is the first six months of the original calendar', () => {
  const schedule = authoredSchedule(6);
  assert.deepEqual(schedule.order, PROBLEMS.slice(0, 24).map((p) => p.id));
  assert.equal(schedule.perms.length, 24);
  assert.ok(Object.isFrozen(schedule));
});

test('in a half year each kind of answer sits in each position exactly 6 times', () => {
  for (const seed of [1, 2, 99, 4821]) {
    const counts = Object.fromEntries(AUTHORING.map((a) => [a, [0, 0, 0, 0]]));
    buildSchedule(seed, 6).perms.forEach((perm) => perm.forEach((authoredIndex, position) => { counts[AUTHORING[authoredIndex]][position] += 1; }));
    for (const a of AUTHORING) assert.deepEqual(counts[a], [6, 6, 6, 6], `${a} with seed ${seed}`);
  }
});
