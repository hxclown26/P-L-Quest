'use strict';

// The 12-month year as a state machine. A run is an immutable snapshot: every function
// returns a new run and never modifies the one it receives.
//
// Phases: problem -> result -> (problem x4) -> monthClose -> (next month) ... -> final -> over.
// The ladder: a meter found at zero (after an answer or at a close) is a blow to the P&L and goes through
// 'shock' (the meter restarts at SHOCK_METER); at a close, OI at zero brings the one-time restructuring plan
// ('rescue' in the code) up to month 9, and a gross profit that covers 70% of the SG&A or less at two
// closes in a row is bankruptcy, which jumps to 'final'. Nothing else ends a company.
//
// A run may also be a half year: 6 months at double pace (`run.months`, `run.pace`), the same
// year at double speed: the restructuring plan then lasts until month 4.

const { applyOps, operatingMargin } = require('../model');
const rules = require('./rules');
const { effectOf, delayMonths } = require('./archetypes');
const { VOICES, PROBLEMS_BY_ID } = require('./problems');
const { authoredSchedule, buildSchedule } = require('./schedule');

const MONTHS = 12;
const PROBLEMS_PER_MONTH = VOICES.length;

// OI is always the margin: operating income as a percentage of net sales.
const oiOf = (run) => operatingMargin(run.pl);

const AUTHORED = authoredSchedule(MONTHS);

// Without a seed the year follows the authored calendar (tests and the simulations use it);
// with one, the problems and the answers come in that seed's own order. `months` is 12, or 6 for
// the half year.
const newYear = (seed = null, months = MONTHS) => ({
  mode: 'year',
  seed,
  months,
  pace: MONTHS / months,
  schedule: seed === null ? (months === MONTHS ? AUTHORED : authoredSchedule(months)) : buildSchedule(seed, months),
  phase: 'problem',
  monthIdx: 0,
  problemIdx: 0,
  pl: rules.START_PL,
  meters: rules.START_METERS,
  flags: { valueMeasured: false },
  rescued: false,
  rescueMonth: null,
  rescues: [],
  shock: null,
  shocks: [],
  distress: 0,
  redLines: 0,
  bankruptMonth: null,
  bankruptCause: null,
  pending: [],
  history: [],
  closes: [],
  last: null,
  lastClose: null,
  resume: null,
  outcome: null,
  attempt: 1,
});

const slotOf = (run) => run.monthIdx * PROBLEMS_PER_MONTH + run.problemIdx;
const currentProblem = (run) => PROBLEMS_BY_ID[run.schedule.order[slotOf(run)]];
const options = (run) => run.schedule.perms[slotOf(run)].map((i) => currentProblem(run).options[i]);

const addMeters = (meters, delta) =>
  Object.fromEntries(rules.METER_KEYS.map((key) => [key, rules.clampMeter(meters[key] + delta[key])]));

// What an answer would do to this run, without applying it (the reviewer mode shows it).
// `oi` is the effect in OI points of plan sales; `pp` is what it does to the OI margin.
function preview(run, index) {
  const option = options(run)[index];
  if (!option) throw new Error(`No option at index ${index}`);
  const effect = effectOf(currentProblem(run), option, { meters: run.meters, oi: oiOf(run), rescued: run.rescued, flags: run.flags, pace: run.pace });
  return { ...effect, pp: operatingMargin(applyOps(run.pl, effect.ops)) - oiOf(run) };
}

function choose(run, index) {
  if (run.phase !== 'problem') throw new Error(`Cannot choose in phase ${run.phase}`);
  const effect = preview(run, index);
  const option = options(run)[index];
  const problem = currentProblem(run);
  const pl = applyOps(run.pl, effect.ops);
  const meters = addMeters(run.meters, effect.meters);
  const entry = {
    monthIdx: run.monthIdx,
    problemIdx: run.problemIdx,
    problemId: problem.id,
    optionIndex: index,
    a: option.a,
    line: option.line,
    sets: option.sets,
    plBefore: run.pl,
    oiBefore: oiOf(run),
    oiAfter: operatingMargin(pl),
    delta: { oi: operatingMargin(pl) - oiOf(run), C: meters.C - run.meters.C, P: meters.P - run.meters.P, E: meters.E - run.meters.E },
    notes: effect.notes,
    delayed: effect.delayed,
    redLine: option.redLine,
  };
  const pending = effect.delayed
    ? [...run.pending, { dueMonth: Math.min(run.monthIdx + delayMonths(run.pace), run.months - 1), meters: effect.delayed, because: problem.id }]
    : run.pending;
  return {
    ...run,
    phase: 'result',
    pl,
    meters,
    flags: option.sets.reduce((flags, flag) => ({ ...flags, [flag]: true }), run.flags),
    pending,
    history: [...run.history, entry],
    last: entry,
    redLines: run.redLines + (option.redLine ? 1 : 0),
    shock: rules.zeroMeter(meters),
  };
}

// Month end: bills that fell due land first, then healthy and unhealthy meters move OI, then
// every meter decays.
function closeMonth(run) {
  const due = run.pending.filter((p) => p.dueMonth <= run.monthIdx);
  const afterDue = due.reduce((meters, p) => addMeters(meters, p.meters), run.meters);
  const { meters, adjustments } = rules.monthEnd(afterDue, run.pace);
  const pl = applyOps(run.pl, adjustments.map((a) => ({ op: 'oi', line: a.line, pts: a.pts })));
  const close = {
    monthIdx: run.monthIdx,
    plBefore: run.pl,
    oi: operatingMargin(pl),
    meters,
    adjustments,
    delayedApplied: due.map((p) => ({ because: p.because, meters: p.meters })),
  };
  return {
    ...run,
    phase: 'monthClose',
    pl,
    meters,
    pending: run.pending.filter((p) => p.dueMonth > run.monthIdx),
    closes: [...run.closes, close],
    lastClose: close,
    shock: rules.zeroMeter(meters),
  };
}

// The gross profit no longer covers the SG&A: the company is gone. The P&L says so, not a meter.
const bankrupt = (run) => ({
  ...run,
  phase: 'final',
  outcome: 'bankrupt',
  bankruptMonth: run.monthIdx + 1,
  bankruptCause: 'pl',
});

const finish = (run) => ({
  ...run,
  phase: 'final',
  outcome: rules.classify(oiOf(run), run.meters, run.rescued, run.redLines),
});

// A meter at zero: the P&L takes the blow of that meter and the meter restarts. `resume` says where play
// goes next ('result': the rest of the month, 'close': the judgement of the close, 'after': the next month).
function applyShock(run, resume) {
  const meter = run.shock;
  const plBefore = run.pl;
  const pl = applyOps(plBefore, rules.shockOps(meter, run.shocks.filter((blow) => blow.meter === meter).length));
  const meters = { ...run.meters, [meter]: rules.SHOCK_METER };
  return {
    ...run,
    phase: 'shock',
    pl,
    meters,
    shock: rules.zeroMeter(meters),
    resume,
    shocks: [...run.shocks, { monthIdx: run.monthIdx, meter, plBefore, oiBefore: operatingMargin(plBefore), oiAfter: operatingMargin(pl) }],
  };
}

// The board's restructuring plan, once (up to month 9, month 4 in a half year): the SG&A and the cost are cut and
// every meter feels the disruption. The P&L it found stays; nothing is injected.
function restructure(run) {
  const plBefore = run.pl;
  const pl = applyOps(plBefore, rules.restructureOps(plBefore));
  const meters = addMeters(run.meters, Object.fromEntries(rules.METER_KEYS.map((key) => [key, -rules.RESTRUCTURING.meters])));
  return {
    ...run,
    phase: 'rescue',
    pl,
    meters,
    rescued: true,
    rescueMonth: run.monthIdx + 1,
    rescues: [...run.rescues, { monthIdx: run.monthIdx, cause: 'oi', oiBefore: operatingMargin(plBefore), oiAfter: operatingMargin(pl) }],
    shock: rules.zeroMeter(meters),
    resume: 'close',
  };
}

// The judgement of a month close, once any blow has landed: bankruptcy, the plan, or the next month.
function judge(run) {
  const distress = rules.distressed(run.pl) ? run.distress + 1 : 0;
  const judged = { ...run, distress };
  if (distress >= rules.BANKRUPT_CLOSES) return bankrupt(judged);
  if (rules.inCrisis(oiOf(judged)) && rules.canRescue(run.monthIdx + 1, run.rescued, run.pace)) return restructure(judged);
  return afterClose(judged);
}

const nextProblem = (run) => ({ ...run, phase: 'problem', problemIdx: run.problemIdx + 1 });

const afterResult = (run) => {
  if (run.problemIdx < PROBLEMS_PER_MONTH - 1) return nextProblem(run);
  return closeMonth(run);
};

const afterClose = (run) => {
  if (run.monthIdx >= run.months - 1) return finish(run);
  return { ...run, phase: 'problem', monthIdx: run.monthIdx + 1, problemIdx: 0 };
};

function next(run) {
  switch (run.phase) {
    case 'result':
      return run.shock ? applyShock(run, 'result') : afterResult(run);
    case 'monthClose':
      return run.shock ? applyShock(run, 'close') : judge(run);
    case 'shock':
      if (run.shock) return applyShock(run, run.resume);
      return run.resume === 'result' ? afterResult(run) : run.resume === 'close' ? judge(run) : afterClose(run);
    case 'rescue':
      return run.shock ? applyShock(run, 'after') : afterClose(run);
    case 'final':
      return { ...run, phase: 'over' };
    default:
      return run;
  }
}

module.exports = {
  MONTHS,
  PROBLEMS_PER_MONTH,
  newYear,
  oiOf,
  currentProblem,
  options,
  preview,
  choose,
  next,
};
