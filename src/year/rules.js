'use strict';

// The rules of the 12-month year. Three meters (Cliente, Planta, Estrategia) sit next to
// OI: they decay every month, drag OI when low, and any of them reaching zero ends the
// company unless a one-time rescue plan is still possible. The numbers were fitted on
// thousands of simulated years: tests/year-balance.test.js keeps them honest.

const { BASE_PL, operatingMargin } = require('../model');

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

// A stressed P&L with OI 2: 100 - 3 - 56 - 17 - 22.
const RESCUE_PL = Object.freeze({ sales: 100, incentives: 3, cost: 56, serve: 17, sga: 22 });
const RESCUE_METER = 38;
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
function monthEnd(meters) {
  const adjustments = METER_KEYS.flatMap((key) => {
    const value = meters[key];
    if (value < DRAG_BELOW) return [{ line: METER_LINE[key], pts: -(DRAG_BELOW - value) * DRAG_RATE, because: key }];
    if (value > BONUS_ABOVE) return [{ line: METER_BONUS_LINE[key], pts: (value - BONUS_ABOVE) * BONUS_RATE, because: key }];
    return [];
  });
  const circle = METER_KEYS.every((key) => meters[key] >= FLYWHEEL)
    ? [{ line: 'sales', pts: FLYWHEEL_BONUS, because: 'fly' }]
    : [];
  return {
    meters: Object.fromEntries(METER_KEYS.map((key) => [key, clampMeter(meters[key] - DECAY)])),
    adjustments: [...adjustments, ...circle],
  };
}

const gradeIndex = (value, column) => {
  const found = GRADES.findIndex((grade) => value >= grade[column]);
  return found === -1 ? GRADES.length : found;
};

// The lower of the OI grade and the weakest-meter grade; a rescue caps the result at "fair".
function classify(oi, meters, rescued) {
  const weakestValue = Math.min(...METER_KEYS.map((key) => meters[key]));
  const index = Math.max(gradeIndex(oi, 1), gradeIndex(weakestValue, 2));
  return OUTCOMES[rescued ? Math.max(index, OUTCOMES.indexOf('fair')) : index];
}

const isZero = (oi, meters) => oi <= 0 || METER_KEYS.some((key) => meters[key] <= 0);

// What reached zero: 'oi' or the first meter at zero.
const zeroCause = (oi, meters) => (oi <= 0 ? 'oi' : METER_KEYS.find((key) => meters[key] <= 0) || 'oi');

const rescueState = (meters) => ({
  pl: RESCUE_PL,
  meters: Object.fromEntries(METER_KEYS.map((key) => [key, Math.max(meters[key], RESCUE_METER)])),
});

const canRescue = (month, alreadyRescued) => !alreadyRescued && month <= RESCUE_LAST_MONTH;

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
  RESCUE_PL,
  RESCUE_METER,
  RESCUE_LAST_MONTH,
  RESCUE_GOAL,
  RECOVERY_K,
  RECOVERY_UNTIL,
  OUTCOMES,
  GRADES,
  clampMeter,
  monthEnd,
  classify,
  isZero,
  zeroCause,
  rescueState,
  canRescue,
  weakest,
  operatingMargin,
};
