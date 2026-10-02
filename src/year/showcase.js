'use strict';

// The "see the endings" menu: a fixed year for each play style, so a tester can watch every
// result screen (including the rescue comeback) without playing 48 turns. Seeds are pinned
// and checked by tests/year-showcase.test.js: if the balance changes, a test names the entry.

const { PROFILES, simulate } = require('./simulate');

const entry = (profile, seed, outcome) => Object.freeze({ profile, seed, outcome });

const SHOWCASE = Object.freeze([
  entry('expert', 1, 'excellent'),
  entry('careful', 48, 'good'),
  entry('average', 5, 'fair'),
  entry('halfShort', 460, 'fair'),
  entry('weak', 4, 'bad'),
  entry('pleaser', 1, 'terrible'),
  entry('short', 1, 'bankrupt'),
  entry('passive', 1, 'bankrupt'),
]);

function showcaseRun(index) {
  const chosen = SHOWCASE[index];
  if (!chosen) throw new Error(`No showcase entry ${index}`);
  return simulate(PROFILES[chosen.profile], chosen.seed);
}

module.exports = { SHOWCASE, showcaseRun };
