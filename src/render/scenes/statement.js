'use strict';

// The P&L window: every line in money with its ratio under it, results in bold and ratios leaning
// in blue, like the report it is modelled on. Rows that just moved are green (better) or red
// (worse); the line the highlighted answer touches carries a gold band. Both game modes use it:
// the tutorial passes nothing (its run's P&L), the year passes its own.

const { operatingMargin } = require('../../model');
const { tierFor } = require('../../tiers');
const anim = require('../../ui/anim');
const layout = require('../../ui/layout');
const statement = require('../../ui/statement');
const { tx, signed } = require('../../ui/tx');
const P = require('../palette');
const { rect } = require('../draw');
const ui = require('../ui');
const { TIER_COLOR } = require('./hud');

const PAD = 6;
const RATIO_INDENT = 6;
// Positive numbers leave the width of a closing bracket free, so the decimals of every row line up.
const BRACKET = 6;
const TOTAL_BAND = 'rgba(255,255,255,0.09)';
const FOCUS_BAND = 'rgba(248,208,72,0.28)';
const HEADER_MIN_W = 36;
const NEGLIGIBLE = 0.05;
// Where the floating change sits on the OI row: in the gap between its short label and its number.
const FLOAT_X = 50;
// A row that just moved carries a triangle in the free slot after its number (the slot a closing bracket
// takes in a loss, which is why a loss has none): up when it helped the business, down when it hurt.
const ARROW_GAP = 2;

function drawHeader(ctx, app, { x, y, w }, columnKey) {
  const { header } = layout.STATEMENT_ROWS;
  const label = tx(app, columnKey);
  const cellW = Math.max(HEADER_MIN_W, ui.textWidth(label) + 8);
  const left = x + w - PAD - cellW + 1;
  ui.text(ctx, tx(app, 'stmt.unit'), x + PAD, y + header.y + 2, P.dim);
  rect(ctx, left, y + header.y, cellW, header.h, P.header);
  ui.textCenter(ctx, label, left + Math.round(cellW / 2), y + header.y + 1, P.white);
}

// The colour of a number: its tone as a line, the factory tier for OI, green or red if it just moved.
function valueColor(row, tierColor, dir) {
  if (dir) return dir > 0 ? P.green : P.red;
  if (row.id === 'oi' || row.id === 'oi.ratio') return tierColor;
  if (row.kind === 'ratio') return P.ratio;
  return row.kind === 'total' ? P.white : P.gray;
}

// The band behind a row: gold (with a marker at its edge) for the line the highlighted answer
// moves, a light one for the results.
function drawBand(ctx, row, top, box, focus) {
  const { pitch } = layout.STATEMENT_ROWS;
  if (statement.isFocused(row, focus)) {
    rect(ctx, box.x + 3, top - 1, box.w - 6, pitch, FOCUS_BAND);
    rect(ctx, box.x + 3, top - 1, 2, pitch, P.gold);
  } else if (row.kind === 'total') {
    rect(ctx, box.x + 3, top - 1, box.w - 6, pitch, TOTAL_BAND);
  }
}

// Labels of the results are bold; numbers keep their normal weight so a zero stays a zero.
function drawRow(ctx, app, row, top, box, { tierColor, moves, focus }) {
  const ratio = row.kind === 'ratio';
  drawBand(ctx, row, top, box, focus);
  const label = ratio ? tx(app, 'stmt.ratio') : tx(app, `line.short.${row.id}`);
  const labelColor = ratio ? P.ratioLabel : row.kind === 'total' ? P.white : P.gray;
  ui.text(ctx, label, box.x + PAD + (ratio ? RATIO_INDENT : 0), top, labelColor, { bold: row.kind === 'total', slant: ratio });
  const negative = statement.isNegative(row);
  const edge = box.x + box.w - PAD - (negative ? 0 : BRACKET);
  const dir = moves.get(row.id);
  ui.textRight(ctx, statement.cellText(app, row), edge, top, valueColor(row, tierColor, dir), { slant: ratio });
  if (dir && !negative) ui.triangle(ctx, edge + ARROW_GAP, top + 2, dir, dir > 0 ? P.green : P.red);
}

// The change in OI (in points of margin) floats up from the OI row and fades out.
function drawFloat(ctx, app, delta, at, rowCount) {
  const float = anim.floatState(app.phaseT);
  if (!float || Math.abs(delta) < NEGLIGIBLE) return;
  const top = at.y + layout.STATEMENT_ROWS.top + (rowCount - 1) * layout.STATEMENT_ROWS.pitch;
  ctx.globalAlpha = float.alpha;
  ui.textCenter(ctx, `${signed(app, delta)} pp`, at.x + FLOAT_X, top - float.rise, delta > 0 ? P.green : P.red, { shadow: P.ink });
  ctx.globalAlpha = 1;
}

// `progress` (0 to 1) rolls the numbers from `before` to `pl`; the rows that changed keep their
// green or red from the start. `delta` is the change in the OI margin, floated over the OI row.
function drawStatement(ctx, app, {
  pl = app.run.pl, before = null, focus = null, column = 'stmt.col.real', at = layout.STATEMENT, progress = 1, delta = null,
} = {}) {
  const shown = before && progress < 1 ? anim.blendPl(before, pl, progress) : pl;
  ui.windowBox(ctx, at.x, at.y, at.w, at.h, { alpha: 0.95 });
  drawHeader(ctx, app, at, column);
  const look = {
    tierColor: TIER_COLOR[tierFor(operatingMargin(shown))],
    moves: new Map(before ? statement.rowChanges(before, pl).map((change) => [change.id, change.dir]) : []),
    focus,
  };
  const rows = statement.statementRows(shown);
  rows.forEach((row, i) => {
    drawRow(ctx, app, row, at.y + layout.STATEMENT_ROWS.top + i * layout.STATEMENT_ROWS.pitch, at, look);
  });
  if (before && delta !== null) drawFloat(ctx, app, delta, at, rows.length);
}

module.exports = { drawStatement, ARROW_GAP };
