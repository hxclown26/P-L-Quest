'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SHOWCASE, showcaseRun } = require('../src/year/showcase');
const { OUTCOMES } = require('../src/year/rules');
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

test('the showcase shows the ladder: blows of the meters, a restructuring plan that is not enough and a bankruptcy by the P&L', () => {
  const runs = SHOWCASE.map((entry, i) => showcaseRun(i));
  assert.ok(runs.some((run) => run.shocks.length >= 3), 'no entry shows the meters hitting zero');
  assert.ok(runs.some((run) => run.rescued && run.outcome !== 'bankrupt'), 'no entry shows the restructuring plan');
  assert.ok(runs.some((run) => run.outcome === 'bankrupt' && run.bankruptCause === 'pl'), 'no entry shows a bankruptcy');
});

test('one entry shows what the OI hides: a healthy margin and a ruined unit', () => {
  const hidden = SHOWCASE.map((entry, i) => showcaseRun(i)).filter((run) => oiOf(run) >= 15 && run.outcome === 'terrible');
  assert.ok(hidden.length >= 1, 'no entry has a margin above the plan and a terrible year');
});

test('the showcase shows both ways growth and profit part ways: sales without margin, and margin without sales', () => {
  const { shapeOf } = require('../src/year/kpis');
  const shapes = SHOWCASE.map((entry, i) => shapeOf(showcaseRun(i).pl));
  assert.ok(shapes.includes('growthNoMargin'), 'no entry sells more and earns less');
  assert.ok(shapes.includes('marginNoGrowth'), 'no entry keeps its margin by shrinking');
});

test('the showcase is deterministic and frozen', () => {
  assert.deepEqual(showcaseRun(2), showcaseRun(2));
  assert.ok(Object.isFrozen(SHOWCASE) && SHOWCASE.every((entry) => Object.isFrozen(entry)));
});

test('showcaseRun rejects an unknown entry', () => {
  assert.throws(() => showcaseRun(99), /No showcase entry/);
});
