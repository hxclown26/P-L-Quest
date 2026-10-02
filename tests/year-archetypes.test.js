'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ARCHETYPES, IDS, effectOf } = require('../src/year/archetypes');

const near = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);

const problem = { id: 'x', voice: 'cliente', focus: 'C', size: 1 };
const state = (over = {}) => ({ meters: { C: 60, P: 60, E: 60 }, oi: 15, rescued: false, flags: {}, ...over });
const option = (a, line = 'sales', k = 1) => ({ a, line, k });

test('there are four answer characters', () => {
  assert.deepEqual([...IDS].sort(), ['ign', 'plac', 'smart', 'temp']);
  assert.ok(Object.isFrozen(ARCHETYPES));
});

test('smart: a little OI, lifts the focus meter, sides barely move', () => {
  const e = effectOf(problem, option('smart'), state());
  near(e.oi, 0.1);
  near(e.meters.C, 3.5);
  near(e.meters.P, 0.4);
  near(e.meters.E, 0.4);
  assert.equal(e.delayed, null);
});

test('temp: pays OI now and bills the meters, half now and half two months later', () => {
  const e = effectOf(problem, option('temp'), state());
  near(e.oi, 0.6);
  near(e.meters.C, -2.75);
  near(e.meters.P, -0.375);
  near(e.delayed.C, -2.75);
  near(e.delayed.E, -0.375);
});

test('plac: costs OI, lifts the focus meter, the others slip', () => {
  const e = effectOf(problem, option('plac'), state());
  near(e.oi, -0.375);
  near(e.meters.C, 6.5);
  near(e.meters.P, -0.75);
  assert.equal(e.delayed, null);
});

test('ign: costs OI and drops the focus meter', () => {
  const e = effectOf(problem, option('ign'), state());
  near(e.oi, -0.45);
  near(e.meters.C, -4.5);
  near(e.meters.E, -0.75);
});

test('the focus meter is the one the problem puts at stake', () => {
  const plant = { id: 'p', voice: 'planta', focus: 'P', size: 1 };
  const e = effectOf(plant, option('plac'), state());
  near(e.meters.P, 6.5);
  near(e.meters.C, -0.75);
});

test('size and the option factor scale every effect', () => {
  const e = effectOf({ ...problem, size: 1.5 }, option('temp', 'sales', 2), state());
  near(e.oi, 0.6 * 3);
});

test('in crisis (focus meter below 32) a smart answer lifts the focus meter only 40%', () => {
  const e = effectOf(problem, option('smart'), state({ meters: { C: 30, P: 60, E: 60 } }));
  near(e.meters.C, 3.5 * 0.4);
  assert.ok(e.notes.includes('crisis'));
  const placate = effectOf(problem, option('plac'), state({ meters: { C: 30, P: 60, E: 60 } }));
  near(placate.meters.C, 6.5);
});

test('in a rescue, smart answers earn 5x OI while OI is below 15', () => {
  const low = effectOf(problem, option('smart'), state({ rescued: true, oi: 6 }));
  near(low.oi, 0.5);
  assert.ok(low.notes.includes('recovery'));
  const healthy = effectOf(problem, option('smart'), state({ rescued: true, oi: 15 }));
  near(healthy.oi, 0.1);
});

test('with value measured, smart answers to client problems add 0.2 OI and 2 to the meter', () => {
  const e = effectOf(problem, option('smart'), state({ flags: { valueMeasured: true } }));
  near(e.oi, 0.3);
  near(e.meters.C, 5.5);
  assert.ok(e.notes.includes('value'));
  const plant = { id: 'p', voice: 'planta', focus: 'P', size: 1 };
  near(effectOf(plant, option('smart'), state({ flags: { valueMeasured: true } })).oi, 0.1);
});

test('the effect moves the stated P&L line by exactly the OI points', () => {
  const e = effectOf(problem, option('temp', 'sales'), state());
  assert.deepEqual(e.ops, [{ op: 'oi', line: 'sales', pts: 0.6 }]);
  const cost = effectOf(problem, option('plac', 'incentives'), state());
  assert.deepEqual(cost.ops, [{ op: 'oi', line: 'incentives', pts: -0.375 }]);
});
