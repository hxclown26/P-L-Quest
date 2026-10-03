'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const es = require('../src/content/es');
const en = require('../src/content/en');
const rules = require('../src/year/rules');
const { SHOWCASE } = require('../src/year/showcase');

const DICTS = { es, en };

function requiredKeys() {
  const keys = ['menu.title', 'menu.best', 'menu.endings.title', 'ui.btn.rules', 'year.review.on', 'year.crisis.l1', 'year.crisis.l2', 'year.goal'];
  keys.push('year.intro.hint', 'year.intro.partial');
  keys.push('stmt.unit', 'stmt.col.real', 'stmt.col.plan', 'stmt.col.var', 'stmt.ratio', 'year.report.title', 'year.report.note');
  for (const m of ['year', 'half', 'tutorial', 'endings']) keys.push(`menu.${m}`, `menu.${m}.desc`);
  keys.push('year.intro1.half', 'year.intro2.half', 'year.rules.l2.half', 'year.rules.l4.half', 'year.assump.a3.half', 'year.verdict.time');
  for (const p of SHOWCASE.map((entry) => entry.profile)) {
    keys.push(`profile.${p}`, `profile.${p}.desc`);
  }
  for (const n of [1, 2, 3]) keys.push(`year.intro${n}`);
  keys.push('year.stage', 'year.close.title', 'year.close.decay', 'year.close.drag', 'year.close.bonus', 'year.close.fly');
  keys.push('year.close.bill', 'year.close.chart');
  for (const v of ['cliente', 'planta', 'entorno', 'estrategia']) keys.push(`year.voice.${v}`);
  for (const m of ['C', 'P', 'E']) keys.push(`year.meterTag.${m}`, `year.meterName.${m}`, `year.fb.tip.${m}`, `year.fb.cause.${m}`);
  keys.push('year.fb.cause.oi', 'year.fb.tip.keep');
  for (const a of ['smart', 'temp', 'plac', 'ign']) keys.push(`year.tag.${a}`);
  for (const n of ['crisis', 'recovery', 'value', 'measured', 'redLine']) keys.push(`year.note.${n}`);
  for (const n of [1, 2, 3]) keys.push(`year.rescue.body${n}`);
  keys.push('year.rescue.title', 'year.rescue.cause', 'year.res.chose', 'year.verdict.oi', 'year.walk.title');
  keys.push('year.walk.plan', 'year.walk.real', 'year.verdict.plan');
  for (const o of rules.OUTCOMES) keys.push(`year.verdict.${o}`, `year.fb.sum.${o}`);
  keys.push('year.fb.temp', 'year.fb.plac', 'year.fb.ign', 'year.fb.clean', 'year.fb.mixed');
  keys.push('year.fb.rescued.yes', 'year.fb.rescued.no', 'year.fb.value', 'year.fb.noValue');
  keys.push('ui.btn.decide', 'year.kpi.growth', 'year.kpi.money', 'year.fb.growth.growthNoMargin', 'year.fb.growth.marginNoGrowth');
  for (const shape of ['growthNoMargin', 'marginNoGrowth']) keys.push(`year.kpi.tag.${shape}`);
  keys.push('year.over.restart', 'year.over.count', 'year.rules.title');
  keys.push('ui.btn.quit', 'ui.btn.menu', 'ui.btn.report', 'ui.btn.feedback', 'year.quit.title', 'year.quit.body', 'year.quit.hint', 'year.fb.title');
  for (let n = 1; n <= 5; n += 1) keys.push(`year.rules.l${n}`);
  for (const o of rules.OUTCOMES.filter((id) => id !== 'bankrupt')) keys.push(`year.grade.${o}`);
  keys.push('year.rules.hNote', 'year.rules.hOi', 'year.rules.hMeter', 'year.rules.below', 'year.rules.hint', 'year.assump.title');
  for (let n = 1; n <= 5; n += 1) keys.push(`year.assump.a${n}`);
  return keys;
}

test('every year-mode interface string exists in both languages', () => {
  for (const lang of Object.keys(DICTS)) {
    for (const key of requiredKeys()) assert.ok(key in DICTS[lang], `${lang} is missing ${key}`);
  }
});

test('voices and meter tags are short enough for their stamps', () => {
  for (const lang of Object.keys(DICTS)) {
    for (const key of Object.keys(DICTS[lang])) {
      if (key.startsWith('year.voice.')) assert.ok(DICTS[lang][key].length <= 10, `${lang} ${key}`);
      if (key.startsWith('year.meterTag.')) assert.equal(DICTS[lang][key].length, 3, `${lang} ${key}`);
      if (key.startsWith('year.tag.')) assert.ok(DICTS[lang][key].length <= 8, `${lang} ${key}`);
    }
  }
});

test('menu names and descriptions fit a 38-column window row', () => {
  for (const lang of Object.keys(DICTS)) {
    for (const key of Object.keys(DICTS[lang])) {
      if (/^(menu\.[A-Za-z]+(\.desc)?|profile\.[A-Za-z]+(\.desc)?)$/.test(key) && key !== 'menu.best' && key !== 'menu.title') {
        assert.ok(DICTS[lang][key].length <= 38, `${lang} ${key} is ${DICTS[lang][key].length}`);
      }
    }
  }
});
