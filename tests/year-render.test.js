'use strict';

// Draws every year-mode screen through the real top-level renderer on a recording canvas.
// It cannot judge looks, but it proves that no screen throws, that each one paints
// something, and that no letter lands outside the 256x240 screen.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, reduce } = require('../src/ui/app');
const { encode } = require('../src/year/result-code');
const { decisionsOf } = require('../src/year/replay');
const engine = require('../src/year/engine');
const model = require('../src/model');
const sim = require('../src/year/simulate');
const { SHOWCASE, showcaseRun } = require('../src/year/showcase');
const { PROBLEMS } = require('../src/year/problems');
const { THEMES } = require('../src/render/year/art');
const { actionKey, noteKey } = require('../src/render/scenes/hud');
const layout = require('../src/ui/layout');
const es = require('../src/content/es');
const en = require('../src/content/en');

function recorder() {
  const glyphs = [];
  const counters = { fillRect: 0, drawImage: 0 };
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'fillRect') return () => { counters.fillRect += 1; };
      if (prop === 'drawImage') {
        return (...args) => {
          counters.drawImage += 1;
          if (args.length === 9) glyphs.push({ x: args[5], y: args[6], w: args[7], h: args[8] });
        };
      }
      return () => undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
  return { ctx, glyphs, counters };
}

const { drawFrame } = require('../src/render/index');

const base = (patch = {}) => ({
  ...createApp({ lang: 'es', muted: false, best: 1, bestYear: 4 }),
  t: 1.2,
  phaseT: 0.3,
  ...patch,
});
const inYear = (year, patch = {}) => base({ scene: 'year', year, ...patch });

const pick = (run, a) => engine.options(run).findIndex((o) => o.a === a);

// Plays until the month closes (answering as the policy says).
function toMonthClose(policy = sim.PROFILES.expert, months = 12) {
  const rng = sim.mulberry32(3);
  let run = engine.newYear(null, months);
  while (run.phase !== 'monthClose') {
    run = run.phase === 'problem' ? engine.choose(run, policy(run, rng)) : engine.next(run);
  }
  return run;
}

function toRescue() {
  const thin = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: -14.8 });
  const shaky = { ...engine.newYear(), monthIdx: 3, pl: thin };
  return engine.next(engine.choose(shaky, pick(shaky, 'ign')));
}

const CODE = 4821;
const codeOf = (name, profile, code = CODE) => encode({
  name,
  code,
  choices: decisionsOf(sim.simulate(sim.PROFILES[profile], 3, engine.newYear(code))),
});

// A ranking with some teams in it, built the way the facilitator builds it: pasting codes.
function rankingWith(texts, extra = {}) {
  const start = { ...base({ scene: 'rank' }), ...extra };
  return texts.reduce((app, text) => reduce(app, { type: 'paste', text }).app, start);
}

function workshopScreens() {
  const finished = sim.simulate(sim.PROFILES.expert, 3, engine.newYear(CODE));
  const workshop = { team: 'LOS HALCONES', code: CODE, result: codeOf('Los Halcones', 'expert') };
  const teams = [codeOf('Atajos', 'short'), codeOf('Equilibrio', 'expert'), codeOf('Cediendo', 'pleaser'), codeOf('Perdidos', 'expert', 77)];
  const screens = [
    ['workshop menu', base({ scene: 'workshop' })],
    ['workshop menu 2', base({ scene: 'workshop', workshopIdx: 1 })],
    ['verdict code page', inYear(finished, { workshop, page: 3 })],
    ['verdict code page copied', inYear(finished, { workshop, page: 3, copiedAt: 1.0 })],
    ['workshop over', inYear(engine.next(finished), { workshop })],
    ['normal over with a code', inYear(engine.next(sim.simulate(sim.PROFILES.expert, 3, engine.newYear(CODE))))],
    ['empty ranking', base({ scene: 'rank' })],
    ['ranking with a long typed line', rankingWith([], { rank: { teams: [], code: null, view: 0, selected: 0, entry: 'LOS HALCONES AZULES/3K9F-2QPA-77XT-1234-5678-ABCD-EFGH-JKMN', notice: null } })],
  ];
  for (let field = 0; field < 3; field += 1) {
    screens.push([`setup field ${field}`, base({ scene: 'setup', setup: { name: 'LOS HALCONES', code: '48', field, notice: field === 1 ? { key: 'ws.setup.needCode', kind: 'error' } : null } })]);
  }
  screens.push(['setup empty', base({ scene: 'setup' })]);
  for (let view = 0; view < 3; view += 1) {
    for (const selected of [0, 2, 3]) {
      const app = rankingWith(teams);
      screens.push([`ranking view ${view} selected ${selected}`, { ...app, rank: { ...app.rank, view, selected } }]);
    }
  }
  const notices = [
    { key: 'rank.added', kind: 'ok', params: { name: 'LOS HALCONES' } },
    { key: 'rank.err.other', kind: 'error', params: { name: 'LOS HALCONES', code: '0077' } },
    { key: 'rank.err.checksum', kind: 'error' },
  ];
  for (const notice of notices) {
    const app = rankingWith(teams);
    screens.push([`ranking notice ${notice.key}`, { ...app, rank: { ...app.rank, notice } }]);
  }
  const eight = rankingWith(Array.from({ length: 8 }, (_, i) => codeOf(`Equipo ${i + 1}`, ['expert', 'careful', 'average', 'weak', 'short', 'pleaser', 'passive', 'halfShort'][i])));
  for (let view = 0; view < 3; view += 1) screens.push([`ranking of eight view ${view}`, { ...eight, rank: { ...eight.rank, view } }]);
  return screens;
}

function allScreens() {
  const screens = [
    ['title', base()],
    ['menu', base({ scene: 'menu' })],
    ['menu 3', base({ scene: 'menu', menuIdx: 2 })],
    ['menu of a creator', base({ scene: 'menu', creator: true, menuIdx: 4 })],
    ['year intro', base({ scene: 'yearIntro' })],
    ['half year intro', base({ scene: 'yearIntro', months: 6 })],
    ['rules overlay', base({ scene: 'yearIntro', overlay: 'rules' })],
    ['half year rules overlay', base({ scene: 'yearIntro', months: 6, overlay: 'rules' })],
    ['half year assumptions', base({ scene: 'yearIntro', months: 6, overlay: 'rules', rulesPage: 1 })],
    ['half year month close', inYear(toMonthClose(sim.PROFILES.expert, 6))],
    ['verdict with the play time', inYear(showcaseRun(0), { page: 0, yearT: 1300 })],
    ['quit overlay', inYear(engine.newYear(), { overlay: 'quit' })],
    ['month close', inYear(toMonthClose())],
    ['rescue', inYear(toRescue())],
  ];
  SHOWCASE.forEach((entry, i) => {
    screens.push([`endings ${entry.profile}`, base({ scene: 'endings', profileIdx: i })]);
    const final = showcaseRun(i);
    screens.push([`verdict ${entry.profile} p0`, inYear(final, { sim: true, page: 0 })]);
    screens.push([`verdict ${entry.profile} p1`, inYear(final, { sim: true, page: 1 })]);
    screens.push([`verdict ${entry.profile} p2`, inYear(final, { sim: true, page: 2 })]);
    screens.push([`over ${entry.profile}`, inYear(engine.next(final), { sim: true })]);
  });
  screens.push(...workshopScreens());
  PROBLEMS.forEach((problem, n) => {
    const run = { ...engine.newYear(), monthIdx: Math.floor(n / 4), problemIdx: n % 4 };
    screens.push([`problem ${problem.id}`, inYear(run, { cursor: n % 4 })]);
    screens.push([`result ${problem.id}`, inYear(engine.choose(run, n % 4), { cursor: n % 4 })]);
  });
  return screens;
}

test('every year-mode screen draws in both languages, with and without the reviewer', () => {
  for (const [name, screen] of allScreens()) {
    for (const lang of ['es', 'en']) {
      for (const review of [false, true]) {
        const { ctx, counters } = recorder();
        assert.doesNotThrow(() => drawFrame(ctx, { ...screen, lang, review }), `${name} ${lang} review=${review}`);
        assert.ok(counters.fillRect > 20 && counters.drawImage > 5, `${name} paints something`);
      }
    }
  }
});

test('no letter on any year-mode screen lands outside the 256x240 screen', () => {
  for (const [name, screen] of allScreens()) {
    for (const lang of ['es', 'en']) {
      const { ctx, glyphs } = recorder();
      drawFrame(ctx, { ...screen, lang });
      for (const g of glyphs) {
        assert.ok(g.x >= 0 && g.x + g.w <= 256 + 1 && g.y + g.h > 0 && g.y + g.h <= layout.H + 3, `${name} ${lang}: glyph at ${g.x},${g.y}`);
      }
    }
  }
});

test('every problem theme has a picture, and the rescue alarm has one too', () => {
  for (const problem of PROBLEMS) assert.ok(THEMES.includes(problem.theme), problem.theme);
  assert.ok(THEMES.includes('alert'));
});

test('the answer list animates: the cursor of the selected answer blinks between two frames', () => {
  const screen = inYear(engine.newYear(), { cursor: 1 });
  const frames = [0, 0.4].map((t) => {
    const { ctx, counters } = recorder();
    drawFrame(ctx, { ...screen, t });
    return counters.drawImage;
  });
  assert.notEqual(frames[0], frames[1]);
});

test('the footer action exists in both languages on every scene, phase and overlay', () => {
  const states = allScreens().map(([, screen]) => screen);
  states.push(base({ scene: 'play', run: require('../src/engine').newRun() }));
  states.push(base({ scene: 'intro' }));
  for (const screen of states) {
    for (const overlay of [null, 'note', 'rules', 'quit']) {
      const state = { ...screen, overlay };
      for (const dict of [es, en]) {
        assert.ok(actionKey(state) in dict, `${screen.scene} ${overlay}: ${actionKey(state)}`);
        assert.ok(noteKey(state) in dict, noteKey(state));
      }
    }
  }
});

test('the footer says rules in the year scenes and note in the tutorial', () => {
  assert.equal(noteKey(base({ scene: 'year' })), 'ui.btn.rules');
  assert.equal(noteKey(base({ scene: 'yearIntro' })), 'ui.btn.rules');
  assert.equal(noteKey(base({ scene: 'play' })), 'ui.btn.note');
});

test('the verdict action is "report" on the first page, "analysis" on the second and "next" on the third', () => {
  const final = showcaseRun(0);
  assert.equal(actionKey(inYear(final, { page: 0 })), 'ui.btn.report');
  assert.equal(actionKey(inYear(final, { page: 1 })), 'ui.btn.feedback');
  assert.equal(actionKey(inYear(final, { page: 2 })), 'ui.btn.next');
  assert.equal(actionKey(inYear(engine.next(final))), 'ui.btn.menu');
  assert.equal(actionKey(inYear(final, { overlay: 'quit' })), 'ui.btn.quit');
});

test('the four footer labels fit their slots, in both languages and on every screen', () => {
  const { tx } = require('../src/ui/tx');
  const states = allScreens().map(([, screen]) => screen);
  states.push(base({ scene: 'play', run: require('../src/engine').newRun() }));
  states.push(base({ scene: 'intro' }));
  const slots = layout.FOOTER.labelX;
  for (const screen of states) {
    for (const overlay of [null, 'note', 'rules', 'quit']) {
      for (const lang of ['es', 'en']) {
        const state = { ...screen, lang, overlay };
        const keys = [actionKey(state), noteKey(state), 'ui.btn.sound', 'ui.btn.lang'];
        keys.forEach((key, i) => {
          const end = slots[i] + tx(state, key).length * 6 - 1;
          const limit = i < slots.length - 1 ? slots[i + 1] : layout.W;
          assert.ok(end <= limit, `${screen.scene} ${overlay} ${lang}: "${tx(state, key)}" ends at ${end}, next slot starts at ${limit}`);
        });
      }
    }
  }
});

test('footer taps land on the label they are over', () => {
  const slots = layout.FOOTER.labelX;
  const names = ['confirm', 'note', 'mute', 'lang'];
  slots.forEach((x, i) => assert.equal(layout.hitFooter(x + 2, layout.FOOTER.y + 5), names[i], names[i]));
});

test('the note label is dim where the N key does nothing and bright where it opens something', () => {
  const { noteActive } = require('../src/render/scenes/hud');
  for (const scene of ['title', 'menu', 'endings', 'intro']) assert.equal(noteActive(base({ scene })), false, scene);
  for (const scene of ['play', 'yearIntro', 'year']) assert.equal(noteActive(base({ scene })), true, scene);
});

test('the reviewer badge fits inside the picture window', () => {
  const screen = inYear(engine.newYear(), { review: true });
  for (const lang of ['es', 'en']) {
    const { ctx, glyphs } = recorder();
    drawFrame(ctx, { ...screen, lang, year: { ...screen.year, meters: { C: 100, P: 100, E: 100 } } });
    const art = layout.ART;
    const inside = glyphs.filter((g) => g.y >= art.y && g.y + g.h <= art.y + 24 && g.x >= art.x && g.x < art.x + art.w);
    assert.ok(inside.length > 10, `${lang}: reviewer badge is drawn`);
    assert.ok(Math.max(...inside.map((g) => g.x + g.w)) <= art.x + art.w - 2, `${lang}: reviewer badge stays inside the window`);
  }
});

test('the long texts of the year fit the windows they are drawn in, in both languages', () => {
  const { wrapText } = require('../src/text');
  const view = require('../src/ui/year-view');
  const dicts = { es, en };
  for (const lang of ['es', 'en']) {
    const rows = (text, cols) => wrapText(text, cols).length;
    const intro = [1, 2, 3].reduce((sum, n) => sum + rows(dicts[lang][`year.intro${n}`], 38), 2);
    assert.ok(intro <= 13, `${lang} year intro uses ${intro} rows of 13`);
    const half = ['year.intro1.half', 'year.intro2.half', 'year.intro3'].reduce((sum, key) => sum + rows(dicts[lang][key], 38), 2);
    assert.ok(half <= 13, `${lang} half-year intro uses ${half} rows of 13`);
    const rules = view.rulesLines(base({ lang })).reduce((sum, text) => sum + rows(text, 37), 0);
    assert.ok(rules <= 17, `${lang} rules use ${rules} rows of 17`);
    const rescue = view.rescueLines({ ...inYear(toRescue()), lang }).reduce((sum, line) => sum + rows(line.text, 38), 0);
    assert.ok(rescue <= 11, `${lang} rescue uses ${rescue} rows of 11`);
    const tutorial = rows(dicts[lang]['ui.intro1'], 38) + rows(dicts[lang]['ui.intro2'], 38) + 1;
    assert.ok(tutorial <= 11, `${lang} tutorial intro uses ${tutorial} rows of 11`);
  }
});

test('the ranking palette has one colour for each team it can hold', () => {
  const { TEAM_COLORS } = require('../src/render/year/workshop');
  const rankView = require('../src/ui/rank-view');
  assert.equal(TEAM_COLORS.length, rankView.TEAM_COLORS);
  assert.equal(rankView.MAX_TEAMS, rankView.TEAM_COLORS);
  assert.equal(new Set(TEAM_COLORS).size, TEAM_COLORS.length, 'no two teams share a colour');
});

test('the month-close chart has a row for each month of the year: twelve, or six in a half year', () => {
  const { textIn, draw } = require('./helpers/screen');
  const labels = (app) => textIn(draw(app).glyphs, layout.SIDE).map((row) => row.trim()).filter((row) => /^\d{1,2}$/.test(row));
  const full = labels(inYear(toMonthClose(sim.PROFILES.expert, 12)));
  const half = labels(inYear(toMonthClose(sim.PROFILES.expert, 6)));
  assert.deepEqual(full, Array.from({ length: 12 }, (_, i) => String(i + 1)));
  assert.deepEqual(half, ['1', '2', '3', '4', '5', '6']);
});

test('the verdict shows how long the game took, and a simulated year shows nothing', () => {
  const { textIn, draw } = require('./helpers/screen');
  const SCREEN = { x: 0, y: 0, w: layout.W, h: layout.H };
  const text = (app) => textIn(draw(app).glyphs, SCREEN).join('|');
  assert.match(text(inYear(showcaseRun(0), { page: 0, yearT: 1300 })), /21:40 min/);
  assert.doesNotMatch(text(inYear(showcaseRun(0), { page: 0, yearT: 1300, sim: true })), /min\b.*21:40|21:40 min/);
  assert.doesNotMatch(text(inYear(showcaseRun(0), { page: 0, yearT: 0 })), /\d\d:\d\d min/);
});
