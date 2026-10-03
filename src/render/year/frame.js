'use strict';

// The furniture shared by the year screens: the background, the voice plate, the picture
// window, the reviewer badge and the OI / meter gauges.

const anim = require('../../ui/anim');
const fx = require('../../ui/fx');
const layout = require('../../ui/layout');
const { operatingMargin } = require('../../model');
const { tierFor } = require('../../tiers');
const screenFx = require('../../ui/screen-fx');
const rules = require('../../year/rules');
const { tx } = require('../../ui/tx');
const P = require('../palette');
const { rect, bands } = require('../draw');
const ui = require('../ui');
const { TIER_COLOR } = require('../scenes/hud');
const { drawArt, ART_W, ART_H } = require('./art');

// The four kinds of answer have one colour each, wherever they are shown.
const DECISION_COLOR = Object.freeze({ smart: P.green, temp: P.orange, plac: P.cyan, ign: P.red });
const VOICE_AREA = Object.freeze({ cliente: 'sales', planta: 'ops', entorno: 'procurement', estrategia: 'mgmt' });
// The gauges window: four bars one under the other, then up to two rows of notes.
const GAUGES = Object.freeze({ top: 6, pitch: 10, bar: Object.freeze({ x: 26, y: 1, w: 84, h: 5 }), notes: Object.freeze([46, 55]) });
const OI_SCALE = 25;
// After an answer a gauge drains (or fills) over GAUGE_SECONDS and leaves a pale ghost of what it lost for GHOST_SECONDS.
const GAUGE_DELAY = 0.15;
const GAUGE_SECONDS = 0.4;
const GHOST_SECONDS = 0.3;
const GHOST_ALPHA = 0.45;

const meterColor = (value) => {
  if (value >= rules.FLYWHEEL) return P.green;
  if (value >= rules.DRAG_BELOW) return P.white;
  if (value >= rules.CRISIS) return P.orange;
  return P.red;
};

function drawBackdrop(ctx, top = '#1c2658', bottom = '#080c24') {
  bands(ctx, 0, 0, layout.W, layout.PLAY_H, top, bottom, 4);
}

// A coloured stamp with the voice that raises the problem (client, plant, environment...).
function drawPlate(ctx, label, color) {
  const { x, y, w, h } = layout.PLATE;
  ui.windowBox(ctx, x, y, w, h, { alpha: 0.95 });
  rect(ctx, x + 4, y + 3, ui.textWidth(label) + 6, 9, color);
  ui.text(ctx, label, x + 7, y + 4, P.white);
}

const voiceColor = (voice) => P.area[VOICE_AREA[voice]];

function drawArtWindow(ctx, app, theme, mood = screenFx.sceneMood(app)) {
  const { x, y, w, h } = layout.ART;
  ui.windowBox(ctx, x, y, w, h);
  drawArt(ctx, theme, x + Math.floor((w - ART_W) / 2), y + Math.floor((h - ART_H) / 2), app.t, mood);
}

// "Month 3 - 2/4" in the corner of the picture.
function drawStage(ctx, app) {
  const { monthIdx, problemIdx } = app.year;
  const label = tx(app, 'year.stage', { m: monthIdx + 1, p: problemIdx + 1 });
  ui.textRight(ctx, label, layout.ART.x + layout.ART.w - 5, layout.ART.y + 35, P.white, { shadow: P.ink });
}

// The segment the problem is about (hotels, hospitals, food, industry), in the top left corner of the picture, on a dark
// chip so it reads over a pale sky or the snow too.
const SEGMENT_CHIP_ALPHA = 0.78;
function drawSegmentTag(ctx, app, problem) {
  const { x, y } = layout.ART;
  const label = tx(app, `year.seg.${problem.segment}`);
  ctx.globalAlpha = SEGMENT_CHIP_ALPHA;
  rect(ctx, x + 3, y + 3, ui.textWidth(label) + 4, 9, P.ink);
  ctx.globalAlpha = 1;
  ui.text(ctx, label, x + 5, y + 4, P.white);
}

// Reviewer mode: a badge and the exact meter values over the picture, on the right so the segment keeps the left corner.
function drawReviewBadge(ctx, app) {
  if (!app.review) return;
  const { x, y, w } = layout.ART;
  ui.textRight(ctx, tx(app, 'year.review.on'), x + w - 5, y + 4, P.red, { shadow: P.ink });
  const { C, P: plant, E } = app.year.meters;
  const values = [['C', C], ['P', plant], ['E', E]].map(([key, value]) => `${tx(app, `year.meterTag.${key}`)[0]}${Math.round(value)}`).join(' ');
  ui.textRight(ctx, values, x + w - 5, y + 14, P.white, { shadow: P.ink });
}

function drawGauge(ctx, row, label, fraction, color, marks, blink = false, ghost = null) {
  const { x, y } = layout.DASH;
  const top = y + GAUGES.top + row * GAUGES.pitch;
  const bx = x + GAUGES.bar.x;
  ui.text(ctx, label, x + 6, top, blink ? P.red : color === P.white ? P.gray : color);
  ui.bar(ctx, bx, top + GAUGES.bar.y, GAUGES.bar.w, GAUGES.bar.h, fraction, color);
  if (ghost && ghost.alpha > 0 && ghost.from > fraction) {
    const from = bx + Math.round(GAUGES.bar.w * fraction);
    ctx.globalAlpha = ghost.alpha;
    rect(ctx, from, top + GAUGES.bar.y, Math.round(GAUGES.bar.w * ghost.from) - Math.round(GAUGES.bar.w * fraction), GAUGES.bar.h, P.white);
    ctx.globalAlpha = 1;
  }
  marks.forEach(([at, tick]) => rect(ctx, bx + Math.round(GAUGES.bar.w * at), top, 1, 7, tick));
}

// One short row under the bars: a crisis warning or, for the reviewer, what an answer does.
function drawNotes(ctx, notes) {
  const { x, y } = layout.DASH;
  notes.slice(0, GAUGES.notes.length).forEach(({ text, color }, i) => ui.text(ctx, text, x + 6, y + GAUGES.notes[i], color));
}

// OI against the plan (and the rescue goal once rescued) plus the three meters, with ticks
// where the meters start to cost OI (42) and where the crisis begins (32). `atStake` is the
// meter the current problem is about; it blinks when it is in crisis.
function drawMeters(ctx, app, { notes = [], atStake = null } = {}) {
  const { x, y, w, h } = layout.DASH;
  const run = app.year;
  ui.windowBox(ctx, x, y, w, h, { alpha: 0.95 });
  // On the result of an answer the gauges go from their old value to the new one (calm mode shows the new one).
  const answered = run.phase === 'result' && run.last ? run.last : null;
  const settling = answered !== null && !app.calm;
  const k = settling ? anim.grow(app.phaseT, GAUGE_DELAY, GAUGE_SECONDS) : 1;
  const fade = settling ? GHOST_ALPHA * (1 - anim.grow(app.phaseT, GAUGE_DELAY + GAUGE_SECONDS, GHOST_SECONDS)) : 0;
  const ease = (was, now) => (settling ? was + (now - was) * k : now);
  const oi = operatingMargin(run.pl);
  const oiWas = answered ? answered.oiBefore : oi;
  const oiMarks = [[rules.PLAN_OI / OI_SCALE, P.white], ...(run.rescued ? [[rules.RESCUE_GOAL / OI_SCALE, P.gold]] : [])];
  const oiGhost = settling ? { from: Math.max(oiWas, 0) / OI_SCALE, alpha: fade } : null;
  drawGauge(ctx, 0, 'OI', Math.max(ease(oiWas, oi), 0) / OI_SCALE, TIER_COLOR[tierFor(oi)], oiMarks, false, oiGhost);
  const meterMarks = [[rules.CRISIS / 100, P.red], [rules.DRAG_BELOW / 100, P.orange]];
  ['C', 'P', 'E'].forEach((key, i) => {
    const now = run.meters[key];
    const was = answered ? now - answered.delta[key] : now;
    const crossed = settling && fx.crossedDown(was, now, [rules.DRAG_BELOW, rules.CRISIS]) && fx.pulseOn(app.phaseT);
    const blink = (key === atStake && Math.floor(app.t * 3) % 2 === 0) || crossed;
    const ghost = settling ? { from: was / 100, alpha: fade } : null;
    drawGauge(ctx, i + 1, tx(app, `year.meterTag.${key}`), ease(was, now) / 100, meterColor(now), meterMarks, blink, ghost);
  });
  drawNotes(ctx, notes);
}

module.exports = {
  drawBackdrop,
  drawPlate,
  drawArtWindow,
  drawStage,
  drawSegmentTag,
  drawReviewBadge,
  drawMeters,
  voiceColor,
  meterColor,
  DECISION_COLOR,
};
