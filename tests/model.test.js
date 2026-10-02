'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/model');

const near = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);

test('the base P&L cascades from sales 102 and incentives 2 to net sales 100 and OI 15', () => {
  near(model.netSales(model.BASE_PL), 100);
  near(model.contributionMargin(model.BASE_PL), 45);
  near(model.grossProfit(model.BASE_PL), 31);
  near(model.operatingIncome(model.BASE_PL), 15);
});

test('net sales are the sales less the incentives, whatever moves either of them', () => {
  near(model.netSales({ ...model.BASE_PL, sales: 110, incentives: 5 }), 105);
  near(model.netSales(model.applyOp(model.BASE_PL, { op: 'add', line: 'incentives', pts: 3 })), 97);
  near(model.netSales(model.applyOp(model.BASE_PL, { op: 'price', pct: 10 })), 110);
});

test('freight and direct charges are two lines that together keep the 14 of the cost to serve', () => {
  assert.equal(model.BASE_PL.freight + model.BASE_PL.direct, 14);
  assert.ok(!('serve' in model.BASE_PL), 'there is no single cost-to-serve line any more');
  assert.deepEqual([...model.DEDUCTION_LINES], ['incentives', 'cost', 'freight', 'direct', 'sga']);
  near(model.grossProfit(model.BASE_PL), 31);
  const leaner = model.applyOp(model.BASE_PL, { op: 'oi', line: 'direct', pts: 0.5 });
  near(leaner.direct, 5.5);
  near(model.operatingIncome(leaner), 15.5);
});

test('BASE_PL is frozen so no card can mutate it', () => {
  assert.ok(Object.isFrozen(model.BASE_PL));
});

test('add op moves only the target line and leaves the input untouched', () => {
  const after = model.applyOp(model.BASE_PL, { op: 'add', line: 'incentives', pts: 3 });
  assert.equal(after.incentives, 5);
  assert.equal(after.cost, model.BASE_PL.cost);
  assert.equal(model.BASE_PL.incentives, 2);
  assert.notEqual(after, model.BASE_PL);
  near(model.operatingIncome(after), 12);
});

test('price op scales sales and incentives, never cost or SG&A', () => {
  const after = model.applyOp(model.BASE_PL, { op: 'price', pct: 3 });
  near(after.sales, 102 * 1.03);
  near(after.incentives, 2.06);
  assert.equal(after.cost, 55);
  assert.equal(after.freight, 8);
  assert.equal(after.direct, 6);
  assert.equal(after.sga, 16);
  // A price point is worth a point of net sales, and all of it goes to OI.
  near(model.operatingIncome(after), 18);
});

test('volume op scales variable lines and keeps SG&A fixed', () => {
  const after = model.applyOp(model.BASE_PL, { op: 'volume', pct: -5 });
  near(after.sales, 102 * 0.95);
  near(after.incentives, 1.9);
  near(after.cost, 55 * 0.95);
  near(after.freight, 8 * (1 - 0.05 * model.SERVE_VARIABLE_SHARE));
  near(after.direct, 6 * (1 - 0.05 * model.SERVE_VARIABLE_SHARE));
  assert.equal(after.sga, 16);
  const variableMargin = model.netSales(model.BASE_PL) - model.BASE_PL.cost - 14 * model.SERVE_VARIABLE_SHARE; // freight 8 + direct charges 6
  near(model.operatingIncome(after) - 15, -0.05 * variableMargin);
});

test('a volume fall hurts OI because SG&A does not shrink with it', () => {
  const drop = model.applyOp(model.BASE_PL, { op: 'volume', pct: -8 });
  const oiLoss = model.operatingIncome(model.BASE_PL) - model.operatingIncome(drop);
  assert.ok(oiLoss > 2.5, `OI loss ${oiLoss} should exceed 2.5`);
  assert.ok(drop.sga / model.netSales(drop) > model.BASE_PL.sga / model.netSales(model.BASE_PL));
});

test('applyOps applies operations in order', () => {
  const after = model.applyOps(model.BASE_PL, [
    { op: 'add', line: 'cost', pts: 4 },
    { op: 'add', line: 'cost', pts: -1.5 },
  ]);
  near(after.cost, 57.5);
});

test('delta reports every line and OI', () => {
  const after = model.applyOp(model.BASE_PL, { op: 'add', line: 'freight', pts: 2 });
  const d = model.delta(model.BASE_PL, after);
  near(d.freight, 2);
  near(d.direct, 0);
  near(d.oi, -2);
  near(d.sales, 0);
});

test('invalid operations are rejected at the boundary', () => {
  assert.throws(() => model.applyOp(model.BASE_PL, { op: 'teleport' }), /Unknown op/);
  assert.throws(() => model.applyOp(model.BASE_PL, { op: 'add', line: 'sales', pts: 1 }), /line/);
  assert.throws(() => model.applyOp(model.BASE_PL, { op: 'add', line: 'cost', pts: Number.NaN }), /pts/);
  assert.throws(() => model.applyOp(model.BASE_PL, { op: 'price', pct: 'x' }), /pct/);
  assert.throws(() => model.applyOp(model.BASE_PL, { op: 'volume', pct: -100 }), /pct/);
});

test('oi op moves OI by the stated points through the chosen line', () => {
  const lessIncentive = model.applyOp(model.BASE_PL, { op: 'oi', line: 'incentives', pts: 0.4 });
  near(lessIncentive.incentives, 1.6);
  near(model.operatingIncome(lessIncentive), 15.4);
  const lessSales = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: -0.5 });
  near(lessSales.sales, 101.5);
  near(model.operatingIncome(lessSales), 14.5);
  assert.throws(() => model.applyOp(model.BASE_PL, { op: 'oi', line: 'margin', pts: 1 }), /line/);
  assert.throws(() => model.applyOp(model.BASE_PL, { op: 'oi', line: 'cost', pts: 'x' }), /pts/);
});

test('every ratio is a line divided by the current net sales, so the base P&L reads 15%', () => {
  const base = model.BASE_PL;
  near(model.operatingMargin(base), 15);
  near(model.ratioOf(base, base.cost), 55);
  near(model.ratioOf(base, model.contributionMargin(base)), 45);
  near(model.ratioOf(base, base.freight), 8);
  near(model.ratioOf(base, base.direct), 6);
  near(model.ratioOf(base, model.grossProfit(base)), 31);
  near(model.ratioOf(base, base.sga), 16);
});

test('the ratio base is the net sales: more incentives shrink it and thicken every ratio', () => {
  const generous = model.applyOp(model.BASE_PL, { op: 'add', line: 'incentives', pts: 3 });
  near(model.ratioOf(generous, generous.cost), (55 / 97) * 100);
  near(model.operatingMargin(generous), (12 / 97) * 100);
});

test('the margin follows the sales: the same OI is a thinner ratio on bigger sales', () => {
  const bigger = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: 10 });
  near(model.operatingIncome(bigger), 25);
  near(model.operatingMargin(bigger), (25 / 110) * 100);
  const smaller = model.applyOp(model.BASE_PL, { op: 'volume', pct: -8 });
  assert.ok(model.operatingMargin(smaller) < (model.operatingIncome(smaller) / 92) * 100 + 1e-9);
  near(model.operatingMargin(smaller), (model.operatingIncome(smaller) / model.netSales(smaller)) * 100);
});

test('a cost cut moves the margin by exactly its points when sales stay put', () => {
  const cheaper = model.applyOp(model.BASE_PL, { op: 'oi', line: 'cost', pts: 2 });
  near(model.operatingMargin(cheaper), 17);
});

test('ratios survive a P&L with no net sales instead of dividing by zero', () => {
  const empty = { ...model.BASE_PL, sales: 0 };
  assert.equal(model.operatingMargin(empty), 0);
  assert.equal(model.ratioOf(empty, 5), 0);
  const eaten = { ...model.BASE_PL, sales: model.BASE_PL.incentives };
  assert.equal(model.netSales(eaten), 0);
  assert.equal(model.ratioOf(eaten, 5), 0);
});

test('delta reports the OI change as margin points next to the line amounts', () => {
  const after = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: 10 });
  const d = model.delta(model.BASE_PL, after);
  near(d.sales, 10);
  near(d.oi, 25 / 110 * 100 - 15);
});
