'use strict';

// Draws the flash and the particles that ui/fx.js plans. They are measured from the impact of the
// result, a moment after the screen opens, and never start before it.

const layout = require('../ui/layout');
const fx = require('../ui/fx');
const P = require('./palette');
const { rect } = require('./draw');

// A faint tint over the picture: its colour and strength come from the plan, and it is gone in 120 ms.
function drawFlash(ctx, plan, phaseT, box = layout.ART) {
  const alpha = fx.flashAlpha(phaseT - fx.IMPACT_AT, plan.flash);
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  rect(ctx, box.x, box.y, box.w, box.h, P[plan.flash.color]);
  ctx.globalAlpha = 1;
}

// The particles alive now, as small squares around `origin`, kept inside `box` so they never cover a number.
function drawBurst(ctx, plan, phaseT, origin, box) {
  if (!plan.burst) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  fx.burst(plan.burst.kind, plan.burst.seed, plan.burst.count, phaseT - fx.IMPACT_AT).forEach((p) => {
    ctx.globalAlpha = p.alpha;
    rect(ctx, origin.x + p.x, origin.y + p.y, p.size, p.size, P[p.tone]);
  });
  ctx.restore();
}

// The weather of an ending: particles that come round again inside `box`, measured against the global clock.
function drawAmbient(ctx, plan, t, box) {
  if (!plan.ambient) return;
  ctx.save();
  fx.ambient(plan.ambient.kind, plan.ambient.seed, plan.ambient.count, t, box).forEach((p) => {
    ctx.globalAlpha = p.alpha;
    rect(ctx, p.x, p.y, p.w, p.h, P[p.tone]);
  });
  ctx.restore();
}

module.exports = { drawFlash, drawBurst, drawAmbient };
