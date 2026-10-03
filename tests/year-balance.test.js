'use strict';

// How the styles of play fare, in a full year (on the authored calendar and on shuffled ones) and in a half year.
// The ladder is what shapes it: a meter at zero is a blow to the P&L, a crisis brings the restructuring plan and only the
// P&L bankrupts. A red line caps a year at "bad", so the mistakes of a careful player split in two: the years without
// one of the five breaches are excellent or good, the others are capped.

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const rules = require('../src/year/rules');
const model = require('../src/model');
const sim = require('../src/year/simulate');

const SEEDS = 300;
const runs = (policy, n = SEEDS) => Array.from({ length: n }, (_, i) => sim.simulate(policy, 100 + i));
const share = (list, test2) => list.filter(test2).length / list.length;
const isOutcome = (id) => (run) => run.outcome === id;
const GOOD = ['excellent', 'good'];
const AT_MOST_BAD = ['bad', 'terrible', 'bankrupt'];
const ruined = (r) => ['terrible', 'bankrupt'].includes(r.outcome);

test('an expert who reads each situation closes an excellent year', () => {
  const run = sim.simulate(sim.PROFILES.expert, 1);
  assert.equal(run.outcome, 'excellent');
  assert.ok(engine.oiOf(run) >= 19);
  assert.equal(run.rescued, false);
  assert.equal(run.shocks.length, 0);
  assert.equal(run.redLines, 0);
});

test('with 20% mistakes the year is excellent or good unless a mistake crosses a red line, which caps it', () => {
  const list = runs(sim.PROFILES.careful);
  const clean = list.filter((r) => r.redLines === 0);
  const breached = list.filter((r) => r.redLines > 0);
  assert.ok(clean.length / list.length >= 0.6, 'most careful years never touch a red line');
  assert.ok(share(clean, (r) => GOOD.includes(r.outcome)) >= 0.95);
  assert.ok(share(clean, isOutcome('excellent')) >= 0.5);
  assert.ok(breached.length > 0 && breached.every((r) => AT_MOST_BAD.includes(r.outcome)), 'a breach is not forgiven by the numbers');
});

test('always taking the shortcut ruins the unit: blow after blow, a plan that is not enough and a terrible year', () => {
  const list = runs(sim.PROFILES.short, 20);
  assert.ok(list.every(ruined), list.map((r) => r.outcome).join());
  assert.ok(list.every((r) => r.shocks.length >= 3), 'the meters keep hitting zero');
  assert.ok(list.every((r) => r.rescued), 'the board steps in once');
  assert.ok(list.every((r) => engine.oiOf(r) < 8));
});

test('doing nothing ends in bankruptcy, as the gross profit stops covering the SG&A', () => {
  const list = runs(sim.PROFILES.passive, 20);
  assert.ok(list.every(isOutcome('bankrupt')));
  assert.ok(list.every((r) => r.bankruptCause === 'pl' && r.rescued && r.rescueMonth < r.bankruptMonth));
});

test('pleasing everyone keeps the company alive but the result is terrible', () => {
  const list = runs(sim.PROFILES.pleaser, 20);
  assert.ok(list.every(isOutcome('terrible')), list.map((r) => r.outcome).join());
});

test('half smart and half shortcut ruins the meters even if the OI holds', () => {
  const list = runs(sim.PROFILES.halfShort);
  assert.ok(share(list, ruined) >= 0.85);
});

test('half smart and half pleasing gives a good or fair year', () => {
  const list = runs(sim.PROFILES.halfPleaser);
  assert.ok(share(list, (r) => ['good', 'fair'].includes(r.outcome)) >= 0.8);
});

test('random answers almost never go well: most years are terrible or end in bankruptcy', () => {
  const list = runs(sim.PROFILES.random);
  assert.ok(share(list, ruined) >= 0.85);
  assert.ok(share(list, (r) => GOOD.includes(r.outcome)) <= 0.03);
});

test('all six outcomes are reachable', () => {
  const seen = new Set();
  for (const policy of Object.values(sim.PROFILES)) {
    runs(policy, 60).forEach((r) => seen.add(r.outcome));
  }
  assert.deepEqual([...seen].sort(), [...rules.OUTCOMES].sort());
});

// A unit in crisis at a close, the restructuring plan, and the months that are left.
const THIN = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: -15.5 });
const afterPlan = (seed, months, closeIdx) => engine.next({ ...engine.newYear(seed, months), monthIdx: closeIdx, problemIdx: 3, phase: 'monthClose', pl: THIN });
const reached = (eps, startOf, n = SEEDS) => share(
  Array.from({ length: n }, (_, i) => sim.simulate(sim.noisy(eps, sim.expert), 500 + i, startOf(2000 + i))),
  (r) => r.outcome !== 'bankrupt' && engine.oiOf(r) >= rules.RESCUE_GOAL,
);

test('after the plan at month 6 a unit can still come back to a double-digit OI with good play', () => {
  const startOf = (seed) => afterPlan(seed, 12, 5);
  assert.equal(startOf(1).phase, 'rescue');
  assert.ok(reached(0, startOf) === 1, 'perfect play always gets there');
  assert.ok(reached(0.15, startOf) >= 0.9, 'a careful player gets there almost always');
  assert.ok(reached(0.3, startOf) >= 0.6, 'a mediocre player still has a real chance');
  assert.ok(reached(1, startOf) <= 0.1, 'random play does not get there');
});

test('a company that went through the restructuring plan never ends better than fair', () => {
  const planned = runs(sim.PROFILES.random, 600).filter((r) => r.rescued && r.outcome !== 'bankrupt');
  assert.ok(planned.length > 0, 'the sweep should include restructured companies');
  assert.ok(planned.every((r) => ['fair', 'bad', 'terrible'].includes(r.outcome)));
});

// Shuffled years: the order of the problems must never decide how a player does.
const shuffled = (policy, n = 150) => Array.from({ length: n }, (_, i) => sim.simulate(policy, 100 + i, engine.newYear(1000 + i)));

test('on any shuffled calendar an expert still closes an excellent year', () => {
  assert.ok(shuffled(sim.PROFILES.expert).every(isOutcome('excellent')));
});

test('on shuffled calendars 20% mistakes still give an excellent or good year when no red line is crossed', () => {
  const clean = shuffled(sim.PROFILES.careful).filter((r) => r.redLines === 0);
  assert.ok(clean.length > 60);
  assert.ok(share(clean, (r) => GOOD.includes(r.outcome)) >= 0.95);
});

test('on shuffled calendars the shortcut ruins the unit, doing nothing is bankruptcy and pleasing everyone is terrible', () => {
  assert.ok(shuffled(sim.PROFILES.short, 60).every(ruined));
  assert.ok(shuffled(sim.PROFILES.passive, 60).every(isOutcome('bankrupt')));
  assert.ok(shuffled(sim.PROFILES.pleaser, 60).every(isOutcome('terrible')));
});

test('on shuffled calendars random answers rarely go well and half-and-half players stay in the middle', () => {
  assert.ok(share(shuffled(sim.PROFILES.random), (r) => ['excellent', 'good', 'fair'].includes(r.outcome)) <= 0.1);
  assert.ok(share(shuffled(sim.PROFILES.halfPleaser), (r) => ['good', 'fair'].includes(r.outcome)) >= 0.8);
});

// ---- the half year: the same year at double speed must reward and punish the same styles of play
const halfYears = (policy, n = 100) => Array.from({ length: n }, (_, i) => sim.simulate(policy, 100 + i, engine.newYear(1000 + i, 6)));

test('in a half year an expert still closes an excellent year, whatever the calendar', () => {
  assert.ok(halfYears(sim.PROFILES.expert, 150).every(isOutcome('excellent')));
});

test('in a half year 20% mistakes still give an excellent or good year without a red line, and mostly an excellent one', () => {
  const clean = halfYears(sim.PROFILES.careful, 200).filter((r) => r.redLines === 0);
  assert.ok(clean.length > 100);
  assert.ok(share(clean, (r) => GOOD.includes(r.outcome)) >= 0.95);
  assert.ok(share(clean, isOutcome('excellent')) >= 0.6);
});

test('in a half year the shortcut ruins the unit and doing nothing is bankruptcy', () => {
  assert.ok(halfYears(sim.PROFILES.short, 60).every(ruined));
  assert.ok(halfYears(sim.PROFILES.short, 60).every((r) => r.shocks.length >= 3));
  assert.ok(halfYears(sim.PROFILES.passive, 60).every(isOutcome('bankrupt')));
});

test('in a half year pleasing everyone keeps the company alive but the result is terrible', () => {
  assert.ok(halfYears(sim.PROFILES.pleaser, 60).every(isOutcome('terrible')));
});

test('in a half year half shortcuts still ruin the meters and half giving in stays in the middle', () => {
  assert.ok(share(halfYears(sim.PROFILES.halfShort, 150), ruined) >= 0.8);
  assert.ok(share(halfYears(sim.PROFILES.halfPleaser, 150), (r) => ['good', 'fair'].includes(r.outcome)) >= 0.7);
});

test('in a half year random answers rarely go well: most years are terrible or end in bankruptcy', () => {
  const list = halfYears(sim.PROFILES.random, 150);
  assert.ok(share(list, ruined) >= 0.8);
  assert.ok(share(list, (r) => GOOD.includes(r.outcome)) <= 0.05);
});

test('in a half year all six outcomes are reachable', () => {
  const seen = new Set();
  for (const policy of Object.values(sim.PROFILES)) halfYears(policy, 80).forEach((r) => seen.add(r.outcome));
  assert.deepEqual([...seen].sort(), [...rules.OUTCOMES].sort());
});

test('after the plan at month 3 of a half year a unit can still come back to a double-digit OI with good play', () => {
  const startOf = (seed) => afterPlan(seed, 6, 2);
  assert.equal(startOf(1).phase, 'rescue');
  assert.ok(reached(0, startOf) === 1, 'perfect play always gets there');
  assert.ok(reached(0.15, startOf) >= 0.9, 'a careful player gets there almost always');
  assert.ok(reached(0.3, startOf) >= 0.6, 'a mediocre player still has a real chance');
  assert.ok(reached(1, startOf) <= 0.1, 'random play does not get there');
});

test('a company that went through the restructuring plan in a half year never ends better than fair', () => {
  const planned = halfYears(sim.PROFILES.random, 400).filter((r) => r.rescued && r.outcome !== 'bankrupt');
  assert.ok(planned.length > 0, 'the sweep should include restructured companies');
  assert.ok(planned.every((r) => ['fair', 'bad', 'terrible'].includes(r.outcome)));
});
