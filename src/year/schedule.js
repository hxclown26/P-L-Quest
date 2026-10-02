'use strict';

// The order of a year. The 48 problems always are the same, but a game can play them in a
// different order every time: each voice's twelve problems are spread over the twelve months
// (calendar-bound ones inside their window), the four voices of a month come in random order
// and the four answers of every problem are scattered. A schedule is plain frozen data that a
// run carries around, so the same seed replays exactly the same year.

const { PROBLEMS, VOICES, PERMUTATIONS, displayOrder } = require('./problems');
const { mulberry32, shuffle } = require('../rng');

const MONTHS = 12;
const MAX_ATTEMPTS = 200;

const freezeSchedule = (order, perms) => Object.freeze({
  order: Object.freeze(order),
  perms: Object.freeze(perms.map((perm) => Object.freeze(perm))),
});

// The original calendar: month by month client, plant, environment, strategy.
const authoredSchedule = () => freezeSchedule(
  PROBLEMS.map((problem) => problem.id),
  PROBLEMS.map((_, n) => displayOrder(n)),
);

const span = (problem) => problem.window[1] - problem.window[0];
const monthsOf = (problem) => Array.from({ length: span(problem) + 1 }, (_, i) => problem.window[0] - 1 + i);

// Tries to give each problem of one voice its own month inside its window, tightest windows
// first; returns the problem ids by month index, or null when a choice painted it into a corner.
function tryPlace(problems, rng) {
  const tightestFirst = [...shuffle(problems, rng)].sort((a, b) => span(a) - span(b));
  return tightestFirst.reduce((slots, problem) => {
    if (slots === null) return null;
    const open = monthsOf(problem).filter((month) => slots[month] === null);
    if (open.length === 0) return null;
    const month = open[Math.floor(rng() * open.length)];
    return slots.map((id, i) => (i === month ? problem.id : id));
  }, Array(MONTHS).fill(null));
}

function placeVoice(voice, rng) {
  const problems = PROBLEMS.filter((p) => p.voice === voice);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const placed = tryPlace(problems, rng);
    if (placed) return placed;
  }
  throw new Error(`Cannot place the ${voice} problems inside their windows`);
}

function buildSchedule(seed) {
  const rng = mulberry32(seed);
  const placed = Object.fromEntries(VOICES.map((voice) => [voice, placeVoice(voice, rng)]));
  const order = Array.from({ length: MONTHS }, (_, month) => shuffle(VOICES, rng).map((voice) => placed[voice][month])).flat();
  // 24 arrangements twice, like the authored scatter, so no kind of answer owns a position.
  const perms = shuffle([...PERMUTATIONS, ...PERMUTATIONS], rng);
  return freezeSchedule(order, perms);
}

module.exports = { authoredSchedule, buildSchedule };
