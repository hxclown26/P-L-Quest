'use strict';

// The year-end report: the P&L of the year set against the plan, line by line, in money and as a
// ratio, with the variance read the way a report reads it (green when it helps the business, red
// and between brackets when it hurts). It is the page to screenshot and take to a meeting.

const statement = require('../../ui/statement');
const { tx } = require('../../ui/tx');
const P = require('../palette');
const { rect } = require('../draw');
const ui = require('../ui');

const WINDOW = Object.freeze({ x: 4, y: 30, w: 248, h: 208 });
// Vertical positions, from the top of the window.
const ROWS = Object.freeze({ titleY: 6, ruleY: 17, headerY: 21, top: 36, pitch: 9 });
// The right edge of each number column, from the left of the window.
const COLUMNS = Object.freeze([
  Object.freeze({ key: 'plan', right: 130, label: 'stmt.col.plan' }),
  Object.freeze({ key: 'real', right: 182, label: 'stmt.col.real' }),
  Object.freeze({ key: 'variance', right: 238, label: 'stmt.col.var' }),
]);
const LABEL_X = 8;
const RATIO_INDENT = 6;
// Positive numbers leave the width of a closing bracket free, so the decimals line up.
const BRACKET = 6;
const HEADER_W = 44;
const TOTAL_BAND = 'rgba(255,255,255,0.09)';
// 38 columns from the label edge leave a margin before the border of the window.
const NOTE_COLS = 38;

const VARIANCE_COLOR = Object.freeze({ '-1': P.red, 0: P.gray, 1: P.green });

// "US$ M" at the left and one blue cell over each column, like the report this is modelled on.
function drawHeader(ctx, app, box) {
  ui.text(ctx, tx(app, 'stmt.unit'), box.x + LABEL_X, box.y + ROWS.headerY + 1, P.dim);
  COLUMNS.forEach(({ right, label }) => {
    const left = box.x + right - HEADER_W + 5;
    rect(ctx, left, box.y + ROWS.headerY - 1, HEADER_W, 9, P.header);
    ui.textCenter(ctx, tx(app, label), left + HEADER_W / 2, box.y + ROWS.headerY, P.white);
  });
}

const drawNumber = (ctx, text, negative, right, y, color, slant) =>
  ui.textRight(ctx, text, right - (negative ? 0 : BRACKET), y, color, { slant });

function drawRow(ctx, app, row, y, box) {
  const ratio = row.kind === 'ratio';
  const total = row.kind === 'total';
  if (total) rect(ctx, box.x + 3, y - 1, box.w - 6, ROWS.pitch, TOTAL_BAND);
  const label = ratio ? tx(app, 'stmt.ratio') : tx(app, `line.short.${row.id}`);
  const labelColor = ratio ? P.ratioLabel : total ? P.white : P.gray;
  ui.text(ctx, label, box.x + LABEL_X + (ratio ? RATIO_INDENT : 0), y, labelColor, { bold: total, slant: ratio });
  const realColor = ratio ? P.ratio : total ? P.white : P.gray;
  const [plan, real, variance] = COLUMNS.map((column) => box.x + column.right);
  drawNumber(ctx, statement.cellText(app, row.plan), statement.isNegative(row.plan), plan, y, ratio ? P.ratio : P.gray, ratio);
  drawNumber(ctx, statement.cellText(app, row.real), statement.isNegative(row.real), real, y, realColor, ratio);
  drawNumber(ctx, statement.varianceText(app, row), row.variance < 0, variance, y, VARIANCE_COLOR[row.favorable], ratio);
}

function drawReport(ctx, app, v) {
  const box = WINDOW;
  ui.windowBox(ctx, box.x, box.y, box.w, box.h);
  ui.text(ctx, tx(app, 'year.report.title'), box.x + LABEL_X, box.y + ROWS.titleY, P.gold);
  rect(ctx, box.x + 8, box.y + ROWS.ruleY, box.w - 16, 1, P.winShade);
  drawHeader(ctx, app, box);
  v.report.forEach((row, i) => drawRow(ctx, app, row, box.y + ROWS.top + i * ROWS.pitch, box));
  const noteY = box.y + ROWS.top + v.report.length * ROWS.pitch + 5;
  ui.paragraph(ctx, ui.wrapLines([{ text: tx(app, 'year.report.note'), tone: 'dim' }], NOTE_COLS), box.x + LABEL_X, noteY, 9);
}

module.exports = { drawReport, WINDOW, ROWS, COLUMNS, LABEL_X, RATIO_INDENT, BRACKET, NOTE_COLS };
