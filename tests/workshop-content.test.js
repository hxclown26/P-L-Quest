'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const es = require('../src/content/es');
const en = require('../src/content/en');
const rules = require('../src/year/rules');
const { wrapText } = require('../src/text');

const DICTS = { es, en };

function requiredKeys() {
  const keys = ['menu.workshop', 'menu.workshop.desc', 'ui.btn.paste'];
  for (const k of ['title', 'play', 'play.desc', 'rank', 'rank.desc']) keys.push(`ws.${k}`);
  for (const k of ['title', 'name', 'code', 'start', 'hint', 'needCode']) keys.push(`ws.setup.${k}`);
  keys.push('ws.team.default', 'year.intro.code', 'year.intro.code.short');
  for (const k of ['title', 'team', 'body', 'copy', 'copied']) keys.push(`ws.result.${k}`);
  for (const k of ['title', 'code', 'empty', 'entry', 'hint', 'chart', 'other', 'added', 'updated', 'removed']) keys.push(`rank.${k}`);
  for (const k of ['team', 'result', 'oi', 'weak']) keys.push(`rank.col.${k}`);
  for (const o of rules.OUTCOMES) keys.push(`rank.res.${o}`);
  for (const v of ['cliente', 'planta', 'entorno', 'estrategia']) keys.push(`rank.voice.${v}`);
  for (const e of ['format', 'checksum', 'version', 'incomplete', 'full', 'other']) keys.push(`rank.err.${e}`);
  keys.push('rank.entry.empty', 'rank.split.title', 'rank.split.none', 'rank.map.title', 'rank.map.rescued', 'rank.map.bankrupt');
  return keys;
}

test('every workshop string exists in both languages', () => {
  for (const lang of Object.keys(DICTS)) {
    for (const key of requiredKeys()) assert.ok(key in DICTS[lang], `${lang} is missing ${key}`);
  }
});

test('result names and voice tags are short enough for their table columns', () => {
  for (const lang of Object.keys(DICTS)) {
    for (const o of rules.OUTCOMES) assert.ok(DICTS[lang][`rank.res.${o}`].length <= 9, `${lang} ${o}`);
    for (const v of ['cliente', 'planta', 'entorno', 'estrategia']) assert.equal(DICTS[lang][`rank.voice.${v}`].length, 3, `${lang} ${v}`);
    for (const key of ['rank.col.team', 'rank.col.result', 'rank.col.oi', 'rank.col.weak']) assert.ok(DICTS[lang][key].length <= 9, `${lang} ${key}`);
  }
});

test('notices and menu lines fit one 38-column row', () => {
  for (const lang of Object.keys(DICTS)) {
    const oneRow = ['rank.err.format', 'rank.err.checksum', 'rank.err.version', 'rank.err.incomplete', 'rank.err.full', 'rank.err.other',
      'rank.added', 'rank.updated', 'rank.removed', 'rank.empty', 'rank.hint', 'ws.setup.needCode', 'ws.result.copy', 'ws.result.body',
      'menu.workshop.desc', 'ws.play.desc', 'ws.rank.desc', 'rank.split.none'];
    for (const key of oneRow) {
      const widest = { name: 'X'.repeat(12), code: '0000', m: '12' };
      const text = DICTS[lang][key].replace(/\{(\w+)\}/g, (_, name) => widest[name]);
      assert.ok(text.length <= 40, `${lang} ${key} is ${text.length}`);
    }
    assert.ok(wrapText(DICTS[lang]['ws.setup.hint'], 38).length <= 3, `${lang} setup hint`);
  }
});

test('the map notes about a rescue or a bankruptcy fit the right column', () => {
  for (const lang of Object.keys(DICTS)) {
    for (const key of ['rank.map.rescued', 'rank.map.bankrupt']) {
      const text = DICTS[lang][key].replace('{m}', '12');
      assert.ok(text.length <= 17, `${lang} ${key} is ${text.length}`);
    }
  }
});

test('the footer label for pasting fits its slot', () => {
  for (const lang of Object.keys(DICTS)) assert.ok(DICTS[lang]['ui.btn.paste'].length <= 15, lang);
});
