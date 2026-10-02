'use strict';

// The answers of the year must not give themselves away. These audits read the texts the way a
// player who ignores the finance would: the words, the first word of a name, the length, the line
// label. Every audit runs on the 48 problems of the year, in Spanish and in English.
//
// "Surprising" means a reader who only guessed would do that well with probability under alpha.
// Against the shortcut, the tempting alternative, alpha is 2%: the words must not tell it from the
// balanced answer. Against giving in and doing nothing, and when picking one of the four, the
// meaning of the answer (postpone, concede) is part of the content and always leaks a little, so
// only a blatant leak (alpha 0.1%) fails.

const test = require('node:test');
const assert = require('node:assert/strict');
const tells = require('./helpers/tells');
const { PROBLEMS } = require('../src/year/problems');
const es = require('../src/content/es');
const en = require('../src/content/en');

const IDS = PROBLEMS.map((problem) => problem.id);
const DICTS = Object.freeze({ es, en });
const ALPHA_SHORTCUT = 0.02;
const ALPHA_MEANING = 0.001;
const MAX_LENGTH_SPREAD = 0.08;
const MAX_NAME_SPREAD = 0.12;
const MIN_SCENES_WITH_FIGURE = 0.8;
const MIN_ANSWERS_WITH_FIGURE = 0.4;
const FIGURE_GAP = 0.15;
const MAX_FIRST_WORD_SHARE = 0.25;

// Runs a check on every language and fails once with every problem found, so one language does not
// hide the other.
function everyLanguage(check) {
  const failures = Object.entries(DICTS).flatMap(([lang, dict]) => check(lang, tells.rowsOf(dict, IDS), dict)
    .map((message) => `${lang}: ${message}`));
  assert.deepEqual(failures, []);
}

// A guess-rate audit: no message when `result` stays under what guessing would reach with chance
// `alpha`, one message otherwise.
function underGuessing(label, { hits, n, chance }, alpha) {
  const limit = tells.surprising(n, chance, alpha);
  return hits < limit ? [] : [`${label}: ${hits} of ${n} (guessing reaches ${limit - 1} at most)`];
}

test('the words alone do not tell the balanced answer from the shortcut', () => {
  everyLanguage((lang, rows) => underGuessing('balanced vs shortcut', tells.pickTheBalanced(rows, ['temp']), ALPHA_SHORTCUT));
});

test('the words alone do not betray the balanced answer beyond what the meaning of each answer gives away', () => {
  everyLanguage((lang, rows) => [
    ...underGuessing('balanced vs giving in', tells.pickTheBalanced(rows, ['plac']), ALPHA_MEANING),
    ...underGuessing('balanced vs doing nothing', tells.pickTheBalanced(rows, ['ign']), ALPHA_MEANING),
    ...underGuessing('the balanced one among the four', tells.pickTheBalanced(rows), ALPHA_MEANING),
  ]);
});

test('the first word of a name does not give its type away', () => {
  everyLanguage((lang, rows) => underGuessing('first word', tells.firstWordHits(rows), ALPHA_SHORTCUT));
});

test('no word opens more than a quarter of the names of one type', () => {
  everyLanguage((lang, rows) => tells.TYPES.flatMap((a) => {
    const names = rows.filter((row) => row.a === a).map((row) => row.name.split(' ')[0].toLowerCase());
    const top = Math.max(...names.map((word) => names.filter((other) => other === word).length));
    return top / names.length <= MAX_FIRST_WORD_SHARE ? [] : [`${a}: one word opens ${top} of ${names.length} names`];
  }));
});

test('the line label an answer shows does not give its type away', () => {
  everyLanguage((lang, rows) => underGuessing('line label', tells.lineHits(rows), ALPHA_SHORTCUT));
});

test('no type of answer is longer than the others: the longest text is not the right one', () => {
  everyLanguage((lang, rows) => {
    const spread = tells.lengthSpread(rows, 'desc');
    const names = tells.lengthSpread(rows, 'name');
    return [
      ...(spread <= MAX_LENGTH_SPREAD ? [] : [`descriptions differ by ${(100 * spread).toFixed(1)}% between types`]),
      ...(names <= MAX_NAME_SPREAD ? [] : [`names differ by ${(100 * names).toFixed(1)}% between types`]),
    ];
  });
});

test('the scenes and the answers carry figures, and every type carries about as many', () => {
  everyLanguage((lang, rows, dict) => {
    const scenes = IDS.filter((id) => tells.hasFigure(tells.sceneOf(dict, id))).length / IDS.length;
    const share = tells.figureShareByType(rows);
    const overall = rows.filter((row) => tells.hasFigure(row.desc)).length / rows.length;
    return [
      ...(scenes >= MIN_SCENES_WITH_FIGURE ? [] : [`${(100 * scenes).toFixed(0)}% of the scenes have a figure`]),
      ...(overall >= MIN_ANSWERS_WITH_FIGURE ? [] : [`${(100 * overall).toFixed(0)}% of the descriptions have a figure`]),
      ...tells.TYPES.filter((a) => Math.abs(share[a] - overall) > FIGURE_GAP)
        .map((a) => `${a}: ${(100 * share[a]).toFixed(0)}% carry a figure against ${(100 * overall).toFixed(0)}% overall`),
    ];
  });
});

const smartLines = () => PROBLEMS.map((problem) => problem.options.find((option) => option.a === 'smart').line);

test('the balanced answers also save on incentives and on SG&A, not only on sales and cost', () => {
  const lines = smartLines();
  const count = (line) => lines.filter((other) => other === line).length;
  assert.ok(count('incentives') >= 4, `incentives: ${count('incentives')} balanced answers`);
  assert.ok(count('sga') >= 8, `sga: ${count('sga')} balanced answers`);
});

test('no line holds more than 40% of the balanced answers', () => {
  const lines = smartLines();
  for (const line of new Set(lines)) {
    const share = lines.filter((other) => other === line).length / lines.length;
    assert.ok(share <= 0.4, `${line} holds ${(100 * share).toFixed(0)}% of the balanced answers`);
  }
});
