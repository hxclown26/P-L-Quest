'use strict';

// The end of the year: the verdict (page 1: the factory, the numbers and the OI bridge;
// page 2: what happened and what to try next) and the GAME OVER screen that restarts the game.

const layout = require('../../ui/layout');
const rules = require('../../year/rules');
const view = require('../../ui/year-view');
const { OVER_SECONDS } = require('../../ui/year-app');
const { tx } = require('../../ui/tx');
const { formatCode } = require('../../rng');
const P = require('../palette');
const { rect } = require('../draw');
const ui = require('../ui');
const hud = require('../scenes/hud');
const { drawSky, drawFactory } = require('../factory');
const frame = require('./frame');
const report = require('./report');

const SKY_H = 94;
const TITLE_SKY_H = 26;
const TITLE_Y = 8;
const FEEDBACK_WRAP = 38;
const FEEDBACK_ROWS = 15;
const GAUGE = Object.freeze({ x: 136, bar: 24, barW: 62, valueRight: 248, rowStep: 12 });
const BRIDGE = Object.freeze({ x: 4, y: 98, w: 248, h: 128, axisX: 138, axisW: 100, axisMax: 35 });
const BRIDGE_ROW = 10;
const TITLE_BAND = 'rgba(12,12,28,0.62)';

const tierColor = (v) => hud.TIER_COLOR[v.tier];

// The code of the game in the corner of a page, so two screenshots can be told to be the same year.
function drawCodeTag(ctx, app, box) {
  if (app.year.seed === null) return;
  const code = tx(app, 'year.intro.code', { code: formatCode(app.year.seed) });
  ui.textRight(ctx, code, box.x + box.w - 8, box.y + box.h - 12, P.dim);
}

function drawTitle(ctx, app, v) {
  rect(ctx, 0, TITLE_Y - 4, layout.W, 22, TITLE_BAND);
  ui.textCenter(ctx, tx(app, v.titleKey), 128, TITLE_Y, tierColor(v), { scale: 2, shadow: P.ink });
}

// OI against the plan and the three meters at the end of the year.
function drawNumbers(ctx, app, v) {
  const { x, y, w, h } = { x: 130, y: 26, w: 122, h: 66 };
  ui.windowBox(ctx, x, y, w, h);
  ui.text(ctx, v.oiText, GAUGE.x, y + 6, tierColor(v));
  ui.text(ctx, v.planText, GAUGE.x, y + 16, P.gray);
  if (v.timeText) ui.textRight(ctx, v.timeText, GAUGE.valueRight, y + 16, P.gray);
  rules.METER_KEYS.forEach((key, i) => {
    const top = y + 30 + i * GAUGE.rowStep;
    const value = v.meters[key];
    const color = frame.meterColor(value);
    ui.text(ctx, tx(app, `year.meterTag.${key}`), GAUGE.x, top, P.gray);
    ui.bar(ctx, GAUGE.x + GAUGE.bar, top + 1, GAUGE.barW, 5, value / 100, color);
    [[rules.CRISIS, '#f05858'], [rules.DRAG_BELOW, '#f89848']].forEach(([at, tick]) => {
      rect(ctx, GAUGE.x + GAUGE.bar + Math.round((GAUGE.barW * at) / 100), top, 1, 7, tick);
    });
    ui.textRight(ctx, String(Math.round(value)), GAUGE.valueRight, top, color);
  });
}

function drawBridgeRow(ctx, row, y, last, color) {
  const scale = BRIDGE.axisW / BRIDGE.axisMax;
  const lo = Math.max(0, Math.min(row.from, row.to));
  const hi = Math.min(BRIDGE.axisMax, Math.max(0, Math.max(row.from, row.to)));
  const x0 = BRIDGE.x + BRIDGE.axisX + Math.round(lo * scale);
  const x1 = BRIDGE.x + BRIDGE.axisX + Math.round(hi * scale);
  ui.text(ctx, row.label, BRIDGE.x + 8, y, last ? P.white : P.gray);
  ui.textRight(ctx, row.text, BRIDGE.x + 132, y, color);
  rect(ctx, x0, y + 1, Math.max(1, x1 - x0), 5, color);
}

// Plan to real as floating bars: every P&L line that moved OI, in the order of the ladder.
function drawBridge(ctx, app, v) {
  const { x, y, w, h } = BRIDGE;
  ui.windowBox(ctx, x, y, w, h);
  ui.text(ctx, tx(app, 'year.walk.title'), x + 8, y + 6, P.gold);
  const rows = view.walkRows(app, v.walk);
  const top = y + 20;
  const planX = x + BRIDGE.axisX + Math.round((rules.PLAN_OI * BRIDGE.axisW) / BRIDGE.axisMax);
  rect(ctx, planX, top - 2, 1, rows.length * BRIDGE_ROW, P.winShade);
  rows.forEach((row, i) => {
    const last = i === rows.length - 1;
    const color = last ? tierColor(v) : P[row.tone];
    drawBridgeRow(ctx, row, top + i * BRIDGE_ROW, last, color);
  });
  drawCodeTag(ctx, app, BRIDGE);
}

function drawNumbersPage(ctx, app, v) {
  frame.drawBackdrop(ctx);
  drawSky(ctx, 0, 0, layout.W, SKY_H, v.tier, app.t);
  drawFactory(ctx, v.tier, 4, 26, app.t, 1);
  drawTitle(ctx, app, v);
  drawNumbers(ctx, app, v);
  drawBridge(ctx, app, v);
}

// The P&L of the year against the plan: money, ratios and variances.
function drawReportPage(ctx, app, v) {
  frame.drawBackdrop(ctx);
  drawSky(ctx, 0, 0, layout.W, TITLE_SKY_H, v.tier, app.t);
  drawTitle(ctx, app, v);
  report.drawReport(ctx, app, v);
  drawCodeTag(ctx, app, report.WINDOW);
}

// What happened, in the player's own terms, separated by blank rows.
function drawFeedbackPage(ctx, app, v) {
  frame.drawBackdrop(ctx);
  drawSky(ctx, 0, 0, layout.W, TITLE_SKY_H, v.tier, app.t);
  drawTitle(ctx, app, v);
  const x = 4;
  const y = 30;
  ui.windowBox(ctx, x, y, 248, 196);
  ui.text(ctx, tx(app, 'year.fb.title'), x + 8, y + 8, P.gold);
  rect(ctx, x + 8, y + 19, 232, 1, P.winShade);
  const items = v.lines.flatMap((text, i) => [
    ...(i > 0 ? [{ text: ' ' }] : []),
    { text, tone: i === 0 ? 'white' : 'gray' },
  ]);
  ui.paragraph(ctx, ui.wrapLines(items, FEEDBACK_WRAP).slice(0, FEEDBACK_ROWS), x + 8, y + 26);
}

const COPIED_SECONDS = 2;
const copiedRecently = (app) => app.t - app.copiedAt < COPIED_SECONDS;

// A workshop team's last page: the whole year in one line, ready to copy and send.
function drawCodePage(ctx, app, v) {
  frame.drawBackdrop(ctx);
  drawSky(ctx, 0, 0, layout.W, TITLE_SKY_H, v.tier, app.t);
  drawTitle(ctx, app, v);
  const x = 4;
  const y = 30;
  const { team, code, result } = app.workshop;
  ui.windowBox(ctx, x, y, 248, 196);
  ui.text(ctx, tx(app, 'ws.result.title'), x + 8, y + 8, P.gold);
  rect(ctx, x + 8, y + 19, 232, 1, P.winShade);
  ui.text(ctx, tx(app, 'ws.result.team', { name: team, code: formatCode(code) }), x + 8, y + 30, P.white);
  view.codeLines(result).forEach((row, i) => ui.text(ctx, row, x + 8, y + 50 + i * 10, P.cyan));
  ui.text(ctx, tx(app, 'ws.result.body'), x + 8, y + 100, P.gray);
  ui.text(ctx, tx(app, 'ws.result.copy'), x + 8, y + 116, P.gold);
  if (copiedRecently(app)) ui.text(ctx, tx(app, 'ws.result.copied'), x + 8, y + 132, P.green);
}

const PAGES = Object.freeze([drawNumbersPage, drawReportPage, drawFeedbackPage, drawCodePage]);

function drawVerdict(ctx, app) {
  PAGES[app.page](ctx, app, view.verdict(app));
}

// The workshop's GAME OVER keeps the code on screen: nobody leaves it by itself.
function drawWorkshopOver(ctx, app) {
  const { team, code, result } = app.workshop;
  ui.textCenter(ctx, tx(app, 'ws.result.team', { name: team, code: formatCode(code) }), 128, 142, P.white);
  view.codeLines(result).forEach((row, i) => ui.textCenter(ctx, row, 128, 154 + i * 10, P.cyan));
  ui.textCenter(ctx, tx(app, 'ws.result.copy'), 128, 180, P.gold);
  if (copiedRecently(app)) ui.textCenter(ctx, tx(app, 'ws.result.copied'), 128, 192, P.green);
}

function drawOver(ctx, app) {
  const tier = view.OUTCOME_TIER[app.year.outcome];
  frame.drawBackdrop(ctx, '#2a0c14', '#08040a');
  drawSky(ctx, 0, 0, layout.W, 80, tier, app.t);
  drawFactory(ctx, tier, 68, 8, app.t, 1);
  ui.textCenter(ctx, tx(app, 'ui.gameOver'), 128, 92, P.red, { scale: 3, shadow: P.ink });
  ui.textCenter(ctx, tx(app, `year.verdict.${app.year.outcome}`), 128, 122, hud.TIER_COLOR[tier], { shadow: P.ink });
  if (app.workshop) {
    drawWorkshopOver(ctx, app);
    return;
  }
  if (app.year.seed !== null) ui.textCenter(ctx, tx(app, 'year.intro.code', { code: formatCode(app.year.seed) }), 128, 192, P.dim);
  ui.textCenter(ctx, tx(app, 'year.over.restart'), 128, 142, P.white);
  const left = Math.max(0, Math.ceil(OVER_SECONDS - app.phaseT));
  ui.textCenter(ctx, tx(app, 'year.over.count', { n: left }), 128, 156, P.gold);
  ui.bar(ctx, 68, 172, 120, 6, 1 - app.phaseT / OVER_SECONDS, P.gold);
}

module.exports = { drawVerdict, drawOver };
