'use strict';

// The two windows that float over any screen: the rules of the year (N), in two pages (the rules
// and the grades, then what the model rests on), and the question before abandoning a game (Esc).

const layout = require('../../ui/layout');
const view = require('../../ui/year-view');
const { tx } = require('../../ui/tx');
const P = require('../palette');
const { rect } = require('../draw');
const ui = require('../ui');

const RULES = Object.freeze({ x: 10, y: 4, w: 236, h: 228, textX: 20, titleY: 14, ruleY: 26, textY: 32, rowH: 9, gap: 3, wrap: 37, hintY: 216 });
// The grade table: the grade at the left, then the right edge of each of the two thresholds.
const GRADES = Object.freeze({ nameX: 20, oiRight: 142, meterRight: 232, count: 5 });
const QUIT_WRAP = 30;

function dim(ctx) {
  ctx.fillStyle = 'rgba(0,0,12,0.6)';
  ctx.fillRect(0, 0, layout.W, layout.H);
}

// Where everything on a page of the rules goes: the paragraphs one under the other, a few pixels
// apart, then (on the first page) the grade table. `end` is the first free row under it all.
function planRules(app, page) {
  const lines = page === 0 ? view.rulesLines(app) : view.assumptionLines(app);
  let y = RULES.textY;
  const paragraphs = lines.map((text) => {
    const rows = ui.wrapLines([{ text }], RULES.wrap);
    const placed = { rows, y };
    y += rows.length * RULES.rowH + RULES.gap;
    return placed;
  });
  if (page !== 0) return { paragraphs, table: null, end: y };
  const table = { headerY: y + 2, firstRowY: y + 3 + RULES.rowH };
  return { paragraphs, table, end: table.firstRowY + GRADES.count * RULES.rowH };
}

function drawGradeTable(ctx, app, table) {
  ui.text(ctx, tx(app, 'year.rules.hNote'), GRADES.nameX, table.headerY, P.dim);
  ui.textRight(ctx, tx(app, 'year.rules.hOi'), GRADES.oiRight, table.headerY, P.dim);
  ui.textRight(ctx, tx(app, 'year.rules.hMeter'), GRADES.meterRight, table.headerY, P.dim);
  view.gradeRows(app).forEach((row, i) => {
    const y = table.firstRowY + i * RULES.rowH;
    ui.text(ctx, row.name, GRADES.nameX, y, P[tierTone(row.tier)]);
    ui.textRight(ctx, row.oi, GRADES.oiRight, y, P.white);
    ui.textRight(ctx, row.meter, GRADES.meterRight, y, P.white);
  });
}

const tierTone = (tier) => ({ hightech: 'cyan', modern: 'green', normal: 'white', worn: 'orange', edge: 'red' }[tier]);

function drawRules(ctx, app) {
  dim(ctx);
  const page = app.rulesPage || 0;
  ui.windowBox(ctx, RULES.x, RULES.y, RULES.w, RULES.h);
  ui.text(ctx, tx(app, page === 0 ? 'year.rules.title' : 'year.assump.title'), RULES.textX, RULES.titleY, P.gold);
  rect(ctx, RULES.textX, RULES.ruleY, RULES.w - 20, 1, P.winShade);
  const plan = planRules(app, page);
  plan.paragraphs.forEach(({ rows, y }) => ui.paragraph(ctx, rows, RULES.textX, y, RULES.rowH));
  if (plan.table) drawGradeTable(ctx, app, plan.table);
  ui.text(ctx, tx(app, 'year.rules.hint', { n: page + 1 }), RULES.textX, RULES.hintY, P.dim);
}

function drawQuit(ctx, app) {
  dim(ctx);
  ui.windowBox(ctx, 28, 62, 200, 84);
  ui.text(ctx, tx(app, 'year.quit.title'), 38, 72, P.gold);
  rect(ctx, 38, 84, 180, 1, P.winShade);
  ui.paragraph(ctx, ui.wrapLines([{ text: tx(app, 'year.quit.body') }], QUIT_WRAP), 38, 92);
  ui.text(ctx, tx(app, 'year.quit.hint'), 38, 126, P.gray);
}

module.exports = { drawRules, drawQuit, planRules, RULES, GRADES };
