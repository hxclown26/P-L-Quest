'use strict';

// The 5x7 font had no row below the baseline, so g, j, p, q and y were squeezed into the letters' own
// height ("Direct Chg" read "Direct Cha"). The cell now has one row below the baseline for their tails;
// nothing else about the font moves, so no screen is laid out differently.

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pixelsOf, CELL_W, CELL_H, SUPPORTED_CHARS } = require('../src/render/font');

const TAILS = 'gjpqy';
const BASELINE_ROW = 8;
const TAIL_ROW = 9;

const key = ([x, y]) => `${x},${y}`;
const setOf = (ch) => new Set(pixelsOf(ch).map(key));
const rowOf = (ch, row) => pixelsOf(ch).filter(([, y]) => y === row).map(([x]) => x);
const apart = (a, b) => {
  const left = setOf(a);
  const right = setOf(b);
  return [...left].filter((p) => !right.has(p)).length + [...right].filter((p) => !left.has(p)).length;
};

test('the glyph cell is 6 wide and 10 tall: two rows for accents, seven for the letters, one for tails', () => {
  assert.equal(CELL_W, 6);
  assert.equal(CELL_H, 10);
});

test('g, j, p, q and y reach one row below the baseline and no other glyph does', () => {
  [...SUPPORTED_CHARS].forEach((ch) => {
    const below = pixelsOf(ch).some(([, y]) => y >= TAIL_ROW);
    assert.equal(below, TAILS.includes(ch), `${ch} ${TAILS.includes(ch) ? 'has no tail' : 'has a tail'}`);
  });
});

test('every tail hangs from the letter: a pixel on the baseline row touches one on the tail row', () => {
  [...TAILS].forEach((ch) => {
    const joined = rowOf(ch, TAIL_ROW).some((x) => [x - 1, x, x + 1].some((near) => rowOf(ch, BASELINE_ROW).includes(near)));
    assert.ok(joined, `${ch} has a loose tail`);
  });
});

test('every glyph stays inside its cell and keeps the column of spacing free', () => {
  [...SUPPORTED_CHARS].forEach((ch) => {
    pixelsOf(ch).forEach(([x, y]) => {
      assert.ok(x >= 0 && x < CELL_W - 1, `${ch} paints column ${x}`);
      assert.ok(y >= 0 && y < CELL_H, `${ch} paints row ${y}`);
    });
  });
});

test('the other 105 glyphs are exactly as they were', () => {
  const kept = [...SUPPORTED_CHARS].filter((ch) => !TAILS.includes(ch));
  const digest = crypto.createHash('sha1').update(JSON.stringify(kept.map((ch) => [ch, pixelsOf(ch)]))).digest('hex');
  assert.equal(kept.length, 105);
  assert.equal(digest, '09b63cb5c6fd435100ee8d7bb30bc20a1d6710da');
});

test('g can no longer be taken for 9, s, a, q, y or j: each is at least 3 pixels away', () => {
  ['9', 's', 'a', 'q', 'y', 'j'].forEach((other) => {
    assert.ok(apart('g', other) >= 3, `g and ${other} differ by ${apart('g', other)} pixels`);
  });
});

test('p and q are mirror twins, and neither is a capital P in disguise', () => {
  assert.ok(apart('p', 'P') >= 3, 'p is not P');
  assert.ok(apart('p', 'q') >= 3, 'p is not q');
});
