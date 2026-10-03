'use strict';

const { deepFreeze } = require('../freeze');
const rules = require('./rules');
const { serveOf } = require('./segments');

// Every problem offers four answers of a different character. "Focus" is the meter the
// problem puts at stake; the other two are the "side" meters.
//   smart: balanced and self-funding: a little OI, lifts the focus meter
//   temp:  the shortcut: OI now, the bill arrives on the meters (half of it later)
//   plac:  give in to the voice in tension: costs OI, lifts the focus meter
//   ign:   do nothing: costs OI and the focus meter drops
const ARCHETYPES = deepFreeze({
  smart: { oi: 0.1, focus: 3.5, side: 0.4 },
  temp: { oi: 0.6, focus: -5.5, side: -0.75 },
  plac: { oi: -0.375, focus: 6.5, side: -0.75 },
  ign: { oi: -0.45, focus: -4.5, side: -0.75 },
});

const IDS = Object.freeze(Object.keys(ARCHETYPES));
const DELAY_MONTHS = 2;
// A shortcut sends the second half of its bill this many months later: fewer at a faster pace.
const delayMonths = (pace = 1) => Math.max(1, Math.round(DELAY_MONTHS / pace));
const VALUE_OI = 0.2;
const VALUE_METER = 2;
const DELAYED_SHARE = 0.5;
// A red line is a breach of the rules, not a shortcut: the fine (audit, lawyers, penalties) is paid at once, takes back
// more than the answer earned, and every meter loses trust on the spot.
const RED_LINE = Object.freeze({ fine: 1.2, reputation: 6 });

const scaleMeters = (meters, factor) =>
  Object.fromEntries(rules.METER_KEYS.map((key) => [key, meters[key] * factor]));

// The OI of the answer spread over the lines it touches, by weight: a gain in one line and a cost in another.
const mixOps = (mix, oi) => mix.map(([line, weight]) => ({ op: 'oi', line, pts: oi * weight }));

// A growth answer is priced in volume, price and extra service; the P&L works out what that does to OI. `k` is the weight
// of the answer: the size of the problem, the factor of the answer and the pace of the run.
function growOps(grow, k, segment) {
  return [
    ...(grow.volume ? [{ op: 'volume', pct: grow.volume * k, share: serveOf(segment) }] : []),
    ...(grow.price ? [{ op: 'price', pct: grow.price * k }] : []),
    ...(grow.adds || []).map(([line, pts]) => ({ op: 'add', line, pts: pts * k })),
  ];
}

// What one answer does to a state. Pure: returns the effect, the caller applies it. At double pace
// (the half year) every effect is twice as big. `oi` is the OI the kind of answer is worth (null for a growth
// answer, which the P&L prices itself); `ops` is what the answer does to the P&L, line by line.
function effectOf(problem, option, state) {
  const base = ARCHETYPES[option.a];
  const pace = state.pace ?? 1;
  const k = problem.size * (option.k ?? 1) * pace;
  const smart = option.a === 'smart';
  const crisis = smart && state.meters[problem.focus] < rules.CRISIS;
  const recovery = smart && state.rescued && state.oi < rules.RECOVERY_UNTIL;
  const value = smart && problem.voice === 'cliente' && state.flags.valueMeasured === true;

  const red = option.redLine === true;
  const worth = base.oi * k * (recovery ? rules.RECOVERY_K : 1) + (value ? VALUE_OI * pace : 0);
  const fine = red ? [{ op: 'oi', line: 'sga', pts: -RED_LINE.fine * k }] : [];
  // A growth answer is priced by the P&L, so what a balanced answer earns on top (the value measured, the recovery
  // after the plan) goes in as plain OI on its line.
  const extra = (value ? VALUE_OI * pace : 0) + (recovery ? base.oi * k * (rules.RECOVERY_K - 1) : 0);
  const ops = option.grow
    ? [...growOps(option.grow, k, problem.segment), ...(extra ? [{ op: 'oi', line: option.line, pts: extra }] : []), ...fine]
    : [...mixOps(option.mix || [[option.line, 1]], worth), ...fine];
  const focusFactor = crisis ? rules.CRISIS_FACTOR : 1;
  const all = Object.fromEntries(rules.METER_KEYS.map((key) => [
    key,
    (key === problem.focus
      ? base.focus * k * focusFactor + (value ? VALUE_METER * pace : 0)
      : base.side * k) - (red ? RED_LINE.reputation * pace : 0),
  ]));
  const deferred = option.a === 'temp' && !red;
  return {
    oi: option.grow ? null : ops.reduce((total, op) => total + op.pts, 0),
    meters: deferred ? scaleMeters(all, 1 - DELAYED_SHARE) : all,
    delayed: deferred ? scaleMeters(all, DELAYED_SHARE) : null,
    ops,
    notes: [crisis ? 'crisis' : null, recovery ? 'recovery' : null, value ? 'value' : null, red ? 'redLine' : null].filter(Boolean),
  };
}

module.exports = { ARCHETYPES, IDS, DELAY_MONTHS, RED_LINE, delayMonths, effectOf };
