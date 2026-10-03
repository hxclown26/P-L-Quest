'use strict';

// What moves on screen: the numbers of the statement roll to their new value, the change in OI
// floats up from its row, the situation is typed and every new screen fades in. The renderer is
// run on a recording canvas and the letters it draws are read back as text.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/ui/app');
const engine = require('../src/year/engine');
const anim = require('../src/ui/anim');
const layout = require('../src/ui/layout');
const es = require('../src/content/es');
const { textIn, draw } = require('./helpers/screen');

const base = (patch = {}) => ({ ...createApp({ lang: 'es', muted: false, best: 0, bestYear: 0 }), t: 1.2, phaseT: 0.3, ...patch });
const answered = (a) => {
  const run = engine.newYear();
  return engine.choose(run, engine.options(run).findIndex((o) => o.a === a));
};

const STATEMENT = layout.STATEMENT;

test('the statement shows the old numbers when the result opens and the new ones once it has rolled', () => {
  const year = answered('smart');
  const rowText = (phaseT) => textIn(draw(base({ scene: 'year', year, phaseT })).glyphs, STATEMENT).join('|');
  const start = rowText(0);
  const settled = anim.FLOAT_DELAY + anim.FLOAT_SECONDS + 0.2;
  const end = rowText(settled);
  assert.notEqual(start, end, 'the numbers rolled');
  assert.match(start, /OI.*15,0/, 'it starts from the plan');
  assert.match(end, new RegExp(`OI.*${year.last.oiAfter.toFixed(1).replace('.', ',')}`), 'and ends on the new OI');
  assert.equal(rowText(settled + 5), end, 'then it stays');
  assert.notEqual(rowText(anim.ROLL_SECONDS / 3), end, 'on the way it shows numbers in between');
});

test('a change in OI floats up from its row for a moment and then goes away', () => {
  const year = answered('temp');
  const floating = (phaseT) => textIn(draw(base({ scene: 'year', year, phaseT })).glyphs, STATEMENT).join('|').includes('pp');
  assert.equal(floating(0), false, 'it waits a moment');
  assert.equal(floating(anim.FLOAT_DELAY + 0.3), true);
  assert.equal(floating(anim.FLOAT_DELAY + anim.FLOAT_SECONDS + 0.5), false, 'and leaves');
});

test('the brief is typed: the first screen of a problem shows only the start of it', () => {
  const year = engine.newYear();
  const brief = es[`year.${engine.currentProblem(year).id}.brief`];
  const briefBox = { x: layout.DIALOGUE.x, y: layout.DIALOGUE.y + layout.DIALOGUE.sceneY - 2, w: layout.DIALOGUE.w, h: 46 };
  const typed = (phaseT) => textIn(draw(base({ scene: 'year', year, phaseT })).glyphs, briefBox).join('').replace(/\s/g, '');
  const complete = typed(8);
  assert.equal(complete, brief.replace(/\s/g, ''), 'everything is there in the end');
  assert.equal(typed(0), '');
  const partial = typed(0.3);
  assert.ok(partial.length > 0 && partial.length < complete.length, 'and part of it on the way');
  assert.ok(complete.startsWith(partial), 'in reading order');
});

test('the answers page shows the situation at once: the brief has told it already', () => {
  const year = engine.newYear();
  const scene = es[`year.${engine.currentProblem(year).id}.scene`];
  const sceneBox = { x: layout.DIALOGUE.x, y: layout.DIALOGUE.y + layout.DIALOGUE.sceneY - 2, w: layout.DIALOGUE.w, h: 20 };
  const shown = textIn(draw(base({ scene: 'year', year, phaseT: 0, briefedSlot: 0 })).glyphs, sceneBox).join('').replace(/\s/g, '');
  assert.equal(shown, scene.replace(/\s/g, ''));
});

test('a screen that has just opened is under a dark veil that clears in a fraction of a second', () => {
  const veilAt = (phaseT) => draw(base({ scene: 'year', year: engine.newYear(), phaseT })).fills
    .filter((f) => f.w === layout.W && f.h === layout.PLAY_H && f.alpha > 0 && f.alpha < 1 && f.color === '#0c0c1c').length;
  assert.ok(veilAt(0) > 0, 'dark at first');
  assert.equal(veilAt(anim.FADE_SECONDS + 0.05), 0, 'clear soon after');
});
