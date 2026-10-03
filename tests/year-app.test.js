'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, reduce } = require('../src/ui/app');
const engine = require('../src/year/engine');
const rules = require('../src/year/rules');
const sim = require('../src/year/simulate');
const model = require('../src/model');
const layout = require('../src/ui/layout');
const { showcaseRun } = require('../src/year/showcase');
const view = require('../src/ui/year-view');

const fresh = (extra = {}) => ({ ...createApp({ lang: 'es', muted: false, best: 0, bestYear: 0 }), ...extra });
const press = (app, key) => reduce(app, { type: 'key', key });
const pressAll = (app, keys) => keys.reduce((state, key) => press(state.app, key), { app, effects: [] });
const names = (result) => result.effects.map((e) => e.name || e.mode || e.type);

const intoBrief = (extra = {}) => pressAll(fresh(extra), ['confirm', 'confirm', 'confirm']).app;
// A brief that has been read (it types in, so some seconds in), then Enter: the answers are on screen.
const readBrief = (app) => press(tick(app, 10), 'confirm');
// Into the year and past the brief of its first problem.
const intoYear = (extra = {}) => readBrief(intoBrief(extra)).app;
const withYear = (year, extra = {}) => ({ ...intoYear(), year, briefedSlot: slotOf(year), ...extra });
const tick = (app, dt) => reduce(app, { type: 'tick', dt }).app;
const slotOf = (year) => year.monthIdx * engine.PROBLEMS_PER_MONTH + year.problemIdx;

// The answers are a vertical list: up to the top, then down to the wanted row.
const cursorKeys = (index) => [...Array(3).fill('up'), ...Array(index).fill('down')];
const moveTo = (app, index) => pressAll(app, cursorKeys(index)).app;
const indexOfArchetype = (year, a) => engine.options(year).findIndex((o) => o.a === a);

function answer(app, a) {
  const shown = view.briefing(app) ? readBrief(app).app : app;
  const moved = moveTo(shown, indexOfArchetype(shown.year, a));
  return press(moved, 'confirm');
}

// Plays a whole year by keys following a simulation policy; returns every effect it saw.
function playYear(app, policy, seed = 1) {
  const rng = sim.mulberry32(seed);
  let state = { app, effects: [] };
  const all = [];
  for (let guard = 0; guard < 800 && state.app.year.phase !== 'final'; guard += 1) {
    if (state.app.year.phase === 'problem') {
      if (view.briefing(state.app)) state = readBrief(state.app);
      state = { app: moveTo(state.app, policy(state.app.year, rng)), effects: [] };
    }
    state = press(state.app, 'confirm');
    all.push(...state.effects);
  }
  return { app: state.app, effects: all };
}

test('arrows move the cursor down the list of answers and confirm picks the highlighted one', () => {
  let app = intoYear();
  assert.equal(app.year.phase, 'problem');
  for (const [key, expected] of [['down', 1], ['down', 2], ['down', 3], ['down', 3], ['up', 2], ['up', 1], ['up', 0], ['up', 0]]) {
    app = press(app, key).app;
    assert.equal(app.cursor, expected, key);
  }
  assert.equal(press(app, 'right').app.cursor, 0, 'left and right do nothing on a vertical list');
  assert.equal(press(app, 'left').app.cursor, 0);
  app = press(app, 'down').app;
  const highlighted = engine.options(app.year)[app.cursor].a;
  const result = press(app, 'confirm');
  assert.equal(result.app.year.phase, 'result');
  assert.equal(result.app.year.last.a, highlighted);
});

test('each kind of answer has its own sound: balanced sounds good, shortcut and passive sound bad', () => {
  const app = intoYear();
  assert.ok(names(answer(app, 'smart')).includes('good'));
  assert.ok(names(answer(app, 'temp')).includes('bad'));
  assert.ok(names(answer(app, 'ign')).includes('bad'));
  assert.ok(names(answer(app, 'plac')).includes('confirm'));
});

test('after the result, confirm brings the next problem with the cursor back on the first answer', () => {
  const answered = answer(moveTo(intoYear(), 3), 'smart').app;
  const next = press(answered, 'confirm').app;
  assert.equal(next.year.phase, 'problem');
  assert.equal(next.year.problemIdx, 1);
  assert.equal(next.cursor, 0);
});

test('four answers close the month and confirm opens the next one', () => {
  let app = intoYear();
  for (let i = 0; i < 4; i += 1) app = press(answer(app, 'smart').app, 'confirm').app;
  assert.equal(app.year.phase, 'monthClose');
  assert.equal(app.year.closes.length, 1);
  app = press(app, 'confirm').app;
  assert.equal(app.year.phase, 'problem');
  assert.equal(app.year.monthIdx, 1);
  assert.equal(app.year.problemIdx, 0);
});

test('a meter at zero opens the blow screen with a warning sound, and confirm goes on with the month', () => {
  const app = withYear({ ...engine.newYear(), monthIdx: 1, meters: { C: 1, P: 60, E: 60 } });
  const result = press(answer(app, 'ign').app, 'confirm');
  assert.equal(result.app.year.phase, 'shock');
  assert.ok(names(result).includes('bad'));
  const resumed = press(result.app, 'confirm').app;
  assert.equal(resumed.year.phase, 'problem');
  assert.equal(resumed.year.problemIdx, 1);
});

test('an OI at zero at the close opens the restructuring screen with a warning sound, and confirm resumes the year', () => {
  const thin = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: -15.5 });
  const app = withYear({ ...engine.newYear(), monthIdx: 3, problemIdx: 3, phase: 'monthClose', pl: thin });
  const result = press(app, 'confirm');
  assert.equal(result.app.year.phase, 'rescue');
  assert.ok(names(result).includes('bad'));
  const resumed = press(result.app, 'confirm').app;
  assert.equal(resumed.year.phase, 'problem');
  assert.equal(resumed.year.rescued, true);
});

test('an expert year ends on the verdict, saves the best year and plays the fanfare', () => {
  const { app, effects } = playYear(intoYear(), sim.PROFILES.expert);
  assert.equal(app.year.phase, 'final');
  assert.equal(app.year.outcome, 'excellent');
  const saved = effects.filter((e) => e.type === 'save');
  assert.deepEqual(saved.map((e) => e.patch), [{ bestYear: 6 }]);
  assert.ok(names({ effects }).includes('star'));
});

test('a bankruptcy plays the defeat sound and saves rank 1', () => {
  const { app, effects } = playYear(intoYear(), sim.PROFILES.passive);
  assert.equal(app.year.outcome, 'bankrupt');
  assert.deepEqual(effects.filter((e) => e.type === 'save').map((e) => e.patch), [{ bestYear: 1 }]);
  assert.ok(names({ effects }).includes('death'));
});

test('the verdict has three pages (result, P&L report, analysis), then GAME OVER, and confirming that restarts at the menu', () => {
  const { app } = playYear(intoYear(), sim.PROFILES.expert);
  assert.equal(app.page, 0);
  const report = press(app, 'confirm');
  assert.equal(report.app.year.phase, 'final', 'the first confirm only turns the page');
  assert.equal(report.app.page, 1);
  assert.ok(names(report).includes('select'));
  const feedback = press(report.app, 'confirm');
  assert.equal(feedback.app.year.phase, 'final');
  assert.equal(feedback.app.page, 2);
  const over = press(feedback.app, 'confirm');
  assert.equal(over.app.year.phase, 'over');
  assert.equal(over.app.page, 0);
  const restart = press(over.app, 'confirm');
  assert.equal(restart.app.scene, 'menu');
  assert.equal(restart.app.year, null);
  assert.ok(names(restart).includes('title'));
});

test('the verdict leaves by itself after 90 seconds and GAME OVER after 10 more', () => {
  const final = withYear(showcaseRun(0));
  assert.equal(tick(final, 89).year.phase, 'final');
  const over = tick(final, 91);
  assert.equal(over.year.phase, 'over');
  assert.equal(over.phaseT, 0, 'the new phase restarts its clock');
  assert.equal(tick(over, 9).scene, 'year');
  assert.equal(tick(over, 11).scene, 'menu');
});

test('time passing never moves a year that is still being played', () => {
  const app = intoYear();
  assert.equal(tick(app, 500).year.phase, 'problem');
  const answered = answer(app, 'smart').app;
  assert.equal(tick(answered, 500).year.phase, 'result');
});

test('a simulated ending returns to the endings list, not the main menu', () => {
  const sample = { ...fresh(), scene: 'endings', profileIdx: 2 };
  const verdict = press(sample, 'confirm').app;
  const over = pressAll(verdict, ['confirm', 'confirm', 'confirm']).app;
  assert.equal(over.year.phase, 'over');
  assert.equal(press(over, 'confirm').app.scene, 'endings');
  assert.equal(tick(over, 11).scene, 'endings');
});

test('N opens the rules overlay, which swallows confirm and closes without moving the year', () => {
  const app = intoYear();
  const opened = press(app, 'note').app;
  assert.equal(opened.overlay, 'rules');
  const closed = press(opened, 'confirm').app;
  assert.equal(closed.overlay, null);
  assert.equal(closed.year.phase, 'problem');
  assert.equal(closed.year.history.length, 0);
});

test('the rules open on their first page, the arrows turn the page and confirm closes them', () => {
  const opened = press(intoYear(), 'note').app;
  assert.equal(opened.rulesPage, 0);
  const second = press(opened, 'right');
  assert.equal(second.app.rulesPage, 1);
  assert.ok(names(second).includes('select'));
  assert.equal(second.app.overlay, 'rules', 'turning the page does not close the rules');
  assert.equal(press(second.app, 'right').app.rulesPage, 0, 'the two pages go round');
  assert.equal(press(second.app, 'left').app.rulesPage, 0);
  assert.equal(press(press(opened, 'down').app, 'up').app.rulesPage, 0);
  const closed = press(second.app, 'confirm').app;
  assert.equal(closed.overlay, null);
  assert.equal(press(closed, 'note').app.rulesPage, 0, 'and they open on the first page again');
});

test('R does nothing for a player: the reviewer is the creator\'s tool', () => {
  const app = intoYear();
  const pressed = press(app, 'review');
  assert.equal(pressed.app.review, false);
  assert.deepEqual(pressed.effects, []);
});

test('R toggles the reviewer mode in creator mode and keeps the year as it is', () => {
  const app = intoYear({ creator: true });
  assert.equal(app.review, false);
  const on = press(app, 'review');
  assert.equal(on.app.review, true);
  assert.ok(names(on).includes('select'));
  assert.equal(press(on.app, 'review').app.review, false);
  assert.equal(on.app.year, app.year);
});

test('back asks before abandoning a year: confirm leaves for the menu, back keeps playing', () => {
  const app = intoYear();
  const asked = press(app, 'back').app;
  assert.equal(asked.overlay, 'quit');
  assert.equal(press(asked, 'back').app.overlay, null);
  assert.equal(press(asked, 'back').app.scene, 'year');
  const left = press(asked, 'confirm').app;
  assert.equal(left.scene, 'menu');
  assert.equal(left.year, null);
  assert.equal(left.overlay, null);
});

test('back on the verdict leaves straight away', () => {
  const final = withYear(showcaseRun(0));
  assert.equal(press(final, 'back').app.scene, 'menu');
  const sample = withYear(showcaseRun(0), { sim: true });
  assert.equal(press(sample, 'back').app.scene, 'endings');
});

test('the quit question also protects a tutorial run', () => {
  const play = pressAll(fresh(), ['confirm', 'down', 'down', 'confirm', 'confirm']).app;
  assert.equal(play.scene, 'play');
  const asked = press(play, 'back').app;
  assert.equal(asked.overlay, 'quit');
  const left = press(asked, 'confirm').app;
  assert.equal(left.scene, 'menu');
  assert.equal(left.run, null);
});

test('taps select an answer first and choose it on the second tap; elsewhere they advance', () => {
  const app = intoYear();
  const card = layout.answerRect(3);
  const select = reduce(app, { type: 'tap', x: card.x + 5, y: card.y + 5 });
  assert.equal(select.app.cursor, 3);
  assert.equal(select.app.year.phase, 'problem');
  const choose = reduce(select.app, { type: 'tap', x: card.x + 5, y: card.y + 5 });
  assert.equal(choose.app.year.phase, 'result');
  const advance = reduce(choose.app, { type: 'tap', x: 100, y: 60 });
  assert.equal(advance.app.year.phase, 'problem');
  const miss = reduce(app, { type: 'tap', x: 100, y: 60 });
  assert.equal(miss.app.year.phase, 'problem', 'a tap off the answers does not answer');
});

test('hover selects an answer only while a problem is open', () => {
  const app = intoYear();
  const card = layout.answerRect(2);
  assert.equal(reduce(app, { type: 'hover', x: card.x + 3, y: card.y + 3 }).app.cursor, 2);
  const answered = answer(app, 'smart').app;
  assert.equal(reduce(answered, { type: 'hover', x: card.x + 3, y: card.y + 3 }).app.cursor, answered.cursor);
});

test('footer taps work in year mode: rules, sound and language', () => {
  const app = intoYear();
  assert.equal(reduce(app, { type: 'tap', x: 120, y: layout.FOOTER.y + 5 }).app.overlay, 'rules');
  assert.equal(reduce(app, { type: 'tap', x: 160, y: layout.FOOTER.y + 5 }).app.muted, true);
  assert.equal(reduce(app, { type: 'tap', x: 230, y: layout.FOOTER.y + 5 }).app.lang, 'en');
});

test('a played year never throws in any phase, whatever the answers', () => {
  for (const name of ['random', 'weak', 'halfShort']) {
    const { app } = playYear(intoYear(), sim.PROFILES[name], 7);
    assert.ok(rules.OUTCOMES.includes(app.year.outcome), name);
  }
});

// ---- the play time and the best year of a half year
test('the play time runs while the year is played, also behind the rules, and stops at the verdict', () => {
  let app = intoYear();
  const start = app.yearT;
  assert.equal(start, 10, 'reading the first brief is part of the game');
  app = tick(app, 2);
  assert.equal(app.yearT, start + 2);
  app = tick(press(app, 'note').app, 1.5);
  assert.equal(app.yearT, start + 3.5, 'reading the rules is part of the game');
  const result = tick(withYear({ ...engine.newYear(), phase: 'result' }, { yearT: 10 }), 1);
  assert.equal(result.yearT, 11);
  for (const phase of ['final', 'over']) {
    assert.equal(tick(withYear({ ...engine.newYear(), phase }, { yearT: 10 }), 1).yearT, 10, phase);
  }
});

test('a simulated year or a screen outside the year does not count play time', () => {
  assert.equal(tick(withYear(engine.newYear(), { sim: true, yearT: 0 }), 3).yearT, 0);
  assert.equal(tick(fresh(), 3).yearT, 0);
  assert.equal(tick(pressAll(fresh(), ['confirm']).app, 3).yearT, 0, 'the menu');
});

test('the best year is saved for a full year, never for a half year or a simulated one', () => {
  const { verdictEffects } = require('../src/ui/year-app');
  const saved = (app, run) => verdictEffects(app, run).some((effect) => effect.type === 'save');
  const full = { ...engine.newYear(), outcome: 'good', phase: 'final' };
  const half = { ...engine.newYear(null, 6), outcome: 'good', phase: 'final' };
  assert.equal(saved({ sim: false, workshop: null }, full), true);
  assert.equal(saved({ sim: false, workshop: null }, half), false);
  assert.equal(saved({ sim: true, workshop: null }, full), false);
});
