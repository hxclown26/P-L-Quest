'use strict';

const engine = require('../../engine');
const { tierFor } = require('../../tiers');
const layout = require('../../ui/layout');
const view = require('../../ui/view');
const { tx, num } = require('../../ui/tx');
const P = require('../palette');
const { rect } = require('../draw');
const ui = require('../ui');
const hud = require('./hud');
const { drawStatement } = require('./statement');
const { drawSky, drawFactory } = require('../factory');
const { drawHero } = require('../bosses');

const SKY_H = layout.PLAY_H;
const ROOM_WRAP = 38;
const ROOM_ROWS = 6;

function drawTitle(ctx, app) {
  drawSky(ctx, 0, 0, layout.W, SKY_H, 'normal', app.t);
  drawFactory(ctx, 'normal', 8, 80, app.t, 2);
  ui.textRight(ctx, tx(app, 'ui.fictional'), 252, 4, P.white, { shadow: P.ink });
  ui.textCenter(ctx, tx(app, 'ui.title'), 128, 16, P.gold, { scale: 3, shadow: '#7a4a10' });
  ui.textCenter(ctx, tx(app, 'ui.subtitle'), 128, 46, P.white, { shadow: P.ink });
  if (Math.floor(app.t * 2) % 2 === 0) ui.textCenter(ctx, tx(app, 'ui.press'), 128, 60, P.white, { shadow: P.ink });
  const es = tx(app, 'lang.es');
  const en = tx(app, 'lang.en');
  const total = ui.textWidth(`${es} / ${en}`);
  const x = Math.round(128 - total / 2);
  ui.text(ctx, es, x, 72, app.lang === 'es' ? P.gold : P.dim, { shadow: P.ink });
  ui.text(ctx, ' / ', x + ui.textWidth(es), 72, P.white, { shadow: P.ink });
  ui.text(ctx, en, x + ui.textWidth(`${es} / `), 72, app.lang === 'en' ? P.gold : P.dim, { shadow: P.ink });
  if (app.best > 0) ui.textCenter(ctx, tx(app, 'ui.best', { n: app.best }), 128, 202, P.white, { shadow: P.ink });
}

function drawIntro(ctx, app) {
  drawSky(ctx, 0, 0, layout.W, SKY_H, 'normal', app.t);
  drawFactory(ctx, 'normal', 68, 6, app.t, 1);
  drawHero(ctx, 38, 70, app.t);
  ui.windowBox(ctx, 4, 78, 248, 148);
  const rows = ui.wrapLines([
    { text: tx(app, 'ui.intro1') },
    { text: ' ' },
    { text: tx(app, 'ui.intro2') },
  ], 38);
  ui.paragraph(ctx, rows, 12, 88);
}

// The control room: the statement with the line of the room marked, the factory in the state the
// OI has left it in, and what the room is about in the window below.
function drawRoom(ctx, app) {
  const { run } = app;
  const tier = tierFor(engine.oiOf(run));
  drawSky(ctx, 0, 0, layout.W, SKY_H, tier, app.t);
  drawFactory(ctx, tier, 132, 8, app.t, 1);
  ui.textCenter(ctx, tx(app, `tier.${tier}`), 192, 82, hud.TIER_COLOR[tier], { shadow: P.ink });
  drawStatement(ctx, app, { focus: run.room });
  const d = layout.DIALOGUE;
  ui.windowBox(ctx, d.x, d.y, d.w, d.h);
  ui.text(ctx, `${tx(app, 'ui.room')} - ${tx(app, `room.${run.room}.title`)}`, d.x + 8, d.y + 6, P.gold);
  rect(ctx, d.x + 4, d.y + 17, d.w - 8, 1, P.winShade);
  const rows = ui.wrapLines([{ text: tx(app, `room.${run.room}.body`) }], ROOM_WRAP);
  ui.paragraph(ctx, rows.slice(0, ROOM_ROWS), d.x + 8, d.y + 22, 9);
  ui.text(ctx, tx(app, 'ui.saved'), d.x + 8, d.y + d.h - 12, P.green);
}

function drawFinal(ctx, app) {
  const { run } = app;
  const oi = engine.oiOf(run);
  const tier = tierFor(oi);
  const stars = engine.starsFor(run);
  drawSky(ctx, 0, 0, layout.W, SKY_H, tier, app.t);
  drawFactory(ctx, tier, 68, 2, app.t, 1);
  ui.textCenter(ctx, tx(app, 'ui.result'), 128, 72, P.gold, { shadow: P.ink });
  [0, 1, 2].forEach((i) => ui.star(ctx, 128 - 31 + i * 22, 82, i < stars));
  const summary = `${tx(app, 'ui.finalOi', { n: num(app, oi) })}  ${tx(app, `tier.${tier}`)}`;
  ui.textCenter(ctx, summary, 128, 94, hud.TIER_COLOR[tier], { shadow: P.ink });
  const criteria = [
    tx(app, 'ui.star1'),
    tx(app, 'ui.star2', { n: engine.MIN_OI }),
    tx(app, 'ui.star3', { n: engine.GOAL_OI }),
  ];
  criteria.forEach((label, i) => ui.text(ctx, label, 36, 106 + i * 10, i < stars ? P.green : P.dim, { shadow: P.ink }));
  ui.windowBox(ctx, 4, 140, 248, 86);
  const rows = ui.wrapLines(view.lessons(app).map((text) => ({ text })), 40);
  ui.paragraph(ctx, rows.slice(0, 8), 10, 148);
}

function drawDead(ctx, app) {
  const shake = app.phaseT < 0.8 ? Math.round(Math.sin(app.phaseT * 60) * 2) : 0;
  drawSky(ctx, 0, 0, layout.W, SKY_H, 'collapse', app.t);
  drawFactory(ctx, 'collapse', 68 + shake, 6, app.t, 1);
  ui.textCenter(ctx, tx(app, 'ui.gameOver'), 128, 78, P.red, { scale: 2, shadow: P.ink });
  ui.windowBox(ctx, 4, 98, 248, 128);
  ui.text(ctx, tx(app, 'ui.autopsy'), 12, 106, P.gold);
  const rows = ui.wrapLines(view.autopsyLines(app).map((text) => ({ text })), 38);
  ui.paragraph(ctx, rows.slice(0, 11), 12, 120);
}

function drawNote(ctx, app) {
  ctx.fillStyle = 'rgba(0,0,12,0.6)';
  ctx.fillRect(0, 0, layout.W, layout.H);
  const keys = view.noteKeys(app);
  ui.windowBox(ctx, 10, 30, 236, 150);
  ui.text(ctx, tx(app, keys.title), 20, 40, P.gold);
  rect(ctx, 20, 52, 216, 1, P.winShade);
  ui.paragraph(ctx, ui.wrapLines([{ text: tx(app, keys.body) }], 37), 20, 60);
}

module.exports = { drawTitle, drawIntro, drawRoom, drawFinal, drawDead, drawNote, ROOM_WRAP, ROOM_ROWS };
