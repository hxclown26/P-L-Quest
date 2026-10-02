'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const anim = require('../src/ui/anim');
const model = require('../src/model');

const near = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);

test('the numbers roll from the old P&L to the new one and settle on it', () => {
  assert.equal(anim.rollProgress(0), 0);
  assert.equal(anim.rollProgress(anim.ROLL_SECONDS), 1);
  assert.equal(anim.rollProgress(60), 1, 'and stay there');
  assert.equal(anim.rollProgress(-1), 0, 'a clock below zero does not roll backwards');
  const half = anim.rollProgress(anim.ROLL_SECONDS / 2);
  assert.ok(half > 0.5 && half < 1, 'it starts fast and slows down');
});

test('blendPl sits between two P&Ls, line by line, and never changes its inputs', () => {
  const before = model.BASE_PL;
  const after = model.applyOp(before, { op: 'add', line: 'cost', pts: 4 });
  const frozen = JSON.stringify(before);
  near(anim.blendPl(before, after, 0).cost, 55);
  near(anim.blendPl(before, after, 1).cost, 59);
  near(anim.blendPl(before, after, 0.5).cost, 57);
  near(anim.blendPl(before, after, 0.5).sales, 102, 1e-9);
  assert.deepEqual(Object.keys(anim.blendPl(before, after, 0.3)).sort(), Object.keys(before).sort());
  assert.equal(JSON.stringify(before), frozen);
});

test('a blended P&L is still a P&L: its results foot at every moment of the roll', () => {
  const before = model.BASE_PL;
  const after = model.applyOp(model.applyOp(before, { op: 'volume', pct: -6 }), { op: 'add', line: 'sga', pts: 2 });
  for (const k of [0, 0.2, 0.55, 0.9, 1]) {
    const pl = anim.blendPl(before, after, k);
    near(model.operatingIncome(pl), pl.sales - pl.incentives - pl.cost - pl.freight - pl.direct - pl.sga);
  }
});

test('text is typed at a steady pace from the moment the screen opens', () => {
  assert.equal(anim.typedChars(0), 0);
  assert.equal(anim.typedChars(1), anim.TYPE_RATE);
  assert.equal(anim.typedChars(-3), 0);
  assert.ok(anim.typedChars(2) > anim.typedChars(1));
});

test('revealRows shows the first letters of the first rows and keeps the others empty', () => {
  const rows = [{ text: 'hola mundo', tone: 'white' }, { text: 'segunda', tone: 'gold' }];
  assert.deepEqual(anim.revealRows(rows, 4), [{ text: 'hola', tone: 'white' }, { text: '', tone: 'gold' }]);
  assert.deepEqual(anim.revealRows(rows, 13), [{ text: 'hola mundo', tone: 'white' }, { text: 'seg', tone: 'gold' }]);
  assert.deepEqual(anim.revealRows(rows, 999), rows);
  assert.deepEqual(anim.revealRows(rows, 0).map((r) => r.text), ['', '']);
  assert.equal(rows[0].text, 'hola mundo', 'the rows given are not touched');
});

test('a new screen fades in from dark and is fully clear after a fraction of a second', () => {
  assert.ok(anim.fadeAlpha(0) > 0.5);
  assert.equal(anim.fadeAlpha(anim.FADE_SECONDS), 0);
  assert.equal(anim.fadeAlpha(5), 0);
  assert.ok(anim.fadeAlpha(anim.FADE_SECONDS / 2) < anim.fadeAlpha(0));
});

test('a change in OI floats up from its row and fades out, then disappears', () => {
  assert.equal(anim.floatState(0), null, 'it waits a moment before it appears');
  const early = anim.floatState(anim.FLOAT_DELAY + 0.1);
  const late = anim.floatState(anim.FLOAT_DELAY + anim.FLOAT_SECONDS - 0.1);
  assert.ok(early.alpha > late.alpha, 'it fades');
  assert.ok(late.rise > early.rise, 'it rises');
  assert.ok(late.rise <= anim.FLOAT_RISE);
  assert.equal(anim.floatState(anim.FLOAT_DELAY + anim.FLOAT_SECONDS + 0.01), null);
});
