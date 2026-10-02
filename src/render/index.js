'use strict';

const anim = require('../ui/anim');
const layout = require('../ui/layout');
const screenFx = require('../ui/screen-fx');
const P = require('./palette');
const hud = require('./scenes/hud');
const { drawBattle } = require('./scenes/battle');
const screens = require('./scenes/screens');
const yearScreens = require('./year/index');

const PLAY_SCREENS = Object.freeze({
  control: screens.drawRoom,
  final: screens.drawFinal,
  dead: screens.drawDead,
});

const OVERLAYS = Object.freeze({ note: screens.drawNote, ...yearScreens.OVERLAYS });

function drawScene(ctx, app) {
  if (app.scene === 'title') return screens.drawTitle(ctx, app);
  if (app.scene === 'intro') return screens.drawIntro(ctx, app);
  if (yearScreens.SCENES[app.scene]) return yearScreens.SCENES[app.scene](ctx, app);
  return (PLAY_SCREENS[app.run.phase] || drawBattle)(ctx, app);
}

// A screen that has just opened comes out of the dark.
function drawVeil(ctx, app) {
  const alpha = anim.fadeAlpha(app.phaseT);
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = P.ink;
  ctx.fillRect(0, 0, layout.W, layout.PLAY_H);
  ctx.globalAlpha = 1;
}

// Draws one whole frame for the given app state. A shake pushes the scene by whole pixels; the veil,
// the overlays and the footer stay where they are.
function drawFrame(ctx, app) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = P.ink;
  ctx.fillRect(0, 0, layout.W, layout.H);
  const shake = screenFx.screenShake(app);
  const shaken = shake.dx !== 0 || shake.dy !== 0;
  if (shaken) {
    ctx.save();
    ctx.translate(shake.dx, shake.dy);
  }
  drawScene(ctx, app);
  if (shaken) ctx.restore();
  drawVeil(ctx, app);
  if (app.overlay) OVERLAYS[app.overlay](ctx, app);
  hud.drawFooter(ctx, app);
}

module.exports = { drawFrame };
