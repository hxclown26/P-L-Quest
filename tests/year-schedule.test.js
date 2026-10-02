'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PROBLEMS, VOICES, PERMUTATIONS, AUTHORING } = require('../src/year/problems');
const { authoredSchedule, buildSchedule } = require('../src/year/schedule');

const byId = Object.fromEntries(PROBLEMS.map((p) => [p.id, p]));
const monthOf = (schedule, id) => Math.floor(schedule.order.indexOf(id) / 4) + 1;

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
