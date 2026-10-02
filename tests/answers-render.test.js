'use strict';

// The decision screens of both modes, drawn for every problem and every card in both languages:
// nothing leaves the screen or its window, and no two pieces of text on an answer row collide.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/ui/app');
const engine = require('../src/year/engine');
const tutorial = require('../src/engine');
const { PROBLEMS } = require('../src/year/problems');
const layout = require('../src/ui/layout');
const { draw } = require('./helpers/screen');

const CELL = 6;
const LANGS = ['es', 'en'];
const base = (patch = {}) => ({ ...createApp({ lang: 'es', muted: false, best: 0, bestYear: 0 }), t: 1.2, phaseT: 3, ...patch });

// The letters of one answer row, left to right.
const rowGlyphs = (glyphs, i) => {
  const r = layout.answerRect(i);
  return glyphs.filter((g) => g.x >= r.x && g.x < r.x + r.w && g.y >= r.y && g.y < r.y + r.h).sort((a, b) => a.x - b.x);
};

// Two letters closer than one cell apart would be printed on top of each other.
function assertNoCollision(glyphs, label) {
  glyphs.slice(1).forEach((g, i) => assert.ok(g.x - glyphs[i].x >= CELL, `${label}: "${glyphs[i].ch}" and "${g.ch}" overlap at x=${g.x}`));
}

const inside = (g, box) => g.x >= box.x && g.x + CELL <= box.x + box.w && g.y >= box.y && g.y + 7 <= box.y + box.h;

test('every answer of every problem fits its row in the year, in both languages', () => {
  PROBLEMS.forEach((problem, n) => {
    const year = { ...engine.newYear(), monthIdx: Math.floor(n / 4), problemIdx: n % 4 };
    for (const lang of LANGS) {
      for (let cursor = 0; cursor < 4; cursor += 1) {
        const { glyphs } = draw(base({ scene: 'year', year, lang, cursor }));
        const label = `${lang} ${problem.id} cursor ${cursor}`;
        for (let i = 0; i < 4; i += 1) {
          const row = rowGlyphs(glyphs, i);
          assert.ok(row.length > 8, `${label}: answer ${i} is drawn`);
          assertNoCollision(row, `${label} answer ${i}`);
          row.forEach((g) => assert.ok(inside(g, layout.answerRect(i)), `${label}: "${g.ch}" leaves answer row ${i}`));
        }
      }
    }
  });
});

// A run of the tutorial that picks the best (or the worst) card each turn, visiting every phase.
function* tutorialStates(pick) {
  let run = tutorial.newRun();
  for (let guard = 0; guard < 300 && run.phase !== 'final' && run.phase !== 'dead'; guard += 1) {
    yield run;
    run = run.phase === 'turn' ? tutorial.playCard(run, run.hand.reduce(pick(run))) : tutorial.next(run);
  }
  yield run;
}

const best = (run) => (a, b) => (tutorial.previewDelta(run, b).oi > tutorial.previewDelta(run, a).oi ? b : a);
const worst = (run) => (a, b) => (tutorial.previewDelta(run, b).oi < tutorial.previewDelta(run, a).oi ? b : a);

test('every card of the tutorial fits its row, and every phase stays inside the screen', () => {
  const seen = new Set();
  for (const pick of [best, worst]) {
    for (const run of tutorialStates(pick)) {
      seen.add(run.phase);
      for (const lang of LANGS) {
        const cursors = run.phase === 'turn' ? run.hand.map((_, i) => i) : [0];
        for (const cursor of cursors) {
          const { glyphs } = draw(base({ scene: 'play', run, lang, cursor }));
          const label = `${lang} floor ${run.floorIdx + 1} ${run.phase} cursor ${cursor}`;
          glyphs.forEach((g) => assert.ok(g.x >= 0 && g.x + CELL <= layout.W + 1 && g.y + 7 <= layout.H, `${label}: "${g.ch}" off the screen at ${g.x},${g.y}`));
          if (run.phase === 'turn') {
            run.hand.forEach((_, i) => {
              const row = rowGlyphs(glyphs, i);
              assertNoCollision(row, `${label} card ${i}`);
              row.forEach((g) => assert.ok(inside(g, layout.answerRect(i)), `${label}: "${g.ch}" leaves card row ${i}`));
            });
          }
        }
      }
    }
  }
  for (const phase of ['floorIntro', 'turn', 'turnResult', 'floorOutro', 'control', 'final', 'dead']) assert.ok(seen.has(phase), `the test reached ${phase}`);
});
