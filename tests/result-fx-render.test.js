'use strict';

// What the result screen adds on top of its numbers: a flash on the picture, sparks or smoke over the OI
// row, and a shake of the whole scene when an answer hurts. Calm mode shows none of it, nothing starts
// before the impact, and the footer never moves.

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const layout = require('../src/ui/layout');
const fx = require('../src/ui/fx');
const screenFx = require('../src/ui/screen-fx');
const P = require('../src/render/palette');
const { drawFrame } = require('../src/render/index');
const { createApp } = require('../src/ui/app');
const { draw } = require('./helpers/screen');

// The first answer, on the authored calendar, whose result has the wanted grade and mood.
function find(tier, mood) {
  for (let slot = 0; slot < 48; slot += 1) {
    const base = { ...engine.newYear(), monthIdx: Math.floor(slot / 4), problemIdx: slot % 4 };
    for (let i = 0; i < 4; i += 1) {
      const run = engine.choose(base, i);
      const plan = fx.resultFeedback(run.last.delta, { pace: run.pace, focus: engine.currentProblem(base).focus });
      if (plan.tier === tier && plan.mood === mood) return run;
    }
  }
  throw new Error(`no ${tier} ${mood} answer on the authored calendar`);
}

const at = (run, extra = {}) => ({
  ...createApp({ lang: 'es', muted: false, best: 0, seed: 5 }),
  scene: 'year',
  year: run,
  t: 3,
  phaseT: fx.IMPACT_AT + 0.03,
  ...extra,
});
const ART = layout.ART;
const isArtFlash = (f) => f.x === ART.x && f.y === ART.y && f.w === ART.w && f.h === ART.h;
const flashes = (app) => draw(app).fills.filter(isArtFlash);

// The particles the effects would draw for this state (as the renderer places them), whether or not they are on.
const ORIGIN = { x: ART.x + Math.floor(ART.w / 2), y: ART.y + ART.h - 10 };
function wouldBe(app, offset = fx.IMPACT_AT) {
  const plan = screenFx.resultPlan({ ...app, calm: false });
  if (!plan || !plan.burst) return [];
  return fx.burst(plan.burst.kind, plan.burst.seed, plan.burst.count, app.phaseT - offset)
    .map((p) => ({ x: ORIGIN.x + p.x, y: ORIGIN.y + p.y, w: p.size, h: p.size, color: P[p.tone], alpha: p.alpha }));
}
const same = (f, want) => f.x === want.x && f.y === want.y && f.w === want.w && f.h === want.h && f.color === want.color && Math.abs((f.alpha ?? 1) - want.alpha) < 1e-9;
// Which of those particles are really on the screen.
const specks = (app, offset) => wouldBe(app, offset).filter((want) => draw(app).fills.some((f) => same(f, want)));

test('a big loss flashes the picture red, throws smoke over the OI row and shakes the scene', () => {
  const run = find('large', 'bad');
  const app = at(run);
  const [flash] = flashes(app);
  assert.ok(flash, 'the picture flashes');
  assert.equal(flash.color, P.red);
  assert.ok(flash.alpha > 0 && flash.alpha <= 0.2, `a faint flash (${flash.alpha})`);
  assert.ok(wouldBe(app).length > 0 && specks(app).length === wouldBe(app).length, 'and all of its smoke is on the screen');
  const moved = [0.02, 0.05, 0.08, 0.11, 0.14, 0.17].some((dt) => {
    const { dx, dy } = screenFx.screenShake(at(run, { phaseT: fx.IMPACT_AT + dt }));
    return dx !== 0 || dy !== 0;
  });
  assert.ok(moved, 'the scene shakes in the first moments after the impact');
});

test('a good answer sparks, a big one also flashes the picture green, and none of them shakes', () => {
  const medium = at(find('medium', 'good'));
  assert.equal(flashes(medium).length, 0, 'a medium answer does not flash');
  assert.ok(wouldBe(medium).length > 0 && specks(medium).length === wouldBe(medium).length, 'it sparks');
  const run = find('large', 'good');
  const app = at(run);
  assert.equal(flashes(app)[0].color, P.green);
  assert.ok(specks(app).length > 0, 'sparks');
  [0.02, 0.05, 0.1, 0.2].forEach((dt) => assert.deepEqual(screenFx.screenShake(at(run, { phaseT: fx.IMPACT_AT + dt })), { dx: 0, dy: 0 }));
});

test('calm mode draws the same screen with no flash, no particles and no shake', () => {
  const run = find('large', 'bad');
  const live = at(run);
  const calm = at(run, { calm: true });
  assert.ok(flashes(live).length > 0 && wouldBe(live).length > 0, 'the effects are on when the mode is not calm');
  assert.equal(flashes(calm).length, 0);
  assert.equal(specks(calm).length, 0, 'and none of the particles is drawn in calm mode');
  assert.deepEqual(screenFx.screenShake(calm), { dx: 0, dy: 0 });
  // Take the effects away from the live screen and it is the calm one, fill for fill (the gauges aside: they settle
  // on their new values at once in calm mode, which screen-fx-render.test.js looks at).
  const outsideGauges = (fills) => fills.filter((f) => !(f.x >= layout.DASH.x && f.y >= layout.DASH.y && f.y < layout.DASH.y + layout.DASH.h));
  const rest = [...draw(live).fills];
  [...rest.filter(isArtFlash), ...wouldBe(live).flatMap((want) => rest.filter((f) => same(f, want)).slice(0, 1))]
    .forEach((extra) => rest.splice(rest.indexOf(extra), 1));
  assert.deepEqual(outsideGauges(rest), outsideGauges(draw(calm).fills), 'the rest of the screen is identical');
});

test('nothing starts before the impact and everything is over a moment later', () => {
  const run = find('large', 'bad');
  const before = at(run, { phaseT: fx.IMPACT_AT * 0.5 });
  assert.equal(flashes(before).length, 0);
  assert.equal(specks(before, 0).length, 0, 'particles are not drawn from the moment the screen opens');
  assert.deepEqual(screenFx.screenShake(before), { dx: 0, dy: 0 });
  const after = at(run, { phaseT: fx.IMPACT_AT + fx.BURST_SECONDS + 0.2 });
  assert.equal(flashes(after).length, 0);
  assert.equal(wouldBe(after).length, 0, 'every particle has died');
  assert.deepEqual(screenFx.screenShake(after), { dx: 0, dy: 0 });
});

test('only the result screen of a played game has effects: not the question, nor a simulated year', () => {
  const run = find('large', 'bad');
  const question = at({ ...run, phase: 'problem' });
  assert.equal(flashes(question).length + specks(question).length, 0);
  assert.equal(screenFx.resultPlan(at(run, { sim: true })), null);
  assert.equal(screenFx.resultPlan({ ...at(run), scene: 'menu' }), null);
});

test('the same result always looks the same: the pattern comes from the game, not from chance', () => {
  const run = find('large', 'bad');
  assert.deepEqual(draw(at(run)).fills, draw(at(run)).fills);
});

test('the voice feels what happened to its meter, not to the OI: a shortcut that lifts the OI and hurts the client leaves him unhappy', () => {
  const base = { ...engine.newYear(), monthIdx: 0, problemIdx: 0 };
  const run = engine.choose(base, engine.options(base).findIndex((o) => o.a === 'temp'));
  assert.ok(run.last.delta.oi > 0 && run.last.delta.C < 0, 'the shortcut: OI up, client down');
  assert.equal(fx.moodOf(run.last.delta.oi), 'good', 'the P&L is green');
  assert.equal(screenFx.sceneMood(at(run)), 'bad', 'but the client is not happy');
  const smart = engine.choose(base, engine.options(base).findIndex((o) => o.a === 'plac'));
  assert.ok(smart.last.delta.oi < 0 && smart.last.delta.C > 0, 'giving in: OI down, client up');
  assert.equal(screenFx.sceneMood(at(smart)), 'good', 'and the client is pleased');
});

// A canvas that remembers its calls in order.
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

// The index of the restore that closes the save at `from`, counting the pairs inside.
function matchingRestore(calls, from) {
  let depth = 0;
  for (let i = from; i < calls.length; i += 1) {
    if (calls[i][0] === 'save') depth += 1;
    if (calls[i][0] === 'restore') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

test('a shake moves the scene and puts it back before the footer is drawn', () => {
  const run = find('large', 'bad');
  const moved = [0.02, 0.05, 0.08, 0.11].map((dt) => at(run, { phaseT: fx.IMPACT_AT + dt }))
    .find((app) => { const s = screenFx.screenShake(app); return s.dx !== 0 || s.dy !== 0; });
  assert.ok(moved, 'there is a moment with a visible shake');
  const calls = callsOf(moved);
  const shift = calls.findIndex((c) => c[0] === 'translate');
  assert.ok(shift > 0 && calls[shift - 1][0] === 'save', 'the translation is inside its own save');
  const back = matchingRestore(calls, shift - 1);
  const footer = calls.findIndex((c) => c[0] === 'fillRect' && c[2] === layout.FOOTER.y && c[3] === layout.W);
  assert.ok(back > shift && footer > back, 'the scene is put back before the footer is drawn');
  assert.equal(callsOf(at(run, { calm: true })).some((c) => c[0] === 'translate'), false, 'and calm mode never moves it');
});

test('the sparks and the smoke stay inside the picture window, so they never cover a number', () => {
  const run = find('large', 'bad');
  const calls = callsOf(at(run, { phaseT: fx.IMPACT_AT + 0.3 }));
  const clips = calls.map((c, i) => [c, i]).filter(([c]) => c[0] === 'clip').map(([, i]) => calls[i - 1]);
  const box = clips.find((c) => c[0] === 'rect' && c[1] === ART.x && c[2] === ART.y && c[3] === ART.w && c[4] === ART.h);
  assert.ok(box, 'the particles are clipped to the picture window');
  const first = calls.findIndex((c) => c[0] === 'rect' && c[1] === ART.x && c[2] === ART.y && c[3] === ART.w && c[4] === ART.h);
  assert.ok(calls.slice(first).some((c) => c[0] === 'fillRect' && c[3] <= 4 && c[4] <= 4), 'and they are drawn');
});

test('the scene wears the mood of the answer: a good result and a bad one do not look the same', () => {
  const base = { ...engine.newYear(), monthIdx: 0, problemIdx: 0 };
  const byArchetype = (a) => engine.choose(base, engine.options(base).findIndex((o) => o.a === a));
  const insidePicture = (app) => JSON.stringify(draw(app).fills.filter((f) => f.x >= ART.x && f.y >= ART.y && f.x < ART.x + ART.w && f.y < ART.y + ART.h && f.w <= 40));
  const good = insidePicture(at(byArchetype('smart'), { calm: true, phaseT: 3 }));
  const bad = insidePicture(at(byArchetype('ign'), { calm: true, phaseT: 3 }));
  assert.notEqual(good, bad, 'a good result and a bad one do not look the same');
  assert.equal(screenFx.sceneMood(at(byArchetype('smart'))), 'good');
  assert.equal(screenFx.sceneMood(at(byArchetype('ign'))), 'bad');
  assert.equal(screenFx.sceneMood(at({ ...base, phase: 'problem' })), 'neutral', 'before answering the scene is neutral');
  assert.equal(screenFx.sceneMood({ ...at(base), scene: 'menu' }), 'neutral');
});
