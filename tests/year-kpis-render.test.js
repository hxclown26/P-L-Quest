'use strict';

// Where the sales growth and the OI in money are drawn: on the first page of the verdict, in the readout of the month close
// and floating from the sales row of the statement after an answer that moved it.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/ui/app');
const engine = require('../src/year/engine');
const sim = require('../src/year/simulate');
const anim = require('../src/ui/anim');
const layout = require('../src/ui/layout');
const { textIn, draw } = require('./helpers/screen');

const NUMBERS = { x: 130, y: 26, w: 122, h: 66 };
const BRIDGE = { x: 4, y: 98, w: 248, h: 128 };
const squash = (text) => text.replace(/ /g, '');

const base = (patch = {}) => ({ ...createApp({ lang: 'es', muted: false, best: 0, bestYear: 0 }), t: 3, phaseT: 5, ...patch });
const verdictOf = (profile, lang = 'es') => base({ scene: 'year', lang, sim: true, page: 0, year: sim.simulate(sim.PROFILES[profile], 1) });
const textOf = (app, box) => squash(textIn(draw(app).glyphs, box).join('|'));

test('the first page of the verdict shows the OI in money and the sales growth in the numbers window', () => {
  const pleaser = verdictOf('pleaser');
  const text = textOf(pleaser, NUMBERS);
  assert.match(text, /OI\d+,\d%/);
  assert.match(text, /US\$\d+,\dM/);
  assert.match(text, /Ventas\+\d+,\d%/);
  const english = textOf(verdictOf('pleaser', 'en'), NUMBERS);
  assert.match(english, /Sales\+\d+\.\d%/);
  assert.match(english, /US\$\d+\.\dM/);
});

test('the numbers window keeps the plan, the three meters and the play time as well', () => {
  const app = { ...verdictOf('expert'), sim: false, yearT: 1300 };
  const text = textOf(app, NUMBERS);
  assert.match(text, /plan15%/);
  assert.match(text, /21:40min/);
  for (const tag of ['CLI', 'PLA', 'EST']) assert.ok(text.includes(tag), tag);
});

test('a year that sold without earning says so under the bridge, and one that earned does not', () => {
  assert.match(textOf(verdictOf('pleaser'), BRIDGE), /Crecesinmargen/);
  assert.match(textOf(verdictOf('pleaser', 'en'), BRIDGE), /Growth,nomargin/);
  assert.doesNotMatch(textOf(verdictOf('expert'), BRIDGE), /Crecesinmargen|Margensincrecer/);
});

test('the label and the game code share the foot of the bridge window without touching: they sit on separate rows', () => {
  for (const lang of ['es', 'en']) {
    const year = sim.simulate(sim.PROFILES.pleaser, 1, engine.newYear(5933));
    const rows = textIn(draw(base({ scene: 'year', lang, sim: false, page: 0, year })).glyphs, BRIDGE).map(squash);
    const tag = rows.findIndex((row) => /Crecesinmargen|Growth,nomargin/.test(row));
    const code = rows.findIndex((row) => /5933/.test(row));
    assert.ok(tag >= 0 && code >= 0, `${lang}: both are drawn`);
    assert.notEqual(tag, code, `${lang}: the label and the code are on the same row`);
    assert.ok(!/5933/.test(rows[tag]), `${lang}: the code runs into the label`);
  }
});

test('the readout of a month close carries the sales growth at its right edge', () => {
  let run = engine.newYear();
  while (run.phase !== 'monthClose') run = run.phase === 'problem' ? engine.choose(run, engine.options(run).findIndex((o) => o.a === 'smart')) : engine.next(run);
  const d = layout.DIALOGUE;
  const text = textOf(base({ scene: 'year', year: run }), { x: d.x, y: d.y + 3, w: d.w, h: 10 });
  assert.match(text, /OI\d+,\d%/);
  assert.match(text, /Ventas[+-]\d+,\d%/);
});

// A growth answer: sales up 5,7% and the margin down a point.
const tender = () => {
  const run = { ...engine.newYear(), monthIdx: 7, problemIdx: 0 };
  return engine.choose(run, engine.options(run).findIndex((o) => o.a === 'plac'));
};
const statementText = (year, phaseT) => textOf(base({ scene: 'year', year, phaseT }), layout.STATEMENT);

test('after an answer that moved the net sales the statement floats the growth for a moment, and then lets go', () => {
  const year = tender();
  assert.equal(year.last.problemId, 'm08c');
  assert.doesNotMatch(statementText(year, 0), /\+\d/, 'it waits a moment');
  assert.match(statementText(year, anim.FLOAT_DELAY + 0.3), /\+5,\d%/);
  assert.doesNotMatch(statementText(year, anim.FLOAT_DELAY + anim.FLOAT_SECONDS + 0.5), /\+\d/, 'and leaves');
});

test('an answer that barely moved the sales floats no growth, and a loss floats it in red', () => {
  const quiet = engine.choose(engine.newYear(), engine.options(engine.newYear()).findIndex((o) => o.a === 'plac'));
  assert.doesNotMatch(statementText(quiet, anim.FLOAT_DELAY + 0.3), /[+-]\d+,\d%/);
  const run = { ...engine.newYear(), monthIdx: 7, problemIdx: 0 };
  const lost = engine.choose(run, engine.options(run).findIndex((o) => o.a === 'ign'));
  assert.match(statementText(lost, anim.FLOAT_DELAY + 0.3), /-3,\d%/);
});
