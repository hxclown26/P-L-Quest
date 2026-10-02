'use strict';

// The month-close screen (OI per month against the plan, and what the month did to the
// meters) and the rescue screen that follows a zero.

const anim = require('../../ui/anim');
const layout = require('../../ui/layout');
const rules = require('../../year/rules');
const view = require('../../ui/year-view');
const { toneOf } = require('../../ui/view');
const { tx, num, signed } = require('../../ui/tx');
const P = require('../palette');
const { rect } = require('../draw');
const ui = require('../ui');
const { drawStatement } = require('../scenes/statement');
const frame = require('./frame');

// The chart is a column of horizontal bars, one per month, 3 pixels for each point of margin.
const CHART = Object.freeze({ title: 4, top: 13, pitch: 8, labelRight: 18, barX: 22, scale: 3 });
const READOUT_Y = 5;
const TEXT_TOP = 17;
const TEXT_ROWS = 8;
const TEXT_WRAP = 40;
const RESCUE_ROWS = 9;
const ROW_H = 9;
const RESCUE_SKY = Object.freeze(['#4a1018', '#14040a']);

const oiColor = (oi) => {
  if (oi >= rules.PLAN_OI) return P.green;
  if (oi >= rules.RESCUE_GOAL) return P.orange;
  return P.red;
};

const barWidth = (oi) => Math.max(1, Math.round(Math.max(oi, 0) * CHART.scale));

// "plan" in gold at the corner of the chart, naming the gold dashed line.
function drawLegend(ctx, app, c) {
  const label = tx(app, 'year.walk.plan').toLowerCase();
  ui.textRight(ctx, label, c.x + c.w - 5, c.y + CHART.title, P.gold);
}

// Twelve rows, one per month; the month that just closed has a bright label and a cap on its bar.
function drawChart(ctx, app) {
  const run = app.year;
  const c = layout.SIDE;
  ui.windowBox(ctx, c.x, c.y, c.w, c.h);
  ui.text(ctx, tx(app, 'year.close.chart'), c.x + 6, c.y + CHART.title, P.gray);
  drawLegend(ctx, app, c);
  const left = c.x + CHART.barX;
  const top = c.y + CHART.top;
  const planX = left + barWidth(rules.PLAN_OI);
  for (let y = top - 2; y < top + 12 * CHART.pitch; y += 4) rect(ctx, planX, y, 1, 2, P.gold);
  view.chartBars(run).forEach(({ month, oi }, i) => {
    const y = top + i * CHART.pitch;
    const current = month === run.monthIdx + 1;
    ui.textRight(ctx, String(month), c.x + CHART.labelRight, y, current ? P.white : P.dim);
    if (oi === null) return;
    rect(ctx, left, y + 1, barWidth(oi), 5, oiColor(oi));
    if (current) rect(ctx, left + barWidth(oi), y, 2, 7, P.white);
  });
}

// OI at the close and how far it moved since the month before (the plan for month 1).
function drawReadout(ctx, app, d) {
  const { closes, lastClose } = app.year;
  const previous = closes.length > 1 ? closes[closes.length - 2].oi : rules.PLAN_OI;
  const change = lastClose.oi - previous;
  const head = `OI ${num(app, lastClose.oi)}%`;
  ui.text(ctx, head, d.x + 8, d.y + READOUT_Y, oiColor(lastClose.oi));
  ui.text(ctx, `(${signed(app, change)} pp)`, d.x + 8 + ui.textWidth(head) + 6, d.y + READOUT_Y, P[toneOf(change)]);
}

// Bills and meter effects first; the constant monthly wear goes last.
const orderedLines = (lines) => [...lines.slice(1), lines[0]];

// Rows that do not fit end in "...", so a cut is never silent.
function fitRows(rows, max) {
  if (rows.length <= max) return rows;
  return [...rows.slice(0, max - 1), { text: '...', tone: 'gray' }];
}

function drawClose(ctx, app) {
  const run = app.year;
  frame.drawBackdrop(ctx);
  drawStatement(ctx, app, { pl: run.pl, before: run.lastClose.plBefore, progress: anim.rollProgress(app.phaseT) });
  frame.drawPlate(ctx, tx(app, 'year.close.title', { m: run.monthIdx + 1 }), P.area.finance);
  drawChart(ctx, app);
  const d = layout.DIALOGUE;
  ui.windowBox(ctx, d.x, d.y, d.w, d.h);
  drawReadout(ctx, app, d);
  rect(ctx, d.x + 4, d.y + TEXT_TOP - 4, d.w - 8, 1, P.winShade);
  const rows = fitRows(ui.wrapLines(orderedLines(view.closeLines(app)), TEXT_WRAP), TEXT_ROWS);
  ui.paragraph(ctx, rows, d.x + 6, d.y + TEXT_TOP, ROW_H);
}

function drawRescue(ctx, app) {
  const run = app.year;
  frame.drawBackdrop(ctx, RESCUE_SKY[0], RESCUE_SKY[1]);
  drawStatement(ctx, app, { pl: run.pl });
  frame.drawPlate(ctx, tx(app, 'year.rescue.title'), P.red);
  frame.drawArtWindow(ctx, app, 'alert');
  frame.drawReviewBadge(ctx, app);
  frame.drawMeters(ctx, app);
  const d = layout.DIALOGUE;
  ui.windowBox(ctx, d.x, d.y, d.w, d.h);
  ui.paragraph(ctx, ui.wrapLines(view.rescueLines(app), TEXT_WRAP).slice(0, RESCUE_ROWS), d.x + 6, d.y + 6, ROW_H);
}

module.exports = { drawClose, drawRescue, TEXT_ROWS, TEXT_WRAP, RESCUE_ROWS, orderedLines, fitRows };
