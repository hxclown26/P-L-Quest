'use strict';

// How the screens use their feedback: the month close grows its bar and counts its OI up and hits when bills fall
// due; the rescue plan flashes; the verdict has the weather of its ending and builds its bridge bar by bar; the
// menu opens with a bounce and its cursor bobs. Calm mode shows all of it already settled and without effects.

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const showcase = require('../src/year/showcase');
const layout = require('../src/ui/layout');
const fx = require('../src/ui/fx');
const anim = require('../src/ui/anim');
const screenFx = require('../src/ui/screen-fx');
const P = require('../src/render/palette');
const { drawFrame } = require('../src/render/index');
const { createApp } = require('../src/ui/app');
const { draw, textIn } = require('./helpers/screen');

const base = (extra = {}) => ({ ...createApp({ lang: 'es', muted: false, best: 0, seed: 5 }), t: 3, phaseT: 1, page: 0, ...extra });
const yearApp = (run, extra = {}) => base({ scene: 'year', year: run, ...extra });
const same = (f, want) => f.x === want.x && f.y === want.y && f.w === want.w && f.h === want.h && f.color === want.color && Math.abs((f.alpha ?? 1) - want.alpha) < 1e-9;
const isBox = (box) => (f) => f.x === box.x && f.y === box.y && f.w === box.w && f.h === box.h;

// Month 1 answered with `kind`, then its close.
function closeOf(kind) {
  let run = engine.newYear();
  for (let i = 0; i < engine.PROBLEMS_PER_MONTH; i += 1) run = engine.next(engine.choose(run, engine.options(run).findIndex((o) => o.a === kind)));
  return run;
}
const billed = (run) => ({ ...run, lastClose: { ...run.lastClose, delayedApplied: [{ because: 'm01c', meters: { C: -8.5, P: -1, E: -1 } }] } });

// Answers that do nothing until the company hits a zero and the rescue plan opens.
function toRescue() {
  let run = engine.newYear();
  for (let i = 0; i < 160 && run.phase !== 'rescue'; i += 1) {
    run = run.phase === 'problem' ? engine.choose(run, engine.options(run).findIndex((o) => o.a === 'ign')) : engine.next(run);
  }
  assert.equal(run.phase, 'rescue', 'doing nothing ends in the rescue plan');
  return run;
}

// ---- the month close ------------------------------------------------------------------------------------
const SIDE = layout.SIDE;
const barsOf = (app) => draw(app).fills.filter((f) => f.x === SIDE.x + 22 && f.h >= 5 && [P.green, P.orange, P.red].includes(f.color));
const readoutOf = (app) => textIn(draw(app).glyphs, layout.DIALOGUE)[0];

test('the bar of the month that just closed grows to its length and stops there', () => {
  const run = closeOf('smart');
  const width = (phaseT, extra = {}) => barsOf(yearApp(run, { phaseT, ...extra }))[0].w;
  const final = width(5);
  assert.ok(final > 30, `the bar of a good month is long (${final})`);
  assert.equal(width(0), 1, 'it starts as a stub');
  assert.ok(width(anim.BAR_DELAY + 0.1) > 1 && width(anim.BAR_DELAY + 0.1) < final, 'and grows in between');
  assert.ok(width(0.3) <= width(0.4) && width(0.4) <= width(0.5), 'never shrinking');
  assert.equal(width(anim.BAR_DELAY + anim.BAR_SECONDS), final);
  assert.equal(width(0, { calm: true }), final, 'calm mode shows it grown at once');
});

test('the OI of the close counts up from the month before to the new value', () => {
  const run = closeOf('smart');
  const shown = (phaseT, extra = {}) => Number(/OI (\d+),(\d)/.exec(readoutOf(yearApp(run, { phaseT, ...extra }))).slice(1).join('.'));
  const before = 15;
  const final = Math.round(run.lastClose.oi * 10) / 10;
  assert.equal(shown(0), before, 'it starts at the OI of the month before (the plan, in month 1)');
  assert.ok(shown(0.2) > before && shown(0.2) < final, 'and counts up');
  assert.equal(shown(5), final);
  assert.equal(shown(0, { calm: true }), final, 'calm mode shows the final number at once');
});

test('a close with bills that hurt flashes the chart window red and throws smoke inside it; a quiet one does not; calm never', () => {
  const run = billed(closeOf('smart'));
  const at = (extra = {}) => yearApp(run, { phaseT: fx.IMPACT_AT + 0.03, ...extra });
  const flash = draw(at()).fills.find(isBox(SIDE));
  assert.ok(flash && flash.color === P.red && flash.alpha > 0 && flash.alpha <= 0.2, 'a faint red flash over the chart window');
  const plan = screenFx.closePlan(at());
  const origin = { x: SIDE.x + Math.floor(SIDE.w / 2), y: SIDE.y + SIDE.h - 14 };
  const smoke = fx.burst(plan.burst.kind, plan.burst.seed, plan.burst.count, 0.03).map((p) => ({ x: origin.x + p.x, y: origin.y + p.y, w: p.size, h: p.size, color: P[p.tone], alpha: p.alpha }));
  const fills = draw(at()).fills;
  assert.ok(smoke.length > 0 && smoke.every((want) => fills.some((f) => same(f, want))), 'all of the smoke is on the screen');
  assert.equal(draw(yearApp(closeOf('smart'), { phaseT: fx.IMPACT_AT + 0.03 })).fills.find(isBox(SIDE)), undefined, 'a quiet close does not flash');
  const calm = draw(at({ calm: true })).fills;
  assert.equal(calm.find(isBox(SIDE)), undefined);
  assert.ok(smoke.every((want) => !calm.some((f) => same(f, want))), 'calm mode draws no smoke');
});

// ---- the rescue plan ------------------------------------------------------------------------------------
test('the rescue plan opens with a red flash on the alarm picture, and calm mode has none', () => {
  const run = toRescue();
  const flash = (extra = {}) => draw(yearApp(run, { phaseT: fx.IMPACT_AT + 0.03, ...extra })).fills.find(isBox(layout.ART));
  assert.ok(flash() && flash().color === P.red);
  assert.equal(flash({ calm: true }), undefined);
  assert.equal(draw(yearApp(run, { phaseT: 3 })).fills.find(isBox(layout.ART)), undefined, 'and it is over later');
});

// ---- the verdict ---------------------------------------------------------------------------------------
const FACTORY = { x: 4, y: 26, w: 120, h: 64 };
const verdictApp = (i, extra = {}) => yearApp(showcase.showcaseRun(i), { sim: true, ...extra });
const RUIN = showcase.SHOWCASE.findIndex((entry) => entry.outcome === 'bankrupt');
const wantAmbient = (app) => {
  const plan = screenFx.verdictPlan(app);
  return plan && plan.ambient ? fx.ambient(plan.ambient.kind, plan.ambient.seed, plan.ambient.count, app.t, FACTORY).map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, color: P[p.tone], alpha: p.alpha })) : [];
};
const onScreen = (app) => wantAmbient(app).filter((want) => draw(app).fills.some((f) => same(f, want)));

test('a good year rains confetti over its factory, ruin lights embers, a middling year has no weather', () => {
  const excellent = verdictApp(0);
  assert.ok(wantAmbient(excellent).length > 0 && onScreen(excellent).length === wantAmbient(excellent).length, 'confetti for the best year');
  const ruin = verdictApp(RUIN);
  assert.ok(wantAmbient(ruin).length > 0 && onScreen(ruin).length === wantAmbient(ruin).length, 'embers for ruin');
  assert.equal(screenFx.verdictPlan(verdictApp(2)).ambient, null, 'a middling year has none');
});

test('the weather is only on the first page and never in calm mode', () => {
  const excellent = verdictApp(0);
  const planned = wantAmbient(excellent);
  assert.equal(planned.filter((want) => draw({ ...excellent, page: 1 }).fills.some((f) => same(f, want))).length, 0, 'the report page has no confetti');
  assert.equal(planned.filter((want) => draw({ ...excellent, calm: true }).fills.some((f) => same(f, want))).length, 0, 'and calm mode has none');
});

test('ruin also flashes the factory red when the page opens', () => {
  const flash = (extra = {}) => draw(verdictApp(RUIN, { phaseT: fx.IMPACT_AT + 0.03, ...extra })).fills.find(isBox(FACTORY));
  assert.ok(flash() && flash().color === P.red);
  assert.equal(flash({ calm: true }), undefined);
  assert.equal(draw(verdictApp(0, { phaseT: fx.IMPACT_AT + 0.03 })).fills.find(isBox(FACTORY)), undefined, 'a good year does not');
});

const BRIDGE = { x: 4, y: 98, w: 248, h: 128 };
const bridgeBars = (app) => draw(app).fills.filter((f) => f.h === 5 && f.y >= BRIDGE.y + 20 && f.y < BRIDGE.y + BRIDGE.h && f.x >= BRIDGE.x + 100);

test('the bridge builds up bar by bar from the plan to the real, while every figure is already written', () => {
  const app = (phaseT, extra = {}) => verdictApp(0, { phaseT, ...extra });
  const widths = (phaseT, extra) => bridgeBars(app(phaseT, extra)).map((f) => f.w);
  const final = widths(5);
  assert.ok(final.length >= 6, 'a year moves several lines');
  assert.deepEqual(widths(0), final.map(() => 1), 'every bar is a stub when the page opens');
  const mid = widths(0.6);
  assert.ok(mid.some((w, i) => w > 1 && w < final[i]) || mid.some((w, i) => w === final[i] && final[i] > 1), 'some are grown');
  assert.ok(mid.slice(-2).every((w) => w === 1), 'and the last ones (the real result) come last');
  assert.deepEqual(widths(0, { calm: true }), final, 'calm mode shows the finished bridge at once');
  const figures = (phaseT) => textIn(draw(app(phaseT)).glyphs, BRIDGE).join('|');
  assert.equal(figures(0), figures(5), 'the figures are there from the first moment');
});

// ---- the menu ------------------------------------------------------------------------------------------
function callsOf(app) {
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return (...args) => { calls.push([prop, ...args]); };
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => undefined, set: () => true }) }) };
  drawFrame(ctx, app);
  return calls;
}

test('the menu panel opens with a bounce and then stays in its place', () => {
  // The factory in the header is also placed with a translation; the panel's is the one that only moves it down.
  const pushed = (phaseT, extra = {}) => callsOf(base({ scene: 'menu', phaseT, ...extra })).filter((c) => c[0] === 'translate' && c[1] === 0).map((c) => c[2]);
  assert.deepEqual(pushed(0), [anim.POP_RISE], 'it starts a few pixels lower');
  assert.ok(pushed(0.09).every((dy) => dy < anim.POP_RISE), 'and rises');
  assert.deepEqual(pushed(1), [], 'settled, it is not moved at all');
  assert.deepEqual(pushed(0, { calm: true }), [], 'calm mode opens it in place');
});

test('the cursor of the menu is always there and bobs one pixel between two frames', () => {
  const cursor = (t, extra = {}) => draw(base({ scene: 'menu', phaseT: 5, t, ...extra })).fills.filter((f) => f.w === 5 && f.h === 1 && f.color === P.gold && f.x === layout.menuRowRect(0, 3).x + layout.menuRowRect(0, 3).w - 12);
  const a = cursor(0);
  const b = cursor(anim.BOB_SECONDS);
  assert.equal(a.length, 1, 'visible in the first frame');
  assert.equal(b.length, 1, 'and in the second: it never blinks out');
  assert.equal(Math.abs(a[0].y - b[0].y), 1);
  assert.equal(cursor(0, { calm: true })[0].y, cursor(anim.BOB_SECONDS, { calm: true })[0].y, 'calm mode keeps it still');
});

// ---- the gauges --------------------------------------------------------------------------------------
const DASH = layout.DASH;
const GAUGE = { x: DASH.x + 26, w: 84 };
const gaugeY = (row) => DASH.y + 6 + row * 10 + 1;
const fillOf = (app, row) => draw(app).fills.find((f) => f.x === GAUGE.x && f.y === gaugeY(row) && f.h === 5 && f.w < GAUGE.w && f.alpha === 1);
const ghostOf = (app, row) => draw(app).fills.find((f) => f.y === gaugeY(row) && f.h === 5 && f.color === P.white && f.alpha < 1 && f.x >= GAUGE.x);

// The first problem answered with "do nothing": the client meter (row 1) drops.
const dropped = () => {
  const start = { ...engine.newYear(), monthIdx: 0, problemIdx: 0 };
  return engine.choose(start, engine.options(start).findIndex((o) => o.a === 'ign'));
};

test('after an answer the meter drains from its old value to the new one, leaving a pale ghost that fades', () => {
  const run = dropped();
  const was = Math.round((GAUGE.w * (run.meters.C - run.last.delta.C)) / 100);
  const now = Math.round((GAUGE.w * run.meters.C) / 100);
  assert.ok(was > now, 'the meter dropped');
  const width = (phaseT, extra = {}) => fillOf(yearApp(run, { phaseT, ...extra }), 1).w;
  assert.equal(width(0), was, 'it starts at the old value');
  assert.ok(width(0.3) <= was && width(0.3) >= now, 'drains in between');
  assert.equal(width(5), now);
  assert.equal(width(0, { calm: true }), now, 'calm mode shows the new value at once');
  const ghost = ghostOf(yearApp(run, { phaseT: 0.4 }), 1);
  assert.ok(ghost && ghost.alpha > 0, 'a ghost marks what was lost');
  assert.equal(ghostOf(yearApp(run, { phaseT: 3 }), 1), undefined, 'and fades away');
  assert.equal(ghostOf(yearApp(run, { phaseT: 0.4, calm: true }), 1), undefined, 'calm mode has no ghost');
});

test('while the question is open the meters are just their value, with no animation', () => {
  const start = { ...engine.newYear(), monthIdx: 0, problemIdx: 0 };
  const a = fillOf(yearApp(start, { phaseT: 0 }), 1);
  const b = fillOf(yearApp(start, { phaseT: 5 }), 1);
  assert.equal(a.w, b.w);
  assert.equal(ghostOf(yearApp(start, { phaseT: 0.4 }), 1), undefined);
});

test('a meter that falls below 42 or 32 flashes its label red for a moment, and only then', () => {
  const ui = require('../src/render/ui');
  const start = { ...engine.newYear(), monthIdx: 0, problemIdx: 0, meters: { C: 43, P: 60, E: 60 } };
  const run = engine.choose(start, engine.options(start).findIndex((o) => o.a === 'ign'));
  assert.ok(run.meters.C < 42 && run.last.delta.C < 0, 'it crossed the line');
  const labelColors = (app) => {
    const seen = [];
    const original = ui.text;
    ui.text = (ctx, str, x, y, color, ...rest) => { if (str === 'CLI') seen.push(color); return original(ctx, str, x, y, color, ...rest); };
    try { draw(app); } finally { ui.text = original; }
    return seen;
  };
  const during = [0, 0.2, 0.4, 0.6].map((phaseT) => labelColors(yearApp(run, { phaseT }))[0]);
  assert.ok(during.includes(P.red) && during.some((c) => c !== P.red), 'it blinks');
  assert.notEqual(labelColors(yearApp(run, { phaseT: 2 }))[0], P.red, 'and it is over after a moment');
  assert.ok([0, 0.2, 0.4].every((phaseT) => labelColors(yearApp(run, { phaseT, calm: true }))[0] !== P.red), 'calm mode does not blink it');
  const calmer = { ...engine.newYear(), monthIdx: 0, problemIdx: 0 };
  const quiet = engine.choose(calmer, engine.options(calmer).findIndex((o) => o.a === 'smart'));
  assert.ok([0, 0.2].every((phaseT) => labelColors(yearApp(quiet, { phaseT }))[0] !== P.red), 'a meter that stays above the lines does not');
});
