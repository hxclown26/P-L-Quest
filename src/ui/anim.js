'use strict';

// The motion of the screens as pure functions of the time since the screen last changed (the
// app's phaseT), so the renderer keeps no animation state of its own and the timings are tested.

const ROLL_SECONDS = 0.7;
// Characters typed per second.
const TYPE_RATE = 70;
const FADE_SECONDS = 0.18;
const FADE_DARKNESS = 0.9;
const FLOAT_DELAY = 0.15;
const FLOAT_SECONDS = 1.3;
const FLOAT_RISE = 10;
// A bar that grows or a number that counts up starts a moment after the screen opens and takes this long.
const BAR_DELAY = 0.15;
const BAR_SECONDS = 0.35;
// A window that opens rises POP_RISE pixels from below, with a small bounce.
const POP_SECONDS = 0.18;
const POP_RISE = 6;
const BACK = 1.70158;
// The cursor of a menu changes frame this often.
const BOB_SECONDS = 0.4;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const easeOut = (k) => 1 - (1 - clamp01(k)) ** 3;

// How far the numbers of the statement have rolled from the old P&L to the new one (0 to 1).
const rollProgress = (phaseT) => easeOut(phaseT / ROLL_SECONDS);

// A P&L between two others: k = 0 is `before`, k = 1 is `after`. Every result of the statement is
// computed from the lines, so the blend always foots.
function blendPl(before, after, k) {
  return Object.fromEntries(Object.keys(after).map((line) => [line, before[line] + (after[line] - before[line]) * k]));
}

const typedChars = (phaseT) => Math.floor(Math.max(0, phaseT) * TYPE_RATE);

// The first `count` letters of a list of rows ({ text, tone }), counted across the rows.
function revealRows(rows, count) {
  let left = count;
  return rows.map((row) => {
    const text = row.text.slice(0, Math.max(0, left));
    left -= row.text.length;
    return { ...row, text };
  });
}

// How dark the veil over a screen that has just opened still is (0 = clear).
const fadeAlpha = (phaseT) => (phaseT >= FADE_SECONDS ? 0 : (1 - phaseT / FADE_SECONDS) * FADE_DARKNESS);

// The little number that floats up from a row that changed: null while it is not on screen.
function floatState(phaseT) {
  const k = (phaseT - FLOAT_DELAY) / FLOAT_SECONDS;
  if (k < 0 || k > 1) return null;
  return { rise: Math.round(easeOut(k) * FLOAT_RISE), alpha: 1 - k * k };
}

// 0 to 1 over `seconds` once `delay` has passed, easing out: a bar that grows or a number that counts up.
const grow = (phaseT, delay = BAR_DELAY, seconds = BAR_SECONDS) => easeOut((phaseT - delay) / seconds);

// How many pixels lower than its place a window that has just opened is (a whole number, never -0): it
// rises with a little bounce, overshoots by one pixel and settles exactly at 0.
function popOffset(phaseT) {
  const u = clamp01(phaseT / POP_SECONDS) - 1;
  const back = 1 + (BACK + 1) * u ** 3 + BACK * u ** 2;
  return Math.round(POP_RISE * (1 - back)) + 0;
}

// The two frames of a menu cursor: 0 or 1 pixel down.
const bob = (t) => (Math.floor(t / BOB_SECONDS) % 2 === 0 ? 0 : 1);

module.exports = {
  ROLL_SECONDS,
  TYPE_RATE,
  FADE_SECONDS,
  FLOAT_DELAY,
  FLOAT_SECONDS,
  FLOAT_RISE,
  BAR_DELAY,
  BAR_SECONDS,
  POP_SECONDS,
  POP_RISE,
  BOB_SECONDS,
  rollProgress,
  blendPl,
  typedChars,
  revealRows,
  fadeAlpha,
  floatState,
  grow,
  popOffset,
  bob,
};
