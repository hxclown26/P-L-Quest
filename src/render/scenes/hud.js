'use strict';

const engine = require('../../engine');
const { tierFor } = require('../../tiers');
const layout = require('../../ui/layout');
const { tx, num } = require('../../ui/tx');
const P = require('../palette');
const { rect } = require('../draw');
const ui = require('../ui');

const TIER_COLOR = Object.freeze({
  collapse: P.red, edge: P.red, worn: P.orange, normal: P.white, modern: P.green, hightech: P.cyan,
});

// The projected OI as a big number and a bar with the two marks of the tutorial (the minimum
// and the goal), with the state of the factory under it. It sits where the year mode has its gauges.
const OI_PANEL = Object.freeze({ valueY: 4, barY: 25, labelsY: 35, tierY: 46, scale: 25 });

function drawOiPanel(ctx, app) {
  const { x, y, w, h } = layout.DASH;
  const oi = engine.oiOf(app.run);
  const tier = tierFor(oi);
  const color = TIER_COLOR[tier];
  const barW = w - 12;
  ui.windowBox(ctx, x, y, w, h, { alpha: 0.95 });
  ui.text(ctx, 'OI', x + 6, y + OI_PANEL.valueY + 4, P.gray);
  ui.textRight(ctx, `${num(app, Math.max(oi, 0))}%`, x + w - 5, y + OI_PANEL.valueY, color, { scale: 2, shadow: P.ink });
  ui.bar(ctx, x + 6, y + OI_PANEL.barY, barW, 6, oi / OI_PANEL.scale, color);
  [engine.MIN_OI, engine.GOAL_OI].forEach((mark) => {
    const at = x + 6 + Math.round((barW * mark) / OI_PANEL.scale);
    rect(ctx, at, y + OI_PANEL.barY - 2, 1, 10, P.gold);
    ui.textCenter(ctx, String(mark), at, y + OI_PANEL.labelsY, P.gold);
  });
  ui.paragraph(ctx, ui.wrapLines([{ text: tx(app, `tier.${tier}`), tone: 'gray' }], 17), x + 6, y + OI_PANEL.tierY, 9);
}

function drawBossPlate(ctx, app, floor) {
  const { x, y, w, h } = layout.PLATE;
  ui.windowBox(ctx, x, y, w, h, { alpha: 0.95 });
  ui.text(ctx, tx(app, `boss.${floor.boss}`), x + 6, y + 4, P.gold);
}

const SCENE_ACTIONS = Object.freeze({
  title: 'ui.btn.start',
  menu: 'ui.btn.pick',
  yearIntro: 'ui.btn.start',
  endings: 'ui.btn.pick',
  intro: 'ui.btn.next',
  workshop: 'ui.btn.pick',
  rank: 'ui.btn.paste',
});
const DEMO_ACTIONS = Object.freeze({ turn: 'ui.btn.pick', final: 'ui.btn.again', dead: 'ui.btn.again' });
const YEAR_ACTIONS = Object.freeze({ problem: 'ui.btn.pick', over: 'ui.btn.menu' });
// The first two pages of the verdict say what the next one is.
const VERDICT_ACTIONS = Object.freeze(['ui.btn.report', 'ui.btn.feedback']);
const OVERLAY_ACTIONS = Object.freeze({ quit: 'ui.btn.quit' });
const YEAR_SCENES = Object.freeze(['yearIntro', 'year']);
const NOTE_SCENES = Object.freeze(['play', 'yearIntro', 'year']);

// What the big left button of the footer does on the current screen.
function actionKey(app) {
  if (app.overlay) return OVERLAY_ACTIONS[app.overlay] || 'ui.btn.close';
  if (app.scene === 'play') return DEMO_ACTIONS[app.run.phase] || 'ui.btn.next';
  if (app.scene === 'setup') return app.setup.field === 2 ? 'ui.btn.start' : 'ui.btn.next';
  if (app.scene === 'year') {
    if (app.year.phase === 'final' && app.page < VERDICT_ACTIONS.length) return VERDICT_ACTIONS[app.page];
    return YEAR_ACTIONS[app.year.phase] || 'ui.btn.next';
  }
  return SCENE_ACTIONS[app.scene];
}

const noteKey = (app) => (YEAR_SCENES.includes(app.scene) ? 'ui.btn.rules' : 'ui.btn.note');

// Only the tutorial floors and the year screens have something behind the N key.
const noteActive = (app) => NOTE_SCENES.includes(app.scene);

// Bottom strip: the action for the current screen plus the three global buttons.
function drawFooter(ctx, app) {
  const f = layout.FOOTER;
  rect(ctx, 0, f.y, layout.W, f.h, P.ink);
  rect(ctx, 0, f.y, layout.W, 1, '#242844');
  const [actionX, noteX, soundX, langX] = f.labelX;
  const items = [
    [tx(app, actionKey(app)), actionX, P.gold],
    [tx(app, noteKey(app)), noteX, noteActive(app) ? P.gray : P.dim],
    [tx(app, 'ui.btn.sound'), soundX, app.muted ? P.dim : P.gray],
    [tx(app, 'ui.btn.lang'), langX, P.gray],
  ];
  items.forEach(([label, x, color]) => ui.text(ctx, label, x, f.y + 3, color));
}

module.exports = { drawOiPanel, drawBossPlate, drawFooter, actionKey, noteKey, noteActive, TIER_COLOR };
