'use strict';

// A year is fully decided by its game code and the answers picked, in order: nothing else is
// random. So a list of answers can be replayed into the very same year, which is what lets a
// short result code carry a whole game and the ranking compare teams that never met.

const engine = require('./engine');
const rules = require('./rules');
const { ARCHETYPES } = require('./archetypes');
const { PROBLEMS } = require('./problems');
const { PROFILES, simulate } = require('./simulate');
const { buildSchedule } = require('./schedule');
const { BASE_PL, SERVE_VARIABLE_SHARE } = require('../model');

const ANSWERS = 4;
const FINGERPRINT_CODE = 1234;

const isAnswer = (value) => Number.isInteger(value) && value >= 0 && value < ANSWERS;

// The answer picked at each problem, as the position it had on screen (0-3).
const decisionsOf = (run) => run.history.map((entry) => entry.optionIndex);

// Plays the decisions on the year of `code`. `complete` is true when the year reached its
// verdict using every decision: no fewer (it would be unfinished) and no more.
function replay(code, choices) {
  if (!choices.every(isAnswer)) throw new Error('Invalid decision in the list');
  let run = engine.newYear(code);
  let used = 0;
  while (run.phase !== 'final') {
    if (run.phase !== 'problem') {
      run = engine.next(run);
    } else if (used < choices.length) {
      run = engine.choose(run, choices[used]);
      used += 1;
    } else {
      return { run, complete: false };
    }
  }
  return { run, complete: used === choices.length };
}

const hash32 = (text) => [...text].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);

const trail = (run) => [
  run.outcome,
  engine.oiOf(run).toFixed(4),
  ...rules.METER_KEYS.map((key) => run.meters[key].toFixed(3)),
  run.history.length,
  run.rescueMonth,
  run.bankruptMonth,
].join(',');

// The numbers a year runs on: the problems, what each kind of answer does, the base P&L and the
// constants of the rules.
const RULE_NAMES = Object.freeze([
  'PLAN_OI', 'START_METERS', 'METER_LINE', 'METER_BONUS_LINE', 'DECAY', 'DRAG_BELOW', 'BONUS_ABOVE', 'FLYWHEEL', 'CRISIS', 'CRISIS_FACTOR',
  'RESCUE_PL', 'RESCUE_METER', 'RESCUE_LAST_MONTH', 'RESCUE_GOAL', 'RECOVERY_K', 'RECOVERY_UNTIL', 'OUTCOMES', 'GRADES',
]);

const currentParts = () => ({
  problems: PROBLEMS,
  archetypes: ARCHETYPES,
  base: { ...BASE_PL, serveShare: SERVE_VARIABLE_SHARE },
  rules: Object.fromEntries(RULE_NAMES.map((name) => [name, rules[name]])),
});

// One byte that changes whenever the rules, the problems or the shuffling change. It hashes the
// data above, the order of a fixed year and how two canned players (a good and a reckless one) fare
// in it, so a change in either the numbers or the logic shows. Codes carry it, so a result made
// with another build is recognised instead of misread.
function fingerprintFor(parts) {
  const schedule = buildSchedule(FINGERPRINT_CODE);
  const years = ['expert', 'short'].map((name) => simulate(PROFILES[name], FINGERPRINT_CODE, engine.newYear(FINGERPRINT_CODE)));
  const text = [
    JSON.stringify(parts),
    schedule.order.join(),
    schedule.perms.map((perm) => perm.join('')).join(),
    ...years.map(trail),
  ].join('|');
  const h = hash32(text);
  return (h ^ (h >>> 8) ^ (h >>> 16) ^ (h >>> 24)) & 0xff;
}

const FINGERPRINT = fingerprintFor(currentParts());
const fingerprint = () => FINGERPRINT;

module.exports = { ANSWERS, isAnswer, decisionsOf, replay, fingerprint, fingerprintFor, currentParts };
