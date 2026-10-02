'use strict';

const { deepFreeze } = require('../freeze');
const rules = require('./rules');

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

const scaleMeters = (meters, factor) =>
  Object.fromEntries(rules.METER_KEYS.map((key) => [key, meters[key] * factor]));

// What one answer does to a state. Pure: returns the effect, the caller applies it. At double pace
// (the half year) every effect is twice as big.
function effectOf(problem, option, state) {
  const base = ARCHETYPES[option.a];
  const pace = state.pace ?? 1;
  const k = problem.size * (option.k ?? 1) * pace;
  const smart = option.a === 'smart';
  const crisis = smart && state.meters[problem.focus] < rules.CRISIS;
  const recovery = smart && state.rescued && state.oi < rules.RECOVERY_UNTIL;
  const value = smart && problem.voice === 'cliente' && state.flags.valueMeasured === true;

  const oi = base.oi * k * (recovery ? rules.RECOVERY_K : 1) + (value ? VALUE_OI * pace : 0);
  const focusFactor = crisis ? rules.CRISIS_FACTOR : 1;
  const all = Object.fromEntries(rules.METER_KEYS.map((key) => [
    key,
    key === problem.focus
      ? base.focus * k * focusFactor + (value ? VALUE_METER * pace : 0)
      : base.side * k,
  ]));
  const deferred = option.a === 'temp';
  return {
    oi,
    meters: deferred ? scaleMeters(all, 1 - DELAYED_SHARE) : all,
    delayed: deferred ? scaleMeters(all, DELAYED_SHARE) : null,
    ops: [{ op: 'oi', line: option.line, pts: oi }],
    notes: [crisis ? 'crisis' : null, recovery ? 'recovery' : null, value ? 'value' : null].filter(Boolean),
  };
}

module.exports = { ARCHETYPES, IDS, DELAY_MONTHS, delayMonths, effectOf };
