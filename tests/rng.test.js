'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mulberry32, shuffle, nextSeed } = require('../src/rng');

test('the generator is deterministic: the same seed gives the same numbers, another seed does not', () => {
  const take = (seed) => {
    const rng = mulberry32(seed);
    return [rng(), rng(), rng(), rng()];
  };
  assert.deepEqual(take(7), take(7));
  assert.notDeepEqual(take(7), take(8));
  for (const n of take(7)) assert.ok(n >= 0 && n < 1);
});

test('shuffle returns a new array with the same items and leaves the original alone', () => {
  const original = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
  const mixed = shuffle(original, mulberry32(3));
  assert.notEqual(mixed, original);
  assert.deepEqual([...mixed].sort(), [...original].sort());
  assert.deepEqual(original, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('shuffle follows the seed and spreads items over every position', () => {
  assert.deepEqual(shuffle([1, 2, 3, 4, 5], mulberry32(11)), shuffle([1, 2, 3, 4, 5], mulberry32(11)));
  const counts = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let seed = 1; seed <= 4000; seed += 1) {
    shuffle([0, 1, 2, 3], mulberry32(seed)).forEach((item, position) => { counts[item][position] += 1; });
  }
  for (const row of counts) for (const count of row) assert.ok(count > 800 && count < 1200, `count ${count}`);
});

test('nextSeed walks to a different 32-bit seed each time and is repeatable', () => {
  const a = nextSeed(1);
  assert.notEqual(a, 1);
  assert.equal(a, nextSeed(1));
  assert.notEqual(nextSeed(a), a);
  for (const seed of [0, 1, 2 ** 31, 2 ** 32 - 1]) {
    const next = nextSeed(seed);
    assert.ok(Number.isInteger(next) && next >= 0 && next < 2 ** 32);
  }
});

const { GAME_CODES, nextGameCode, formatCode, parseCode } = require('../src/rng');

test('a game code is a number from 0 to 9999 shown with four digits', () => {
  assert.equal(GAME_CODES, 10000);
  assert.equal(formatCode(42), '0042');
  assert.equal(formatCode(9999), '9999');
  assert.equal(formatCode(0), '0000');
});

test('parseCode accepts exactly four digits and nothing else', () => {
  assert.equal(parseCode('0042'), 42);
  assert.equal(parseCode(' 4821 '), 4821);
  for (const bad of ['', '42', '12345', 'abcd', '48 21', '48.2', '-123', null, undefined]) {
    assert.equal(parseCode(bad), null, String(bad));
  }
});

test('nextGameCode always gives a different valid code and is repeatable', () => {
  for (let code = 0; code < 10000; code += 37) {
    const next = nextGameCode(code);
    assert.ok(Number.isInteger(next) && next >= 0 && next < GAME_CODES, `code ${code}`);
    assert.notEqual(next, code);
    assert.equal(next, nextGameCode(code));
  }
  assert.notEqual(nextGameCode(9999), 9999);
});
