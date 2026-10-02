'use strict';

// The workshop screens: its small menu, the team setup and the facilitator's ranking (a table with
// the OI margin of every team month by month, the problems where they split, and the decision
// map of the selected team).

const layout = require('../../ui/layout');
const view = require('../../ui/year-view');
const { WORKSHOP_ITEMS } = require('../../ui/workshop-app');
const { rankedTeams, noticeText } = require('../../ui/rank-view');
const { tx, num } = require('../../ui/tx');
const { formatCode } = require('../../rng');
const rules = require('../../year/rules');
const { splits } = require('../../year/standings');
const P = require('../palette');
const { rect, line } = require('../draw');
const ui = require('../ui');
const hud = require('../scenes/hud');
const { DECISION_COLOR } = require('./frame');
const menus = require('./menus');

const TEAM_COLORS = Object.freeze([P.green, P.cyan, P.gold, P.orange, '#c8a0f8', '#f898c8', P.red, P.white]);
const VOICES = Object.freeze(['cliente', 'planta', 'entorno', 'estrategia']);
const TYPES = Object.freeze(['smart', 'temp', 'plac', 'ign']);
const BODY = Object.freeze({ x: 4, y: 21, w: 248, h: 166 });
const TABLE = Object.freeze({ top: 37, step: 10, rows: 8 });
const PLOT = Object.freeze({ left: 30, right: 238, top: 134, bottom: 174, max: 30 });
const SELECTED_ROW = 'rgba(248,208,72,0.22)';

const teamColor = (team) => TEAM_COLORS[team.color % TEAM_COLORS.length];
const caret = (app) => (Math.floor(app.t * 2) % 2 === 0 ? '_' : ' ');
const outcomeColor = (outcome) => hud.TIER_COLOR[view.OUTCOME_TIER[outcome]];

// ---------------------------------------------------------------- menu and setup

function drawWorkshopMenu(ctx, app) {
  menus.drawHeader(ctx, app, 'normal');
  const p = layout.MENU.panel;
  ui.windowBox(ctx, p.x, p.y, p.w, p.h);
  ui.textCenter(ctx, tx(app, 'ws.title'), 128, p.y + 7, P.gold);
  WORKSHOP_ITEMS.forEach((id, i) => {
    menus.drawMenuRow(ctx, app, tx(app, `ws.${id}`), tx(app, `ws.${id}.desc`), i, i === app.workshopIdx);
  });
}

function drawField(ctx, app, box, value, placeholder, focused) {
  ui.windowBox(ctx, box.x, box.y, box.w, box.h, { selected: focused });
  const shown = value === '' ? placeholder : value;
  ui.text(ctx, `${shown}${focused ? caret(app) : ''}`, box.x + 5, box.y + 4, value === '' ? P.dim : P.white);
}

function drawSetup(ctx, app) {
  menus.drawHeader(ctx, app, 'normal');
  const p = layout.MENU.panel;
  const { name, code, field, notice } = app.setup;
  ui.windowBox(ctx, p.x, p.y, p.w, p.h);
  ui.textCenter(ctx, tx(app, 'ws.setup.title'), 128, p.y + 7, P.gold);
  ui.text(ctx, tx(app, 'ws.setup.name'), 14, layout.SETUP.name.y + 4, P.gray);
  ui.text(ctx, tx(app, 'ws.setup.code'), 14, layout.SETUP.code.y + 4, P.gray);
  drawField(ctx, app, layout.SETUP.name, name, tx(app, 'ws.team.default'), field === 0);
  drawField(ctx, app, layout.SETUP.code, code, '0000', field === 1);
  const start = layout.SETUP.start;
  ui.windowBox(ctx, start.x, start.y, start.w, start.h, { selected: field === 2 });
  ui.textCenter(ctx, tx(app, 'ws.setup.start'), start.x + start.w / 2, start.y + 5, P.gold);
  ui.paragraph(ctx, ui.wrapLines([{ text: tx(app, 'ws.setup.hint'), tone: 'gray' }], 38), 12, 170);
  if (notice) ui.text(ctx, noticeText(app, notice), 12, p.y + p.h - 9, P.red);
}

// ---------------------------------------------------------------- the ranking

const RANK_VIEWS = Object.freeze([drawRankTable, drawRankSplit, drawRankMap]);

// The strip with the title, a dot per view (the current one is lit) and the game of the ranking.
function drawRankFrame(ctx, app) {
  rect(ctx, 0, 0, layout.W, layout.PLAY_H, '#0a0e26');
  ui.windowBox(ctx, 4, 3, 248, 16);
  ui.text(ctx, tx(app, 'rank.title'), 10, 8, P.gold);
  const { rank } = app;
  RANK_VIEWS.forEach((_, i) => rect(ctx, 130 + i * 8, 9, 5, 5, i === rank.view ? P.gold : P.dim));
  if (rank.code !== null) ui.textRight(ctx, tx(app, 'rank.code', { code: formatCode(rank.code) }), 246, 8, P.gray);
  ui.windowBox(ctx, BODY.x, BODY.y, BODY.w, BODY.h);
}

// The line under the body: the latest notice, and what is being typed.
function drawEntry(ctx, app) {
  const { rank } = app;
  const notice = rank.notice;
  if (notice) ui.text(ctx, noticeText(app, notice), 8, 191, notice.kind === 'ok' ? P.green : P.orange);
  else ui.text(ctx, tx(app, 'rank.hint'), 8, 191, P.dim);
  ui.text(ctx, tx(app, 'rank.entry'), 8, 201, P.gray);
  const x = 8 + 6 * (tx(app, 'rank.entry').length + 1);
  const room = Math.floor((246 - x) / 6) - 1;
  if (rank.entry === '') ui.text(ctx, tx(app, 'rank.entry.empty'), x, 201, P.dim);
  else ui.text(ctx, `${rank.entry.slice(-room)}${caret(app)}`, x, 201, P.white);
}

function drawTableRows(ctx, app, all, ranked) {
  const header = [[tx(app, 'rank.col.team'), 22], [tx(app, 'rank.col.result'), 98]];
  header.forEach(([label, x]) => ui.text(ctx, label, x, 25, P.gray));
  ui.textRight(ctx, tx(app, 'rank.col.oi'), 200, 25, P.gray);
  ui.text(ctx, tx(app, 'rank.col.weak'), 212, 25, P.gray);
  rect(ctx, 10, 34, 232, 1, P.winShade);
  all.slice(0, TABLE.rows).forEach((team, i) => {
    const y = TABLE.top + i * TABLE.step;
    const listed = ranked.includes(team);
    if (i === app.rank.selected) rect(ctx, 7, y - 2, 238, 10, SELECTED_ROW);
    ui.text(ctx, listed ? String(i + 1) : '-', 10, y, P.dim);
    ui.text(ctx, team.name, 22, y, listed ? teamColor(team) : P.dim);
    if (!listed) {
      ui.text(ctx, tx(app, 'rank.other'), 98, y, P.orange);
      return;
    }
    ui.text(ctx, tx(app, `rank.res.${team.outcome}`), 98, y, outcomeColor(team.outcome));
    ui.textRight(ctx, `${num(app, team.margin)}%`, 200, y, P.white);
    const weakKey = rules.weakest(team.meters);
    ui.text(ctx, `${tx(app, `year.meterTag.${weakKey}`)} ${Math.round(team.meters[weakKey])}`, 212, y, P.gray);
  });
}

// OI margin month by month for every ranked team, with the plan as a dashed line.
function drawChart(ctx, app, ranked) {
  const { left, right, top, bottom, max } = PLOT;
  ui.text(ctx, tx(app, 'rank.chart'), left + 6, 124, P.gray);
  rect(ctx, left, bottom, right - left, 1, P.winShade);
  rect(ctx, left, top, 1, bottom - top, P.winShade);
  const y = (value) => bottom - Math.round((Math.max(0, Math.min(max, value)) * (bottom - top)) / max);
  const x = (month) => left + Math.round((month * (right - left)) / 11);
  for (let px = left; px < right; px += 4) rect(ctx, px, y(rules.PLAN_OI), 2, 1, P.gold);
  [[0, '0'], [rules.PLAN_OI, '15'], [max, '30']].forEach(([value, label]) => {
    ui.textRight(ctx, label, left - 3, y(value) - 3, P.dim);
  });
  [0, 5, 11].forEach((month) => ui.text(ctx, String(month + 1), x(month) - 2, bottom + 3, P.dim));
  const order = [...ranked].sort((a, b) => (a === ranked[app.rank.selected] ? 1 : 0) - (b === ranked[app.rank.selected] ? 1 : 0));
  order.forEach((team) => {
    const color = teamColor(team);
    team.series.forEach((value, month) => {
      if (month > 0) line(ctx, x(month - 1), y(team.series[month - 1]), x(month), y(value), color);
      rect(ctx, x(month) - 1, y(value) - 1, 2, 2, color);
    });
  });
}

function drawRankTable(ctx, app) {
  const { ranked, all } = rankedTeams(app.rank);
  if (all.length === 0) {
    ui.textCenter(ctx, tx(app, 'rank.empty'), 128, 95, P.gray);
    return;
  }
  drawTableRows(ctx, app, all, ranked);
  drawChart(ctx, app, ranked);
}

// Where the teams chose differently: each problem with one coloured square per ranked team, in
// the order of the ranking.
function drawRankSplit(ctx, app) {
  const { ranked } = rankedTeams(app.rank);
  ui.text(ctx, tx(app, 'rank.split.title'), 10, 25, P.gold);
  TYPES.reduce((x, a) => {
    ui.text(ctx, tx(app, `year.tag.${a}`), x, 35, DECISION_COLOR[a]);
    return x + 6 * (tx(app, `year.tag.${a}`).length + 1);
  }, 10);
  const found = splits(ranked, 6);
  if (found.length === 0) {
    ui.textCenter(ctx, tx(app, 'rank.split.none'), 128, 100, P.gray);
    return;
  }
  ranked.forEach((_, i) => ui.text(ctx, String(i + 1), 12 + i * 16, 46, P.dim));
  found.forEach((item, row) => {
    const top = 56 + row * 22;
    ui.text(ctx, tx(app, `year.${item.problemId}.title`), 10, top, P.white);
    item.byTeam.forEach((a, i) => {
      if (a !== null) rect(ctx, 10 + i * 16, top + 10, 13, 8, DECISION_COLOR[a]);
    });
  });
}

// The year of one team as a grid: a row per month, a column per voice, coloured by the kind of
// answer chosen, next to its numbers.
function drawRankMap(ctx, app) {
  const { all } = rankedTeams(app.rank);
  const team = all[app.rank.selected];
  if (!team) {
    ui.textCenter(ctx, tx(app, 'rank.empty'), 128, 95, P.gray);
    return;
  }
  ui.text(ctx, tx(app, 'rank.map.title', { name: team.name }), 10, 25, teamColor(team));
  VOICES.forEach((voice, c) => ui.text(ctx, tx(app, `rank.voice.${voice}`), 40 + c * 30, 36, P.gray));
  for (let month = 0; month < 12; month += 1) ui.textRight(ctx, String(month + 1), 28, 47 + month * 11, P.dim);
  team.decisions.forEach((d) => {
    rect(ctx, 36 + VOICES.indexOf(d.voice) * 30, 46 + d.monthIdx * 11, 26, 8, DECISION_COLOR[d.a]);
  });
  const x = 164;
  ui.text(ctx, tx(app, `rank.res.${team.outcome}`), x, 36, outcomeColor(team.outcome));
  ui.text(ctx, `${num(app, team.margin)}%`, x, 46, P.white);
  TYPES.forEach((a, i) => {
    rect(ctx, x, 62 + i * 11, 8, 8, DECISION_COLOR[a]);
    ui.text(ctx, `${tx(app, `year.tag.${a}`)} ${team.counts[a]}`, x + 12, 63 + i * 11, P.gray);
  });
  if (team.rescued) ui.text(ctx, tx(app, 'rank.map.rescued', { m: team.rescueMonth }), x - 20, 112, P.orange);
  if (team.bankruptMonth) ui.text(ctx, tx(app, 'rank.map.bankrupt', { m: team.bankruptMonth }), x - 20, 124, P.red);
  team.series.forEach((value, month) => {
    const h = Math.max(1, Math.round((Math.max(0, value) * 40) / PLOT.max));
    rect(ctx, x + month * 7, 178 - h, 5, h, value >= rules.PLAN_OI ? P.green : value >= rules.RESCUE_GOAL ? P.orange : P.red);
  });
}

function drawRank(ctx, app) {
  drawRankFrame(ctx, app);
  RANK_VIEWS[app.rank.view](ctx, app);
  drawEntry(ctx, app);
}

module.exports = { drawWorkshopMenu, drawSetup, drawRank, TEAM_COLORS };
