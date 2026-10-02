'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const statement = require('../src/ui/statement');
const model = require('../src/model');

const near = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);
const byId = (pl) => Object.fromEntries(statement.statementRows(pl).map((row) => [row.id, row]));
const es = { lang: 'es' };
const en = { lang: 'en' };

test('the statement lists every line in money, with the ratio under the lines that have one', () => {
  const rows = statement.statementRows(model.BASE_PL);
  assert.deepEqual(rows.map((r) => r.id), [
    'sales', 'incentives', 'cost', 'cost.ratio', 'cm', 'cm.ratio', 'serve', 'serve.ratio',
    'gp', 'gp.ratio', 'sga', 'sga.ratio', 'oi', 'oi.ratio',
  ]);
  assert.deepEqual(rows.map((r) => r.value), [100, 2, 53, 53, 45, 45, 14, 14, 31, 31, 16, 16, 15, 15]);
});

test('results are totals, deductions are plain lines and ratios hang from their line', () => {
  const rows = byId(model.BASE_PL);
  for (const id of ['sales', 'cm', 'gp', 'oi']) assert.equal(rows[id].kind, 'total', id);
  for (const id of ['incentives', 'cost', 'serve', 'sga']) assert.equal(rows[id].kind, 'line', id);
  for (const id of ['cost', 'cm', 'serve', 'gp', 'sga', 'oi']) {
    assert.equal(rows[`${id}.ratio`].kind, 'ratio', id);
    assert.equal(rows[`${id}.ratio`].of, id);
    assert.equal(rows[`${id}.ratio`].unit, 'pct');
    assert.equal(rows[id].unit, 'money');
  }
  assert.equal(rows['incentives.ratio'], undefined, 'incentives have no ratio row, like a sub-line of sales');
  assert.equal(rows['sales.ratio'], undefined, 'sales are the base of every ratio');
});

test('deductions are positive amounts and every result is the line above minus the deduction', () => {
  const pl = model.applyOp(model.BASE_PL, { op: 'add', line: 'cost', pts: 4 });
  const r = byId(pl);
  for (const id of ['incentives', 'cost', 'serve', 'sga']) assert.ok(r[id].value > 0, id);
  near(r.cm.value, r.sales.value - r.incentives.value - r.cost.value);
  near(r.gp.value, r.cm.value - r.serve.value);
  near(r.oi.value, r.gp.value - r.sga.value);
});

test('ratios are percentages of the current sales, so they move with the sales they are read against', () => {
  const bigger = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: 10 });
  const r = byId(bigger);
  near(r.sales.value, 110);
  near(r['cost.ratio'].value, (53 / 110) * 100);
  near(r['cm.ratio'].value, ((110 - 2 - 53) / 110) * 100);
  near(r['oi.ratio'].value, (25 / 110) * 100);
});

test('every ratio row equals its money row over the sales, whatever the P&L', () => {
  const pl = model.applyOp(model.BASE_PL, { op: 'volume', pct: -8 });
  const r = byId(pl);
  for (const id of ['cost', 'cm', 'serve', 'gp', 'sga', 'oi']) near(r[`${id}.ratio`].value, (100 * r[id].value) / r.sales.value, 1e-9);
});

test('a loss reads as a negative result and a negative ratio', () => {
  const loss = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: -20 });
  const r = byId(loss);
  assert.ok(r.oi.value < 0 && r['oi.ratio'].value < 0);
  assert.equal(statement.cellText(es, r.oi), '(5,0)');
  assert.equal(statement.cellText(es, r['oi.ratio']), '(6,3%)');
});

test('rowChanges flags the rows whose printed number moved, ratios included, with their direction', () => {
  const after = model.applyOp(model.BASE_PL, { op: 'add', line: 'incentives', pts: 3 });
  const changes = Object.fromEntries(statement.rowChanges(model.BASE_PL, after).map((c) => [c.id, c.dir]));
  assert.equal(changes.incentives, -1, 'a bigger deduction is worse');
  for (const id of ['cm', 'cm.ratio', 'gp', 'gp.ratio', 'oi', 'oi.ratio']) assert.equal(changes[id], -1, id);
  assert.equal(changes.cost, undefined, 'a line that did not move is not flagged');
  assert.deepEqual(statement.rowChanges(model.BASE_PL, model.BASE_PL), []);
});

test('a smaller deduction or a bigger result is an improvement', () => {
  const cheaper = model.applyOp(model.BASE_PL, { op: 'add', line: 'cost', pts: -3 });
  const changes = Object.fromEntries(statement.rowChanges(model.BASE_PL, cheaper).map((c) => [c.id, c.dir]));
  assert.equal(changes.cost, 1);
  assert.equal(changes['cost.ratio'], 1);
  assert.equal(changes.oi, 1);
  assert.equal(changes['oi.ratio'], 1);
});

test('rowChanges flags a row only when the number you read changes', () => {
  const tiny = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: 0.01 });
  assert.deepEqual(statement.rowChanges(model.BASE_PL, tiny), [], 'a move below one decimal is not on screen');
  const sales = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: 5 });
  const ids = statement.rowChanges(model.BASE_PL, sales).map((c) => c.id);
  assert.ok(ids.includes('sales') && ids.includes('oi'));
  assert.ok(ids.includes('cost.ratio'), 'more sales dilute the cost ratio, and it shows');
});

test('cellText prints one decimal, the language decimal mark and brackets for negatives', () => {
  const r = byId(model.BASE_PL);
  assert.equal(statement.cellText(es, r.sales), '100,0');
  assert.equal(statement.cellText(en, r.sales), '100.0');
  assert.equal(statement.cellText(es, r['cost.ratio']), '53,0%');
  assert.equal(statement.cellText(en, r['oi.ratio']), '15.0%');
  assert.equal(statement.cellText(es, { value: -2.04, unit: 'money' }), '(2,0)');
  assert.equal(statement.cellText(en, { value: -3.46, unit: 'pct' }), '(3.5%)');
});

test('a value that rounds to zero is printed as zero, never as (0,0)', () => {
  assert.equal(statement.cellText(es, { value: -0.04, unit: 'money' }), '0,0');
  assert.equal(statement.cellText(es, { value: -0.04, unit: 'pct' }), '0,0%');
  assert.equal(statement.isNegative({ value: -0.04, unit: 'money' }), false);
  assert.equal(statement.isNegative({ value: -0.06, unit: 'money' }), true);
});

test('isFocused marks the line an answer moves and the ratio under it', () => {
  const [sales, incentives, cost, costRatio, cm] = statement.statementRows(model.BASE_PL);
  assert.equal(statement.isFocused(cost, 'cost'), true);
  assert.equal(statement.isFocused(costRatio, 'cost'), true);
  assert.equal(statement.isFocused(cm, 'cost'), false);
  assert.equal(statement.isFocused(sales, 'sales'), true);
  assert.equal(statement.isFocused(incentives, 'cost'), false);
  assert.equal(statement.isFocused(cost, null), false);
});

test('the rows are frozen so a screen cannot change the statement it draws', () => {
  const rows = statement.statementRows(model.BASE_PL);
  assert.ok(Object.isFrozen(rows) && rows.every((row) => Object.isFrozen(row)));
});

// ---- the report: plan, real and variance

const asReport = (plan, real) => Object.fromEntries(statement.reportRows(plan, real).map((row) => [row.id, row]));

test('a year that ends on plan has no variance anywhere', () => {
  const rows = statement.reportRows(model.BASE_PL, model.BASE_PL);
  assert.equal(rows.length, 14);
  for (const row of rows) {
    assert.equal(row.variance, 0, row.id);
    assert.equal(row.favorable, 0, row.id);
  }
});

test('the variance is read as a report reads it: positive is good for the business', () => {
  const costlier = model.applyOp(model.BASE_PL, { op: 'add', line: 'cost', pts: 4 });
  const r = asReport(model.BASE_PL, costlier);
  assert.equal(r.cost.variance, -4, 'a bigger cost is an unfavorable variance');
  assert.equal(r.cost.favorable, -1);
  assert.equal(r.cm.variance, -4, 'and it takes the same amount from the result');
  assert.equal(r.oi.favorable, -1);
  assert.ok(r['oi.ratio'].variance < 0, 'the OI margin falls');
  const sales = asReport(model.BASE_PL, model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: 5 }));
  assert.equal(sales.sales.variance, 5);
  assert.equal(sales.sales.favorable, 1);
  const cheaper = asReport(model.BASE_PL, model.applyOp(model.BASE_PL, { op: 'add', line: 'sga', pts: -2 }));
  assert.equal(cheaper.sga.variance, 2, 'a smaller deduction is favorable');
});

test('the variance is the difference of the numbers you read, so the report foots', () => {
  const real = model.applyOp(model.applyOp(model.BASE_PL, { op: 'volume', pct: -7 }), { op: 'add', line: 'serve', pts: 1.37 });
  for (const row of statement.reportRows(model.BASE_PL, real)) {
    const shown = (cell) => Math.sign(cell.value) * Math.round(Math.abs(cell.value) * 10);
    const read = (shown(row.real) - shown(row.plan)) * row.real.good || 0;
    assert.equal(Math.round(row.variance * 10), read, row.id);
  }
});

test('varianceText prints a favorable number plain, an unfavorable one between brackets, ratios in points', () => {
  const costlier = model.applyOp(model.BASE_PL, { op: 'add', line: 'cost', pts: 4 });
  const r = asReport(model.BASE_PL, costlier);
  assert.equal(statement.varianceText(es, r.cost), '(4,0)');
  assert.equal(statement.varianceText(en, r.cost), '(4.0)');
  assert.equal(statement.varianceText(es, r['cost.ratio']), '(4,0pp)');
  const cheaper = asReport(model.BASE_PL, model.applyOp(model.BASE_PL, { op: 'add', line: 'sga', pts: -2 }));
  assert.equal(statement.varianceText(es, cheaper.sga), '2,0');
  assert.equal(statement.varianceText(es, cheaper['sga.ratio']), '2,0pp');
  assert.equal(statement.varianceText(es, asReport(model.BASE_PL, model.BASE_PL).oi), '0,0');
});

test('every report row carries the plan and the real row it compares', () => {
  const real = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: 3 });
  for (const row of statement.reportRows(model.BASE_PL, real)) {
    assert.equal(row.plan.id, row.id);
    assert.equal(row.real.id, row.id);
    assert.equal(row.plan.unit, row.real.unit);
  }
});
