'use strict';

// Plays whole years with simple player profiles. Used by the balance tests and by the
// "see the endings" menu, so a tester can see every result screen without playing 48 turns.

const engine = require('./engine');
const rules = require('./rules');
const { mulberry32 } = require('../rng');

const indexOf = (run, a) => engine.options(run).findIndex((o) => o.a === a);
const anyIndex = (rng) => Math.floor(rng() * 4);

// Reads the focus meter: when it is in or near crisis a balanced answer is not enough, so the
// expert gives in (unless a rescue is already lifting OI and the meter is just recovering).
function expert(run) {
  const focus = run.meters[engine.currentProblem(run).focus];
  const recovering = engine.oiOf(run) < rules.RECOVERY_UNTIL && focus >= 33;
  return indexOf(run, focus < rules.CRISIS + 6 && !recovering ? 'plac' : 'smart');
}

const always = (a) => (run) => indexOf(run, a);
const mix = (a, b) => (run, rng) => indexOf(run, rng() < 0.5 ? a : b);
const noisy = (eps, base) => (run, rng) => (rng() < eps ? anyIndex(rng) : base(run, rng));

const PROFILES = Object.freeze({
  expert,
  careful: noisy(0.2, expert),
  average: noisy(0.45, expert),
  weak: noisy(0.7, expert),
  short: always('temp'),
  pleaser: always('plac'),
  passive: always('ign'),
  halfShort: mix('smart', 'temp'),
  halfPleaser: mix('smart', 'plac'),
  random: (run, rng) => anyIndex(rng),
});

// Plays from `start` (a new year by default) until the verdict.
function simulate(policy, seed, start = engine.newYear()) {
  const rng = mulberry32(seed);
  let run = start;
  for (let guard = 0; guard < 500 && run.phase !== 'final'; guard += 1) {
    run = run.phase === 'problem' ? engine.choose(run, policy(run, rng)) : engine.next(run);
  }
  return run;
}

module.exports = { PROFILES, expert, always, mix, noisy, simulate, mulberry32 };
