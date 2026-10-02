'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const rules = require('../src/year/rules');
const sim = require('../src/year/simulate');

const SEEDS = 300;
const runs = (policy, n = SEEDS) => Array.from({ length: n }, (_, i) => sim.simulate(policy, 100 + i));
const share = (list, test2) => list.filter(test2).length / list.length;
const isOutcome = (id) => (run) => run.outcome === id;

test('an expert who reads each situation closes an excellent year', () => {
  const run = sim.simulate(sim.PROFILES.expert, 1);
  assert.equal(run.outcome, 'excellent');
  assert.ok(engine.oiOf(run) >= 19);
  assert.equal(run.rescued, false);
});

test('with 20% mistakes the year is usually excellent or good', () => {
  const list = runs(sim.PROFILES.careful);
  assert.ok(share(list, (r) => ['excellent', 'good'].includes(r.outcome)) >= 0.9);
  assert.ok(share(list, isOutcome('excellent')) >= 0.5);
});

test('always taking the shortcut ends in bankruptcy, after burning the rescue plan', () => {
  const list = runs(sim.PROFILES.short, 20);
  assert.ok(list.every(isOutcome('bankrupt')));
  assert.ok(list.every((r) => r.rescued && r.rescueMonth < r.bankruptMonth));
  assert.ok(list.every((r) => r.bankruptMonth <= 11), `bankrupt at ${list[0].bankruptMonth}`);
});

test('doing nothing ends in bankruptcy', () => {
  assert.ok(runs(sim.PROFILES.passive, 20).every(isOutcome('bankrupt')));
});

test('pleasing everyone keeps the company alive but the result is terrible', () => {
  const list = runs(sim.PROFILES.pleaser, 20);
  assert.ok(list.every(isOutcome('terrible')), list.map((r) => r.outcome).join());
});

test('half smart and half shortcut is still deadly, because the shortcut poisons the meters', () => {
  const list = runs(sim.PROFILES.halfShort);
  assert.ok(share(list, isOutcome('bankrupt')) >= 0.5);
});

test('half smart and half pleasing gives a good or fair year', () => {
  const list = runs(sim.PROFILES.halfPleaser);
  assert.ok(share(list, (r) => ['good', 'fair'].includes(r.outcome)) >= 0.8);
});

test('random answers almost never go well: most years are terrible or end in bankruptcy', () => {
  const list = runs(sim.PROFILES.random);
  assert.ok(share(list, (r) => ['terrible', 'bankrupt'].includes(r.outcome)) >= 0.8);
  assert.ok(share(list, (r) => ['excellent', 'good'].includes(r.outcome)) <= 0.03);
});

test('all six outcomes are reachable', () => {
  const seen = new Set();
  for (const policy of Object.values(sim.PROFILES)) {
    runs(policy, 60).forEach((r) => seen.add(r.outcome));
  }
  assert.deepEqual([...seen].sort(), [...rules.OUTCOMES].sort());
});

test('a rescue at month 6 can still reach a double-digit OI with good play', () => {
  const start = {
    ...engine.newYear(),
    monthIdx: 5,
    pl: rules.RESCUE_PL,
    meters: { C: 38, P: 38, E: 38 },
    rescued: true,
    rescueMonth: 6,
  };
  const perfect = sim.simulate(sim.PROFILES.expert, 1, start);
  assert.ok(engine.oiOf(perfect) >= rules.RESCUE_GOAL, `perfect rescue ended at ${engine.oiOf(perfect)}`);
  const reached = (eps, n = SEEDS) => share(
    Array.from({ length: n }, (_, i) => sim.simulate(sim.noisy(eps, sim.expert), 500 + i, start)),
    (r) => r.outcome !== 'bankrupt' && engine.oiOf(r) >= rules.RESCUE_GOAL,
  );
  assert.ok(reached(0.15) >= 0.9, 'a careful player gets there almost always');
  assert.ok(reached(0.3) >= 0.6, 'a mediocre player still has a real chance');
  assert.ok(reached(1) <= 0.05, 'random play does not get there');
});

test('a company that went through a rescue never ends better than fair', () => {
  const rescuedRuns = runs(sim.PROFILES.random, 600).filter((r) => r.rescued && r.outcome !== 'bankrupt');
  assert.ok(rescuedRuns.length > 0, 'the sweep should include rescued companies');
  assert.ok(rescuedRuns.every((r) => ['fair', 'bad', 'terrible'].includes(r.outcome)));
});

test('a rescue is not a free pass: later zeros are final', () => {
  const list = runs(sim.PROFILES.short, 20);
  assert.ok(list.every((r) => r.rescued));
});

// Shuffled years: the order of the problems must never decide how a player does.
const shuffled = (policy, n = 150) => Array.from({ length: n }, (_, i) => sim.simulate(policy, 100 + i, engine.newYear(1000 + i)));

test('on any shuffled calendar an expert still closes an excellent year', () => {
  assert.ok(shuffled(sim.PROFILES.expert).every(isOutcome('excellent')));
});

test('on shuffled calendars 20% mistakes still give an excellent or good year', () => {
  const list = shuffled(sim.PROFILES.careful);
  assert.ok(share(list, (r) => ['excellent', 'good'].includes(r.outcome)) >= 0.9);
});

test('on shuffled calendars the shortcut and doing nothing are bankruptcy, and pleasing everyone is terrible', () => {
  assert.ok(shuffled(sim.PROFILES.short, 60).every(isOutcome('bankrupt')));
  assert.ok(shuffled(sim.PROFILES.passive, 60).every(isOutcome('bankrupt')));
  assert.ok(shuffled(sim.PROFILES.pleaser, 60).every(isOutcome('terrible')));
});

test('on shuffled calendars random answers rarely go well and half-and-half players stay in the middle', () => {
  assert.ok(share(shuffled(sim.PROFILES.random), (r) => ['excellent', 'good', 'fair'].includes(r.outcome)) <= 0.1);
  assert.ok(share(shuffled(sim.PROFILES.halfPleaser), (r) => ['good', 'fair'].includes(r.outcome)) >= 0.8);
});

test('a month-6 rescue still comes back to a double-digit OI margin on a shuffled calendar', () => {
  const startAt = (seed) => ({
    ...engine.newYear(seed),
    monthIdx: 5,
    pl: rules.RESCUE_PL,
    meters: { C: 38, P: 38, E: 38 },
    rescued: true,
    rescueMonth: 6,
  });
  const reached = (eps, n = SEEDS) => share(
    Array.from({ length: n }, (_, i) => sim.simulate(sim.noisy(eps, sim.expert), 500 + i, startAt(2000 + i))),
    (r) => r.outcome !== 'bankrupt' && engine.oiOf(r) >= rules.RESCUE_GOAL,
  );
  assert.ok(reached(0) === 1, 'perfect play always gets there');
  assert.ok(reached(0.15) >= 0.9, 'a careful player gets there almost always');
  assert.ok(reached(0.3) >= 0.6, 'a mediocre player still has a real chance');
  assert.ok(reached(1) <= 0.05, 'random play does not get there');
});
