'use strict';

// The structure of the 48 problems of the year: who they are about, which lines their answers move and how.

const test = require('node:test');
const assert = require('node:assert/strict');
const { PROBLEMS, VOICES, LINES } = require('../src/year/problems');
const { SEGMENT_IDS } = require('../src/year/segments');

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('every problem is about one of the four segments, and each segment has three problems of every voice', () => {
  assert.deepEqual([...SEGMENT_IDS].sort(), ['food', 'hospital', 'hotel', 'industry']);
  PROBLEMS.forEach((problem) => assert.ok(SEGMENT_IDS.includes(problem.segment), `${problem.id}: segment ${problem.segment}`));
  for (const voice of VOICES) {
    for (const segment of SEGMENT_IDS) {
      const n = PROBLEMS.filter((p) => p.voice === voice && p.segment === segment).length;
      assert.equal(n, 3, `${voice} x ${segment}: ${n} problems`);
    }
  }
});

test('every answer says how its OI is spread over the lines: weights that add up to one, and its line is the heaviest', () => {
  PROBLEMS.forEach((problem) => problem.options.forEach((option) => {
    assert.ok(Array.isArray(option.mix) && option.mix.length >= 1, `${problem.id} ${option.a}: no mix`);
    assert.ok(near(option.mix.reduce((sum, [, weight]) => sum + weight, 0), 1), `${problem.id} ${option.a}: the weights add up to ${option.mix.reduce((sum, [, w]) => sum + w, 0)}`);
    option.mix.forEach(([line]) => assert.ok(LINES.includes(line), `${problem.id} ${option.a}: line ${line}`));
    const heaviest = option.mix.reduce((best, pair) => (Math.abs(pair[1]) > Math.abs(best[1]) ? pair : best));
    assert.equal(option.line, heaviest[0], `${problem.id} ${option.a}: the chip names the heaviest line`);
  }));
});

test('a red line is always one of the shortcuts, and a growth answer names its line and moves price, volume or service', () => {
  PROBLEMS.forEach((problem) => problem.options.forEach((option) => {
    if (option.redLine) assert.equal(option.a, 'temp', `${problem.id} ${option.a}: a red line is a shortcut that crosses the rules`);
    if (option.grow) {
      assert.ok(LINES.includes(option.line), `${problem.id} ${option.a}: growth line`);
      assert.ok(option.grow.volume || option.grow.price || (option.grow.adds && option.grow.adds.length), `${problem.id} ${option.a}: growth with nothing in it`);
    }
  }));
});
