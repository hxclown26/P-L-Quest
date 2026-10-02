'use strict';

const engine = require('../../engine');
const { CARDS } = require('../../content/cards');
const { FLOORS } = require('../../content/floors');
const { tierFor } = require('../../tiers');
const anim = require('../../ui/anim');
const layout = require('../../ui/layout');
const view = require('../../ui/view');
const { tx, signed } = require('../../ui/tx');
const P = require('../palette');
const { rect } = require('../draw');
const ui = require('../ui');
const hud = require('./hud');
const { drawStatement } = require('./statement');
const { drawBackdrop } = require('../backdrops');
const { drawBoss } = require('../bosses');

const WRAP = 40;
const MESSAGE_WRAP = 40;
const MESSAGE_ROWS = 10;
const REVEAL_ROWS = 9;
const ROW_H = 9;
const SELECTED_ROW = 'rgba(248,208,72,0.22)';

function bossMood(app) {
  const { run } = app;
  if (run.phase !== 'turnResult') return 'idle';
  if (run.last.delta.oi < -0.05) return 'happy';
  return run.last.delta.oi > 0.05 && app.phaseT < 0.8 ? 'hit' : 'idle';
}

const CHIP_GAP = 6;
const chipsWidth = (items) => items.reduce((sum, item) => sum + item.width, 0) + CHIP_GAP * Math.max(0, items.length - 1);

// The last chips are the ones left out when the row has no room for all of them.
const fitChips = (items, room) => (chipsWidth(items) <= room || items.length <= 1 ? items : fitChips(items.slice(0, -1), room));

// The levers a card touches, right aligned on its row, after the name.
function drawChips(ctx, app, card, right, limit, y) {
  const items = view.chipsFor(card).map((chip) => {
    const label = tx(app, chip.key);
    return { chip, label, width: ui.textWidth(label) + (chip.dir ? 7 : 0) };
  });
  const shown = fitChips(items, right - limit);
  shown.reduce((x, { chip, label, width }) => {
    ui.text(ctx, label, x, y, P.gray);
    if (chip.dir) ui.triangle(ctx, x + ui.textWidth(label), y + 1, chip.dir, P.white);
    return x + width + CHIP_GAP;
  }, right - chipsWidth(shown));
}

function drawCardRow(ctx, app, id, i) {
  const card = CARDS[id];
  const r = layout.answerRect(i);
  const selected = i === app.cursor;
  if (selected) {
    rect(ctx, r.x, r.y, r.w, r.h, SELECTED_ROW);
    if (Math.floor(app.t * 3) % 2 === 0) ui.text(ctx, '>', r.x + 3, r.y + 1, P.gold);
  }
  const name = tx(app, `card.${id}.name`);
  ui.text(ctx, name, r.x + 12, r.y + 1, selected ? P.white : P.gray);
  drawChips(ctx, app, card, r.x + r.w - 4, r.x + 12 + ui.textWidth(name) + 8, r.y + 1);
}

// The area (sales, plant...) that owns the highlighted card, as a coloured tag.
function drawAreaTag(ctx, app, card, d) {
  const tag = tx(app, `area.tag.${card.area}`);
  const w = ui.textWidth(tag) + 4;
  const x = d.x + d.w - 6 - w;
  rect(ctx, x, d.y + d.titleY - 1, w, 9, P.area[card.area]);
  ui.text(ctx, tag, x + 2, d.y + d.titleY, P.white);
}

function drawTurn(ctx, app) {
  const { run } = app;
  const floor = FLOORS[run.floorIdx];
  const card = CARDS[run.hand[app.cursor]];
  const d = layout.DIALOGUE;
  ui.windowBox(ctx, d.x, d.y, d.w, d.h);
  ui.text(ctx, tx(app, 'ui.stage', { f: floor.id, n: run.turn + 1 }), d.x + 6, d.y + d.titleY, P.gold);
  drawAreaTag(ctx, app, card, d);
  const said = ui.wrapLines([{ text: tx(app, `floor.${floor.id}.t${run.turn + 1}`) }], WRAP);
  ui.paragraph(ctx, anim.revealRows(said, anim.typedChars(app.phaseT)), d.x + 6, d.y + d.sceneY, ROW_H);
  rect(ctx, d.x + 4, d.y + d.firstRule, d.w - 8, 1, P.winShade);
  run.hand.forEach((id, i) => drawCardRow(ctx, app, id, i));
  rect(ctx, d.x + 4, d.y + d.secondRule, d.w - 8, 1, P.winShade);
  const desc = ui.wrapLines([{ text: tx(app, `card.${card.id}.desc`) }], WRAP);
  ui.paragraph(ctx, desc, d.x + 6, d.y + d.detailY, ROW_H);
}

function drawMessage(ctx, app, rows) {
  const d = layout.DIALOGUE;
  ui.windowBox(ctx, d.x, d.y, d.w, d.h);
  ui.paragraph(ctx, ui.wrapLines(rows, MESSAGE_WRAP).slice(0, MESSAGE_ROWS), d.x + 8, d.y + 4, ROW_H);
}

function drawFloorIntro(ctx, app) {
  const { run } = app;
  const floor = FLOORS[run.floorIdx];
  const boss = tx(app, `boss.${floor.boss}`);
  drawMessage(ctx, app, [
    { text: tx(app, 'ui.appears', { boss }), tone: 'gold' },
    { text: `${tx(app, 'ui.floor', { n: floor.id })} - ${tx(app, `floor.${floor.id}.name`)}`, tone: 'white' },
    { text: tx(app, `floor.${floor.id}.place`), tone: 'gray' },
    ...view.entryLines(app),
    { text: tx(app, `floor.${floor.id}.t1`), tone: 'cyan' },
  ]);
}

function drawReveal(ctx, app) {
  const d = layout.DIALOGUE;
  ui.windowBox(ctx, d.x, d.y, d.w, d.h);
  ui.paragraph(ctx, ui.wrapLines(view.revealLines(app), WRAP).slice(0, REVEAL_ROWS), d.x + 8, d.y + 8, ROW_H);
}

function drawFloorOutro(ctx, app) {
  const { run } = app;
  const impact = view.floorImpact(run);
  const tier = tierFor(engine.oiOf(run));
  drawMessage(ctx, app, [
    { text: tx(app, 'ui.floorDone', { n: FLOORS[run.floorIdx].id }), tone: 'gold' },
    { text: ' ', tone: 'white' },
    { text: tx(app, 'ui.floorImpact', { delta: signed(app, impact) }), tone: view.toneOf(impact) },
    { text: tx(app, `tier.${tier}`), tone: 'white' },
  ]);
}

const PHASES = { floorIntro: drawFloorIntro, turn: drawTurn, turnResult: drawReveal, floorOutro: drawFloorOutro };

// Everything shared by the fight screens: the room, the boss, the OI panel and the P&L statement.
function drawBattle(ctx, app) {
  const { run } = app;
  const floor = FLOORS[run.floorIdx];
  const tier = tierFor(engine.oiOf(run));
  drawBackdrop(ctx, floor.id, tier, app.t);
  const slide = run.phase === 'floorIntro' ? Math.max(0, 1 - app.phaseT / 0.5) * 44 : 0;
  drawBoss(ctx, floor.boss, layout.BOSS_CENTER.x, layout.BOSS_CENTER.y - slide, app.t, bossMood(app));
  hud.drawBossPlate(ctx, app, floor);
  hud.drawOiPanel(ctx, app);
  const result = run.phase === 'turnResult';
  drawStatement(ctx, app, {
    before: result ? view.plBefore(run) : null,
    focus: floor.line,
    delta: result ? run.last.delta.oi : null,
    progress: anim.rollProgress(app.phaseT),
  });
  PHASES[run.phase](ctx, app);
}

module.exports = { drawBattle, MESSAGE_ROWS, MESSAGE_WRAP, REVEAL_ROWS };
