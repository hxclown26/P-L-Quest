'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const text = require('../src/text');

test('wrapText keeps short text on one line', () => {
  assert.deepEqual(text.wrapText('hola mundo', 20), ['hola mundo']);
});

test('wrapText breaks on spaces without exceeding the width', () => {
  assert.deepEqual(text.wrapText('uno dos tres cuatro', 9), ['uno dos', 'tres', 'cuatro']);
});

test('wrapText hard-splits words longer than the width', () => {
  assert.deepEqual(text.wrapText('abcdefghij', 4), ['abcd', 'efgh', 'ij']);
});

test('wrapText respects explicit newlines and empty input', () => {
  assert.deepEqual(text.wrapText('a\nb', 10), ['a', 'b']);
  assert.deepEqual(text.wrapText('', 10), ['']);
});

test('formatNumber uses a comma in Spanish and a dot in English', () => {
  assert.equal(text.formatNumber(15, 'es'), '15,0');
  assert.equal(text.formatNumber(15, 'en'), '15.0');
  assert.equal(text.formatNumber(12.34, 'es'), '12,3');
  assert.equal(text.formatNumber(-2.4, 'en'), '-2.4');
});

test('formatDelta always carries a sign and never prints -0', () => {
  assert.equal(text.formatDelta(3, 'es'), '+3,0');
  assert.equal(text.formatDelta(-1.26, 'en'), '-1.3');
  assert.equal(text.formatDelta(-0.04, 'es'), '0,0');
  assert.equal(text.formatDelta(0, 'en'), '0.0');
});
