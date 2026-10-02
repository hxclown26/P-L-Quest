'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const view = require('../src/ui/year-view');
const engine = require('../src/year/engine');
const rules = require('../src/year/rules');
const sim = require('../src/year/simulate');
const model = require('../src/model');

const app = (year, lang = 'es', extra = {}) => ({ lang, year, bestYear: 0, ...extra });
const pick = (run, a) => engine.options(run).findIndex((o) => o.a === a);
const answer = (run, a) => engine.choose(run, pick(run, a));

test('yearCards lists the four answers with text keys and a P&L chip, never the meter effect', () => {
  const cards = view.yearCards(app(engine.newYear()));
  assert.equal(cards.length, 4);
  assert.deepEqual(cards.map((c) => c.a).sort(), ['ign', 'plac', 'smart', 'temp']);
  const byA = Object.fromEntries(cards.map((c) => [c.a, c]));
  assert.equal(byA.smart.nameKey, 'year.m01c.smart.name');
  assert.equal(byA.temp.descKey, 'year.m01c.temp.desc');
  assert.deepEqual(byA.smart.chip, { key: 'line.short.sales', dir: 1 });
  assert.deepEqual(byA.plac.chip, { key: 'line.short.incentives', dir: 1 });
  assert.deepEqual(byA.ign.chip, { key: 'line.short.sales', dir: -1 });
  for (const card of cards) assert.ok(!('meters' in card));
});

test('a cost line that falls shows a downward arrow because it helps OI', () => {
  const plant = { ...engine.newYear(), problemIdx: 1 };
  const smart = view.yearCards(app(plant)).find((c) => c.a === 'smart');
  assert.deepEqual(smart.chip, { key: 'line.short.cost', dir: -1 });
});

test('crisisMeter names the meter at stake only when it is below 32', () => {
  assert.equal(view.crisisMeter(app(engine.newYear())), null);
  const low = { ...engine.newYear(), meters: { C: 30, P: 60, E: 60 } };
  assert.equal(view.crisisMeter(app(low)), 'C');
  const strategy = { ...engine.newYear(), monthIdx: 0, problemIdx: 3, meters: { C: 60, P: 60, E: 20 } };
  assert.equal(view.crisisMeter(app(strategy)), 'E');
});

test('crisisLines say which meter is in crisis and what it costs, in two short rows', () => {
  const low = { ...engine.newYear(), meters: { C: 30, P: 60, E: 60 } };
  assert.deepEqual(view.crisisLines(app(low)), ['¡Crisis CLI!', 'Rinde solo 40%']);
  assert.deepEqual(view.crisisLines(app(low, 'en')), ['Crisis CLI!', 'Pays only 40%']);
  assert.deepEqual(view.crisisLines(app(engine.newYear())), []);
});

test('resultLines tell what you chose, what OI did and why', () => {
  const run = answer(engine.newYear(), 'temp');
  const lines = view.resultLines(app(run));
  assert.match(lines[0].text, /Elegiste: Aceptar y compensar/);
  assert.match(lines[1].text, /^OI 15,0% > 15,5% {2}\(\+0,5 pp\)$/);
  assert.equal(lines[1].tone, 'green');
  assert.match(lines[2].text, /Atajo/);
  assert.match(lines[2].text, /Cliente/);
  const en = view.resultLines(app(run, 'en'));
  assert.match(en[0].text, /You chose: Accept and offset/);
  assert.match(en[2].text, /Shortcut/);
});

test('resultLines explain a crisis, a rescue and the measuring answer', () => {
  const crisis = answer({ ...engine.newYear(), meters: { C: 30, P: 60, E: 60 } }, 'smart');
  assert.ok(view.resultLines(app(crisis)).some((l) => /crisis/.test(l.text)));
  const rescued = answer({ ...engine.newYear(), rescued: true, pl: rules.RESCUE_PL }, 'smart');
  assert.ok(view.resultLines(app(rescued)).some((l) => /rescate/.test(l.text)));
  const measuring = answer({ ...engine.newYear(), monthIdx: 0, problemIdx: 3 }, 'smart');
  assert.ok(view.resultLines(app(measuring)).some((l) => /Valor medido/.test(l.text)));
});

test('meterDeltas reports the three meter changes of the last answer', () => {
  const run = answer(engine.newYear(), 'plac');
  const deltas = view.meterDeltas(run.last);
  assert.deepEqual(deltas.map((d) => d.key), ['C', 'P', 'E']);
  assert.ok(deltas[0].delta > 6 && deltas[1].delta < 0);
});

test('closeLines list the decay, the meters that dragged or lifted OI and the delayed bills', () => {
  let run = engine.newYear();
  run = engine.next(answer(run, 'temp'));
  for (let i = 0; i < 3; i += 1) run = engine.next(answer(run, 'ign'));
  assert.equal(run.phase, 'monthClose');
  const lines = view.closeLines(app(run));
  assert.match(lines[0].text, /bajan 1,8/);
  assert.ok(lines.length >= 1);
  let later = engine.next(run);
  for (let guard = 0; guard < 80 && later.closes.length < 3; guard += 1) {
    later = later.phase === 'problem' ? answer(later, 'smart') : engine.next(later);
  }
  assert.equal(later.closes.length, 3);
  assert.ok(view.closeLines(app(later)).some((l) => /cuenta del atajo/.test(l.text)));
});

test('chartBars has 12 slots and only closed months carry an OI', () => {
  let run = engine.newYear();
  for (let i = 0; i < 4; i += 1) run = engine.next(answer(run, 'smart'));
  const bars = view.chartBars(run);
  assert.equal(bars.length, 12);
  assert.ok(typeof bars[0].oi === 'number');
  assert.equal(bars[1].oi, null);
});

test('rescueLines name the cause and the goal', () => {
  const shaky = { ...engine.newYear(), monthIdx: 3, pl: model.applyOp(model.BASE_PL, { op: 'oi', line: 'sales', pts: -14.8 }) };
  const rescue = engine.next(answer(shaky, 'ign'));
  assert.equal(rescue.phase, 'rescue');
  const lines = view.rescueLines(app(rescue));
  assert.match(lines[0].text, /el OI llegó a cero/);
  assert.match(lines[2].text, /OI 10/);
});

test('verdict gathers title, factory state, numbers, walk and translated feedback', () => {
  const run = sim.simulate(sim.PROFILES.expert, 1);
  const v = view.verdict(app(run));
  assert.equal(v.titleKey, 'year.verdict.excellent');
  assert.equal(v.tier, 'hightech');
  assert.match(v.oiText, /^OI \d+,\d%$/);
  assert.equal(v.planText, 'plan 15%');
  assert.equal(v.lines.length, 4);
  assert.ok(v.lines.every((l) => typeof l === 'string' && !l.includes('{')));
  assert.ok(Math.abs(v.walk.end - v.oi) < 1e-6);
  const bankrupt = view.verdict(app(sim.simulate(sim.PROFILES.short, 1), 'en'));
  assert.equal(bankrupt.tier, 'collapse');
  assert.match(bankrupt.lines[0], /Bankruptcy in month/);
});

test('every feedback line of every profile resolves with no placeholder left over', () => {
  for (const profile of Object.keys(sim.PROFILES)) {
    for (const lang of ['es', 'en']) {
      const v = view.verdict(app(sim.simulate(sim.PROFILES[profile], 4), lang));
      for (const line of v.lines) assert.ok(!/\{|undefined|NaN/.test(line), `${profile} ${lang}: ${line}`);
    }
  }
});

test('rulesLines are the five rules of the year, with no placeholder left', () => {
  for (const lang of ['es', 'en']) {
    const lines = view.rulesLines(app(engine.newYear(), lang));
    assert.equal(lines.length, 5);
    for (const line of lines) assert.ok(!/\{|undefined|NaN/.test(line), `${lang}: ${line}`);
  }
});

test('gradeRows print the real thresholds of the five grades, best first', () => {
  const rows = view.gradeRows(app(engine.newYear()));
  assert.deepEqual(rows.map((r) => r.id), ['excellent', 'good', 'fair', 'bad', 'terrible']);
  assert.deepEqual(rows.map((r) => r.name), ['Excelente', 'Bueno', 'Mediano', 'Malo', 'Muy malo']);
  assert.deepEqual(rows.slice(0, 4).map((r) => r.oi), ['21,5%', '17,0%', '13,0%', '8,0%']);
  assert.deepEqual(rows.slice(0, 4).map((r) => r.meter), ['55', '45', '36', '24']);
  assert.deepEqual([rows[4].oi, rows[4].meter], ['menos', 'menos']);
  assert.deepEqual(rows.map((r) => r.tier), ['hightech', 'modern', 'normal', 'worn', 'edge']);
  assert.equal(view.gradeRows(app(engine.newYear(), 'en'))[0].name, 'Excellent');
  assert.equal(view.gradeRows(app(engine.newYear(), 'en'))[0].oi, '21.5%');
});

test('assumptionLines state what the model rests on, in both languages', () => {
  for (const lang of ['es', 'en']) {
    const lines = view.assumptionLines(app(engine.newYear(), lang));
    assert.equal(lines.length, 5);
    assert.match(lines[0], /US\$/);
    for (const line of lines) assert.ok(!/\{|undefined|NaN/.test(line), `${lang}: ${line}`);
  }
});

test('ranks go from 1 (bankrupt) to 6 (excellent) and the best-year label follows', () => {
  assert.equal(view.rankOf('bankrupt'), 1);
  assert.equal(view.rankOf('excellent'), 6);
  assert.equal(view.bestLabel(app(null, 'es', { bestYear: 0 })), null);
  assert.match(view.bestLabel(app(null, 'es', { bestYear: 5 })), /AÑO BUENO/);
});

test('cardReview shows the hidden character and size of an answer, delayed bill included', () => {
  const run = engine.newYear();
  const smart = view.cardReview(app(run), pick(run, 'smart'));
  assert.equal(smart.a, 'smart');
  assert.deepEqual(smart.lines, ['EQUILIB. OI+0,1', 'C+3,5 P+0,4 E+0,4']);
  const temp = view.cardReview(app(run), pick(run, 'temp'));
  assert.deepEqual(temp.lines, ['ATAJO OI+0,5', 'C-5,5 P-0,8 E-0,8']);
  const en = view.cardReview(app(run, 'en'), pick(run, 'ign'));
  assert.deepEqual(en.lines, ['PASSIVE OI-0.4', 'C-4.5 P-0.8 S-0.8']);
});

test('every reviewer line fits the gauges window, in both languages', () => {
  for (let m = 0; m < 12; m += 1) {
    for (let p = 0; p < 4; p += 1) {
      const run = { ...engine.newYear(), monthIdx: m, problemIdx: p };
      for (let i = 0; i < 4; i += 1) {
        for (const lang of ['es', 'en']) {
          for (const line of view.cardReview(app(run, lang), i).lines) {
            assert.ok(line.length <= 18, `${lang} m${m + 1}p${p + 1}#${i}: "${line}" is ${line.length}`);
          }
        }
      }
    }
  }
});

test('the crisis lines fit the gauges window in both languages', () => {
  for (const focus of ['C', 'P', 'E']) {
    const run = { ...engine.newYear(), monthIdx: 0, problemIdx: focus === 'P' ? 1 : 0, meters: { C: 10, P: 10, E: 10 } };
    for (const lang of ['es', 'en']) {
      for (const line of view.crisisLines(app(run, lang))) assert.ok(line.length <= 18, `${lang} ${focus}: "${line}" is ${line.length}`);
    }
  }
});

test('walkRows lay the OI bridge out as floating bars from plan to real', () => {
  const run = sim.simulate(sim.PROFILES.expert, 1);
  const rows = view.walkRows(app(run), view.verdict(app(run)).walk);
  assert.equal(rows[0].label, 'Plan');
  assert.equal(rows[0].from, 0);
  assert.equal(rows[0].to, rules.PLAN_OI);
  const last = rows[rows.length - 1];
  assert.equal(last.label, 'Real');
  assert.equal(last.from, 0);
  assert.ok(Math.abs(last.to - engine.oiOf(run)) < 1e-6);
  const steps = rows.slice(1, -1);
  assert.ok(steps.length >= 1);
  steps.reduce((running, row) => {
    assert.ok(Math.abs(row.from - running) < 1e-6, `${row.label} starts where the previous one ended`);
    return row.to;
  }, rules.PLAN_OI);
  assert.ok(Math.abs(steps[steps.length - 1].to - last.to) < 1e-6, 'the bridge lands on the real OI');
});

test('walkRows skip lines that did not move and colour a fall red', () => {
  const quiet = view.walkRows(app(engine.newYear()), { start: 15, steps: [{ id: 'sales', pts: 0.01 }, { id: 'cost', pts: 2 }], end: 17.01 });
  assert.deepEqual(quiet.map((r) => r.label), ['Plan', 'Costo', 'Real']);
  const worse = view.walkRows(app(engine.newYear(), 'en'), { start: 15, steps: [{ id: 'serve', pts: -3 }], end: 12 });
  assert.deepEqual(worse.map((r) => r.label), ['Plan', 'Serve cost', 'Real']);
  assert.equal(worse[1].text, '-3.0');
  assert.equal(worse[1].tone, 'red');
});

test('the four feedback lines always fit the 15 rows of the feedback page', () => {
  const { wrapText } = require('../src/text');
  for (const name of Object.keys(sim.PROFILES)) {
    for (const lang of ['es', 'en']) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const v = view.verdict(app(sim.simulate(sim.PROFILES[name], seed), lang));
        const rows = v.lines.reduce((total, line) => total + wrapText(line, 38).length, 0) + v.lines.length - 1;
        assert.ok(rows <= 15, `${name} ${lang} seed ${seed}: ${rows} rows`);
      }
    }
  }
});

test('walkRows keep the bridge inside the chart even for a bankrupt year', () => {
  const run = sim.simulate(sim.PROFILES.passive, 1);
  const rows = view.walkRows(app(run), view.verdict(app(run)).walk);
  assert.ok(rows.length >= 3);
  for (const row of rows) assert.ok(Number.isFinite(row.from) && Number.isFinite(row.to), row.label);
});

test('closeLines hide adjustments too small to show at one decimal', () => {
  const lastClose = {
    adjustments: [
      { line: 'sales', pts: 0.004, because: 'E' },
      { line: 'cost', pts: -0.3, because: 'P' },
      { line: 'sales', pts: 0.08, because: 'fly' },
    ],
    delayedApplied: [],
  };
  const lines = view.closeLines(app({ lastClose }));
  assert.equal(lines.length, 3, 'decay, the real drag and the virtuous circle');
  assert.ok(lines.every((l) => !/ 0,0$/.test(l.text)));
  assert.ok(lines.some((l) => /Planta bajo 42/.test(l.text)));
});

test('codeLines put the team name and the code on their own rows so nothing breaks mid-code', () => {
  const { encode } = require('../src/year/result-code');
  const { decisionsOf } = require('../src/year/replay');
  const text = encode({ name: 'Los Halcones', code: 4821, choices: decisionsOf(sim.simulate(sim.PROFILES.expert, 3, engine.newYear(4821))) });
  const rows = view.codeLines(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0], 'LOS HALCONES/');
  assert.equal(`${rows[0]}${rows[1]}`, text);
  assert.ok(rows[1].length <= 36, `the code row is ${rows[1].length} characters`);
  assert.deepEqual(view.codeLines('ABCD-EFGH'), ['ABCD-EFGH']);
});

test('the verdict carries the P&L report: the plan against the P&L the year ended with', () => {
  const run = sim.simulate(sim.PROFILES.expert, 1);
  const { report } = view.verdict(app(run));
  assert.equal(report.length, 14);
  const byId = Object.fromEntries(report.map((row) => [row.id, row]));
  assert.equal(byId.oi.plan.value, rules.START_PL.sales - rules.START_PL.incentives - rules.START_PL.cost - rules.START_PL.serve - rules.START_PL.sga);
  assert.ok(Math.abs(byId['oi.ratio'].real.value - engine.oiOf(run)) < 1e-9, 'the real OI ratio is the OI of the year');
  assert.ok(Math.abs(byId['oi.ratio'].plan.value - rules.PLAN_OI) < 1e-9, 'and the plan is the 15% of the rules');
  assert.equal(byId.oi.favorable, Math.sign(Math.round(byId['oi'].real.value * 10) - Math.round(byId['oi'].plan.value * 10)));
});
