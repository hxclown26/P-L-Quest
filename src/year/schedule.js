'use strict';

// The order of a year. The 48 problems always are the same, but a game can play them in a
// different order every time: each voice's twelve problems are spread over the twelve months
// (calendar-bound ones inside their window), the four voices of a month come in random order
// and the four answers of every problem are scattered. A schedule is plain frozen data that a
// run carries around, so the same seed replays exactly the same year.
//
// A half year (6 months) deals 6 problems of each voice, picked at random among those that can
// happen in its months.

const { PROBLEMS, VOICES, PERMUTATIONS, displayOrder } = require('./problems');
const { mulberry32, shuffle } = require('../rng');

const MONTHS = 12;
const MAX_ATTEMPTS = 200;
// Each of the 24 arrangements of the answers is used once for every 24 problems dealt.
const arrangementCopies = (months) => Math.max(1, Math.round((months * VOICES.length) / PERMUTATIONS.length));

const freezeSchedule = (order, perms) => Object.freeze({
  order: Object.freeze(order),
  perms: Object.freeze(perms.map((perm) => Object.freeze(perm))),
});

// The original calendar: month by month client, plant, environment, strategy.
const authoredSchedule = (months = MONTHS) => {
  const problems = PROBLEMS.slice(0, months * VOICES.length);
  return freezeSchedule(problems.map((problem) => problem.id), problems.map((_, n) => displayOrder(n)));
};

// The months (0-based) a problem can fall in within a year of `months` months.
const lastMonth = (problem, months) => Math.min(problem.window[1], months);
const span = (problem, months) => lastMonth(problem, months) - problem.window[0];
const monthsOf = (problem, months) => Array.from({ length: span(problem, months) + 1 }, (_, i) => problem.window[0] - 1 + i);

// Tries to give each problem of one voice its own month inside its window, tightest windows
// first; returns the problem ids by month index, or null when a choice painted it into a corner.
function tryPlace(problems, rng, months) {
  const tightestFirst = [...shuffle(problems, rng)].sort((a, b) => span(a, months) - span(b, months));
  return tightestFirst.reduce((slots, problem) => {
    if (slots === null) return null;
    const open = monthsOf(problem, months).filter((month) => slots[month] === null);
    if (open.length === 0) return null;
    const month = open[Math.floor(rng() * open.length)];
    return slots.map((id, i) => (i === month ? problem.id : id));
  }, Array(months).fill(null));
}

// One problem of the voice for each month: all of its problems in a full year, a random pick of the
// ones that can happen in the first `months` months in a shorter one.
function placeVoice(voice, rng, months) {
  const pool = PROBLEMS.filter((p) => p.voice === voice && p.window[0] <= months);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const problems = pool.length > months ? shuffle(pool, rng).slice(0, months) : pool;
    const placed = tryPlace(problems, rng, months);
    if (placed) return placed;
  }
  throw new Error(`Cannot place the ${voice} problems inside their windows`);
}

function buildSchedule(seed, months = MONTHS) {
  const rng = mulberry32(seed);
  const placed = Object.fromEntries(VOICES.map((voice) => [voice, placeVoice(voice, rng, months)]));
  const order = Array.from({ length: months }, (_, month) => shuffle(VOICES, rng).map((voice) => placed[voice][month])).flat();
  // Every arrangement of the answers equally often, like the authored scatter, so no kind of
  // answer owns a position.
  const perms = shuffle(Array.from({ length: arrangementCopies(months) }, () => PERMUTATIONS).flat(), rng);
  return freezeSchedule(order, perms);
}

module.exports = { authoredSchedule, buildSchedule };
