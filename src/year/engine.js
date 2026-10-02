'use strict';

// The 12-month year as a state machine. A run is an immutable snapshot: every function
// returns a new run and never modifies the one it receives.
//
// Phases: problem -> result -> (problem x4) -> monthClose -> (next month) ... -> final -> over.
// A zero (OI or a meter) found at a result or a month close goes through 'rescue' once, up
// to month 9; otherwise the company is bankrupt and the run jumps to 'final'.

const { applyOps, operatingMargin } = require('../model');
const rules = require('./rules');
const { effectOf, DELAY_MONTHS } = require('./archetypes');
const { VOICES, PROBLEMS_BY_ID } = require('./problems');
const { authoredSchedule, buildSchedule } = require('./schedule');

const MONTHS = 12;
const PROBLEMS_PER_MONTH = VOICES.length;

// OI is always the margin: operating income as a percentage of net sales.
const oiOf = (run) => operatingMargin(run.pl);

const AUTHORED = authoredSchedule();

// Without a seed the year follows the authored calendar (tests and the simulations use it);
// with one, the problems and the answers come in that seed's own order.
const newYear = (seed = null) => ({
  mode: 'year',
  seed,
  schedule: seed === null ? AUTHORED : buildSchedule(seed),
  phase: 'problem',
  monthIdx: 0,
  problemIdx: 0,
  pl: rules.START_PL,
  meters: rules.START_METERS,
  flags: { valueMeasured: false },
  rescued: false,
  rescueMonth: null,
  rescues: [],
  bankruptMonth: null,
  bankruptCause: null,
  pending: [],
  history: [],
  closes: [],
  last: null,
  lastClose: null,
  resume: null,
  zero: false,
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
  const effect = effectOf(currentProblem(run), option, { meters: run.meters, oi: oiOf(run), rescued: run.rescued, flags: run.flags });
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
  };
  const pending = effect.delayed
    ? [...run.pending, { dueMonth: Math.min(run.monthIdx + DELAY_MONTHS, MONTHS - 1), meters: effect.delayed, because: problem.id }]
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
    zero: rules.isZero(operatingMargin(pl), meters),
  };
}

// Month end: bills that fell due land first, then healthy and unhealthy meters move OI, then
// every meter decays.
function closeMonth(run) {
  const due = run.pending.filter((p) => p.dueMonth <= run.monthIdx);
  const afterDue = due.reduce((meters, p) => addMeters(meters, p.meters), run.meters);
  const { meters, adjustments } = rules.monthEnd(afterDue);
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
    zero: rules.isZero(operatingMargin(pl), meters),
  };
}

const bankrupt = (run) => ({
  ...run,
  phase: 'final',
  outcome: 'bankrupt',
  bankruptMonth: run.monthIdx + 1,
  bankruptCause: rules.zeroCause(oiOf(run), run.meters),
  zero: false,
});

const finish = (run) => ({
  ...run,
  phase: 'final',
  outcome: rules.classify(oiOf(run), run.meters, run.rescued),
});

// A zero: rescue once (up to month 9) or go bankrupt.
function handleZero(run, resume) {
  const month = run.monthIdx + 1;
  if (!rules.canRescue(month, run.rescued)) return bankrupt(run);
  const rescued = rules.rescueState(run.meters);
  return {
    ...run,
    phase: 'rescue',
    pl: rescued.pl,
    meters: rescued.meters,
    rescued: true,
    rescueMonth: month,
    rescues: [...run.rescues, {
      monthIdx: run.monthIdx,
      cause: rules.zeroCause(oiOf(run), run.meters),
      oiBefore: oiOf(run),
      oiAfter: operatingMargin(rescued.pl),
    }],
    resume,
    zero: false,
  };
}

const nextProblem = (run) => ({ ...run, phase: 'problem', problemIdx: run.problemIdx + 1 });

const afterResult = (run) => {
  if (run.problemIdx < PROBLEMS_PER_MONTH - 1) return nextProblem(run);
  return closeMonth(run);
};

const afterClose = (run) => {
  if (run.monthIdx >= MONTHS - 1) return finish(run);
  return { ...run, phase: 'problem', monthIdx: run.monthIdx + 1, problemIdx: 0 };
};

function next(run) {
  switch (run.phase) {
    case 'result':
      return run.zero ? handleZero(run, 'result') : afterResult(run);
    case 'monthClose':
      return run.zero ? handleZero(run, 'close') : afterClose(run);
    case 'rescue':
      return run.resume === 'result' ? afterResult(run) : afterClose(run);
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
