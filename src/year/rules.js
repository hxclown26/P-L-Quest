'use strict';

// The rules of the 12-month year. Three meters (Cliente, Planta, Estrategia) sit next to OI: they decay
// every month and drag OI when low. A meter that reaches zero is a blow, not an ending: the biggest client
// leaves, the plant stops, the market stops respecting the price, and the P&L takes it. What ends a company is
// the P&L, in three steps: an alert (OI under the plan), a crisis (OI at zero: the gross profit no longer covers
// the SG&A), which brings a one-time restructuring plan, and bankruptcy (the gross profit covers 70% of the SG&A
// or less at two month closes in a row). The numbers were fitted on thousands of simulated years:
// tests/year-balance.test.js keeps them honest.
//
// The half year (6 months) is the same year at double speed: `pace` is 2 and every monthly
// effect is twice as big, so the grades and the rest of the numbers keep their meaning.

const { BASE_PL, operatingMargin, coverage } = require('../model');
const { deepFreeze } = require('../freeze');

const PLAN_OI = 15;
const START_PL = BASE_PL;
const START_METERS = Object.freeze({ C: 60, P: 60, E: 60 });
const METER_KEYS = Object.freeze(['C', 'P', 'E']);
// The line each meter hits when it is unhealthy...
const METER_LINE = Object.freeze({ C: 'incentives', P: 'cost', E: 'sales' });
// ...and the line it helps when it is strong. A loyal client sells more; it does not cut the
// incentives, which are a small line and cannot fall below zero.
const METER_BONUS_LINE = Object.freeze({ C: 'sales', P: 'cost', E: 'sales' });

const DECAY = 1.8;
const DRAG_BELOW = 42;
const DRAG_RATE = 0.015;
const BONUS_ABOVE = 70;
const BONUS_RATE = 0.01;
const FLYWHEEL = 60;
const FLYWHEEL_BONUS = 0.08;
const CRISIS = 32;
const CRISIS_FACTOR = 0.4;

// What a meter at zero costs: the P&L takes a structural blow (it stays, it is not a one-off), and the meter restarts
// where the unit still has something left to defend.
const SHOCK_METER = 35;
// The next blow of the same meter is this share of the one before: the second client to leave is a smaller one.
const SHOCK_FADE = 0.6;
const SHOCKS = deepFreeze({
  C: { ops: [{ op: 'volume', pct: -16 }] },
  P: { ops: [{ op: 'oi', line: 'sales', pts: -4 }, { op: 'oi', line: 'cost', pts: -2 }] },
  E: { ops: [{ op: 'price', pct: -6 }] },
});

// The ladder. A crisis is OI at zero or less; bankruptcy is a gross profit that covers 70% of the SG&A or less (a
// gross margin near 10% when the SG&A is 16) at two month closes in a row.
const BANKRUPT_COVERAGE = 0.7;
const BANKRUPT_CLOSES = 2;
const EPSILON = 1e-9;

// The restructuring plan the board imposes at the first crisis: a share of the SG&A and of the cost goes, and the
// disruption shakes every meter. It keeps the P&L the unit had: nobody injects capital.
const RESTRUCTURING = deepFreeze({ sga: 0.15, cost: 0.02, meters: 5 });
const RESCUE_LAST_MONTH = 9;
const RESCUE_GOAL = 10;
const RECOVERY_K = 5;
const RECOVERY_UNTIL = 15;

const OUTCOMES = Object.freeze(['excellent', 'good', 'fair', 'bad', 'terrible', 'bankrupt']);
// [outcome, minimum OI, minimum weakest meter]; anything below the last row is "terrible".
const GRADES = Object.freeze([
  Object.freeze(['excellent', 21.5, 55]),
  Object.freeze(['good', 17, 45]),
  Object.freeze(['fair', 13, 36]),
  Object.freeze(['bad', 8, 24]),
]);

const clampMeter = (value) => Math.max(0, Math.min(100, value));

// Meters decay each month; unhealthy ones drag OI, strong ones lift it, and all three
// healthy at once start a virtuous circle. Adjustments are computed before the decay.
function monthEnd(meters, pace = 1) {
  const adjustments = METER_KEYS.flatMap((key) => {
    const value = meters[key];
    if (value < DRAG_BELOW) return [{ line: METER_LINE[key], pts: -(DRAG_BELOW - value) * DRAG_RATE * pace, because: key }];
    if (value > BONUS_ABOVE) return [{ line: METER_BONUS_LINE[key], pts: (value - BONUS_ABOVE) * BONUS_RATE * pace, because: key }];
    return [];
  });
  const circle = METER_KEYS.every((key) => meters[key] >= FLYWHEEL)
    ? [{ line: 'sales', pts: FLYWHEEL_BONUS * pace, because: 'fly' }]
    : [];
  return {
    meters: Object.fromEntries(METER_KEYS.map((key) => [key, clampMeter(meters[key] - DECAY * pace)])),
    adjustments: [...adjustments, ...circle],
  };
}

const gradeIndex = (value, column) => {
  const found = GRADES.findIndex((grade) => value >= grade[column]);
  return found === -1 ? GRADES.length : found;
};

// The lower of the OI grade and the weakest-meter grade. A restructuring plan caps the result at "fair" (it leaves
// a scar) and a red line, a breach of the rules, at "bad": no result buys that back.
function classify(oi, meters, restructured, redLines = 0) {
  const weakestValue = Math.min(...METER_KEYS.map((key) => meters[key]));
  const index = Math.max(gradeIndex(oi, 1), gradeIndex(weakestValue, 2));
  const scar = restructured ? OUTCOMES.indexOf('fair') : 0;
  const breach = redLines > 0 ? OUTCOMES.indexOf('bad') : 0;
  return OUTCOMES[Math.max(index, scar, breach)];
}

// The blow of a meter that has already hit zero `previous` times, as operations on the P&L.
const shockOps = (key, previous) => SHOCKS[key].ops.map((op) => {
  const scale = SHOCK_FADE ** previous;
  return op.op === 'oi' ? { ...op, pts: op.pts * scale } : { ...op, pct: op.pct * scale };
});

// The first meter at zero (or below), in the order client, plant, strategy; null when none is.
const zeroMeter = (meters) => METER_KEYS.find((key) => meters[key] <= 0) || null;

const inCrisis = (oi) => oi <= 0;
const distressed = (pl) => coverage(pl) <= BANKRUPT_COVERAGE + EPSILON;

// What the board does to a P&L in crisis, as operations on it.
const restructureOps = (pl) => [
  { op: 'oi', line: 'sga', pts: pl.sga * RESTRUCTURING.sga },
  { op: 'oi', line: 'cost', pts: pl.cost * RESTRUCTURING.cost },
];

const canRescue = (month, alreadyRescued, pace = 1) => !alreadyRescued && month <= Math.floor(RESCUE_LAST_MONTH / pace);

const weakest = (meters) => METER_KEYS.reduce((low, key) => (meters[key] < meters[low] ? key : low), 'C');

module.exports = {
  PLAN_OI,
  START_PL,
  START_METERS,
  METER_KEYS,
  METER_LINE,
  METER_BONUS_LINE,
  DECAY,
  DRAG_BELOW,
  BONUS_ABOVE,
  FLYWHEEL,
  CRISIS,
  CRISIS_FACTOR,
  SHOCK_METER,
  SHOCK_FADE,
  SHOCKS,
  shockOps,
  BANKRUPT_COVERAGE,
  BANKRUPT_CLOSES,
  RESTRUCTURING,
  RESCUE_LAST_MONTH,
  RESCUE_GOAL,
  RECOVERY_K,
  RECOVERY_UNTIL,
  OUTCOMES,
  GRADES,
  clampMeter,
  monthEnd,
  classify,
  zeroMeter,
  inCrisis,
  distressed,
  restructureOps,
  canRescue,
  weakest,
  operatingMargin,
};
