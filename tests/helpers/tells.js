'use strict';

// Audits of the year's answers for "tells": ways a player could pick the right answer without
// reading the finance (the longest text, the word that always leads the shortcut, the line label).
// Everything here is pure and works on rows { id, a, name, desc, line } built by `rowsOf`.

const { PROBLEMS, AUTHORING } = require('../../src/year/problems');

const TYPES = AUTHORING;

// One row per answer of the given problems, in the language of `dict` (a content dictionary).
const rowsOf = (dict, ids = PROBLEMS.map((p) => p.id)) => PROBLEMS
  .filter((problem) => ids.includes(problem.id))
  .flatMap((problem) => problem.options.map((option) => ({
    id: problem.id,
    a: option.a,
    line: option.line,
    name: dict[`year.${problem.id}.${option.a}.name`],
    desc: dict[`year.${problem.id}.${option.a}.desc`],
  })));

const sceneOf = (dict, id) => dict[`year.${id}.scene`];

// The distinct words of a text, lower case and without accents.
const words = (text) => [...new Set(
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2),
)];

const textOf = (row) => `${row.name} ${row.desc}`;
const groupBy = (rows, key) => rows.reduce((groups, row) => ({ ...groups, [row[key]]: [...(groups[row[key]] || []), row] }), {});

// A naive Bayes model of "this text belongs to the positive class", from the presence of words.
function train(rows, isPositive) {
  const model = { yes: {}, no: {}, docsYes: 0, docsNo: 0 };
  rows.forEach((row) => {
    const side = isPositive(row) ? 'yes' : 'no';
    model[side === 'yes' ? 'docsYes' : 'docsNo'] += 1;
    words(textOf(row)).forEach((w) => { model[side][w] = (model[side][w] || 0) + 1; });
  });
  return model;
}

const score = (model, row) => words(textOf(row)).reduce(
  (sum, w) => sum + Math.log(((model.yes[w] || 0) + 1) / (model.docsYes + 2)) - Math.log(((model.no[w] || 0) + 1) / (model.docsNo + 2)),
  0,
);

// Leaves one problem out, trains on the rest and asks the model to find the balanced answer of the
// held-out problem. `versus` is the list of types it competes against (all the others by default).
// Returns the hits and the number of problems read, so a caller can compare it to chance.
function pickTheBalanced(rows, versus = TYPES.filter((a) => a !== 'smart')) {
  const byProblem = groupBy(rows, 'id');
  const ids = Object.keys(byProblem);
  const kept = [...versus, 'smart'];
  const hits = ids.filter((held) => {
    const training = ids.filter((id) => id !== held).flatMap((id) => byProblem[id]).filter((row) => kept.includes(row.a));
    const model = train(training, (row) => row.a === 'smart');
    const ranked = byProblem[held].filter((row) => kept.includes(row.a)).map((row) => ({ a: row.a, s: score(model, row) })).sort((x, y) => y.s - x.s);
    return ranked[0].a === 'smart' && ranked[0].s > ranked[1].s;
  }).length;
  return { hits, n: ids.length, chance: 1 / kept.length };
}

const firstWord = (text) => text.split(' ')[0].toLowerCase();

// How often the first word of an answer's name alone gives its type away: leave one answer out and
// guess the type that most often follows that word in the others (no data is a miss).
function firstWordHits(rows) {
  const counts = {};
  rows.forEach((row) => {
    const w = firstWord(row.name);
    counts[w] = counts[w] || { smart: 0, temp: 0, plac: 0, ign: 0 };
    counts[w][row.a] += 1;
  });
  const hits = rows.filter((row) => {
    const seen = { ...counts[firstWord(row.name)], [row.a]: counts[firstWord(row.name)][row.a] - 1 };
    const total = TYPES.reduce((sum, a) => sum + seen[a], 0);
    return total > 0 && TYPES.reduce((best, a) => (seen[a] > seen[best] ? a : best), 'smart') === row.a && seen[row.a] > 0;
  }).length;
  return { hits, n: rows.length, chance: 1 / TYPES.length };
}

// The same, from the line label an answer shows on the screen.
function lineHits(rows) {
  const byProblem = groupBy(rows, 'id');
  const ids = Object.keys(byProblem);
  const hits = rows.filter((row) => {
    const others = ids.filter((id) => id !== row.id).flatMap((id) => byProblem[id]).filter((other) => other.line === row.line);
    const seen = TYPES.map((a) => others.filter((other) => other.a === a).length);
    const best = Math.max(...seen);
    return best > 0 && seen.filter((count) => count === best).length === 1 && TYPES[seen.indexOf(best)] === row.a;
  }).length;
  return { hits, n: rows.length, chance: 1 / TYPES.length };
}

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

// The biggest gap between the mean length of one type of answer and the mean of all of them, as a
// share of the latter (0.1 means the longest or shortest type is 10% away).
function lengthSpread(rows, field = 'desc') {
  const overall = mean(rows.map((row) => row[field].length));
  const byType = groupBy(rows, 'a');
  return Math.max(...TYPES.map((a) => Math.abs(mean(byType[a].map((row) => row[field].length)) - overall) / overall));
}

const hasFigure = (text) => /\d/.test(text);

// The share of answers (0 to 1) of each type whose description shows a figure.
const figureShareByType = (rows) => Object.fromEntries(
  TYPES.map((a) => [a, rows.filter((row) => row.a === a && hasFigure(row.desc)).length / rows.filter((row) => row.a === a).length]),
);

const choose = (n, k) => Array.from({ length: k }, (_, i) => Math.log(n - i) - Math.log(i + 1)).reduce((sum, v) => sum + v, 0);
const pmf = (n, k, p) => Math.exp(choose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));

// The least number of hits out of `n` that guessing would reach with probability at most `alpha`.
function surprising(n, p, alpha) {
  let tail = 0;
  for (let k = n; k >= 0; k -= 1) {
    tail += pmf(n, k, p);
    if (tail > alpha) return k + 1;
  }
  return 0;
}

module.exports = {
  TYPES,
  rowsOf,
  sceneOf,
  words,
  pickTheBalanced,
  firstWordHits,
  lineHits,
  lengthSpread,
  hasFigure,
  figureShareByType,
  surprising,
};
