'use strict';

const { deepFreeze } = require('../freeze');
const { SEGMENT_IDS } = require('./segments');

// The 48 problems of the year: 12 months x 4 voices (client, plant, environment, strategy).
// This file holds only the structure: which segment it is about, which meter is at stake, how big the problem is
// and which P&L lines each of the four answers moves. All wording lives in content/year.*.js.
//
// Each problem is authored in the order smart, temp, plac, ign; the player never sees that
// order: displayOrder() scatters the four answers so each position holds the smart one
// exactly 12 times across the year.

const THEMES = Object.freeze([
  'client', 'plant', 'safety', 'rain', 'snow', 'water', 'politics', 'economy', 'protest', 'truck', 'strategy',
]);
const VOICES = Object.freeze(['cliente', 'planta', 'entorno', 'estrategia']);
const AUTHORING = Object.freeze(['smart', 'temp', 'plac', 'ign']);
const LINES = Object.freeze(['sales', 'incentives', 'cost', 'freight', 'direct', 'sga']);

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

// What an answer does to the P&L, written as one of three things:
//   a line id            all of its OI goes through that line;
//   [line, w, line, w]   its OI spread over two lines by weight (they add up to 1): a gain in one, a cost in the other,
//                        so a rebate that wins the contract shows as more sales and more incentives;
//   { line, volume, price, adds }   a growth answer, priced in volume %, price % and extra service [[line, pts]].
// The chip of an answer names its heaviest line and never the direction.
function mixOf(spec) {
  if (typeof spec === 'string') return [[spec, 1]];
  const pairs = [];
  for (let i = 0; i < spec.length; i += 2) pairs.push([spec[i], spec[i + 1]]);
  if (Math.abs(pairs.reduce((sum, [, weight]) => sum + weight, 0) - 1) > 1e-9) throw new Error(`The weights of ${JSON.stringify(spec)} do not add up to 1`);
  return pairs;
}

const heaviest = (mix) => mix.reduce((best, pair) => (Math.abs(pair[1]) > Math.abs(best[1]) ? pair : best))[0];

// answer: [spec, factor?, flagsSet?, { redLine }?], in authoring order.
function optionOf(a, [spec, k = 1, sets = [], flags = {}]) {
  const growth = typeof spec === 'object' && !Array.isArray(spec);
  const mix = growth ? [[spec.line, 1]] : mixOf(spec);
  const { line, ...grow } = growth ? spec : { line: null };
  return { a, line: growth ? line : heaviest(mix), mix, grow: growth ? grow : null, k, sets, redLine: flags.redLine === true };
}

const make = (id, voice, theme, focus, size, segment, answers) => {
  if (!SEGMENT_IDS.includes(segment)) throw new Error(`${id}: unknown segment ${segment}`);
  return {
    id,
    month: Number(id.slice(1, 3)),
    window: WINDOWS[id] || ANY_MONTH,
    voice,
    theme,
    focus,
    size,
    segment,
    options: AUTHORING.map((a, i) => optionOf(a, answers[i])),
  };
};

const S = 'sales';
const I = 'incentives';
const C = 'cost';
const F = 'freight';
const D = 'direct';
const G = 'sga';

// Writers of the answers. A plain line is `[C]`; the rest are written with a helper so the table below reads like the
// text of the answers: `mix(S, 2, I, -1)` is more sales and a rebate that costs, `growth(S, { volume: 9, price: -3 })` is
// a big win at a bad price, `redLine(...)` is a shortcut that breaks the rules.
const mix = (...pairs) => [pairs];
const growth = (line, change) => [{ line, ...change }];
const redLine = ([spec, k = 1, sets = []]) => [spec, k, sets, { redLine: true }];

const PROBLEMS = deepFreeze([
  make('m01c', 'cliente', 'client', 'C', 1.0, 'hotel', [mix(S, 2, I, -1), mix(S, 1.5, I, -0.5), [I], [S]]),
  make('m01p', 'planta', 'plant', 'P', 1.0, 'hotel', [[C], [C], [C], mix(C, 0.6, S, 0.4)]),
  make('m01e', 'entorno', 'economy', 'E', 1.0, 'industry', [mix(C, 0.6, S, 0.4), redLine([S]), [C], [C]]),
  make('m01s', 'estrategia', 'strategy', 'E', 1.2, 'hospital', [[...mix(S, 2, G, -1), 1, ['valueMeasured']], mix(S, 2, I, -1), [G], [S]]),

  make('m02c', 'cliente', 'client', 'C', 1.0, 'food', [mix(C, 2, D, -1), [C], [C], [S]]),
  make('m02p', 'planta', 'plant', 'P', 1.0, 'hospital', [mix(C, 0.6, S, 0.4), mix(C, 0.6, S, 0.4), mix(S, 0.5, C, 0.5), [S]]),
  make('m02e', 'entorno', 'rain', 'P', 1.0, 'hotel', [mix(S, 2, F, -1), mix(F, 0.6, S, 0.4), [F], mix(S, 1.4, F, -0.4)]),
  make('m02s', 'estrategia', 'strategy', 'E', 1.0, 'industry', [[G], redLine([G]), [G], [G]]),

  make('m03c', 'cliente', 'client', 'C', 1.0, 'industry', [mix(S, 2, C, -1), mix(C, 0.5, F, 0.5), [I], [D]]),
  make('m03p', 'planta', 'plant', 'P', 1.3, 'hospital', [mix(C, 0.6, S, 0.4), [C], [C], mix(C, 0.6, S, 0.4)]),
  make('m03e', 'entorno', 'politics', 'C', 1.0, 'hospital', [mix(S, 2, I, -1), mix(S, 1.5, I, -0.5), [S], [S]]),
  make('m03s', 'estrategia', 'water', 'E', 1.2, 'food', [mix(S, 2, D, -1), growth(S, { volume: 4, adds: [[D, 0.3]] }), [G], [S]]),

  make('m04c', 'cliente', 'client', 'C', 1.1, 'hospital', [mix(S, 2, D, -1), [S], [S], [S]]),
  make('m04p', 'planta', 'plant', 'P', 1.0, 'industry', [mix(C, 2, G, -1), mix(S, 2, C, -1), [C], mix(S, 1.4, C, -0.4)]),
  make('m04e', 'entorno', 'politics', 'C', 1.2, 'industry', [mix(I, 0.5, S, 0.5), [S], [I], [I]]),
  make('m04s', 'estrategia', 'strategy', 'E', 1.0, 'industry', [[G], mix(G, 1.5, S, -0.5), [G], [G]]),

  make('m05c', 'cliente', 'client', 'C', 1.0, 'hospital', [mix(D, 2, G, -1), [D], [D], [S]]),
  make('m05p', 'planta', 'safety', 'P', 1.2, 'food', [[C], redLine([C]), mix(C, 0.5, S, 0.5), [C]]),
  make('m05e', 'entorno', 'economy', 'C', 1.0, 'hotel', [mix(S, 2, I, -1), mix(I, 0.6, S, 0.4), [I], [S]]),
  make('m05s', 'estrategia', 'strategy', 'E', 1.2, 'industry', [mix(D, 2, G, -1), mix(G, 0.5, D, 0.5), [G], [D]]),

  make('m06c', 'cliente', 'client', 'C', 1.3, 'hotel', [growth(I, { volume: 0.6, price: -0.08 }), growth(S, { price: 0.35 }), growth(S, { price: -0.5 }), growth(S, { volume: -2.5 })]),
  make('m06p', 'planta', 'plant', 'P', 1.0, 'hospital', [mix(C, 2, D, -1), redLine([C]), mix(D, 0.5, S, 0.5), [C]]),
  make('m06e', 'entorno', 'water', 'C', 1.0, 'food', [mix(S, 2, D, -1), [S], [D], [S]]),
  make('m06s', 'estrategia', 'strategy', 'E', 1.0, 'hotel', [growth(G, { volume: 1.5, adds: [[G, 0.15]] }), growth(S, { volume: 0.6, price: 0.3 }), growth(G, { volume: 0.8, adds: [[G, 0.4]] }), [S]]),

  make('m07c', 'cliente', 'client', 'C', 1.0, 'industry', [mix(S, 2, D, -1), [S], [S], [S]]),
  make('m07p', 'planta', 'plant', 'P', 1.1, 'food', [mix(C, 0.6, S, 0.4), [C], [F], mix(S, 0.5, C, 0.5)]),
  make('m07e', 'entorno', 'snow', 'P', 1.0, 'hospital', [mix(F, 0.6, S, 0.4), mix(F, 0.6, S, 0.4), [F], mix(S, 1.4, F, -0.4)]),
  make('m07s', 'estrategia', 'strategy', 'E', 1.0, 'hospital', [[G], mix(G, 1.5, S, -0.5), [G], [G]]),

  make('m08c', 'cliente', 'client', 'C', 1.0, 'hospital', [growth(I, { volume: 0.8, price: -0.1 }), growth(S, { volume: 3, price: 0.2 }), growth(S, { volume: 9, price: -3 }), growth(S, { volume: -3 })]),
  make('m08p', 'planta', 'plant', 'P', 1.0, 'hotel', [mix(S, 2, C, -1), mix(C, 0.6, S, 0.4), [C], [S]]),
  make('m08e', 'entorno', 'economy', 'E', 1.0, 'food', [mix(S, 2, C, -1), [S], [S], [C]]),
  make('m08s', 'estrategia', 'strategy', 'E', 1.0, 'hotel', [mix(G, 1.5, I, -0.5), mix(G, 1.5, S, -0.5), [I], [D]]),

  make('m09c', 'cliente', 'client', 'C', 1.0, 'hotel', [growth(I, { volume: 1.5, price: -0.1 }), growth(S, { volume: -0.3, price: 0.8 }), growth(S, { volume: 1.4, price: -0.65 }), growth(S, { volume: -1.5 })]),
  make('m09p', 'planta', 'plant', 'P', 1.0, 'industry', [[C], mix(C, 1.5, S, -0.5), [C], [C]]),
  make('m09e', 'entorno', 'politics', 'E', 1.0, 'hotel', [[S], mix(S, 2, I, -1), [C], [S]]),
  make('m09s', 'estrategia', 'strategy', 'E', 1.1, 'food', [[C], [C], [C], [C]]),

  make('m10c', 'cliente', 'client', 'C', 1.0, 'food', [mix(D, 0.6, S, 0.4), [S], [D], [S]]),
  make('m10p', 'planta', 'plant', 'P', 1.2, 'industry', [mix(S, 2, C, -1), mix(C, 0.5, S, 0.5), [C], [S]]),
  make('m10e', 'entorno', 'water', 'C', 1.2, 'food', [mix(C, 2, S, -1), [S], [C], [S]]),
  make('m10s', 'estrategia', 'strategy', 'E', 1.0, 'hospital', [mix(G, 0.6, S, 0.4), mix(S, 2, I, -1), [G], [G]]),

  make('m11c', 'cliente', 'client', 'C', 1.2, 'industry', [mix(S, 2, D, -1), [S], [I], [I]]),
  make('m11p', 'planta', 'plant', 'P', 1.0, 'hotel', [mix(S, 2, C, -1), mix(S, 1.5, C, -0.5), [S], [C]]),
  make('m11e', 'entorno', 'protest', 'P', 1.2, 'industry', [mix(S, 2, F, -1), [S], [F], [S]]),
  make('m11s', 'estrategia', 'strategy', 'E', 1.2, 'hotel', [[G], [S], [G], [I]]),

  make('m12c', 'cliente', 'client', 'C', 1.0, 'food', [growth(S, { volume: 0.5, price: 0.1 }), growth(S, { price: 0.5 }), growth(C, { volume: 0.3, adds: [[C, 0.4]] }), growth(S, { volume: -3 })]),
  make('m12p', 'planta', 'plant', 'P', 1.0, 'food', [mix(S, 2, C, -1), redLine([C]), [C], [C]]),
  make('m12e', 'entorno', 'truck', 'P', 1.0, 'hospital', [mix(F, 0.6, S, 0.4), [S], [F], [S]]),
  make('m12s', 'estrategia', 'strategy', 'E', 1.3, 'food', [[G], redLine([S]), [G], [G]]),
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
