'use strict';

// The feedback ("juice") of the screens, as pure functions of the time since an event and of a seed,
// like anim.js: the renderer keeps no state, so every effect is tested without a canvas. One answer is
// graded small, medium or large by how big its effect is; the grade decides what is added on top of
// the numbers: sparks when it helps and smoke when it hurts, in proportion, and only the large ones add
// a flash (and a shake when they hurt), because emphasis loses its meaning if every answer has it.
// Everything is brief and returns to rest, and calm mode takes it all away.

const NEGLIGIBLE = 0.05;
const METER_NEGLIGIBLE = 0.5;
// The biggest effect one answer has in a full year, on OI (points of margin) and on one meter.
const OI_FULL = 0.78;
const METER_FULL = 8.5;
const MEDIUM_FROM = 0.45;
const LARGE_FROM = 0.9;

// Seconds after a result opens when its impact lands: the moment the change in OI starts to float.
const IMPACT_AT = 0.15;
const SHAKE_MAX = 3;
// Trauma lost per second: a hit of 0.8 is over in a third of a second.
const SHAKE_DECAY = 2.2;
// One flash per event, faint and short (well under three flashes a second).
const FLASH_SECONDS = 0.12;
const MAX_PARTICLES = 40;
const BURST_SECONDS = 1.2;
const GRAVITY = 70;

const PRESETS = Object.freeze({
  small: Object.freeze({ trauma: 0, flash: 0, particles: 4 }),
  medium: Object.freeze({ trauma: 0.4, flash: 0, particles: 10 }),
  large: Object.freeze({ trauma: 0.8, flash: 0.2, particles: 24 }),
});

// How big an answer is, against the biggest of a full year; a half year doubles every effect, so
// `pace` brings both to the same scale.
function tierOf(oi, meters, pace = 1) {
  const size = Math.max(Math.abs(oi) / OI_FULL, ...meters.map((m) => Math.abs(m) / METER_FULL)) / pace;
  if (size >= LARGE_FROM) return 'large';
  return size >= MEDIUM_FROM ? 'medium' : 'small';
}

const moodOf = (oi) => (oi > NEGLIGIBLE ? 'good' : oi < -NEGLIGIBLE ? 'bad' : 'neutral');

// How the voice of a problem feels: by what happened to the meter it is about, not to the OI, so the
// client does not smile after a shortcut that lifted the OI and hurt him.
const moodOfMeter = (delta) => (delta > METER_NEGLIGIBLE ? 'good' : delta < -METER_NEGLIGIBLE ? 'bad' : 'neutral');

// What a result adds to the screen: its grade and mood, the shake (trauma 0 to 1), at most one flash
// and at most one burst of particles. `delta` is the entry of the run: { oi, C, P, E }.
function resultFeedback(delta, { pace = 1, calm = false, seed = 0, mood: given = null } = {}) {
  const tier = tierOf(delta.oi, [delta.C, delta.P, delta.E], pace);
  const mood = given || moodOf(delta.oi);
  if (calm) return { tier, mood, trauma: 0, flash: null, burst: null };
  const preset = PRESETS[tier];
  const decided = mood !== 'neutral';
  const count = mood === 'neutral' ? Math.floor(preset.particles / 2) : preset.particles;
  return {
    tier,
    mood,
    trauma: mood === 'bad' ? preset.trauma : 0,
    flash: decided && preset.flash > 0 ? { peak: preset.flash, seconds: FLASH_SECONDS, color: mood === 'bad' ? 'red' : 'green' } : null,
    burst: count > 0 ? { kind: mood === 'bad' ? 'smoke' : 'spark', count, seed } : null,
  };
}

// A whole number that is never -0, so a still shake compares equal to zero.
const whole = (value) => Math.round(value) + 0;

// Shake by "trauma": it decays in a straight line and the offset is its square times a smooth wave, so
// light hits barely move the picture and heavy ones punch, and it always ends on its own.
const shakeSeconds = (trauma) => trauma / SHAKE_DECAY;

function shakeOffset(trauma, t, seed = 0) {
  const left = Math.max(0, trauma - SHAKE_DECAY * t);
  if (t < 0 || left <= 0) return { dx: 0, dy: 0 };
  const power = left * left;
  const wave = (phase) => 0.6 * Math.sin(t * 61 + phase) + 0.4 * Math.sin(t * 97 + 2 * phase);
  return { dx: whole(SHAKE_MAX * power * wave(seed)), dy: whole(SHAKE_MAX * power * wave(seed + 1.7)) };
}

// The opacity of a flash `t` seconds after it started: its peak at once, then a straight fade to nothing.
function flashAlpha(t, flash) {
  if (!flash || t < 0 || t >= flash.seconds) return 0;
  return flash.peak * (1 - t / flash.seconds);
}

// A number in [0, 1) that depends only on its three inputs.
function unit(seed, k, salt) {
  let h = (seed * 374761393 + k * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const SPARK_TONES = Object.freeze(['gold', 'white', 'green']);
const SMOKE_TONES = Object.freeze(['gray', 'dim']);

// A spark flies up and out in a fan, slows under gravity and fades.
function spark(seed, k, t) {
  const life = 0.55 + 0.4 * unit(seed, k, 1);
  if (t < 0 || t >= life) return null;
  const angle = -Math.PI * (0.15 + 0.7 * unit(seed, k, 2));
  const speed = 22 + 30 * unit(seed, k, 3);
  return {
    x: whole(Math.cos(angle) * speed * t),
    y: whole(Math.sin(angle) * speed * t + 0.5 * GRAVITY * t * t),
    size: unit(seed, k, 4) < 0.25 ? 2 : 1,
    alpha: 1 - (t / life) ** 2,
    tone: SPARK_TONES[k % SPARK_TONES.length],
  };
}

// A puff of smoke starts in a small cloud, drifts up and sideways, swells and fades.
function smoke(seed, k, t) {
  const life = 0.7 + 0.5 * unit(seed, k, 1);
  if (t < 0 || t >= life) return null;
  const drift = (unit(seed, k, 2) - 0.5) * 14;
  const rise = 10 + 14 * unit(seed, k, 3);
  return {
    x: whole(drift * t + (unit(seed, k, 5) - 0.5) * 8),
    y: whole(-rise * t + (unit(seed, k, 6) - 0.5) * 5),
    size: 2 + Math.floor((2 * t) / life),
    alpha: 0.75 * (1 - t / life),
    tone: SMOKE_TONES[k % SMOKE_TONES.length],
  };
}

const KINDS = Object.freeze({ spark, smoke });

const clampTo = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const CONFETTI_TONES = Object.freeze(['gold', 'cyan', 'green', 'red', 'white']);
const EMBER_TONES = Object.freeze(['orange', 'gold', 'red']);
const DRIZZLE_TONES = Object.freeze(['cyan', 'gray']);

// Ambient particles are not one-off bursts: they come round again for as long as the screen is open. Each
// one is a point of its own loop inside `box`, in whole pixels.
function confetti(seed, k, t, box) {
  const flat = Math.floor(t * 3 + k) % 2 === 0;
  const w = flat ? 2 : 1;
  const h = flat ? 1 : 2;
  const fall = (unit(seed, k, 2) * box.h + t * (14 + 12 * unit(seed, k, 1))) % (box.h - h);
  const sway = Math.round(Math.sin(t * 1.6 + unit(seed, k, 3) * 6.28) * 2);
  const x = box.x + 2 + Math.floor(unit(seed, k, 4) * (box.w - 6)) + sway;
  return { x: clampTo(x, box.x, box.x + box.w - w), y: box.y + Math.floor(fall), w, h, alpha: 1, tone: CONFETTI_TONES[k % CONFETTI_TONES.length] };
}

function embers(seed, k, t, box) {
  const size = unit(seed, k, 5) < 0.3 ? 2 : 1;
  const travel = box.h - size;
  const up = Math.floor((unit(seed, k, 2) * box.h + t * (8 + 8 * unit(seed, k, 1))) % travel);
  const flicker = Math.round(Math.sin(t * 5 + unit(seed, k, 3) * 6.28));
  const x = box.x + 1 + Math.floor(unit(seed, k, 4) * (box.w - 4)) + flicker;
  return { x: clampTo(x, box.x, box.x + box.w - size), y: box.y + travel - up, w: size, h: size, alpha: 1 - 0.8 * (up / travel) ** 2, tone: EMBER_TONES[k % EMBER_TONES.length] };
}

function drizzle(seed, k, t, box) {
  const fall = (unit(seed, k, 2) * box.h + t * (40 + 20 * unit(seed, k, 1))) % (box.h - 3);
  return { x: box.x + Math.floor(unit(seed, k, 4) * (box.w - 1)), y: box.y + Math.floor(fall), w: 1, h: 3, alpha: 0.7, tone: DRIZZLE_TONES[k % DRIZZLE_TONES.length] };
}

const AMBIENT = Object.freeze({ confetti, embers, drizzle });

// The ambient particles of `kind` at time `t`: always `count` of them (up to the cap), inside `box`.
const ambient = (kind, seed, count, t, box) =>
  Array.from({ length: Math.min(count, MAX_PARTICLES) }, (_, k) => AMBIENT[kind](seed, k, t, box));

// The weather of each ending of the year; ruin also hits once, when the page opens.
const ENDINGS = Object.freeze({
  excellent: Object.freeze({ ambient: Object.freeze({ kind: 'confetti', count: 30 }) }),
  good: Object.freeze({ ambient: Object.freeze({ kind: 'confetti', count: 16 }) }),
  fair: Object.freeze({}),
  bad: Object.freeze({ ambient: Object.freeze({ kind: 'drizzle', count: 14 }) }),
  terrible: Object.freeze({ ambient: Object.freeze({ kind: 'drizzle', count: 26 }) }),
  bankrupt: Object.freeze({ ambient: Object.freeze({ kind: 'embers', count: 24 }), trauma: 0.8, flash: 0.2 }),
});

function verdictFeedback(outcome, { calm = false, seed = 0 } = {}) {
  if (calm) return { ambient: null, trauma: 0, flash: null };
  const ending = ENDINGS[outcome] || {};
  return {
    ambient: ending.ambient ? { ...ending.ambient, seed } : null,
    trauma: ending.trauma || 0,
    flash: ending.flash ? { peak: ending.flash, seconds: FLASH_SECONDS, color: 'red' } : null,
  };
}

// A meter that has just fallen below one of the lines (the drag at 42, the crisis at 32) pulses its label.
const PULSE_SECONDS = 0.8;
const PULSE_RATE = 2.5;
const crossedDown = (was, now, lines) => lines.some((line) => was >= line && now < line);
const pulseOn = (phaseT) => phaseT >= 0 && phaseT < PULSE_SECONDS && Math.floor(phaseT * 2 * PULSE_RATE) % 2 === 0;

// A month close is graded like an answer: by the OI it moved and by the bills of earlier shortcuts that fell due.
// A bill that really hurts a meter is bad news even if the OI of the month went up, so the close is bad then.
const BILL_HURTS = 2;
function closeFeedback(close, options = {}) {
  const billed = Math.min(close.bills.C, close.bills.P, close.bills.E) <= -BILL_HURTS;
  return resultFeedback({ oi: close.oi, ...close.bills }, { ...options, mood: billed ? 'bad' : null });
}

// The rescue plan is the biggest blow the game deals: graded as the largest loss there is.
const rescueFeedback = (options) => resultFeedback({ oi: -OI_FULL, C: -METER_FULL, P: -METER_FULL, E: -METER_FULL }, options);

// The particles of a burst alive `t` seconds after it started, as offsets from where it began.
function burst(kind, seed, count, t) {
  return Array.from({ length: Math.min(count, MAX_PARTICLES) }, (_, k) => KINDS[kind](seed, k, t)).filter(Boolean);
}

module.exports = {
  IMPACT_AT,
  SHAKE_MAX,
  SHAKE_DECAY,
  FLASH_SECONDS,
  MAX_PARTICLES,
  BURST_SECONDS,
  PRESETS,
  tierOf,
  moodOf,
  moodOfMeter,
  resultFeedback,
  shakeOffset,
  shakeSeconds,
  flashAlpha,
  burst,
  ambient,
  verdictFeedback,
  closeFeedback,
  rescueFeedback,
  PULSE_SECONDS,
  PULSE_RATE,
  crossedDown,
  pulseOn,
};
