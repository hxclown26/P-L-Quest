'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SHOWCASE, showcaseRun } = require('../src/year/showcase');
const { OUTCOMES, RESCUE_GOAL } = require('../src/year/rules');
const { oiOf } = require('../src/year/engine');

test('the showcase has one entry per play style, each with its documented outcome', () => {
  assert.equal(SHOWCASE.length, 8);
  for (let i = 0; i < SHOWCASE.length; i += 1) {
    const run = showcaseRun(i);
    assert.equal(run.phase, 'final');
    assert.equal(run.outcome, SHOWCASE[i].outcome, `${SHOWCASE[i].profile} seed ${SHOWCASE[i].seed}`);
  }
});

test('the six endings can all be seen from the showcase', () => {
  const seen = new Set(SHOWCASE.map((entry, i) => showcaseRun(i).outcome));
  assert.deepEqual([...seen].sort(), [...OUTCOMES].sort());
});

test('one entry shows the comeback: rescued, then back to double-digit OI', () => {
  const comebacks = SHOWCASE.map((entry, i) => showcaseRun(i))
    .filter((run) => run.rescued && run.outcome !== 'bankrupt' && oiOf(run) >= RESCUE_GOAL);
  assert.ok(comebacks.length >= 1, 'no entry shows the rescue plan working');
});

test('the showcase is deterministic and frozen', () => {
  assert.deepEqual(showcaseRun(2), showcaseRun(2));
  assert.ok(Object.isFrozen(SHOWCASE) && SHOWCASE.every((entry) => Object.isFrozen(entry)));
});

test('showcaseRun rejects an unknown entry', () => {
  assert.throws(() => showcaseRun(99), /No showcase entry/);
});
