'use strict';

// A line that does not fit its window is cut off, and the player never sees it. These tests
// measure the real texts of the game against the windows they are drawn in, in both languages.

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const rules = require('../src/year/rules');
const sim = require('../src/year/simulate');
const model = require('../src/model');
const yearView = require('../src/ui/year-view');
const view = require('../src/ui/view');
const { PROBLEMS } = require('../src/year/problems');
const { CARD_LIST } = require('../src/content/cards');
const { FLOORS } = require('../src/content/floors');
const { wrapText } = require('../src/text');
const ui = require('../src/render/ui');
const { tx } = require('../src/ui/tx');
const problem = require('../src/render/year/problem');
const close = require('../src/render/year/close');
const battle = require('../src/render/scenes/battle');
const screens = require('../src/render/scenes/screens');
const layout = require('../src/ui/layout');
const es = require('../src/content/es');
const en = require('../src/content/en');

const LANGS = ['es', 'en'];
const rows = (items, cols) => items.reduce((sum, item) => sum + wrapText(item.text, cols).length, 0);

// Every problem of the year, in the states that add the longest notes to the result.
function resultStates() {
  const states = [];
  PROBLEMS.forEach((_, n) => {
    const run = { ...engine.newYear(), monthIdx: Math.floor(n / 4), problemIdx: n % 4 };
    const crisis = { ...run, meters: { C: 10, P: 10, E: 10 } };
    const rescued = { ...run, rescued: true, pl: rules.RESCUE_PL };
    for (const state of [run, crisis, rescued]) {
      for (let i = 0; i < 4; i += 1) states.push(engine.choose(state, i));
    }
  });
  return states;
}

test('what happened after an answer fits the dialogue window, in every problem, state and language', () => {
  for (const lang of LANGS) {
    for (const year of resultStates()) {
      const used = rows(yearView.resultLines({ lang, year }), problem.RESULT_WRAP);
      assert.ok(used <= problem.MAX_RESULT_ROWS, `${lang} ${year.last.problemId} ${year.last.a} uses ${used} rows of ${problem.MAX_RESULT_ROWS}`);
    }
  }
});

function toRescue() {
  const thin = model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: -14.8 });
  const shaky = { ...engine.newYear(), monthIdx: 3, pl: thin };
  return engine.next(engine.choose(shaky, engine.options(shaky).findIndex((o) => o.a === 'ign')));
}

test('the rescue text fits its window in both languages, for every cause', () => {
  for (const lang of LANGS) {
    const run = toRescue();
    for (const cause of ['oi', 'C', 'P', 'E']) {
      const withCause = { ...run, rescues: [{ ...run.rescues[run.rescues.length - 1], cause }] };
      const used = rows(yearView.rescueLines({ lang, year: withCause }), close.TEXT_WRAP);
      assert.ok(used <= close.RESCUE_ROWS, `${lang} rescue by ${cause} uses ${used} rows of ${close.RESCUE_ROWS}`);
    }
  }
});

test('fitRows keeps a list that fits and ends a longer one with dots', () => {
  const list = Array.from({ length: 5 }, (_, i) => ({ text: `row ${i}`, tone: 'white' }));
  assert.deepEqual(close.fitRows(list, 5), list);
  const cut = close.fitRows(list, 3);
  assert.equal(cut.length, 3);
  assert.deepEqual(cut.slice(0, 2), list.slice(0, 2));
  assert.equal(cut[2].text, '...');
});

test('the month close shows every row of an ordinary month and cuts a crowded one visibly', () => {
  for (const name of ['expert', 'weak', 'pleaser']) {
    const policy = sim.PROFILES[name];
    const rng = sim.mulberry32(5);
    let run = engine.newYear();
    for (let guard = 0; guard < 400 && run.phase !== 'final' && run.phase !== 'over'; guard += 1) {
      if (run.phase === 'monthClose') {
        const lines = yearView.closeLines({ lang: 'es', year: run });
        const wrapped = close.fitRows(ui.wrapLines(close.orderedLines(lines), close.TEXT_WRAP), close.TEXT_ROWS);
        assert.ok(wrapped.length <= close.TEXT_ROWS, `${name} month ${run.monthIdx + 1}`);
      }
      run = run.phase === 'problem' ? engine.choose(run, policy(run, rng)) : engine.next(run);
    }
  }
});

test('the floor intro and outro messages fit their window, with both kinds of bill on arrival', () => {
  for (const lang of LANGS) {
    const d = lang === 'es' ? es : en;
    const app = { lang };
    for (const floor of FLOORS) {
      const intro = [
        { text: tx(app, 'ui.appears', { boss: tx(app, `boss.${floor.boss}`) }) },
        { text: `${tx(app, 'ui.floor', { n: floor.id })} - ${tx(app, `floor.${floor.id}.name`)}` },
        { text: d[`floor.${floor.id}.place`] },
        { text: tx(app, 'ui.entryDeferred', { delta: '+12,5' }) },
        { text: tx(app, 'ui.entryShock', { delta: '-12,5' }) },
        { text: d[`floor.${floor.id}.t1`] },
      ];
      const used = rows(intro, battle.MESSAGE_WRAP);
      assert.ok(used <= battle.MESSAGE_ROWS, `${lang} floor ${floor.id} intro uses ${used} rows of ${battle.MESSAGE_ROWS}`);
    }
  }
});

test('what a card did fits the reveal window, whatever else it announces', () => {
  for (const lang of LANGS) {
    for (const card of CARD_LIST) {
      const run = { last: { cardId: card.id, delta: { oi: -2 }, oiBefore: 15.5, oiAfter: 9.5 } };
      const used = rows(view.revealLines({ lang, run }), 40);
      assert.ok(used <= battle.REVEAL_ROWS, `${lang} ${card.id} reveal uses ${used} rows of ${battle.REVEAL_ROWS}`);
    }
  }
});

test('the card rows keep the whole name and at least the first lever, in both languages', () => {
  const rowWidth = layout.answerRect(0).w - 12 - 4;
  for (const lang of LANGS) {
    const app = { lang };
    for (const card of CARD_LIST) {
      const name = tx(app, `card.${card.id}.name`);
      const [first] = view.chipsFor(card);
      const chip = first ? ui.textWidth(tx(app, first.key)) + (first.dir ? 7 : 0) : 0;
      assert.ok(ui.textWidth(name) + 8 + chip <= rowWidth, `${lang} ${card.id}: "${name}" and its first lever do not fit one row`);
    }
  }
});

test('the boss line of every turn and the room texts fit their windows', () => {
  for (const lang of LANGS) {
    const d = lang === 'es' ? es : en;
    for (const floor of FLOORS) {
      for (const turn of [1, 2, 3]) {
        const used = wrapText(d[`floor.${floor.id}.t${turn}`], 40).length;
        assert.ok(used <= 2, `${lang} floor ${floor.id} turn ${turn} uses ${used} rows of 2`);
      }
    }
    for (const key of Object.keys(d).filter((k) => /^room\.\w+\.body$/.test(k))) {
      const used = wrapText(d[key], screens.ROOM_WRAP).length;
      assert.ok(used <= screens.ROOM_ROWS, `${lang} ${key} uses ${used} rows of ${screens.ROOM_ROWS}`);
    }
  }
});

// ---- the year-end report

const report = require('../src/render/year/report');
const statement = require('../src/ui/statement');

test('the report note takes two rows at most, in both languages', () => {
  for (const lang of LANGS) {
    const used = wrapText(tx({ lang }, 'year.report.note'), report.NOTE_COLS).length;
    assert.ok(used <= 2, `${lang} report note uses ${used} rows`);
  }
});

test('every label and number of the report fits its column, in both languages, even for a bankrupt year', () => {
  const { reportRows } = require('../src/ui/statement');
  const [planRight, realRight, varianceRight] = report.COLUMNS.map((column) => column.right);
  const bankrupt = { sales: 62, incentives: 6.5, cost: 48, freight: 11, direct: 8, sga: 30 };
  assert.ok(model.operatingMargin(bankrupt) < 0, 'the worst case is a loss');
  for (const lang of LANGS) {
    const app = { lang };
    for (const row of reportRows(model.BASE_PL, bankrupt)) {
      const ratio = row.kind === 'ratio';
      const label = ratio ? tx(app, 'stmt.ratio') : tx(app, `line.short.${row.id}`);
      const labelEnd = report.LABEL_X + (ratio ? report.RATIO_INDENT : 0) + ui.textWidth(label) + (row.kind === 'total' ? 1 : 0);
      // The box a number occupies: its text, right aligned, with room left for a bracket if positive.
      const cell = (text, negative, right) => {
        const edge = right - (negative ? 0 : report.BRACKET);
        return { left: edge - ui.textWidth(text), right: edge };
      };
      const cells = [
        cell(statement.cellText(app, row.plan), statement.isNegative(row.plan), planRight),
        cell(statement.cellText(app, row.real), statement.isNegative(row.real), realRight),
        cell(statement.varianceText(app, row), row.variance < 0, varianceRight),
      ];
      assert.ok(cells[0].left >= labelEnd + 4, `${lang} ${row.id}: the plan runs into the label`);
      assert.ok(cells[1].left >= cells[0].right + 3, `${lang} ${row.id}: the real runs into the plan`);
      assert.ok(cells[2].left >= cells[1].right + 3, `${lang} ${row.id}: the variance runs into the real`);
      assert.ok(varianceRight <= report.WINDOW.w - 4, `${lang} ${row.id}: the variance leaves the window`);
    }
  }
});

// ---- the rules overlay

const overlays = require('../src/render/year/overlays');

test('both pages of the rules fit above their hint, in both languages and in both lengths of year', () => {
  for (const lang of LANGS) {
    for (const months of [12, 6]) {
      for (const page of [0, 1]) {
        const plan = overlays.planRules({ lang, months }, page);
        assert.ok(plan.end <= overlays.RULES.hintY - 2, `${lang} ${months} months page ${page + 1} ends at ${plan.end}, the hint is at ${overlays.RULES.hintY}`);
      }
    }
  }
});

test('the grade table keeps its columns apart in both languages', () => {
  const { GRADES } = overlays;
  for (const lang of LANGS) {
    const app = { lang };
    const header = [tx(app, 'year.rules.hNote'), tx(app, 'year.rules.hOi'), tx(app, 'year.rules.hMeter')];
    assert.ok(GRADES.nameX + ui.textWidth(header[0]) < GRADES.oiRight - ui.textWidth(header[1]) - 4, `${lang}: the grade runs into the OI header`);
    assert.ok(GRADES.oiRight < GRADES.meterRight - ui.textWidth(header[2]) - 4, `${lang}: the OI header runs into the meter header`);
    for (const row of yearView.gradeRows(app)) {
      assert.ok(GRADES.nameX + ui.textWidth(row.name) < GRADES.oiRight - ui.textWidth(row.oi) - 4, `${lang} ${row.id}: name and OI collide`);
      assert.ok(GRADES.oiRight < GRADES.meterRight - ui.textWidth(row.meter) - 4, `${lang} ${row.id}: OI and meter collide`);
    }
  }
});
