'use strict';

// A row of the P&L that just moved is green when it helped the business and red when it hurt it. Colour alone
// is not enough (some people cannot tell them apart), so each of those rows also carries a small triangle in the
// free slot at the right of its number: pointing up when it helped, down when it hurt.

const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/model');
const layout = require('../src/ui/layout');
const statement = require('../src/ui/statement');
const P = require('../src/render/palette');
const { drawStatement, ARROW_GAP } = require('../src/render/scenes/statement');
const { recorder } = require('./helpers/screen');

const app = { lang: 'es', t: 1, phaseT: 5, calm: false };
const rowTop = (index) => layout.STATEMENT.y + layout.STATEMENT_ROWS.top + index * layout.STATEMENT_ROWS.pitch;
// Where the number of a positive row ends (its closing bracket slot is the free space the arrow uses).
const NUMBER_EDGE = layout.STATEMENT.x + layout.STATEMENT.w - 6 - 6;

// The triangles drawn in the statement: every 5 px wide row of a triangle is a fill at the arrow column.
function arrows(before, after) {
  const { ctx, fills } = recorder();
  drawStatement(ctx, app, { pl: after, before, progress: 1 });
  const x = NUMBER_EDGE + ARROW_GAP;
  const rows = statement.statementRows(after);
  return rows.flatMap((row, i) => {
    const base = fills.filter((f) => f.x === x && f.w === 5 && f.h === 1 && f.y >= rowTop(i) && f.y < rowTop(i) + layout.STATEMENT_ROWS.pitch);
    if (base.length === 0) return [];
    const apex = fills.find((f) => f.x === x + 2 && f.w === 1 && f.h === 1 && f.y >= rowTop(i) && f.y < rowTop(i) + layout.STATEMENT_ROWS.pitch);
    return [{ id: row.id, up: apex.y < base[0].y, color: base[0].color }];
  });
}

const BEFORE = model.BASE_PL;

test('each row that moved carries one triangle, pointing at what it did for the business', () => {
  const after = model.applyOp(BEFORE, { op: 'oi', line: 'sales', pts: 2 });
  const expected = statement.rowChanges(BEFORE, after).filter((c) => !statement.isNegative(statement.statementRows(after).find((r) => r.id === c.id)));
  assert.ok(expected.length >= 4, 'a change in sales moves several rows');
  const drawn = arrows(BEFORE, after);
  assert.deepEqual(drawn.map((a) => a.id).sort(), expected.map((c) => c.id).sort(), 'one triangle for each row that moved, and none for the others');
  drawn.forEach((a) => {
    const dir = expected.find((c) => c.id === a.id).dir;
    assert.equal(a.up, dir > 0, `${a.id}: the triangle points ${a.up ? 'up' : 'down'}`);
    assert.equal(a.color, dir > 0 ? P.green : P.red, `${a.id}: and it has the colour of the number`);
  });
});

test('a cost that grows is a triangle pointing down in red: worse, even though the number went up', () => {
  const after = model.applyOp(BEFORE, { op: 'add', line: 'cost', pts: 3 });
  const cost = arrows(BEFORE, after).find((a) => a.id === 'cost');
  assert.equal(cost.up, false);
  assert.equal(cost.color, P.red);
  const cheaper = model.applyOp(BEFORE, { op: 'add', line: 'cost', pts: -3 });
  assert.equal(arrows(BEFORE, cheaper).find((a) => a.id === 'cost').up, true, 'and a cost that shrinks points up');
});

test('nothing moved, nothing marked', () => {
  assert.deepEqual(arrows(BEFORE, BEFORE), []);
});

test('a number in brackets keeps its bracket in the slot and gets no triangle', () => {
  const loss = model.applyOp(BEFORE, { op: 'oi', line: 'sga', pts: -40 });
  const rows = statement.statementRows(loss);
  assert.ok(rows.find((r) => r.id === 'oi').value < 0, 'the OI is a loss');
  const marked = arrows(BEFORE, loss).map((a) => a.id);
  assert.ok(!marked.includes('oi'), 'the loss row has no triangle');
  assert.ok(marked.includes('sga'), 'the other rows that moved still do');
});
