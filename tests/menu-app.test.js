'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, reduce } = require('../src/ui/app');
const { SHOWCASE } = require('../src/year/showcase');
const { menuItems } = require('../src/ui/year-view');
const layout = require('../src/ui/layout');

const fresh = (extra = {}) => ({ ...createApp({ lang: 'es', muted: false, best: 0, bestYear: 0 }), ...extra });
const press = (app, key) => reduce(app, { type: 'key', key });
const pressAll = (app, keys) => keys.reduce((state, key) => press(state.app, key), { app, effects: [] });
const names = (result) => result.effects.map((e) => e.name || e.mode || e.type);

const CREATOR = { creator: true };
const intoMenu = (extra = {}) => press(fresh(extra), 'confirm').app;
const intoEndings = () => pressAll(fresh(CREATOR), ['confirm', 'down', 'down', 'confirm']).app;

test('the title leads to the mode menu and starts the title music', () => {
  const result = press(fresh(), 'confirm');
  assert.equal(result.app.scene, 'menu');
  assert.equal(result.app.menuIdx, 0);
  assert.ok(names(result).includes('title'));
});

test('a tap on the title also opens the menu', () => {
  assert.equal(reduce(fresh(), { type: 'tap', x: 100, y: 100 }).app.scene, 'menu');
});

test('a player sees two modes, the year and the tutorial, and the list stops at its ends', () => {
  assert.deepEqual(menuItems(fresh()), ['year', 'tutorial']);
  let state = { app: intoMenu(), effects: [] };
  state = press(state.app, 'up');
  assert.equal(state.app.menuIdx, 0);
  assert.deepEqual(state.effects, [], 'no sound when nothing moves');
  state = press(state.app, 'down');
  assert.equal(state.app.menuIdx, 1);
  assert.ok(names(state).includes('select'));
  state = pressAll(state.app, ['down', 'down', 'down', 'down']);
  assert.equal(state.app.menuIdx, 1, 'there is nothing after the tutorial');
});

test('the creator mode adds the endings and the workshop to the menu', () => {
  assert.deepEqual(menuItems(fresh(CREATOR)), ['year', 'tutorial', 'endings', 'workshop']);
  const state = pressAll(intoMenu(CREATOR), ['down', 'down', 'down', 'down']);
  assert.equal(state.app.menuIdx, 3);
  assert.equal(press(state.app, 'confirm').app.scene, 'workshop');
});

test('a player cannot reach the endings or the workshop with taps or the pointer either', () => {
  for (let y = 0; y < layout.H; y += 2) {
    const first = reduce(intoMenu(), { type: 'tap', x: 40, y }).app;
    const tapped = first.scene === 'menu' ? reduce(first, { type: 'tap', x: 40, y }).app : first;
    assert.ok(['menu', 'yearIntro', 'intro'].includes(tapped.scene), `tapping y=${y} twice opened ${tapped.scene}`);
    assert.ok(reduce(intoMenu(), { type: 'hover', x: 40, y }).app.menuIdx <= 1, `hovering y=${y}`);
  }
});

test('the full year and the tutorial are each one confirm away, and the endings in creator mode', () => {
  assert.equal(press(intoMenu(), 'confirm').app.scene, 'yearIntro');
  assert.equal(pressAll(fresh(), ['confirm', 'down', 'confirm']).app.scene, 'intro');
  assert.equal(intoEndings().scene, 'endings');
});

test('the tutorial still runs from the menu: intro, then the first floor', () => {
  const intro = pressAll(fresh(), ['confirm', 'down', 'confirm']).app;
  const play = press(intro, 'confirm');
  assert.equal(play.app.scene, 'play');
  assert.equal(play.app.run.phase, 'floorIntro');
  assert.ok(names(play).includes('play'));
});

const intoIntro = (extra = {}) => press(intoMenu(extra), 'confirm').app;
const digits = (app, text) => pressAll(app, [...text].map((digit) => `digit${digit}`));

test('typing four digits on the year intro fixes the game code of the year', () => {
  const typed = digits(intoIntro(), '4821');
  assert.equal(typed.app.seed, 4821);
  assert.equal(typed.app.codeEntry, '');
  assert.ok(names(typed).includes('confirm'), 'the fourth digit sounds like a confirmation');
  const start = press(typed.app, 'confirm').app;
  assert.equal(start.year.seed, 4821);
  assert.equal(start.scene, 'year');
});

test('two players who type the same code play the same year', () => {
  const a = press(digits(intoIntro(), '0077').app, 'confirm').app;
  const b = press(digits(intoIntro({ seed: 5 }), '0077').app, 'confirm').app;
  assert.deepEqual(a.year.schedule, b.year.schedule);
  assert.equal(a.year.seed, 77);
});

test('the digits typed so far are kept until the fourth arrives', () => {
  const partial = digits(intoIntro(), '48');
  assert.equal(partial.app.codeEntry, '48');
  assert.equal(partial.app.seed, 1, 'the code of the game does not change yet');
  assert.ok(names(partial).includes('select'));
  assert.equal(digits(partial.app, '2').app.codeEntry, '482');
});

test('delete erases the last digit and back leaves the intro forgetting the code typed so far', () => {
  const partial = digits(intoIntro(), '482').app;
  assert.equal(press(partial, 'delete').app.codeEntry, '48');
  assert.deepEqual(press(intoIntro(), 'delete').effects, [], 'nothing to erase');
  const left = press(partial, 'back').app;
  assert.equal(left.scene, 'menu');
  assert.equal(left.codeEntry, '');
});

test('with part of a code typed the year does not start: the code is finished or erased first', () => {
  const partial = digits(intoIntro(), '482').app;
  const pressed = press(partial, 'confirm');
  assert.equal(pressed.app.scene, 'yearIntro');
  assert.equal(pressed.app.codeEntry, '482');
  assert.equal(reduce(partial, { type: 'tap', x: 100, y: 100 }).app.scene, 'yearIntro', 'a tap does not start it either');
  assert.equal(press(press(partial, 'delete').app, 'confirm').app.scene, 'yearIntro');
  assert.equal(press(pressAll(partial, ['delete', 'delete', 'delete']).app, 'confirm').app.scene, 'year');
});

test('digits do nothing outside the year intro', () => {
  const menu = intoMenu();
  assert.equal(digits(menu, '1234').app, menu);
  assert.equal(digits(fresh(), '1234').app.seed, 1);
});

test('the year intro starts a fresh year and the play music', () => {
  const start = press(press(intoMenu(), 'confirm').app, 'confirm');
  assert.equal(start.app.scene, 'year');
  assert.equal(start.app.year.phase, 'problem');
  assert.equal(start.app.year.monthIdx, 0);
  assert.equal(start.app.sim, false);
  assert.equal(start.app.cursor, 0);
  assert.ok(names(start).includes('play'));
});

test('back steps out one level: year intro, endings and tutorial intro return to the menu, the menu to the title', () => {
  assert.equal(press(press(intoMenu(), 'confirm').app, 'back').app.scene, 'menu');
  assert.equal(press(intoEndings(), 'back').app.scene, 'menu');
  const tutorialIntro = pressAll(fresh(), ['confirm', 'down', 'confirm']).app;
  assert.equal(press(tutorialIntro, 'back').app.scene, 'menu');
  assert.equal(press(intoMenu(), 'back').app.scene, 'title');
  assert.equal(press(fresh(), 'back').app.scene, 'title');
});

test('the endings list moves through the eight play styles', () => {
  let app = intoEndings();
  assert.equal(app.profileIdx, 0);
  app = pressAll(app, Array(20).fill('down')).app;
  assert.equal(app.profileIdx, SHOWCASE.length - 1);
  app = pressAll(app, Array(20).fill('up')).app;
  assert.equal(app.profileIdx, 0);
});

test('choosing a play style shows its verdict as a simulated year without saving anything', () => {
  for (let i = 0; i < SHOWCASE.length; i += 1) {
    const app = { ...intoEndings(), profileIdx: i };
    const result = press(app, 'confirm');
    assert.equal(result.app.scene, 'year');
    assert.equal(result.app.sim, true);
    assert.equal(result.app.year.phase, 'final');
    assert.equal(result.app.year.outcome, SHOWCASE[i].outcome);
    assert.ok(!result.effects.some((e) => e.type === 'save'), 'a simulated year must not set the best year');
  }
});

test('taps on a menu row select it first and open it on the second tap', () => {
  const menu = intoMenu();
  const row = layout.menuRowRect(1, 2);
  const select = reduce(menu, { type: 'tap', x: row.x + 5, y: row.y + 5 });
  assert.equal(select.app.menuIdx, 1);
  assert.equal(select.app.scene, 'menu');
  const open = reduce(select.app, { type: 'tap', x: row.x + 5, y: row.y + 5 });
  assert.equal(open.app.scene, 'intro');
});

test('hovering a menu row or a play style selects it', () => {
  const row = layout.menuRowRect(2);
  assert.equal(reduce(intoMenu(CREATOR), { type: 'hover', x: row.x + 3, y: row.y + 3 }).app.menuIdx, 2);
  const profile = layout.profileRowRect(5);
  assert.equal(reduce(intoEndings(), { type: 'hover', x: profile.x + 3, y: profile.y + 2 }).app.profileIdx, 5);
});

test('taps on a play style row select then open it', () => {
  const profile = layout.profileRowRect(3);
  const select = reduce(intoEndings(), { type: 'tap', x: profile.x + 4, y: profile.y + 2 });
  assert.equal(select.app.profileIdx, 3);
  assert.equal(select.app.scene, 'endings');
  assert.equal(reduce(select.app, { type: 'tap', x: profile.x + 4, y: profile.y + 2 }).app.scene, 'year');
});

test('the creator flag is part of the app state and is off unless asked for', () => {
  assert.equal(createApp({ lang: 'es', muted: false, best: 0 }).creator, false);
  assert.equal(createApp({ lang: 'es', muted: false, best: 0, creator: true }).creator, true);
});

test('the best-year rank is part of the app state', () => {
  assert.equal(createApp({ lang: 'en', muted: true, best: 2, bestYear: 4 }).bestYear, 4);
  assert.equal(createApp({ lang: 'en', muted: true, best: 2 }).bestYear, 0);
});

test('every new year gets its own order: the app hands the engine a fresh seed each time', () => {
  const app = createApp({ lang: 'es', muted: false, best: 0, bestYear: 0, seed: 123 });
  const menu = press(app, 'confirm').app;
  const first = pressAll(menu, ['confirm', 'confirm']).app;
  assert.equal(first.year.seed, 123);
  assert.notEqual(first.seed, 123, 'the app moves on to another seed');
  const back = press(pressAll(first, ['back']).app, 'confirm').app;
  assert.equal(back.scene, 'menu');
  const second = pressAll(back, ['confirm', 'confirm']).app;
  assert.notEqual(second.year.seed, first.year.seed);
  assert.notEqual(second.year.schedule.order.join(), first.year.schedule.order.join());
});

test('the tutorial also starts with a seed of its own', () => {
  const app = createApp({ lang: 'es', muted: false, best: 0, bestYear: 0, seed: 77 });
  const play = pressAll(app, ['confirm', 'down', 'confirm', 'confirm']).app;
  assert.equal(play.run.seed, 77);
  assert.notEqual(play.seed, 77);
});

test('the simulated endings never use or burn the seed', () => {
  const app = createApp({ lang: 'es', muted: false, best: 0, bestYear: 0, seed: 55, creator: true });
  const shown = pressAll(app, ['confirm', 'down', 'down', 'confirm', 'confirm']).app;
  assert.equal(shown.sim, true);
  assert.equal(shown.seed, 55);
});
