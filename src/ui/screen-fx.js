'use strict';

// What the screen being shown adds on top of its numbers, read from the app state with the pure functions of
// fx.js: the plan of a result, of a month close, of the rescue plan and of the first page of the verdict, and
// the shake of the whole scene. The question and the other pages of the verdict stay as they are.

const engine = require('../year/engine');
const rules = require('../year/rules');
const fx = require('./fx');

const played = (app, phase) => app.scene === 'year' && !app.sim && app.year && app.year.phase === phase;

// The same answer to the same problem of the same game always gives the same number, so a result looks
// identical every time and a test can describe it.
function seedOf(run) {
  const { monthIdx, problemIdx, optionIndex } = run.last;
  return ((run.seed ?? 0) * 101 + (monthIdx * 4 + problemIdx) * 4 + optionIndex) | 0;
}

// The grade, mood, shake, flash and burst of the result on screen; null on any other screen.
function resultPlan(app) {
  if (!played(app, 'result')) return null;
  const seed = seedOf(app.year);
  const focus = engine.currentProblem(app.year).focus;
  return { ...fx.resultFeedback(app.year.last.delta, { pace: app.year.pace, calm: app.calm, seed, focus }), seed };
}

const sumMeters = (bills) => bills.reduce((sum, d) => ({ C: sum.C + d.meters.C, P: sum.P + d.meters.P, E: sum.E + d.meters.E }), { C: 0, P: 0, E: 0 });

// A month close hits as hard as the OI it moved and the bills of old shortcuts that fell due with it.
function closePlan(app) {
  if (!played(app, 'monthClose')) return null;
  const run = app.year;
  const { closes, lastClose } = run;
  const previous = closes.length > 1 ? closes[closes.length - 2].oi : rules.PLAN_OI;
  const seed = ((run.seed ?? 0) * 101 + run.monthIdx * 7 + 3) | 0;
  const close = { oi: lastClose.oi - previous, bills: sumMeters(lastClose.delayedApplied) };
  return { ...fx.closeFeedback(close, { pace: run.pace, calm: app.calm, seed }), seed };
}

function rescuePlan(app) {
  if (!played(app, 'rescue')) return null;
  const seed = ((app.year.seed ?? 0) * 101 + (app.year.rescueMonth ?? 0)) | 0;
  return { ...fx.rescueFeedback({ calm: app.calm, seed }), seed };
}

// A meter at zero is a heavy blow: it hits like the plan that follows a crisis.
function shockPlan(app) {
  if (!played(app, 'shock')) return null;
  const seed = ((app.year.seed ?? 0) * 101 + app.year.shocks.length * 13 + app.year.monthIdx) | 0;
  return { ...fx.rescueFeedback({ calm: app.calm, seed }), seed };
}

// The weather of the ending, on the first page of the verdict (the one with the factory); it also plays in the
// creator's simulated years, which are screens too.
function verdictPlan(app) {
  if (app.scene !== 'year' || !app.year || app.year.phase !== 'final' || app.page !== 0) return null;
  const seed = (app.year.seed ?? 0) | 0;
  return { ...fx.verdictFeedback(app.year.outcome, { calm: app.calm, seed }), seed };
}

// How the picture of a problem looks at its owner: neutral while the question is open, then the mood of the
// voice after the answer (what happened to the meter the problem is about; the result already shows it).
function sceneMood(app) {
  if (app.scene !== 'year' || !app.year || app.year.phase !== 'result') return 'neutral';
  return fx.moodOfMeter(app.year.last.delta[engine.currentProblem(app.year).focus]);
}

const STILL = Object.freeze({ dx: 0, dy: 0 });

// How far, in whole pixels, the scene is pushed right now (never the footer or the veil).
function screenShake(app) {
  const plan = resultPlan(app) || closePlan(app) || rescuePlan(app) || shockPlan(app) || verdictPlan(app);
  if (!plan || plan.trauma <= 0) return STILL;
  return fx.shakeOffset(plan.trauma, app.phaseT - fx.IMPACT_AT, plan.seed);
}

module.exports = { resultPlan, closePlan, rescuePlan, shockPlan, verdictPlan, screenShake, sceneMood };
