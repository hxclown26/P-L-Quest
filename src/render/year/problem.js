'use strict';

// The two screens of one problem: the question with its four answers, and what happened
// after answering. They share the P&L statement, the voice plate, the picture and the gauges.

const layout = require('../../ui/layout');
const engine = require('../../year/engine');
const rules = require('../../year/rules');
const view = require('../../ui/year-view');
const anim = require('../../ui/anim');
const { tx, signed } = require('../../ui/tx');
const P = require('../palette');
const { rect } = require('../draw');
const ui = require('../ui');
const { drawStatement } = require('../scenes/statement');
const frame = require('./frame');

const WRAP = 40;
const RESULT_WRAP = 38;
const MAX_RESULT_ROWS = 8;
const ROW_H = 9;
const NEGLIGIBLE = 0.05;
const TONE = frame.DECISION_COLOR;
const SELECTED_ROW = 'rgba(248,208,72,0.22)';

// What the gauges window says under its bars: what the highlighted answer does (reviewer) or
// that the meter at stake is in crisis.
function gaugeNotes(app) {
  if (app.review) {
    const review = view.cardReview(app, app.cursor);
    return review.lines.map((text) => ({ text, color: TONE[review.a] }));
  }
  return view.crisisLines(app).map((text) => ({ text, color: P.orange }));
}

// Backdrop, P&L statement, voice plate, picture and gauges. Returns the current problem.
function drawTop(ctx, app, { before = null, focus = null, notes = [], delta = null } = {}) {
  const run = app.year;
  const problem = engine.currentProblem(run);
  frame.drawBackdrop(ctx);
  drawStatement(ctx, app, { pl: run.pl, before, focus, delta, progress: anim.rollProgress(app.phaseT) });
  frame.drawPlate(ctx, tx(app, `year.voice.${problem.voice}`), frame.voiceColor(problem.voice));
  frame.drawArtWindow(ctx, app, problem.theme);
  frame.drawStage(ctx, app);
  frame.drawReviewBadge(ctx, app);
  frame.drawMeters(ctx, app, { notes, atStake: view.crisisMeter(app) });
  return problem;
}

const drawRule = (ctx, d, y) => rect(ctx, d.x + 4, d.y + y, d.w - 8, 1, P.winShade);

// The title of the problem (and the rescue goal) and the situation in two rows.
function drawSituation(ctx, app, problem) {
  const d = layout.DIALOGUE;
  ui.text(ctx, tx(app, `year.${problem.id}.title`), d.x + 6, d.y + d.titleY, P.gold);
  if (app.year.rescued) {
    const reached = engine.oiOf(app.year) >= rules.RESCUE_GOAL;
    ui.textRight(ctx, tx(app, 'year.goal', { n: rules.RESCUE_GOAL }), d.x + d.w - 6, d.y + d.titleY, reached ? P.green : P.orange);
  }
  const scene = ui.wrapLines([{ text: tx(app, `year.${problem.id}.scene`) }], WRAP);
  ui.paragraph(ctx, anim.revealRows(scene, anim.typedChars(app.phaseT)), d.x + 6, d.y + d.sceneY, ROW_H);
  drawRule(ctx, d, d.firstRule);
}

// The P&L line an answer moves; never which way it goes nor the effect on the meters.
const drawChip = (ctx, app, chip, right, y) => ui.textRight(ctx, tx(app, chip.key), right, y, P.gray);

function drawAnswer(ctx, app, card, i) {
  const r = layout.answerRect(i);
  const selected = i === app.cursor;
  if (selected) {
    rect(ctx, r.x, r.y, r.w, r.h, SELECTED_ROW);
    if (Math.floor(app.t * 3) % 2 === 0) ui.text(ctx, '>', r.x + 3, r.y + 1, P.gold);
  }
  ui.text(ctx, tx(app, card.nameKey), r.x + 12, r.y + 1, selected ? P.white : P.gray);
  if (app.review) ui.textRight(ctx, tx(app, card.tagKey), r.x + r.w - 4, r.y + 1, TONE[card.a]);
  else drawChip(ctx, app, card.chip, r.x + r.w - 4, r.y + 1);
}

// The highlighted answer in full.
function drawDetail(ctx, app, cards) {
  const d = layout.DIALOGUE;
  drawRule(ctx, d, d.secondRule);
  ui.paragraph(ctx, ui.wrapLines([{ text: tx(app, cards[app.cursor].descKey) }], WRAP), d.x + 6, d.y + d.detailY, ROW_H);
}

function drawProblem(ctx, app) {
  const cards = view.yearCards(app);
  const problem = drawTop(ctx, app, { focus: cards[app.cursor].line, notes: gaugeNotes(app) });
  const d = layout.DIALOGUE;
  ui.windowBox(ctx, d.x, d.y, d.w, d.h);
  drawSituation(ctx, app, problem);
  cards.forEach((card, i) => drawAnswer(ctx, app, card, i));
  drawDetail(ctx, app, cards);
}

// How each meter moved after the answer, e.g. "CLI +3,5".
function drawDeltaStrip(ctx, app, x, y) {
  view.meterDeltas(app.year.last).forEach(({ key, delta }, i) => {
    const cx = x + i * 76;
    const tag = tx(app, `year.meterTag.${key}`);
    const value = signed(app, delta);
    const color = delta > NEGLIGIBLE ? P.green : delta < -NEGLIGIBLE ? P.red : P.white;
    ui.text(ctx, tag, cx, y, P.gray);
    ui.text(ctx, value, cx + ui.textWidth(tag) + 4, y, color);
    if (Math.abs(delta) >= NEGLIGIBLE) {
      ui.triangle(ctx, cx + ui.textWidth(tag) + ui.textWidth(value) + 7, y + 1, delta > 0 ? 1 : -1, color);
    }
  });
}

function drawResult(ctx, app) {
  drawTop(ctx, app, { before: app.year.last.plBefore, delta: app.year.last.delta.oi });
  const d = layout.DIALOGUE;
  ui.windowBox(ctx, d.x, d.y, d.w, d.h);
  const rows = ui.wrapLines(view.resultLines(app), RESULT_WRAP).slice(0, MAX_RESULT_ROWS);
  ui.paragraph(ctx, rows, d.x + 8, d.y + 6, ROW_H);
  drawDeltaStrip(ctx, app, d.x + 8, d.y + d.h - 12);
}

module.exports = { drawProblem, drawResult, drawTop, WRAP, RESULT_WRAP, MAX_RESULT_ROWS };
