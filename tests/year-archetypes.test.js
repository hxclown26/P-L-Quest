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

test('at double pace every effect doubles and a shortcut bills its second half a month later', () => {
  const { delayMonths } = require('../src/year/archetypes');
  for (const a of IDS) {
    const normal = effectOf(problem, option(a), state());
    const fast = effectOf(problem, option(a), state({ pace: 2 }));
    near(fast.oi, 2 * normal.oi);
    for (const key of ['C', 'P', 'E']) near(fast.meters[key], 2 * normal.meters[key]);
    if (normal.delayed) for (const key of ['C', 'P', 'E']) near(fast.delayed[key], 2 * normal.delayed[key]);
  }
  assert.equal(delayMonths(1), 2);
  assert.equal(delayMonths(2), 1);
});

test('the value-measured bonus doubles at double pace too', () => {
  const measured = state({ flags: { valueMeasured: true }, pace: 2 });
  const plain = state({ pace: 2 });
  near(effectOf(problem, option('smart'), measured).oi - effectOf(problem, option('smart'), plain).oi, 0.4);
});

// ---- Demo 6: an answer can touch two lines (a benefit and a cost), a growth answer is priced in price and volume,
// and a red line costs more than it earns

const mixed = (a, mix, over = {}) => ({ a, line: mix[0][0], mix, k: 1, ...over });
const sumOps = (ops) => ops.reduce((total, op) => total + op.pts, 0);

test('a mixed answer splits its OI over its lines by weight, and the parts add up to the OI of its kind', () => {
  const e = effectOf(problem, mixed('smart', [['sales', 1.5], ['incentives', -0.5]]), state());
  assert.equal(e.ops.length, 2);
  assert.deepEqual(e.ops.map((op) => op.line), ['sales', 'incentives']);
  near(e.ops[0].pts, 0.15);
  near(e.ops[1].pts, -0.05);
  near(sumOps(e.ops), e.oi);
  near(e.oi, 0.1);
});

test('a loss can be a lost sale softened by a saving: the parts still add up to the loss', () => {
  const e = effectOf(problem, mixed('ign', [['sales', 1.4], ['freight', -0.4]]), state());
  near(e.ops[0].pts, -0.63);
  near(e.ops[1].pts, 0.18);
  near(sumOps(e.ops), -0.45);
});

test('an answer written with a single line keeps working: all the OI goes through it', () => {
  const e = effectOf(problem, { a: 'smart', line: 'cost', k: 1 }, state());
  assert.deepEqual(e.ops, [{ op: 'oi', line: 'cost', pts: 0.1 }]);
});

const growth = (over = {}) => ({ a: 'smart', line: 'sales', k: 1, grow: { volume: 10, price: -2, adds: [['direct', 0.5]] }, ...over });

test('a growth answer is made of price, volume and extra service, not of an OI figure', () => {
  const e = effectOf({ ...problem, segment: 'industry' }, growth(), state());
  assert.equal(e.oi, null);
  assert.deepEqual(e.ops.map((op) => op.op), ['volume', 'price', 'add']);
  near(e.ops[0].pct, 10);
  near(e.ops[1].pct, -2);
  assert.deepEqual([e.ops[2].line, e.ops[2].pts], ['direct', 0.5]);
});

test('the service a segment asks for decides how much of freight and direct charges follows the volume', () => {
  const share = (segment) => effectOf({ ...problem, segment }, growth(), state()).ops[0].share;
  assert.ok(share('hospital') > share('industry'));
  assert.ok(share('industry') > share('hotel'));
  assert.ok(share('hospital') <= 1 && share('hotel') >= 0);
});

test('at double pace a growth answer weighs twice as much', () => {
  const e = effectOf({ ...problem, segment: 'food' }, growth(), state({ pace: 2 }));
  near(e.ops[0].pct, 20);
  near(e.ops[1].pct, -4);
  near(e.ops[2].pts, 1);
});

test('a growth answer weighs as much as the problem and the answer say: size and factor scale price, volume and service', () => {
  const e = effectOf({ ...problem, segment: 'food', size: 1.5 }, growth({ k: 2 }), state());
  near(e.ops[0].pct, 10 * 3);
  near(e.ops[1].pct, -2 * 3);
  near(e.ops[2].pts, 0.5 * 3);
});

test('a balanced growth answer still earns the value-measured and the recovery bonus, as plain OI on its line', () => {
  const food = { ...problem, segment: 'food' };
  const measured = effectOf(food, growth(), state({ flags: { valueMeasured: true } }));
  const bonus = measured.ops[measured.ops.length - 1];
  assert.deepEqual([bonus.op, bonus.line], ['oi', 'sales']);
  near(bonus.pts, 0.2);
  assert.ok(measured.notes.includes('value'));
  const rescued = effectOf(food, growth(), state({ rescued: true, oi: 6 }));
  near(rescued.ops[rescued.ops.length - 1].pts, 0.1 * 4);
  assert.ok(rescued.notes.includes('recovery'));
  assert.equal(effectOf(food, growth(), state()).ops.length, 3, 'nothing is added when neither bonus applies');
  assert.equal(effectOf(food, growth({ a: 'temp' }), state({ flags: { valueMeasured: true } })).ops.length, 3, 'only a balanced answer earns them');
});

test('a growth answer still moves the meters like its kind', () => {
  const e = effectOf({ ...problem, segment: 'food' }, growth({ a: 'plac' }), state());
  near(e.meters.C, 6.5);
  near(e.meters.P, -0.75);
});

test('a red line pays its gain, then a fine, and hits every meter now: nothing is left for later', () => {
  const plain = effectOf(problem, mixed('temp', [['sales', 1]]), state());
  const red = effectOf(problem, mixed('temp', [['sales', 1]], { redLine: true }), state());
  assert.equal(red.delayed, null, 'a fine is paid on the spot');
  assert.ok(red.notes.includes('redLine'));
  assert.deepEqual(red.ops[red.ops.length - 1].line, 'sga');
  assert.ok(red.ops[red.ops.length - 1].pts < 0, 'the fine is a cost');
  assert.ok(sumOps(red.ops) < 0, 'the fine takes back more than the gain');
  near(red.ops[0].pts, plain.ops[0].pts);
  for (const key of ['C', 'P', 'E']) assert.ok(red.meters[key] < plain.meters[key] + plain.delayed[key] - 5, `${key} takes a reputation hit`);
});
