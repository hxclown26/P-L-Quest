'use strict';

// The screens before play: the mode menu, the list of endings to watch and the introduction
// of the year. They share the sky-and-factory header of the title screen.

const layout = require('../../ui/layout');
const view = require('../../ui/year-view');
const { SHOWCASE } = require('../../year/showcase');
const { tx } = require('../../ui/tx');
const { formatCode } = require('../../rng');
const P = require('../palette');
const { rect } = require('../draw');
const ui = require('../ui');
const { drawSky, drawFactory } = require('../factory');
const { drawHero } = require('../bosses');

const HEADER_H = 78;
const INTRO_WRAP = 38;
const SELECTED_ROW = 'rgba(248,208,72,0.22)';
const blink = (app) => Math.floor(app.t * 3) % 2 === 0;

// Sky, the title block on the left and the factory (in the state of `tier`) on the right.
function drawHeader(ctx, app, tier) {
  drawSky(ctx, 0, 0, layout.W, HEADER_H, tier, app.t);
  drawFactory(ctx, tier, 132, 6, app.t, 1);
  ui.text(ctx, tx(app, 'ui.title'), 10, 14, P.gold, { scale: 2, shadow: '#7a4a10' });
  ui.wrapLines([{ text: tx(app, 'ui.subtitle') }], 21).forEach((row, i) => {
    ui.text(ctx, row.text, 10, 38 + i * 10, P.white, { shadow: P.ink });
  });
  ui.text(ctx, 'DEMO 3', 10, 64, P.orange, { shadow: P.ink });
}

// A row of a list of modes: its name, a line saying what it is and, on the full year, the best
// result so far at the right of the name. `count` is the number of rows of the list.
function drawMenuRow(ctx, app, name, description, i, selected, extra = null, count = 4) {
  const r = layout.menuRowRect(i, count);
  const top = r.y + Math.floor((r.h - 18) / 2);
  ui.windowBox(ctx, r.x, r.y, r.w, r.h, { selected });
  ui.text(ctx, name, r.x + 8, top, selected ? P.white : P.gray);
  if (extra) ui.textRight(ctx, extra, r.x + r.w - 8, top, P.gold);
  ui.text(ctx, description, r.x + 8, top + 10, selected ? P.gray : P.dim);
  if (selected && blink(app)) ui.triangle(ctx, r.x + r.w - 12, top + 11, -1, P.gold);
}

function drawMenu(ctx, app) {
  drawHeader(ctx, app, 'normal');
  const p = layout.MENU.panel;
  const items = view.menuItems(app);
  ui.windowBox(ctx, p.x, p.y, p.w, p.h);
  ui.textCenter(ctx, tx(app, 'menu.title'), 128, p.y + 7, P.gold);
  items.forEach((id, i) => {
    const best = id === 'year' ? view.bestLabel(app) : null;
    drawMenuRow(ctx, app, tx(app, `menu.${id}`), tx(app, `menu.${id}.desc`), i, i === app.menuIdx, best, items.length);
  });
  if (items.length <= 2) ui.textCenter(ctx, tx(app, 'ui.fictional'), 128, p.y + p.h - 14, P.dim);
}

// The factory behind the list shows the state the highlighted play style ends in.
function drawEndings(ctx, app) {
  drawHeader(ctx, app, view.OUTCOME_TIER[SHOWCASE[app.profileIdx].outcome]);
  const p = layout.MENU.panel;
  ui.windowBox(ctx, p.x, p.y, p.w, p.h);
  ui.textCenter(ctx, tx(app, 'menu.endings.title'), 128, p.y + 7, P.gold);
  view.PROFILE_ITEMS.forEach((id, i) => {
    const r = layout.profileRowRect(i);
    const selected = i === app.profileIdx;
    if (selected) {
      rect(ctx, r.x, r.y, r.w, r.h, SELECTED_ROW);
      rect(ctx, r.x + 4, r.y + 3, 3, 3, P.gold);
    }
    ui.text(ctx, tx(app, `profile.${id}`), r.x + 14, r.y + 2, selected ? P.white : P.gray);
  });
  const chosen = view.PROFILE_ITEMS[app.profileIdx];
  ui.text(ctx, tx(app, `profile.${chosen}.desc`), p.x + 8, p.y + p.h - 16, P.gray);
}

const CODE_DIGITS = 4;

// The code of the game: the one that will be played, or the digits typed so far with blanks for the rest.
function codeText(app) {
  const typed = app.codeEntry.length > 0;
  const code = typed ? `${app.codeEntry}${'_'.repeat(CODE_DIGITS - app.codeEntry.length)}` : formatCode(app.seed);
  return { typed, text: tx(app, 'year.intro.code', { code }) };
}

function drawYearIntro(ctx, app) {
  drawSky(ctx, 0, 0, layout.W, layout.PLAY_H, 'normal', app.t);
  drawFactory(ctx, 'normal', 150, -8, app.t, 1);
  ui.text(ctx, tx(app, 'ui.title'), 10, 10, P.gold, { scale: 2, shadow: '#7a4a10' });
  ui.text(ctx, tx(app, 'menu.year'), 10, 32, P.white, { shadow: P.ink });
  const code = codeText(app);
  ui.text(ctx, code.text, 10, 44, code.typed ? P.gold : P.gray, { shadow: P.ink });
  drawHero(ctx, 226, 58, app.t);
  ui.windowBox(ctx, 4, 60, 248, 166);
  const rows = ui.wrapLines([
    { text: tx(app, 'year.intro1') },
    { text: ' ' },
    { text: tx(app, 'year.intro2') },
    { text: ' ' },
    { text: tx(app, 'year.intro3'), tone: 'gold' },
  ], INTRO_WRAP);
  ui.paragraph(ctx, rows, 12, 70);
  ui.text(ctx, tx(app, code.typed ? 'year.intro.partial' : 'year.intro.hint'), 12, 208, code.typed ? P.orange : P.dim);
}

module.exports = { drawMenu, drawEndings, drawYearIntro, drawHeader, drawMenuRow };
