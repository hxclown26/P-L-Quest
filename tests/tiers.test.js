'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const tiers = require('../src/tiers');

test('tierFor maps OI to the factory states', () => {
  assert.equal(tiers.tierFor(-3), 'collapse');
  assert.equal(tiers.tierFor(0), 'collapse');
  assert.equal(tiers.tierFor(Number.NaN), 'collapse');
  assert.equal(tiers.tierFor(0.1), 'edge');
  assert.equal(tiers.tierFor(4.99), 'edge');
  assert.equal(tiers.tierFor(5), 'worn');
  assert.equal(tiers.tierFor(9.99), 'worn');
  assert.equal(tiers.tierFor(10), 'normal');
  assert.equal(tiers.tierFor(15.99), 'normal');
  assert.equal(tiers.tierFor(16), 'modern');
  assert.equal(tiers.tierFor(18.99), 'modern');
  assert.equal(tiers.tierFor(19), 'hightech');
  assert.equal(tiers.tierFor(40), 'hightech');
});

test('the starting OI of 15 is a normal factory, so gains are visible', () => {
  assert.equal(tiers.tierFor(15), 'normal');
});

test('tierDirection tells whether the factory improved, worsened or stayed', () => {
  assert.equal(tiers.tierDirection('normal', 'modern'), 'up');
  assert.equal(tiers.tierDirection('modern', 'worn'), 'down');
  assert.equal(tiers.tierDirection('normal', 'normal'), 'same');
});
