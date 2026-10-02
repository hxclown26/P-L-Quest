'use strict';

// The screen geometry of the decision screens: every window sits inside the canvas, no two windows
// overlap, and the P&L window is tall enough for every row of the statement.

const test = require('node:test');
const assert = require('node:assert/strict');
const layout = require('../src/ui/layout');
const statement = require('../src/ui/statement');
const model = require('../src/model');

const GLYPH_H = 7;
const windows = () => ({
  statement: layout.STATEMENT,
  plate: layout.PLATE,
  art: layout.ART,
  dash: layout.DASH,
  dialogue: layout.DIALOGUE,
});
const right = (box) => box.x + box.w;
const bottom = (box) => box.y + box.h;
const overlap = (a, b) => a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);

test('the canvas is 256 wide and 256 high, with the footer strip under the play area', () => {
  assert.equal(layout.W, 256);
  assert.equal(layout.H, 256);
  assert.equal(layout.FOOTER.y, layout.PLAY_H);
  assert.equal(layout.FOOTER.y + layout.FOOTER.h, layout.H);
});

test('every window of the decision screens sits inside the play area', () => {
  for (const [name, box] of Object.entries(windows())) {
    assert.ok(box.x >= 0 && right(box) <= layout.W, `${name} horizontally`);
    assert.ok(box.y >= 0 && bottom(box) <= layout.PLAY_H, `${name} vertically`);
  }
});

test('no two windows of the decision screens overlap', () => {
  const entries = Object.entries(windows());
  entries.forEach(([nameA, a], i) => {
    entries.slice(i + 1).forEach(([nameB, b]) => assert.ok(!overlap(a, b), `${nameA} overlaps ${nameB}`));
  });
});

test('the P&L window holds every row of the statement, glyphs included', () => {
  const rows = statement.statementRows(model.BASE_PL).length;
  const { top, pitch, header } = layout.STATEMENT_ROWS;
  assert.ok(top >= header.y + header.h, 'the rows start under the header');
  const lastGlyphBottom = top + (rows - 1) * pitch + GLYPH_H;
  assert.ok(lastGlyphBottom <= layout.STATEMENT.h - 1, `the last row ends at ${lastGlyphBottom} of ${layout.STATEMENT.h}`);
});

test('the right column lines up with the P&L window, top and bottom', () => {
  assert.equal(layout.PLATE.y, layout.STATEMENT.y);
  assert.equal(bottom(layout.DASH), bottom(layout.STATEMENT));
  assert.equal(bottom(layout.SIDE), bottom(layout.STATEMENT));
  assert.equal(layout.SIDE.y, layout.ART.y);
});

test('the dialogue sits right under the P&L window and its answers stay inside it', () => {
  assert.ok(layout.DIALOGUE.y - bottom(layout.STATEMENT) >= 2, 'a gap between the P&L and the dialogue');
  for (let i = 0; i < 4; i += 1) {
    const row = layout.answerRect(i);
    assert.ok(row.y >= layout.DIALOGUE.y && bottom(row) <= bottom(layout.DIALOGUE), `answer ${i}`);
  }
});
