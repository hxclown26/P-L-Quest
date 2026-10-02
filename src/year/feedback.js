'use strict';

// What the player sees when the year ends: the OI walk (plan to real) and a short coaching
// text computed from what they actually did. Both are pure and return keys + raw numbers;
// the UI formats and translates them.

const { operatingMargin } = require('../model');
const rules = require('./rules');
const { AUTHORING, PROBLEMS } = require('./problems');

const WALK_LINES = Object.freeze(['sales', 'incentives', 'cost', 'serve', 'sga']);
const MISTAKES = Object.freeze(['temp', 'plac', 'ign']);
const PATTERN_MIN = 3;
const CLEAN_MIN = 40;
const TIP_BELOW = 45;

const sum = (values) => values.reduce((total, value) => total + value, 0);

// The OI margin bridge: from the plan P&L to the final one, a line at a time in the order of
// the cascade. Each step swaps that line from its plan amount to its final amount and records
// how far the margin moved (in percentage points), so the steps add up exactly to the change.
function walk(run) {
  const plan = rules.START_PL;
  const { steps } = WALK_LINES.reduce((acc, id) => {
    const pl = { ...acc.pl, [id]: run.pl[id] };
    const margin = operatingMargin(pl);
    return { pl, margin, steps: [...acc.steps, { id, pts: margin - acc.margin }] };
  }, { pl: plan, margin: operatingMargin(plan), steps: [] });
  return { start: rules.PLAN_OI, steps, end: operatingMargin(run.pl) };
}

const countAnswers = (run) =>
  Object.fromEntries(AUTHORING.map((a) => [a, run.history.filter((h) => h.a === a).length]));

// The shortcut whose hidden bill (meter damage, now and later) was the biggest.
function costliestShortcut(run) {
  const bill = (h) => -sum(rules.METER_KEYS.map((k) => Math.min(0, h.delta[k]) + Math.min(0, h.delayed ? h.delayed[k] : 0)));
  return run.history
    .filter((h) => h.a === 'temp')
    .reduce((worst, h) => (worst === null || bill(h) > bill(worst) ? h : worst), null);
}

const focusOf = (problemId) => PROBLEMS.find((p) => p.id === problemId).focus;

function patternLine(run, counts) {
  const dominant = MISTAKES.reduce((best, a) => (counts[a] > counts[best] ? a : best), 'temp');
  if (counts.smart >= CLEAN_MIN) return { key: 'year.fb.clean', params: { n: counts.smart } };
  if (counts[dominant] < PATTERN_MIN) return { key: 'year.fb.mixed', params: { n: counts.smart } };
  if (dominant === 'temp') {
    const worst = costliestShortcut(run);
    return {
      key: 'year.fb.temp',
      params: { n: counts.temp, problem: worst.problemId, month: worst.monthIdx + 1, oiGain: worst.delta.oi, meter: focusOf(worst.problemId) },
    };
  }
  if (dominant === 'plac') {
    const oiLost = -sum(run.history.filter((h) => h.a === 'plac').map((h) => h.delta.oi));
    return { key: 'year.fb.plac', params: { n: counts.plac, oiLost } };
  }
  return { key: 'year.fb.ign', params: { n: counts.ign } };
}

function tipLine(run, weakestKey) {
  if (run.meters[weakestKey] < TIP_BELOW) return { key: `year.fb.tip.${weakestKey}`, params: {} };
  return { key: 'year.fb.tip.keep', params: {} };
}

function extraLine(run, oi) {
  if (run.rescued) {
    const reached = oi >= rules.RESCUE_GOAL;
    return { key: reached ? 'year.fb.rescued.yes' : 'year.fb.rescued.no', params: { month: run.rescueMonth, goal: rules.RESCUE_GOAL, oi } };
  }
  return { key: run.flags.valueMeasured ? 'year.fb.value' : 'year.fb.noValue', params: {} };
}

function feedback(run) {
  const oi = rules.operatingMargin(run.pl);
  const weakestKey = rules.weakest(run.meters);
  const counts = countAnswers(run);
  const summary = run.outcome === 'bankrupt'
    ? { key: 'year.fb.sum.bankrupt', params: { month: run.bankruptMonth, cause: run.bankruptCause } }
    : { key: `year.fb.sum.${run.outcome}`, params: { oi, meter: weakestKey, value: run.meters[weakestKey] } };
  return {
    outcome: run.outcome,
    counts,
    lines: [summary, patternLine(run, counts), tipLine(run, weakestKey), extraLine(run, oi)],
  };
}

module.exports = { walk, feedback, countAnswers, WALK_LINES };
