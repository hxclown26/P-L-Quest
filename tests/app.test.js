'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, reduce } = require('../src/ui/app');
const engine = require('../src/engine');
const layout = require('../src/ui/layout');

const fresh = () => createApp({ lang: 'es', muted: false, best: 0 });
const press = (app, key) => reduce(app, { type: 'key', key });
const pressAll = (app, keys) => keys.reduce((state, key) => press(state.app, key), { app, effects: [] });
const names = (result) => result.effects.map((e) => e.name || e.mode || e.type);

const intoTutorialIntro = () => pressAll(fresh(), ['confirm', 'down', 'confirm']).app;
const intoPlay = () => press(intoTutorialIntro(), 'confirm').app;
const intoTurn = () => press(intoPlay(), 'confirm').app;

const GOOD = [
  'scan', 'measured', 'contract3y', 'raise', 'bundle', 'forecast',
  'passValue', 'renegotiate', 'swapInput', 'remote', 'routeOpt', 'fee',
  'restructure', 'freeze', 'trimTravel',
];

// The cards are a vertical list: up to the top, then down to the wanted row.
function moveTo(app, index) {
  return pressAll(app, [...Array(3).fill('up'), ...Array(index).fill('down')]).app;
}

function playByKeys(app, prefs) {
  let state = { app, effects: [] };
  const all = [];
  for (let i = 0; i < 400 && state.app.run.phase !== 'final' && state.app.run.phase !== 'dead'; i += 1) {
    const { run } = state.app;
    if (run.phase === 'turn') {
      const id = prefs.find((p) => run.hand.includes(p)) || run.hand[0];
      state = { app: moveTo(state.app, run.hand.indexOf(id)), effects: [] };
    }
    state = press(state.app, 'confirm');
    all.push(...state.effects);
  }
  return { app: state.app, effects: all };
}

test('title leads to the menu, the menu to the tutorial intro and the intro starts the run', () => {
  const first = press(fresh(), 'confirm');
  assert.equal(first.app.scene, 'menu');
  assert.ok(names(first).includes('title'), 'title music starts on the first interaction');
  const second = pressAll(first.app, ['down', 'confirm']);
  assert.equal(second.app.scene, 'intro');
  const third = press(second.app, 'confirm');
  assert.equal(third.app.scene, 'play');
  assert.equal(third.app.run.phase, 'floorIntro');
  assert.ok(names(third).includes('play'));
});

test('the note overlay opens in play, swallows confirm and closes', () => {
  const app = intoPlay();
  const opened = press(app, 'note').app;
  assert.equal(opened.overlay, 'note');
  const confirmed = press(opened, 'confirm').app;
  assert.equal(confirmed.overlay, null);
  assert.equal(confirmed.run.phase, 'floorIntro', 'closing the note must not advance the game');
  assert.equal(press(fresh(), 'note').app.overlay, null, 'no note on the title screen');
});

test('arrows move the cursor down the list of cards and stop at both ends', () => {
  const turn = intoTurn();
  assert.equal(turn.run.phase, 'turn');
  assert.equal(turn.cursor, 0);
  const path = [['down', 1], ['down', 2], ['down', 3], ['down', 3], ['up', 2], ['up', 1], ['up', 0], ['up', 0], ['right', 0], ['left', 0]];
  let state = turn;
  for (const [key, expected] of path) {
    state = press(state, key).app;
    assert.equal(state.cursor, expected, key);
  }
});

test('confirm in a turn plays the selected card and moves to the result', () => {
  const turn = intoTurn();
  const result = press(turn, 'confirm');
  assert.equal(result.app.run.phase, 'turnResult');
  assert.equal(result.app.run.played.length, 1);
  assert.equal(result.app.run.played[0].cardId, turn.run.hand[0]);
  assert.ok(result.effects.some((e) => e.type === 'sfx'));
});

test('good cards sound good and bad cards sound bad', () => {
  let app = intoTurn();
  for (const id of ['listPrice', 'bundle', 'raise']) {
    app = moveTo(app, app.run.hand.indexOf(id));
    app = press(app, 'confirm').app;
    app = press(app, 'confirm').app;
  }
  assert.equal(app.run.floorIdx, 0);
  const advanced = pressAll(app, ['confirm', 'confirm']).app;
  assert.equal(advanced.run.floorIdx, 1);
  assert.equal(advanced.run.phase, 'turn');
  const bad = press(moveTo(advanced, advanced.run.hand.indexOf('give3')), 'confirm');
  assert.ok(names(bad).includes('bad'));
  const good = press(moveTo(advanced, advanced.run.hand.indexOf('scan')), 'confirm');
  assert.ok(!names(good).includes('bad'));
});

test('a perfect run reaches the final screen and saves three stars', () => {
  const { app, effects } = playByKeys(intoPlay(), GOOD);
  assert.equal(app.run.phase, 'final');
  assert.ok(effects.some((e) => e.type === 'save' && e.patch.bestStars === 3));
  const again = press(app, 'confirm');
  assert.equal(again.app.run.phase, 'floorIntro');
  assert.equal(again.app.run.attempt, 1);
});

test('dying silences the music and retrying brings it back', () => {
  const doomedRun = engine.enterFloor(
    { ...engine.newRun(), pl: { sales: 100, incentives: 2, cost: 53, serve: 14, sga: 30 } },
    2,
  );
  const dead = { ...intoPlay(), run: doomedRun };
  assert.equal(dead.run.phase, 'dead');
  const retried = press(dead, 'confirm');
  assert.equal(retried.app.run.phase, 'floorIntro');
  assert.equal(retried.app.run.attempt, 2);
  assert.ok(names(retried).includes('play'));
});

test('mute and language toggles are saved', () => {
  const muted = press(fresh(), 'mute');
  assert.equal(muted.app.muted, true);
  assert.deepEqual(muted.effects.find((e) => e.type === 'save').patch, { muted: true });
  const english = press(fresh(), 'lang');
  assert.equal(english.app.lang, 'en');
  assert.deepEqual(english.effects.find((e) => e.type === 'save').patch, { lang: 'en' });
  assert.equal(press(english.app, 'lang').app.lang, 'es');
});

test('taps hit the footer buttons, select cards and advance other screens', () => {
  const turn = intoTurn();
  const tapped = reduce(turn, { type: 'tap', x: 230, y: layout.FOOTER.y + 5 });
  assert.equal(tapped.app.lang, 'en');
  const card = layout.answerRect(3);
  const select = reduce(turn, { type: 'tap', x: card.x + 5, y: card.y + 5 });
  assert.equal(select.app.cursor, 3);
  assert.equal(select.app.run.phase, 'turn', 'the first tap only selects');
  const play = reduce(select.app, { type: 'tap', x: card.x + 5, y: card.y + 5 });
  assert.equal(play.app.run.phase, 'turnResult', 'the second tap plays the card');
  const intro = reduce(intoPlay(), { type: 'tap', x: 100, y: 60 });
  assert.equal(intro.app.run.phase, 'turn', 'a tap advances a non-turn screen');
});

test('hover selects a card only during a turn', () => {
  const turn = intoTurn();
  const card = layout.answerRect(2);
  assert.equal(reduce(turn, { type: 'hover', x: card.x + 3, y: card.y + 3 }).app.cursor, 2);
  const intro = intoPlay();
  assert.equal(reduce(intro, { type: 'hover', x: card.x + 3, y: card.y + 3 }).app.cursor, 0);
});

test('tick advances time and a phase change restarts the phase clock', () => {
  const app = intoTurn();
  const ticked = reduce(app, { type: 'tick', dt: 0.5 }).app;
  assert.equal(ticked.t, app.t + 0.5);
  assert.equal(ticked.phaseT, app.phaseT + 0.5);
  const moved = press(ticked, 'confirm').app;
  assert.equal(moved.phaseT, 0);
});

test('back leaves the tutorial straight away from its final and game-over screens, and asks first mid-run', () => {
  const { app: final } = playByKeys(intoPlay(), GOOD);
  assert.equal(final.run.phase, 'final');
  const left = press(final, 'back');
  assert.equal(left.app.scene, 'menu');
  assert.equal(left.app.run, null);
  assert.ok(names(left).includes('title'));
  const doomedRun = engine.enterFloor(
    { ...engine.newRun(), pl: { sales: 100, incentives: 2, cost: 53, serve: 14, sga: 30 } },
    2,
  );
  const dead = { ...intoPlay(), run: doomedRun };
  assert.equal(press(dead, 'back').app.scene, 'menu');
  assert.equal(press(intoPlay(), 'back').app.overlay, 'quit');
});
