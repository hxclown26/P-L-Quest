'use strict';

// Every problem opens with its brief: who is asking, why now and three facts. The answers appear after Enter, so a player
// reads the situation before deciding, and the footer says so.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, reduce } = require('../src/ui/app');
const engine = require('../src/year/engine');
const view = require('../src/ui/year-view');
const hud = require('../src/render/scenes/hud');
const layout = require('../src/ui/layout');
const { PROBLEMS } = require('../src/year/problems');
const es = require('../src/content/es');
const en = require('../src/content/en');

const fresh = (extra = {}) => ({ ...createApp({ lang: 'es', muted: false, best: 0, bestYear: 0 }), ...extra });
const press = (app, key) => reduce(app, { type: 'key', key });
// The brief types in; a player who has read it is some seconds in.
const read = (app) => reduce(app, { type: 'tick', dt: 10 }).app;
const decide = (app) => press(read(app), 'confirm').app;
const pressAll = (app, keys) => keys.reduce((state, key) => press(state.app, key), { app, effects: [] });
const names = (result) => result.effects.map((e) => e.name || e.mode || e.type);
const intoYear = () => pressAll(fresh(), ['confirm', 'confirm', 'confirm']).app;

test('a new year opens on the brief of its first problem, not on the answers', () => {
  const app = intoYear();
  assert.equal(app.year.phase, 'problem');
  assert.equal(view.briefing(app), true);
});

test('confirm on a brief that has been read shows the answers without answering; a second confirm answers', () => {
  const app = read(intoYear());
  const shown = press(app, 'confirm');
  assert.equal(shown.app.year.phase, 'problem', 'nothing was answered');
  assert.equal(shown.app.year.history.length, 0);
  assert.equal(view.briefing(shown.app), false);
  assert.ok(names(shown).includes('select'));
  const answered = press(shown.app, 'confirm');
  assert.equal(answered.app.year.phase, 'result');
  assert.equal(answered.app.year.history.length, 1);
});

test('the arrows do nothing on the brief: the cursor and the sound stay put', () => {
  const app = intoYear();
  for (const key of ['up', 'down', 'left', 'right']) {
    const result = press(app, key);
    assert.equal(result.app.cursor, app.cursor, key);
    assert.deepEqual(result.effects, [], key);
    assert.equal(view.briefing(result.app), true, key);
  }
});

test('a tap anywhere on the brief reads as Enter, and hovering does not move the cursor', () => {
  const app = read(intoYear());
  const hovered = reduce(app, { type: 'hover', x: 120, y: layout.DIALOGUE.y + layout.DIALOGUE.answersY + 10 });
  assert.equal(hovered.app.cursor, app.cursor);
  const tapped = reduce(app, { type: 'tap', x: 120, y: 200 });
  assert.equal(view.briefing(tapped.app), false);
  assert.equal(tapped.app.year.history.length, 0);
});

test('every new problem opens with its own brief: after the result and after the month closes', () => {
  let app = decide(intoYear());
  app = press(app, 'confirm').app;
  assert.equal(app.year.phase, 'result');
  app = press(app, 'confirm').app;
  assert.equal(app.year.phase, 'problem');
  assert.equal(app.year.problemIdx, 1);
  assert.equal(view.briefing(app), true, 'the second problem has its own brief');
  for (let i = 0; i < 3; i += 1) app = press(press(decide(app), 'confirm').app, 'confirm').app;
  assert.equal(app.year.phase, 'monthClose');
  app = press(app, 'confirm').app;
  assert.equal(app.year.monthIdx, 1);
  assert.equal(view.briefing(app), true, 'the first problem of the next month too');
});

test('a new year, after leaving one, opens on a brief again', () => {
  let app = decide(intoYear());
  app = press(press(app, 'back').app, 'confirm').app;
  assert.equal(app.scene, 'menu');
  app = pressAll(app, ['confirm', 'confirm']).app;
  assert.equal(app.scene, 'year');
  assert.equal(view.briefing(app), true);
});

test('only the problem phase has a brief: the result, the close and the verdict never do', () => {
  const answered = press(decide(intoYear()), 'confirm').app;
  assert.equal(answered.year.phase, 'result');
  assert.equal(view.briefing(answered), false);
});

test('the footer says what Enter does: decide on the brief, pick on the answers', () => {
  const app = intoYear();
  assert.equal(hud.actionKey(app), 'ui.btn.decide');
  assert.equal(hud.actionKey(decide(app)), 'ui.btn.pick');
  assert.equal(es['ui.btn.decide'], 'Enter: decidir');
  assert.equal(en['ui.btn.decide'], 'Enter: decide');
});

test('the brief of a problem: its title, the paragraph and three facts split into a label and a value', () => {
  const app = intoYear();
  const brief = view.briefOf(app);
  const problem = engine.currentProblem(app.year);
  assert.equal(brief.title, es[`year.${problem.id}.title`]);
  assert.equal(brief.text, es[`year.${problem.id}.brief`]);
  assert.equal(brief.facts.length, 3);
  brief.facts.forEach((fact) => {
    assert.ok(fact.label.length > 0 && fact.value.length > 0, JSON.stringify(fact));
  });
  const [label, value] = es[`year.${problem.id}.facts`].split('|')[0].split(': ');
  assert.deepEqual(brief.facts[0], { label, value });
  const english = en[`year.${problem.id}.facts`].split('|')[0].split(': ')[0];
  assert.equal(view.briefOf({ ...app, lang: 'en' }).facts[0].label, english);
});

test('every fact of every problem splits into a label and a value, in both languages', () => {
  for (let slot = 0; slot < PROBLEMS.length; slot += 1) {
    const year = { ...engine.newYear(), monthIdx: Math.floor(slot / 4), problemIdx: slot % 4 };
    ['es', 'en'].forEach((lang) => {
      const brief = view.briefOf({ ...fresh({ lang }), year });
      const id = engine.currentProblem(year).id;
      assert.equal(brief.facts.length, 3, `${lang} ${id}`);
      brief.facts.forEach((fact) => assert.ok(fact.label && fact.value, `${lang} ${id}: ${JSON.stringify(fact)}`));
    });
  }
});

// ---- what the brief screen draws

const { textIn, draw } = require('./helpers/screen');
const { tx } = require('../src/ui/tx');

const BOX = { x: layout.DIALOGUE.x, y: layout.DIALOGUE.y, w: layout.DIALOGUE.w, h: layout.DIALOGUE.h };
const squash = (text) => text.replace(/ /g, '');
const screenOf = (year, patch = {}) => ({ ...fresh(), scene: 'year', year, t: 3, phaseT: 5, briefedSlot: -1, ...patch });
const dialogue = (app) => squash(textIn(draw(app).glyphs, BOX).join(''));

test('the brief screen draws the title, the whole brief and the three facts in the dialogue window, and no answer', () => {
  const app = screenOf(engine.newYear());
  const problem = engine.currentProblem(app.year);
  const text = dialogue(app);
  assert.ok(text.includes(squash(es[`year.${problem.id}.title`])), 'the title');
  assert.ok(text.includes(squash(es[`year.${problem.id}.brief`])), 'the whole paragraph');
  es[`year.${problem.id}.facts`].split('|').forEach((fact) => assert.ok(text.includes(squash(fact)), fact));
  ['smart', 'temp', 'plac', 'ign'].forEach((a) => assert.ok(!text.includes(squash(es[`year.${problem.id}.${a}.name`])), `the ${a} answer is not shown yet`));
});

test('after Enter the window shows the answers and no longer the brief', () => {
  const year = engine.newYear();
  const problem = engine.currentProblem(year);
  const app = screenOf(year, { briefedSlot: view.slotOf(year) });
  const text = dialogue(app);
  ['smart', 'temp', 'plac', 'ign'].forEach((a) => assert.ok(text.includes(squash(es[`year.${problem.id}.${a}.name`])), a));
  assert.ok(!text.includes(squash(es[`year.${problem.id}.facts`].split('|')[0])), 'the facts are gone');
});

test('the brief types in like the situation did: at the first moment only its start is on screen', () => {
  const app = screenOf(engine.newYear(), { phaseT: 0.05 });
  const problem = engine.currentProblem(app.year);
  const text = dialogue(app);
  assert.ok(!text.includes(squash(es[`year.${problem.id}.brief`])), 'not all of it yet');
  assert.ok(text.includes(squash(es[`year.${problem.id}.title`])), 'the title is there from the start');
});

test('all 48 briefs fit the dialogue window in both languages: nine rows at most, inside its box', () => {
  for (let slot = 0; slot < PROBLEMS.length; slot += 1) {
    const year = { ...engine.newYear(), monthIdx: Math.floor(slot / 4), problemIdx: slot % 4 };
    for (const lang of ['es', 'en']) {
      const app = screenOf(year, { lang });
      const glyphs = draw(app).glyphs.filter((g) => g.y < layout.PLAY_H && g.y >= BOX.y);
      const id = engine.currentProblem(year).id;
      assert.ok(Math.max(...glyphs.map((g) => g.y + g.h)) <= BOX.y + BOX.h, `${lang} ${id}: text below the window`);
      assert.ok(Math.max(...glyphs.map((g) => g.x + g.w)) <= BOX.x + BOX.w - 2, `${lang} ${id}: text past the right edge`);
      assert.ok(textIn(draw(app).glyphs, BOX).length <= 9, `${lang} ${id}: more than nine rows`);
      assert.ok(tx(app, `year.${id}.brief`).length > 0);
    }
  }
});

// ---- the segment of the client, named in the picture window

test('the picture window names the segment the problem is about, on the brief, the answers and the result', () => {
  for (let slot = 0; slot < PROBLEMS.length; slot += 1) {
    const year = { ...engine.newYear(), monthIdx: Math.floor(slot / 4), problemIdx: slot % 4 };
    const problem = engine.currentProblem(year);
    for (const lang of ['es', 'en']) {
      const name = squash((lang === 'es' ? es : en)[`year.seg.${problem.segment}`]);
      const screens = [
        screenOf(year, { lang }),
        screenOf(year, { lang, briefedSlot: view.slotOf(year) }),
        screenOf(engine.choose(year, 0), { lang }),
      ];
      screens.forEach((app, i) => {
        const text = squash(textIn(draw(app).glyphs, layout.ART).join('|'));
        assert.ok(text.includes(name), `${lang} ${problem.id} screen ${i}: "${name}" is not in the picture window`);
      });
    }
  }
});

test('the reviewer badge moves to the right so the segment keeps the left corner', () => {
  const year = engine.newYear();
  const text = textIn(draw(screenOf(year, { review: true })).glyphs, layout.ART).join('|');
  assert.ok(squash(text).includes(squash(es['year.review.on'])), 'the badge is still there');
  assert.ok(squash(text).includes(squash(es[`year.seg.${engine.currentProblem(year).segment}`])), 'and so is the segment');
});

// ---- the first Enter finishes the typing: a double press must not skip a brief nobody has read

const anim = require('../src/ui/anim');

test('Enter while the brief is still typing finishes the typing; the next Enter shows the answers', () => {
  const app = intoYear();
  assert.equal(app.phaseT, 0, 'nothing has been typed yet');
  const finished = press(app, 'confirm');
  assert.equal(view.briefing(finished.app), true, 'the brief is still there');
  assert.ok(anim.typedChars(finished.app.phaseT) >= view.briefChars(finished.app), 'and all of it is on screen');
  assert.equal(finished.app.year.history.length, 0);
  assert.equal(view.briefing(press(finished.app, 'confirm').app), false, 'the second Enter shows the answers');
});

test('a tap does the same as Enter on a brief that is still typing', () => {
  const finished = reduce(intoYear(), { type: 'tap', x: 120, y: 200 });
  assert.equal(view.briefing(finished.app), true);
  assert.ok(anim.typedChars(finished.app.phaseT) >= view.briefChars(finished.app));
  assert.equal(view.briefing(reduce(finished.app, { type: 'tap', x: 120, y: 200 }).app), false);
});

test('a brief that has been typed in full needs a single Enter', () => {
  assert.equal(view.briefing(press(read(intoYear()), 'confirm').app), false);
});

test('the length of the brief is what the screen types: five rows at most, spaces at the breaks not counted', () => {
  const app = intoYear();
  const problem = engine.currentProblem(app.year);
  const rows = require('../src/text').wrapText(es[`year.${problem.id}.brief`], 40).slice(0, 5);
  assert.equal(view.briefChars(app), rows.reduce((total, row) => total + row.length, 0));
});
