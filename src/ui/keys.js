'use strict';

const { W, H } = require('./layout');

// The digits are keys of their own: the year intro takes a game code from them.
const DIGIT_ACTIONS = Object.fromEntries([...'0123456789'].map((digit) => [digit, `digit${digit}`]));

const KEY_ACTIONS = Object.freeze({
  ...DIGIT_ACTIONS,
  Enter: 'confirm',
  ' ': 'confirm',
  z: 'confirm',
  Z: 'confirm',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
  n: 'note',
  N: 'note',
  m: 'mute',
  M: 'mute',
  l: 'lang',
  L: 'lang',
  r: 'review',
  R: 'review',
  c: 'copy',
  C: 'copy',
  Backspace: 'delete',
  Delete: 'delete',
  Escape: 'back',
  x: 'back',
  X: 'back',
});

const keyToAction = (key) =>
  typeof key === 'string' && Object.prototype.hasOwnProperty.call(KEY_ACTIONS, key) ? KEY_ACTIONS[key] : null;

// Converts a pointer position on the (scaled) canvas to the 256x224 logical screen.
function toLogical(clientX, clientY, rect) {
  if (!rect.width || !rect.height) return { x: 0, y: 0 };
  return {
    x: ((clientX - rect.left) * W) / rect.width,
    y: ((clientY - rect.top) * H) / rect.height,
  };
}

module.exports = { keyToAction, toLogical };
