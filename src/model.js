'use strict';

// The P&L model. Amounts are "points per 100 of plan net sales": the plan has sales 102 and
// incentives 2, so net sales start at 100. The numbers the game plays for are ratios: every line
// divided by the current net sales, in percent, so "OI 15" is a 15% margin and moves with the net
// sales it is measured against.
// All functions are pure: they return new objects and never touch their input.

// Freight and direct charges, the cost of serving the client, follow the volume only in part.
const SERVE_VARIABLE_SHARE = 0.6;
const DEDUCTION_LINES = Object.freeze(['incentives', 'cost', 'freight', 'direct', 'sga']);

const BASE_PL = Object.freeze({
  sales: 102,
  incentives: 2,
  cost: 55,
  freight: 8,
  direct: 6,
  sga: 16,
});

const netSales = (pl) => pl.sales - pl.incentives;
const contributionMargin = (pl) => netSales(pl) - pl.cost;
const grossProfit = (pl) => contributionMargin(pl) - pl.freight - pl.direct;
const operatingIncome = (pl) => grossProfit(pl) - pl.sga;

// A line as a percentage of net sales (0 when there are none, instead of dividing by zero).
const ratioOf = (pl, amount) => (netSales(pl) > 0 ? (100 * amount) / netSales(pl) : 0);
const operatingMargin = (pl) => ratioOf(pl, operatingIncome(pl));

function assertNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
}

// Price moves sales and the rebates that are a percentage of sales; cost does not follow.
function scalePrice(pl, pct) {
  assertNumber(pct, 'pct');
  const k = 1 + pct / 100;
  return { ...pl, sales: pl.sales * k, incentives: pl.incentives * k };
}

// Volume moves every variable line. SG&A is fixed, so it does not scale with volume.
function scaleVolume(pl, pct) {
  assertNumber(pct, 'pct');
  if (pct <= -100) throw new Error(`Invalid pct: ${pct}`);
  const k = 1 + pct / 100;
  const delivery = 1 + (k - 1) * SERVE_VARIABLE_SHARE;
  return {
    ...pl,
    sales: pl.sales * k,
    incentives: pl.incentives * k,
    cost: pl.cost * k,
    freight: pl.freight * delivery,
    direct: pl.direct * delivery,
  };
}

function addToLine(pl, line, pts) {
  if (!DEDUCTION_LINES.includes(line)) throw new Error(`Invalid line: ${line}`);
  assertNumber(pts, 'pts');
  return { ...pl, [line]: pl[line] + pts };
}

// Moves OI by exactly `pts` through one line: more sales or a smaller deduction.
function moveOi(pl, line, pts) {
  assertNumber(pts, 'pts');
  if (line === 'sales') return { ...pl, sales: pl.sales + pts };
  if (!DEDUCTION_LINES.includes(line)) throw new Error(`Invalid line: ${line}`);
  return { ...pl, [line]: pl[line] - pts };
}

function applyOp(pl, op) {
  switch (op.op) {
    case 'price':
      return scalePrice(pl, op.pct);
    case 'volume':
      return scaleVolume(pl, op.pct);
    case 'add':
      return addToLine(pl, op.line, op.pts);
    case 'oi':
      return moveOi(pl, op.line, op.pts);
    default:
      throw new Error(`Unknown op: ${op.op}`);
  }
}

const applyOps = (pl, ops) => ops.reduce(applyOp, pl);

// Line amounts move in points; `oi` is the change of the OI margin, in percentage points.
const delta = (before, after) => ({
  sales: after.sales - before.sales,
  incentives: after.incentives - before.incentives,
  cost: after.cost - before.cost,
  freight: after.freight - before.freight,
  direct: after.direct - before.direct,
  sga: after.sga - before.sga,
  oi: operatingMargin(after) - operatingMargin(before),
});

module.exports = {
  BASE_PL,
  SERVE_VARIABLE_SHARE,
  DEDUCTION_LINES,
  netSales,
  contributionMargin,
  grossProfit,
  operatingIncome,
  operatingMargin,
  ratioOf,
  applyOp,
  applyOps,
  delta,
};
