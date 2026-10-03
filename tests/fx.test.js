'use strict';

// The feedback of the screens is made of pure functions of the time since an event and of a seed, so
// every effect can be tested without a canvas: it must start, stay inside its limits, and come back
// to rest. Photosensitivity limits (one short, faint flash per event) are pinned here too.

const test = require('node:test');
const assert = require('node:assert/strict');
const fx = require('../src/ui/fx');

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);
const SAMPLES = Array.from({ length: 41 }, (_, i) => i * 0.025);

test('the importance of an answer is its biggest effect against the biggest one a full year has', () => {
  assert.equal(fx.tierOf(0.1, [0.4, 0.4, 0.4]), 'small');
  assert.equal(fx.tierOf(0.38, [4.5, -0.8, -0.8]), 'medium');
  assert.equal(fx.tierOf(0.2, [0.4, 8.5, 0.4]), 'large');
  assert.equal(fx.tierOf(-0.78, [-0.8, -0.8, -0.8]), 'large');
});

test('a half year, where every effect is twice as big, grades its answers the same way', () => {
  [[0.1, [0.4, 0.4, 0.4]], [0.38, [4.5, -0.8, -0.8]], [0.7, [8, 0, 0]]].forEach(([oi, meters]) => {
    assert.equal(fx.tierOf(oi * 2, meters.map((m) => m * 2), 2), fx.tierOf(oi, meters, 1));
  });
});

test('the mood of an answer follows the sign of the change in OI, with a dead zone for noise', () => {
  assert.equal(fx.moodOf(0.38), 'good');
  assert.equal(fx.moodOf(-0.38), 'bad');
  assert.equal(fx.moodOf(0.04), 'neutral');
  assert.equal(fx.moodOf(-0.04), 'neutral');
  assert.equal(fx.moodOf(0), 'neutral');
});

test('a result is a win only when the OI and the meter of the problem both improve, a loss when both worsen, and mixed otherwise', () => {
  assert.equal(fx.moodOfResult(0.1, 3.5), 'good', 'the balanced answer');
  assert.equal(fx.moodOfResult(0.6, -2.75), 'neutral', 'a shortcut lifts the OI and hurts the meter');
  assert.equal(fx.moodOfResult(-0.375, 6.5), 'neutral', 'giving in lifts the meter and costs OI');
  assert.equal(fx.moodOfResult(-0.45, -4.5), 'bad', 'doing nothing');
  assert.equal(fx.moodOfResult(0.02, 3.5), 'neutral', 'a change in OI too small to see is no win');
  assert.equal(fx.moodOfResult(0.4, 0.2), 'neutral', 'nor is a meter that did not move');
});

test('the effects celebrate the balanced answer most: a double win is sparked up a grade and a shortcut is not celebrated at all', () => {
  const win = fx.resultFeedback({ oi: 0.1, C: 3.5, P: 0.4, E: 0.4 }, { focus: 'C', seed: 1 });
  assert.equal(win.mood, 'good');
  assert.equal(win.tier, 'medium', 'a double win is worth more than its size');
  assert.equal(win.burst.kind, 'spark');
  assert.ok(win.burst.count >= 10);
  const shortcut = fx.resultFeedback({ oi: 0.6, C: -2.75, P: -0.4, E: -0.4 }, { focus: 'C', seed: 1 });
  assert.equal(shortcut.mood, 'neutral');
  assert.deepEqual([shortcut.burst, shortcut.flash, shortcut.trauma], [null, null, 0]);
  const gift = fx.resultFeedback({ oi: -0.375, C: 6.5, P: -0.75, E: -0.75 }, { focus: 'C', seed: 1 });
  assert.deepEqual([gift.mood, gift.burst, gift.flash, gift.trauma], ['neutral', null, null, 0]);
  const nothing = fx.resultFeedback({ oi: -0.45, C: -4.5, P: -0.75, E: -0.75 }, { focus: 'C', seed: 1 });
  assert.equal(nothing.mood, 'bad');
  assert.equal(nothing.burst.kind, 'smoke');
});

test('the mood of a voice follows what happened to the meter it cares about, with a dead zone for noise', () => {
  assert.equal(fx.moodOfMeter(3.5), 'good');
  assert.equal(fx.moodOfMeter(-2.8), 'bad');
  assert.equal(fx.moodOfMeter(0.4), 'neutral');
  assert.equal(fx.moodOfMeter(-0.4), 'neutral');
  assert.equal(fx.moodOfMeter(0), 'neutral');
});

test('shake is whole pixels, never above its limit, and is exactly still once it has decayed', () => {
  [0.2, 0.5, 0.8, 1].forEach((trauma) => {
    SAMPLES.forEach((t) => {
      const { dx, dy } = fx.shakeOffset(trauma, t, 7);
      assert.ok(Number.isInteger(dx) && Number.isInteger(dy), `whole pixels at ${t}`);
      assert.ok(Math.abs(dx) <= fx.SHAKE_MAX && Math.abs(dy) <= fx.SHAKE_MAX, `within ${fx.SHAKE_MAX} px at ${t}`);
      assert.ok(!Object.is(dx, -0) && !Object.is(dy, -0), 'no negative zero');
    });
    const end = fx.shakeSeconds(trauma);
    assert.ok(end < 0.5, 'it is over in under half a second');
    assert.deepEqual(fx.shakeOffset(trauma, end, 7), { dx: 0, dy: 0 });
    assert.deepEqual(fx.shakeOffset(trauma, end + 3, 7), { dx: 0, dy: 0 });
  });
  assert.deepEqual(fx.shakeOffset(0, 0.1, 7), { dx: 0, dy: 0 }, 'no trauma, no shake');
  assert.deepEqual(fx.shakeOffset(0.8, -0.05, 7), { dx: 0, dy: 0 }, 'nothing shakes before the event');
});

test('shake is the same every time for the same trauma, time and seed, and differs between seeds', () => {
  assert.deepEqual(fx.shakeOffset(0.8, 0.12, 3), fx.shakeOffset(0.8, 0.12, 3));
  const seeds = new Set(Array.from({ length: 12 }, (_, s) => JSON.stringify(SAMPLES.map((t) => fx.shakeOffset(0.9, t, s)))));
  assert.ok(seeds.size > 1, 'the seed changes the pattern');
});

test('a heavier hit shakes more than a light one at the same moment', () => {
  const peak = (trauma) => Math.max(...SAMPLES.map((t) => Math.abs(fx.shakeOffset(trauma, t, 5).dx) + Math.abs(fx.shakeOffset(trauma, t, 5).dy)));
  assert.ok(peak(1) > peak(0.3));
});

test('a flash starts at its peak, fades in a straight line and is gone at the end', () => {
  const flash = { peak: 0.2, seconds: 0.12 };
  near(fx.flashAlpha(0, flash), 0.2);
  assert.ok(fx.flashAlpha(0.06, flash) < fx.flashAlpha(0.01, flash));
  assert.equal(fx.flashAlpha(0.12, flash), 0);
  assert.equal(fx.flashAlpha(5, flash), 0);
  assert.equal(fx.flashAlpha(-0.1, flash), 0, 'nothing before the event');
  assert.equal(fx.flashAlpha(0.05, null), 0, 'no flash planned');
});

test('no tier flashes harder than 20% for longer than 120 ms, and a plan has one flash at most', () => {
  Object.entries(fx.PRESETS).forEach(([tier, preset]) => {
    assert.ok(preset.flash <= 0.2, `${tier}: the flash is faint`);
    assert.ok(fx.FLASH_SECONDS <= 0.12, 'and short');
  });
  const plan = fx.resultFeedback({ oi: -0.7, C: -8, P: -1, E: -1 }, { pace: 1, calm: false, seed: 1 });
  assert.ok(plan.flash === null || (typeof plan.flash === 'object' && !Array.isArray(plan.flash)), 'one flash, not a list');
});

test('a burst is deterministic, capped, and every particle is a whole-pixel point that fades', () => {
  ['spark', 'smoke'].forEach((kind) => {
    const a = fx.burst(kind, 11, 24, 0.3);
    assert.deepEqual(a, fx.burst(kind, 11, 24, 0.3));
    assert.ok(a.length > 0 && a.length <= 24);
    a.forEach((p) => {
      assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y) && Number.isInteger(p.size), `${kind}: whole pixels`);
      assert.ok(p.alpha > 0 && p.alpha <= 1, `${kind}: alpha ${p.alpha}`);
      assert.ok(p.size >= 1 && p.size <= 4);
      assert.ok(typeof p.tone === 'string');
    });
  });
  assert.equal(fx.burst('spark', 11, 99, 0.3).length <= fx.MAX_PARTICLES, true, 'there is a cap');
});

test('every burst is over by its longest life and empty before it begins', () => {
  ['spark', 'smoke'].forEach((kind) => {
    assert.deepEqual(fx.burst(kind, 4, 24, -0.1), []);
    assert.deepEqual(fx.burst(kind, 4, 24, fx.BURST_SECONDS + 0.01), []);
  });
});

test('sparks fly up and fall back; smoke rises and swells', () => {
  const early = fx.burst('spark', 2, 24, 0.12);
  assert.ok(early.filter((p) => p.y < 0).length > early.length / 2, 'most sparks are above where they started');
  const smokeEarly = fx.burst('smoke', 2, 10, 0.1);
  const smokeLate = fx.burst('smoke', 2, 10, 0.6);
  const mean = (list, key) => list.reduce((s, p) => s + p[key], 0) / list.length;
  assert.ok(mean(smokeLate, 'y') < mean(smokeEarly, 'y'), 'smoke rises');
  assert.ok(mean(smokeLate, 'size') > mean(smokeEarly, 'size'), 'smoke swells');
});

test('smoke starts as a small cloud, not as one row of squares', () => {
  [1, 5, 9].forEach((seed) => {
    const rows = new Set(fx.burst('smoke', seed, 24, 0.02).map((p) => p.y));
    assert.ok(rows.size >= 3, `seed ${seed}: the puffs start on ${rows.size} row(s)`);
  });
});

test('a good medium answer only sparks: no flash and no shake, which are kept for the big ones', () => {
  const plan = fx.resultFeedback({ oi: 0.4, C: 4.5, P: 0.4, E: 0.4 }, { pace: 1, calm: false, seed: 1 });
  assert.equal(plan.tier, 'medium');
  assert.equal(plan.mood, 'good');
  assert.equal(plan.trauma, 0);
  assert.equal(plan.flash, null);
  assert.equal(plan.burst.kind, 'spark');
});

test('a good large answer also flashes green, still without shaking', () => {
  const plan = fx.resultFeedback({ oi: 0.7, C: 8.5, P: 0.4, E: 0.4 }, { pace: 1, calm: false, seed: 1 });
  assert.equal(plan.tier, 'large');
  assert.equal(plan.trauma, 0);
  assert.equal(plan.flash.color, 'green');
  assert.equal(plan.burst.kind, 'spark');
});

test('a bad large answer smokes, flashes red and shakes', () => {
  const plan = fx.resultFeedback({ oi: -0.7, C: -8.5, P: -1, E: -1 }, { pace: 1, calm: false, seed: 1 });
  assert.equal(plan.tier, 'large');
  assert.equal(plan.mood, 'bad');
  assert.ok(plan.trauma > 0 && plan.trauma <= 1);
  assert.equal(plan.flash.color, 'red');
  assert.equal(plan.burst.kind, 'smoke');
  assert.ok(plan.burst.count > fx.resultFeedback({ oi: -0.4, C: -4.5, P: -1, E: -1 }, { pace: 1, calm: false, seed: 1 }).burst.count, 'bigger events throw more');
});

test('a small beat adds nothing but a few sparks, and never shakes or flashes', () => {
  const plan = fx.resultFeedback({ oi: 0.1, C: 0.4, P: 0.4, E: 0.4 }, { pace: 1, calm: false, seed: 1 });
  assert.equal(plan.tier, 'small');
  assert.equal(plan.trauma, 0);
  assert.equal(plan.flash, null);
  assert.ok(plan.burst === null || plan.burst.count <= 4);
});

test('calm mode takes away the shake, the flash and the particles, whatever happened', () => {
  const plan = fx.resultFeedback({ oi: -0.78, C: -8.5, P: -1, E: -1 }, { pace: 1, calm: true, seed: 1 });
  assert.equal(plan.tier, 'large', 'the grade is still known');
  assert.equal(plan.trauma, 0);
  assert.equal(plan.flash, null);
  assert.equal(plan.burst, null);
});

test('the impact lands when the number starts to float, a moment after the screen opens', () => {
  assert.ok(fx.IMPACT_AT > 0 && fx.IMPACT_AT < 0.5);
});

const BOX = { x: 4, y: 26, w: 122, h: 62 };

test('ambient particles loop for ever inside their box, whole pixels, the same every time', () => {
  ['confetti', 'embers', 'drizzle'].forEach((kind) => {
    [0, 0.4, 1.3, 7.9, 40].forEach((t) => {
      const a = fx.ambient(kind, 3, 20, t, BOX);
      assert.deepEqual(a, fx.ambient(kind, 3, 20, t, BOX));
      assert.equal(a.length, 20, `${kind}: they never die, they come round again`);
      a.forEach((p) => {
        assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y) && Number.isInteger(p.w) && Number.isInteger(p.h), `${kind}: whole pixels`);
        assert.ok(p.x >= BOX.x && p.y >= BOX.y && p.x + p.w <= BOX.x + BOX.w && p.y + p.h <= BOX.y + BOX.h, `${kind} t=${t}: ${JSON.stringify(p)} leaves the box`);
        assert.ok(p.alpha > 0 && p.alpha <= 1 && typeof p.tone === 'string');
      });
    });
  });
  assert.ok(fx.ambient('confetti', 3, 99, 1, BOX).length <= fx.MAX_PARTICLES, 'there is a cap');
});

test('confetti and drizzle fall, embers rise: every particle against itself a moment later', () => {
  const moves = (kind, dt) => [0.3, 0.9, 1.4, 2.2].flatMap((t) => {
    const now = fx.ambient(kind, 9, 12, t, BOX);
    const soon = fx.ambient(kind, 9, 12, t + dt, BOX);
    // a particle that went round the box (a jump of more than half of it) is not a move
    return soon.map((p, k) => p.y - now[k].y).filter((d) => Math.abs(d) < BOX.h / 2);
  });
  assert.ok(moves('confetti', 0.05).every((d) => d >= 0) && moves('confetti', 0.05).some((d) => d > 0), 'confetti falls');
  assert.ok(moves('drizzle', 0.02).every((d) => d >= 0) && moves('drizzle', 0.02).some((d) => d > 0), 'drizzle falls');
  assert.ok(moves('embers', 0.05).every((d) => d <= 0) && moves('embers', 0.05).some((d) => d < 0), 'embers rise');
});

test('each ending has its own weather: confetti for the good years, drizzle for the poor ones, embers and a shake for ruin', () => {
  const seed = 4;
  const plan = (outcome, calm = false) => fx.verdictFeedback(outcome, { calm, seed });
  assert.equal(plan('excellent').ambient.kind, 'confetti');
  assert.equal(plan('good').ambient.kind, 'confetti');
  assert.ok(plan('excellent').ambient.count > plan('good').ambient.count, 'the best year has more');
  assert.equal(plan('fair').ambient, null, 'a middling year has no weather');
  assert.equal(plan('bad').ambient.kind, 'drizzle');
  assert.equal(plan('terrible').ambient.kind, 'drizzle');
  assert.ok(plan('terrible').ambient.count > plan('bad').ambient.count);
  assert.equal(plan('bankrupt').ambient.kind, 'embers');
  assert.ok(plan('bankrupt').trauma > 0 && plan('bankrupt').flash.color === 'red', 'ruin hits');
  ['excellent', 'good', 'fair', 'bad', 'terrible'].forEach((outcome) => assert.equal(plan(outcome).trauma, 0, `${outcome} does not shake`));
});

test('calm mode takes the weather, the shake and the flash away from every ending', () => {
  ['excellent', 'good', 'fair', 'bad', 'terrible', 'bankrupt'].forEach((outcome) => {
    assert.deepEqual(fx.verdictFeedback(outcome, { calm: true, seed: 4 }), { ambient: null, trauma: 0, flash: null });
  });
});

test('a month close hurts in proportion to the bills that fall due, and a quiet one adds nothing', () => {
  const quiet = fx.closeFeedback({ oi: 0.1, bills: { C: 0, P: 0, E: 0 } }, { pace: 1, calm: false, seed: 2 });
  assert.equal(quiet.trauma, 0);
  assert.equal(quiet.flash, null);
  const hit = fx.closeFeedback({ oi: -0.7, bills: { C: -8.5, P: -1, E: -1 } }, { pace: 1, calm: false, seed: 2 });
  assert.equal(hit.tier, 'large');
  assert.ok(hit.trauma > 0 && hit.flash.color === 'red' && hit.burst.kind === 'smoke');
  const calm = fx.closeFeedback({ oi: -0.7, bills: { C: -8.5, P: -1, E: -1 } }, { pace: 1, calm: true, seed: 2 });
  assert.deepEqual([calm.trauma, calm.flash, calm.burst], [0, null, null]);
});

test('a bill that hurts a meter makes the close bad even when the OI of the month went up', () => {
  const billed = fx.closeFeedback({ oi: 0.4, bills: { C: -8.5, P: 0, E: 0 } }, { pace: 1, calm: false, seed: 2 });
  assert.equal(billed.mood, 'bad');
  assert.equal(billed.tier, 'large');
  assert.ok(billed.trauma > 0 && billed.burst.kind === 'smoke');
  const light = fx.closeFeedback({ oi: 0.4, bills: { C: -0.5, P: 0, E: 0 } }, { pace: 1, calm: false, seed: 2 });
  assert.equal(light.mood, 'good', 'a small bill does not spoil a good month');
});

test('the rescue plan arrives like a blow: a red flash, a shake and smoke, unless the mode is calm', () => {
  const plan = fx.rescueFeedback({ calm: false, seed: 1 });
  assert.ok(plan.trauma > 0 && plan.flash.color === 'red' && plan.burst.kind === 'smoke');
  assert.deepEqual([fx.rescueFeedback({ calm: true, seed: 1 }).trauma, fx.rescueFeedback({ calm: true, seed: 1 }).flash, fx.rescueFeedback({ calm: true, seed: 1 }).burst], [0, null, null]);
});

test('a meter has crossed a line only when it was on or above it and is now below it', () => {
  assert.equal(fx.crossedDown(43, 41, [42, 32]), true);
  assert.equal(fx.crossedDown(42, 41.9, [42, 32]), true, 'on the line counts as above it');
  assert.equal(fx.crossedDown(33, 31, [42, 32]), true);
  assert.equal(fx.crossedDown(60, 55, [42, 32]), false);
  assert.equal(fx.crossedDown(40, 38, [42, 32]), false, 'already below the first line, not yet at the second');
  assert.equal(fx.crossedDown(41, 45, [42, 32]), false, 'rising is not crossing down');
});

test('the pulse of a label blinks a few times a second for under a second and then stops', () => {
  assert.equal(fx.pulseOn(0), true);
  assert.equal(fx.pulseOn(0.2), false);
  assert.equal(fx.pulseOn(0.4), true);
  assert.equal(fx.pulseOn(fx.PULSE_SECONDS), false);
  assert.equal(fx.pulseOn(5), false);
  assert.equal(fx.pulseOn(-1), false);
  assert.ok(fx.PULSE_RATE <= 3, 'never more than three blinks a second');
});
