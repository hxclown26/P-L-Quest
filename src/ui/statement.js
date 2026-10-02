'use strict';

// The P&L as a finance report lays it out: every line in money with its ratio (a percentage of
// the sales) on the row below, deductions as positive amounts, results as totals and negative
// numbers between brackets. Pure: it turns a P&L into rows and rows into text; nothing is drawn.

const { contributionMargin, grossProfit, operatingIncome, ratioOf } = require('../model');
const { num } = require('./tx');

// `good` is +1 when a bigger number is better for the business (sales, results) and -1 when it is
// worse (a deduction), so a change can be coloured without knowing which line it is.
const LINES = Object.freeze([
  { id: 'sales', kind: 'total', good: 1, ratio: false, amount: (pl) => pl.sales },
  { id: 'incentives', kind: 'line', good: -1, ratio: false, amount: (pl) => pl.incentives },
  { id: 'cost', kind: 'line', good: -1, ratio: true, amount: (pl) => pl.cost },
  { id: 'cm', kind: 'total', good: 1, ratio: true, amount: contributionMargin },
  { id: 'serve', kind: 'line', good: -1, ratio: true, amount: (pl) => pl.serve },
  { id: 'gp', kind: 'total', good: 1, ratio: true, amount: grossProfit },
  { id: 'sga', kind: 'line', good: -1, ratio: true, amount: (pl) => pl.sga },
  { id: 'oi', kind: 'total', good: 1, ratio: true, amount: operatingIncome },
]);

const moneyRow = (spec, pl) =>
  Object.freeze({ id: spec.id, kind: spec.kind, unit: 'money', good: spec.good, value: spec.amount(pl) });

const ratioRow = (spec, pl) =>
  Object.freeze({
    id: `${spec.id}.ratio`,
    kind: 'ratio',
    unit: 'pct',
    good: spec.good,
    of: spec.id,
    value: ratioOf(pl, spec.amount(pl)),
  });

function statementRows(pl) {
  return Object.freeze(LINES.flatMap((spec) => (spec.ratio ? [moneyRow(spec, pl), ratioRow(spec, pl)] : [moneyRow(spec, pl)])));
}

// The statement shows one decimal, so a number "moved" only when what is printed changes. Halves
// round away from zero on both sides of zero, like the decimal text does.
const printed = (row) => Math.sign(row.value) * Math.round(Math.abs(row.value) * 10);

function rowChanges(before, after) {
  const was = statementRows(before);
  return statementRows(after).flatMap((row, i) => {
    const moved = printed(row) - printed(was[i]);
    return moved === 0 ? [] : [{ id: row.id, dir: Math.sign(moved) * row.good }];
  });
}

const isNegative = (row) => printed(row) < 0;

// "100,0", "53,0%" and, for a loss, "(5,0)": brackets instead of a minus sign, as in a report.
function cellText(app, row) {
  const body = `${num(app, Math.abs(printed(row) / 10))}${row.unit === 'pct' ? '%' : ''}`;
  return isNegative(row) ? `(${body})` : body;
}

const isFocused = (row, line) => line !== null && (row.id === line || row.of === line);

// One row of the report that sets the real year against the plan. The variance is read the way a
// report reads it: positive when it is good for the business, whichever way the number moved, and
// computed on the numbers that are printed, so plan and variance always add up to the real.
function reportRows(plan, real) {
  const planned = statementRows(plan);
  return Object.freeze(statementRows(real).map((row, i) => {
    const tenths = (printed(row) - printed(planned[i])) * row.good || 0;
    return Object.freeze({
      id: row.id,
      kind: row.kind,
      unit: row.unit,
      plan: planned[i],
      real: row,
      variance: tenths / 10,
      favorable: Math.sign(tenths),
    });
  }));
}

// "3,2" when the variance helps, "(1,7)" when it hurts, and in points ("0,4pp") for a ratio.
function varianceText(app, row) {
  const body = `${num(app, Math.abs(row.variance))}${row.unit === 'pct' ? 'pp' : ''}`;
  return row.variance < 0 ? `(${body})` : body;
}

module.exports = { statementRows, rowChanges, cellText, isNegative, isFocused, reportRows, varianceText };
