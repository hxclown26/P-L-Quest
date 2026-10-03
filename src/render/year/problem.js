'use strict';

// The three screens of one problem: its brief (who is asking and why now), the question with its four answers, and
// what happened after answering. They share the P&L statement, the voice plate, the picture and the gauges.

const layout = require('../../ui/layout');
const engine = require('../../year/engine');
const rules = require('../../year/rules');
const view = require('../../ui/year-view');
const anim = require('../../ui/anim');
const screenFx = require('../../ui/screen-fx');
const { tx, signed } = require('../../ui/tx');
const P = require('../palette');
const { rect } = require('../draw');
const fxDraw = require('../fx');
const ui = require('../ui');
const { drawStatement } = require('../scenes/statement');
const frame = require('./frame');

const WRAP = 40;
// The brief: up to five rows of text, a rule and three facts under it.
const BRIEF = Object.freeze({ rows: view.BRIEF_ROWS, ruleY: 59, factsY: 63 });
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
function drawTop(ctx, app, { before = null, focus = null, notes = [], delta = null, growth = null } = {}) {
  const run = app.year;
  const problem = engine.currentProblem(run);
  frame.drawBackdrop(ctx);
  drawStatement(ctx, app, { pl: run.pl, before, focus, delta, growth, progress: anim.rollProgress(app.phaseT) });
  frame.drawPlate(ctx, tx(app, `year.voice.${problem.voice}`), frame.voiceColor(problem.voice));
  frame.drawArtWindow(ctx, app, problem.theme);
  frame.drawStage(ctx, app);
  frame.drawSegmentTag(ctx, app, problem);
  frame.drawReviewBadge(ctx, app);
  frame.drawMeters(ctx, app, { notes, atStake: view.crisisMeter(app) });
  return problem;
}

const drawRule = (ctx, d, y) => rect(ctx, d.x + 4, d.y + y, d.w - 8, 1, P.winShade);

// The title of the problem and, once the unit has been rescued, how far it is from the goal.
function drawHeading(ctx, app, title) {
  const d = layout.DIALOGUE;
  ui.text(ctx, title, d.x + 6, d.y + d.titleY, P.gold);
  if (app.year.rescued) {
    const reached = engine.oiOf(app.year) >= rules.RESCUE_GOAL;
    ui.textRight(ctx, tx(app, 'year.goal', { n: rules.RESCUE_GOAL }), d.x + d.w - 6, d.y + d.titleY, reached ? P.green : P.orange);
  }
}

// The title of the problem and the situation in two rows (the brief already told it in full).
function drawSituation(ctx, app, problem) {
  const d = layout.DIALOGUE;
  drawHeading(ctx, app, tx(app, `year.${problem.id}.title`));
  ui.paragraph(ctx, ui.wrapLines([{ text: tx(app, `year.${problem.id}.scene`) }], WRAP), d.x + 6, d.y + d.sceneY, ROW_H);
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

// The facts of the brief, one row each: the label in gray and the value in white.
function drawFacts(ctx, facts, d) {
  facts.forEach((fact, i) => {
    const y = d.y + BRIEF.factsY + i * ROW_H;
    const label = `${fact.label}:`;
    ui.text(ctx, label, d.x + 6, y, P.gray);
    ui.text(ctx, fact.value, d.x + 6 + ui.textWidth(label) + 4, y, P.white);
  });
}

// Before the answers: who is asking and why now, typed in, and three facts to weigh it by.
function drawBrief(ctx, app) {
  drawTop(ctx, app, { notes: view.crisisLines(app).map((text) => ({ text, color: P.orange })) });
  const d = layout.DIALOGUE;
  const brief = view.briefOf(app);
  ui.windowBox(ctx, d.x, d.y, d.w, d.h);
  drawHeading(ctx, app, brief.title);
  const rows = ui.wrapLines([{ text: brief.text }], view.BRIEF_COLS).slice(0, BRIEF.rows);
  ui.paragraph(ctx, anim.revealRows(rows, anim.typedChars(app.phaseT)), d.x + 6, d.y + d.sceneY, ROW_H);
  drawRule(ctx, d, BRIEF.ruleY);
  drawFacts(ctx, brief.facts, d);
}

function drawProblem(ctx, app) {
  if (view.briefing(app)) return drawBrief(ctx, app);
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

// The sparks or smoke rise from the foot of the picture, inside its window.
const burstOrigin = () => ({ x: layout.ART.x + Math.floor(layout.ART.w / 2), y: layout.ART.y + layout.ART.h - 10 });

function drawResult(ctx, app) {
  drawTop(ctx, app, { before: app.year.last.plBefore, delta: app.year.last.delta.oi, growth: view.resultGrowth(app) });
  const plan = screenFx.resultPlan(app);
  if (plan) fxDraw.drawFlash(ctx, plan, app.phaseT);
  const d = layout.DIALOGUE;
  ui.windowBox(ctx, d.x, d.y, d.w, d.h);
  const rows = ui.wrapLines(view.resultLines(app), RESULT_WRAP).slice(0, MAX_RESULT_ROWS);
  ui.paragraph(ctx, rows, d.x + 8, d.y + 6, ROW_H);
  drawDeltaStrip(ctx, app, d.x + 8, d.y + d.h - 12);
  if (plan) fxDraw.drawBurst(ctx, plan, app.phaseT, burstOrigin(), layout.ART);
}

module.exports = { drawProblem, drawResult, drawTop, WRAP, RESULT_WRAP, MAX_RESULT_ROWS };
