'use strict';

const { deepFreeze } = require('../freeze');

// The 48 problems of the year: 12 months x 4 voices (client, plant, environment, strategy).
// This file holds only the structure: which meter is at stake, how big the problem is and
// which P&L line each of the four answers moves. All wording lives in content/year.*.js.
//
// Each problem is authored in the order smart, temp, plac, ign; the player never sees that
// order: displayOrder() scatters the four answers so each position holds the smart one
// exactly 12 times across the year.

const THEMES = Object.freeze([
  'client', 'plant', 'safety', 'rain', 'snow', 'water', 'politics', 'economy', 'protest', 'truck', 'strategy',
]);
const VOICES = Object.freeze(['cliente', 'planta', 'entorno', 'estrategia']);
const AUTHORING = Object.freeze(['smart', 'temp', 'plac', 'ign']);
const LINES = Object.freeze(['sales', 'incentives', 'cost', 'serve', 'sga']);

// Months (1-12, inclusive) in which a problem makes sense. Most fit any month; the ones that
// speak of the start of the year, of winter or of the closing are tied to the calendar, so a
// shuffled year never opens with "the year is closing".
const ANY_MONTH = Object.freeze([1, 12]);
const WINDOWS = Object.freeze({
  m01p: [1, 2],
  m01e: [1, 4],
  m01s: [1, 3],
  m02e: [1, 3],
  m07e: [6, 8],
  m10p: [8, 12],
  m10s: [9, 12],
  m11p: [11, 12],
  m12p: [11, 12],
  m12e: [11, 12],
  m12s: [11, 12],
});

// lines: one [line, factor?, flagsSet?] per answer, in authoring order.
const make = (id, voice, theme, focus, size, lines) => ({
  id,
  month: Number(id.slice(1, 3)),
  window: WINDOWS[id] || ANY_MONTH,
  voice,
  theme,
  focus,
  size,
  options: AUTHORING.map((a, i) => ({ a, line: lines[i][0], k: lines[i][1] ?? 1, sets: lines[i][2] ?? [] })),
});

const S = 'sales';
const I = 'incentives';
const C = 'cost';
const V = 'serve';
const G = 'sga';

const PROBLEMS = deepFreeze([
  make('m01c', 'cliente', 'client', 'C', 1.0, [[S], [S], [I], [S]]),
  make('m01p', 'planta', 'plant', 'P', 1.0, [[C], [C], [C], [S]]),
  make('m01e', 'entorno', 'economy', 'E', 1.0, [[C], [S], [C], [C]]),
  make('m01s', 'estrategia', 'strategy', 'E', 1.2, [[S, 1, ['valueMeasured']], [S], [G], [S]]),

  make('m02c', 'cliente', 'client', 'C', 1.0, [[V], [C], [V], [S]]),
  make('m02p', 'planta', 'plant', 'P', 1.0, [[C], [C], [S], [C]]),
  make('m02e', 'entorno', 'rain', 'P', 1.0, [[V], [V], [V], [S]]),
  make('m02s', 'estrategia', 'strategy', 'E', 1.0, [[G], [S], [G], [G]]),

  make('m03c', 'cliente', 'client', 'C', 1.0, [[V], [V], [I], [S]]),
  make('m03p', 'planta', 'plant', 'P', 1.3, [[C], [C], [C], [S]]),
  make('m03e', 'entorno', 'politics', 'C', 1.0, [[S], [S], [S], [S]]),
  make('m03s', 'estrategia', 'water', 'E', 1.2, [[S], [S], [G], [S]]),

  make('m04c', 'cliente', 'client', 'C', 1.1, [[S], [S], [I], [S]]),
  make('m04p', 'planta', 'plant', 'P', 1.0, [[C], [C], [C], [C]]),
  make('m04e', 'entorno', 'politics', 'C', 1.2, [[S], [S], [I], [S]]),
  make('m04s', 'estrategia', 'strategy', 'E', 1.0, [[G], [G], [G], [G]]),

  make('m05c', 'cliente', 'client', 'C', 1.0, [[V], [V], [V], [S]]),
  make('m05p', 'planta', 'safety', 'P', 1.2, [[C], [C], [S], [C]]),
  make('m05e', 'entorno', 'economy', 'C', 1.0, [[S], [S], [I], [S]]),
  make('m05s', 'estrategia', 'strategy', 'E', 1.2, [[V], [V], [V], [V]]),

  make('m06c', 'cliente', 'client', 'C', 1.3, [[S], [S], [I], [S]]),
  make('m06p', 'planta', 'plant', 'P', 1.0, [[C], [C], [C], [C]]),
  make('m06e', 'entorno', 'water', 'C', 1.0, [[S], [S], [V], [S]]),
  make('m06s', 'estrategia', 'strategy', 'E', 1.0, [[S], [S], [G], [S]]),

  make('m07c', 'cliente', 'client', 'C', 1.0, [[V], [S], [I], [S]]),
  make('m07p', 'planta', 'plant', 'P', 1.1, [[C], [C], [C], [S]]),
  make('m07e', 'entorno', 'snow', 'P', 1.0, [[V], [V], [V], [S]]),
  make('m07s', 'estrategia', 'strategy', 'E', 1.0, [[G], [G], [G], [G]]),

  make('m08c', 'cliente', 'client', 'C', 1.0, [[S], [S], [I], [S]]),
  make('m08p', 'planta', 'plant', 'P', 1.0, [[C], [C], [S], [C]]),
  make('m08e', 'entorno', 'economy', 'E', 1.0, [[C], [S], [C], [C]]),
  make('m08s', 'estrategia', 'strategy', 'E', 1.0, [[V], [G], [I], [S]]),

  make('m09c', 'cliente', 'client', 'C', 1.0, [[S], [S], [I], [S]]),
  make('m09p', 'planta', 'plant', 'P', 1.0, [[C], [C], [C], [C]]),
  make('m09e', 'entorno', 'politics', 'E', 1.0, [[S], [S], [S], [S]]),
  make('m09s', 'estrategia', 'strategy', 'E', 1.1, [[C], [C], [C], [C]]),

  make('m10c', 'cliente', 'client', 'C', 1.0, [[V], [S], [V], [S]]),
  make('m10p', 'planta', 'plant', 'P', 1.2, [[C], [C], [C], [S]]),
  make('m10e', 'entorno', 'water', 'C', 1.2, [[S], [S], [V], [S]]),
  make('m10s', 'estrategia', 'strategy', 'E', 1.0, [[G], [S], [G], [G]]),

  make('m11c', 'cliente', 'client', 'C', 1.2, [[S], [S], [I], [S]]),
  make('m11p', 'planta', 'plant', 'P', 1.0, [[C], [C], [S], [C]]),
  make('m11e', 'entorno', 'protest', 'P', 1.2, [[V], [S], [V], [S]]),
  make('m11s', 'estrategia', 'strategy', 'E', 1.2, [[S], [S], [S], [S]]),

  make('m12c', 'cliente', 'client', 'C', 1.0, [[S], [S], [S], [S]]),
  make('m12p', 'planta', 'plant', 'P', 1.0, [[C], [C], [C], [C]]),
  make('m12e', 'entorno', 'truck', 'P', 1.0, [[V], [S], [V], [S]]),
  make('m12s', 'estrategia', 'strategy', 'E', 1.3, [[S], [S], [G], [S]]),
]);

// All 24 orderings of four answers, in lexicographic order.
const permute = (items) => (items.length <= 1
  ? [items]
  : items.flatMap((item, i) => permute([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])));
const PERMUTATIONS = Object.freeze(permute([0, 1, 2, 3]).map((p) => Object.freeze(p)));

// 7 is coprime with 24, so 48 consecutive problems walk through every ordering twice.
const displayOrder = (problemNumber) => PERMUTATIONS[(problemNumber * 7) % PERMUTATIONS.length];

const problemNumber = (monthIdx, problemIdx) => monthIdx * VOICES.length + problemIdx;
const problemAt = (monthIdx, problemIdx) => PROBLEMS[problemNumber(monthIdx, problemIdx)];

// The four answers of a problem in the order the player sees them.
const displayOptions = (monthIdx, problemIdx) =>
  displayOrder(problemNumber(monthIdx, problemIdx)).map((i) => problemAt(monthIdx, problemIdx).options[i]);

const PROBLEMS_BY_ID = Object.freeze(Object.fromEntries(PROBLEMS.map((p) => [p.id, p])));

module.exports = {
  THEMES,
  VOICES,
  AUTHORING,
  LINES,
  PROBLEMS,
  PROBLEMS_BY_ID,
  PERMUTATIONS,
  displayOrder,
  problemNumber,
  problemAt,
  displayOptions,
};
