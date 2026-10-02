'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, reduce, acceptsText } = require('../src/ui/app');
const engine = require('../src/year/engine');
const sim = require('../src/year/simulate');
const { decisionsOf } = require('../src/year/replay');
const { encode, decode } = require('../src/year/result-code');
const layout = require('../src/ui/layout');

const CODE = 4821;
const fresh = (extra = {}) => ({ ...createApp({ lang: 'es', muted: false, best: 0, bestYear: 0, seed: 9, creator: true }), ...extra });
const press = (app, key) => reduce(app, { type: 'key', key });
const pressAll = (app, keys) => keys.reduce((state, key) => press(state.app, key), { app, effects: [] });
const type = (app, text) => [...text].reduce((state, char) => reduce(state.app, { type: 'char', char }), { app, effects: [] });
const paste = (app, text) => reduce(app, { type: 'paste', text });
const names = (result) => result.effects.map((e) => e.name || e.mode || e.type);

const codeOf = (name, profile, seed = 3, code = CODE) => encode({
  name,
  code,
  choices: decisionsOf(sim.simulate(sim.PROFILES[profile], seed, engine.newYear(code))),
});

const intoWorkshop = () => pressAll(fresh(), ['confirm', 'down', 'down', 'down', 'down', 'confirm']).app;
const intoSetup = () => press(intoWorkshop(), 'confirm').app;
const intoRank = () => pressAll(intoWorkshop(), ['down', 'confirm']).app;

// Fills the setup and starts the team's year.
const startTeam = (name = 'Halcones', code = '4821') => {
  let state = type(intoSetup(), name);
  state = pressAll(state.app, ['confirm']);
  state = type(state.app, code);
  return pressAll(state.app, ['confirm', 'confirm']);
};

// Plays the year the way a profile would and returns the app at the verdict.
function playTeam(profile, seed = 3, name = 'Halcones') {
  let app = startTeam(name).app;
  const rng = sim.mulberry32(seed);
  const policy = sim.PROFILES[profile];
  for (let guard = 0; guard < 800 && app.year.phase !== 'final'; guard += 1) {
    if (app.year.phase === 'problem') {
      const want = policy(app.year, rng);
      app = pressAll(app, [...Array(3).fill('up'), ...Array(want).fill('down')]).app;
    }
    app = press(app, 'confirm').app;
  }
  return app;
}

test('the mode menu has a fifth entry that opens the workshop, with its own two rows', () => {
  const workshop = intoWorkshop();
  assert.equal(workshop.scene, 'workshop');
  assert.equal(workshop.menuIdx, 4);
  assert.equal(pressAll(workshop, ['down', 'down']).app.workshopIdx, 1, 'the list stops at its last row');
  assert.equal(press(workshop, 'back').app.scene, 'menu');
  assert.equal(intoSetup().scene, 'setup');
  assert.equal(intoRank().scene, 'rank');
});

test('typing is for the setup and the ranking only', () => {
  assert.equal(acceptsText(fresh({ scene: 'setup' })), true);
  assert.equal(acceptsText(fresh({ scene: 'rank' })), true);
  for (const scene of ['title', 'menu', 'workshop', 'year', 'play', 'endings']) assert.equal(acceptsText(fresh({ scene })), false, scene);
  const menu = pressAll(fresh(), ['confirm']).app;
  assert.equal(reduce(menu, { type: 'char', char: 'a' }).app, menu, 'a letter on the menu does nothing');
  assert.equal(reduce(menu, { type: 'paste', text: '1234' }).app, menu);
});

test('setup: the name takes letters, digits and spaces; the code takes four digits', () => {
  let state = type(intoSetup(), 'los halcones azules');
  assert.equal(state.app.setup.name, 'LOS HALCONES');
  state = pressAll(state.app, ['delete', 'delete']);
  assert.equal(state.app.setup.name, 'LOS HALCON');
  state = pressAll(state.app, ['confirm']);
  assert.equal(state.app.setup.field, 1);
  state = type(state.app, '48a2b1999');
  assert.equal(state.app.setup.code, '4821');
  assert.equal(state.app.setup.name, 'LOS HALCON', 'letters typed in the code field are ignored');
});

test('setup: arrows move between the fields and Enter walks forward', () => {
  let app = intoSetup();
  assert.equal(app.setup.field, 0);
  app = press(app, 'down').app;
  assert.equal(app.setup.field, 1);
  app = press(app, 'up').app;
  assert.equal(app.setup.field, 0);
  assert.equal(press(app, 'up').app.setup.field, 0, 'stops at the first field');
  assert.equal(pressAll(app, ['down', 'down', 'down']).app.setup.field, 2, 'and at the last');
});

test('setup: the year does not start without the four digits of the code', () => {
  let state = type(intoSetup(), 'Azul');
  state = pressAll(state.app, ['confirm', 'confirm', 'confirm']);
  assert.equal(state.app.scene, 'setup');
  assert.equal(state.app.setup.notice.key, 'ws.setup.needCode');
  state = type(state.app, '12');
  assert.equal(pressAll(state.app, ['down', 'confirm']).app.scene, 'setup', 'two digits are not enough');
});

test('setup: a pasted four-digit code fills the code field', () => {
  const app = intoSetup();
  assert.equal(paste(app, ' 0042 ').app.setup.code, '0042');
  assert.equal(paste(app, 'hola').app.setup.code, '');
});

test('starting a team: its own year for that code, no reviewer, nothing saved as a best year', () => {
  const started = startTeam('Halcones', '4821');
  const app = started.app;
  assert.equal(app.scene, 'year');
  assert.equal(app.year.seed, 4821);
  assert.deepEqual(app.workshop, { team: 'HALCONES', code: 4821, result: null });
  assert.equal(app.review, false);
  assert.ok(names(started).includes('play'));
  assert.equal(press(app, 'review').app.review, false, 'R does nothing in a workshop');
  assert.equal(app.seed, 9, 'the app seed is left alone');
  assert.deepEqual(engine.currentProblem(app.year), engine.currentProblem(engine.newYear(4821)));
});

test('a team without a name plays as EQUIPO or TEAM', () => {
  let state = pressAll(intoSetup(), ['confirm']);
  state = type(state.app, '0007');
  assert.equal(pressAll(state.app, ['confirm', 'confirm']).app.workshop.team, 'EQUIPO');
  const english = { ...intoSetup(), lang: 'en' };
  state = pressAll(english, ['confirm']);
  state = type(state.app, '0007');
  assert.equal(pressAll(state.app, ['confirm', 'confirm']).app.workshop.team, 'TEAM');
});

test('the quit question takes a workshop team back to the workshop menu', () => {
  const app = startTeam().app;
  const asked = press(app, 'back').app;
  assert.equal(asked.overlay, 'quit');
  const left = press(asked, 'confirm').app;
  assert.equal(left.scene, 'workshop');
  assert.equal(left.workshop, null);
  assert.equal(left.year, null);
});

test('a finished workshop year has a fourth page with the result code, and saves no best year', () => {
  let app = playTeam('expert');
  assert.equal(app.year.phase, 'final');
  assert.equal(app.page, 0);
  const second = press(app, 'confirm');
  assert.equal(second.app.page, 1);
  assert.ok(!second.effects.some((e) => e.type === 'save'));
  const third = press(second.app, 'confirm');
  assert.equal(third.app.page, 2);
  const fourth = press(third.app, 'confirm');
  assert.equal(fourth.app.year.phase, 'final');
  assert.equal(fourth.app.page, 3);
  assert.ok(fourth.app.workshop.result.startsWith('HALCONES/'));
  const over = press(fourth.app, 'confirm').app;
  assert.equal(over.year.phase, 'over');
});

test('arriving at the verdict of a workshop year saves nothing but still plays the fanfare', () => {
  let app = startTeam().app;
  const rng = sim.mulberry32(3);
  const effects = [];
  for (let guard = 0; guard < 800 && app.year.phase !== 'final'; guard += 1) {
    if (app.year.phase === 'problem') {
      const want = sim.PROFILES.expert(app.year, rng);
      app = pressAll(app, [...Array(3).fill('up'), ...Array(want).fill('down')]).app;
    }
    const step = press(app, 'confirm');
    effects.push(...step.effects);
    app = step.app;
  }
  assert.ok(!effects.some((e) => e.type === 'save'), 'no best year from a workshop game');
  assert.ok(names({ effects }).includes('star'));
});

test('the result code decodes back into exactly the year the team played', () => {
  const app = pressAll(playTeam('careful', 12), ['confirm', 'confirm']).app;
  const decoded = decode(app.workshop.result);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.name, 'HALCONES');
  assert.equal(decoded.code, 4821);
  assert.deepEqual(decoded.choices, decisionsOf(app.year));
});

test('C copies the result code once it exists, and the screen remembers it for a moment', () => {
  const verdict = playTeam('expert');
  assert.deepEqual(press(verdict, 'copy').effects, [], 'nothing to copy before the code page');
  const atCode = pressAll(verdict, ['confirm', 'confirm', 'confirm']).app;
  const copied = press({ ...atCode, t: 12.5 }, 'copy');
  const copyEffect = copied.effects.find((e) => e.type === 'copy');
  assert.equal(copyEffect.text, atCode.workshop.result);
  assert.equal(copied.app.copiedAt, 12.5);
});

test('a workshop verdict never leaves by itself: the team needs time to copy the code', () => {
  const atCode = pressAll(playTeam('expert'), ['confirm', 'confirm', 'confirm']).app;
  assert.equal(reduce(atCode, { type: 'tick', dt: 1000 }).app.year.phase, 'final');
  const over = press(atCode, 'confirm').app;
  assert.equal(reduce(over, { type: 'tick', dt: 1000 }).app.scene, 'year');
  const left = press(over, 'confirm').app;
  assert.equal(left.scene, 'workshop');
  assert.equal(left.workshop, null);
});

test('footer taps still work on the typing screens', () => {
  const setup = intoSetup();
  assert.equal(reduce(setup, { type: 'tap', x: 230, y: layout.FOOTER.y + 5 }).app.lang, 'en');
  assert.equal(reduce(setup, { type: 'tap', x: 160, y: layout.FOOTER.y + 5 }).app.muted, true);
});

test('taps on the setup fields focus them and the button starts the year', () => {
  let app = intoSetup();
  const code = layout.SETUP.code;
  app = reduce(app, { type: 'tap', x: code.x + 3, y: code.y + 3 }).app;
  assert.equal(app.setup.field, 1);
  app = { ...app, setup: { ...app.setup, code: '4821' } };
  const start = layout.SETUP.start;
  const started = reduce(app, { type: 'tap', x: start.x + 5, y: start.y + 5 });
  assert.equal(started.app.scene, 'year');
});

// ---------------------------------------------------------------- ranking

const first = () => codeOf('Atajos', 'short');
const second = () => codeOf('Equilibrio', 'expert');
const third = () => codeOf('Cediendo', 'pleaser');

test('the ranking starts empty and learns the game code from the first team', () => {
  const app = intoRank();
  assert.deepEqual(app.rank.teams, []);
  const added = paste(app, first()).app;
  assert.equal(added.rank.teams.length, 1);
  assert.equal(added.rank.code, 4821);
  assert.equal(added.rank.notice.key, 'rank.added');
  assert.equal(added.rank.notice.params.name, 'ATAJOS');
});

test('teams are listed best first, whatever order their codes arrive in', () => {
  const { rankedTeams } = require('../src/ui/rank-view');
  let app = intoRank();
  for (const code of [first(), second(), third()]) app = paste(app, code).app;
  assert.deepEqual(rankedTeams(app.rank).ranked.map((t) => t.name), ['EQUILIBRIO', 'CEDIENDO', 'ATAJOS']);
  assert.equal(app.rank.teams.length, 3);
});

test('each team keeps its own colour', () => {
  let app = intoRank();
  for (const code of [first(), second(), third()]) app = paste(app, code).app;
  assert.equal(new Set(app.rank.teams.map((t) => t.color)).size, 3);
});

test('a code can be typed instead of pasted and is added with Enter', () => {
  const text = second();
  const typed = type(intoRank(), text);
  assert.equal(typed.app.rank.entry, text);
  const added = press(typed.app, 'confirm').app;
  assert.equal(added.rank.entry, '');
  assert.equal(added.rank.teams.length, 1);
  assert.equal(pressAll(added, ['confirm']).app.rank.teams.length, 1, 'Enter on an empty line adds nothing');
});

test('Backspace edits the typed line, and on an empty line removes the selected team', () => {
  let app = paste(intoRank(), second()).app;
  const typed = type(app, 'AB').app;
  assert.equal(press(typed, 'delete').app.rank.entry, 'A');
  const removed = press(app, 'delete');
  assert.equal(removed.app.rank.teams.length, 0);
  assert.equal(removed.app.rank.code, null);
  assert.equal(removed.app.rank.notice.key, 'rank.removed');
  assert.equal(press(removed.app, 'delete').app.rank.teams.length, 0, 'nothing left to remove');
});

test('bad codes get a notice that tells why, and change nothing', () => {
  const base = paste(intoRank(), second()).app;
  const good = second();
  const payload = good.split('/')[1].replace(/-/g, '');
  const flipped = `X/${payload.slice(0, 12)}${payload[12] === '2' ? '3' : '2'}${payload.slice(13)}`;
  const cases = [
    ['hola, esto no es un código', 'rank.err.format'],
    [flipped, 'rank.err.checksum'],
    [encode({ name: 'X', code: 1, choices: [0, 1], fingerprint: 0 }), 'rank.err.version'],
    [encode({ name: 'X', code: CODE, choices: decisionsOf(sim.simulate(sim.PROFILES.expert, 3, engine.newYear(CODE))).slice(0, 10) }), 'rank.err.incomplete'],
  ];
  for (const [text, key] of cases) {
    const result = paste(base, text).app;
    assert.equal(result.rank.notice.key, key, text);
    assert.equal(result.rank.notice.kind, 'error');
    assert.equal(result.rank.teams.length, 1);
  }
});

test('the same team sent twice is updated, not listed twice', () => {
  let app = paste(intoRank(), codeOf('Azul', 'short')).app;
  const color = app.rank.teams[0].color;
  app = paste(app, codeOf('Azul', 'expert')).app;
  assert.equal(app.rank.teams.length, 1);
  assert.equal(app.rank.teams[0].outcome, 'excellent');
  assert.equal(app.rank.teams[0].color, color);
  assert.equal(app.rank.notice.key, 'rank.updated');
});

test('at most eight teams', () => {
  let app = intoRank();
  for (let i = 1; i <= 8; i += 1) app = paste(app, codeOf(`Equipo ${i}`, 'expert')).app;
  assert.equal(app.rank.teams.length, 8);
  const refused = paste(app, codeOf('Equipo 9', 'expert')).app;
  assert.equal(refused.rank.teams.length, 8);
  assert.equal(refused.rank.notice.key, 'rank.err.full');
  assert.equal(paste(app, codeOf('Equipo 8', 'short')).app.rank.teams.length, 8, 'but a known team can still be updated');
});

test('a team that played another game is listed apart and warned about', () => {
  const { rankedTeams } = require('../src/ui/rank-view');
  let app = paste(intoRank(), second()).app;
  app = paste(app, codeOf('Perdidos', 'expert', 3, 77)).app;
  assert.equal(app.rank.notice.key, 'rank.err.other');
  assert.equal(app.rank.notice.params.code, '0077');
  const view = rankedTeams(app.rank);
  assert.deepEqual(view.ranked.map((t) => t.name), ['EQUILIBRIO']);
  assert.deepEqual(view.others.map((t) => t.name), ['PERDIDOS']);
  assert.equal(view.all.length, 2);
});

test('a nameless code gets a numbered default name', () => {
  const nameless = encode({ name: '', code: CODE, choices: decisionsOf(sim.simulate(sim.PROFILES.expert, 3, engine.newYear(CODE))) });
  const app = paste(paste(intoRank(), nameless).app, codeOf('Otro', 'short')).app;
  assert.ok(app.rank.teams.some((t) => t.name === 'EQUIPO 1'));
});

test('arrows change the view and the selected team, and stop at the ends', () => {
  let app = intoRank();
  for (const code of [first(), second(), third()]) app = paste(app, code).app;
  assert.equal(app.rank.view, 0);
  assert.equal(press(app, 'right').app.rank.view, 1);
  assert.equal(pressAll(app, ['right', 'right']).app.rank.view, 2);
  assert.equal(pressAll(app, ['right', 'right', 'right']).app.rank.view, 0, 'the views go round');
  assert.equal(press(app, 'left').app.rank.view, 2);
  const start = app.rank.selected;
  assert.ok(start >= 0 && start <= 2);
  assert.equal(pressAll(app, ['up', 'up', 'up', 'up']).app.rank.selected, 0);
  assert.equal(pressAll(app, ['down', 'down', 'down', 'down']).app.rank.selected, 2);
});

test('leaving the ranking and coming back keeps the teams', () => {
  const app = paste(intoRank(), second()).app;
  const out = press(app, 'back').app;
  assert.equal(out.scene, 'workshop');
  const back = pressAll(out, ['down', 'confirm']).app;
  assert.equal(back.scene, 'rank');
  assert.equal(back.rank.teams.length, 1);
});

test('the Spanish and English notices resolve from the dictionary', () => {
  const { noticeText } = require('../src/ui/rank-view');
  const app = paste(intoRank(), 'no es un codigo').app;
  assert.equal(noticeText({ ...app, lang: 'es' }, app.rank.notice), 'No parece un código de resultado.');
  assert.match(noticeText({ ...app, lang: 'en' }, app.rank.notice), /does not look like a result code/);
  const added = paste(intoRank(), second()).app;
  assert.equal(noticeText(added, added.rank.notice), 'Agregado: EQUILIBRIO');
});
