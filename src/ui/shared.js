'use strict';

// Small pieces every UI reducer needs: effects, immutable state helpers and cursor moves.

const NONE = Object.freeze([]);

const sfx = (name) => ({ type: 'sfx', name });
const music = (mode) => ({ type: 'music', mode });
const result = (app, effects = NONE) => ({ app, effects });

// A change of screen or phase restarts the phase clock.
const moved = (app, patch) => ({ ...app, ...patch, phaseT: 0 });

const ARROWS = Object.freeze(['up', 'down', 'left', 'right']);
const isArrow = (key) => ARROWS.includes(key);

// Cursor on the 2x2 grid of answers (0 1 / 2 3); never lands past the last answer.
function gridMove(cursor, key, count) {
  const col = cursor % 2;
  const row = Math.floor(cursor / 2);
  const target = { left: row * 2, right: row * 2 + 1, up: col, down: 2 + col }[key];
  return Math.min(target, count - 1);
}

// Cursor on a vertical list; stops at both ends.
function listMove(index, key, count) {
  if (key === 'up') return Math.max(0, index - 1);
  if (key === 'down') return Math.min(count - 1, index + 1);
  return index;
}

const selectIndex = (app, field, index) =>
  (app[field] === index ? result(app) : result({ ...app, [field]: index }, [sfx('select')]));

// Back to a menu: whatever run was in progress is dropped.
const leaveTo = (app, scene) =>
  result(
    moved(app, { scene, run: null, year: null, sim: false, workshop: null, overlay: null, cursor: 0 }),
    [sfx('select'), music('title')],
  );

module.exports = { NONE, sfx, music, result, moved, isArrow, gridMove, listMove, selectIndex, leaveTo };
