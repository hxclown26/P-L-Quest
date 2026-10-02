'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { reviewRows, TYPE_LABELS } = require('../tools/export-review');
const { PROBLEMS, AUTHORING } = require('../src/year/problems');
const es = require('../src/content/es');
const en = require('../src/content/en');

const rows = reviewRows();

test('the review has one row per answer: 4 for each of the 48 problems', () => {
  assert.equal(rows.length, 192);
  for (const problem of PROBLEMS) {
    assert.deepEqual(rows.filter((row) => row.id === problem.id).map((row) => row.type), AUTHORING, problem.id);
  }
});

test('every row carries the texts of both languages, as the game shows them', () => {
  for (const row of rows) {
    for (const [lang, dict] of [['es', es], ['en', en]]) {
      const text = row[lang];
      assert.equal(text.title, dict[`year.${row.id}.title`]);
      assert.equal(text.scene, dict[`year.${row.id}.scene`]);
      assert.equal(text.name, dict[`year.${row.id}.${row.type}.name`]);
      assert.equal(text.desc, dict[`year.${row.id}.${row.type}.desc`]);
      assert.ok(Object.values(text).every((value) => typeof value === 'string' && value.length > 0), `${row.id} ${row.type} ${lang}`);
    }
  }
});

test('every row names the P&L line the answer moves, with the label the game shows on the chip', () => {
  for (const row of rows) {
    const option = PROBLEMS.find((problem) => problem.id === row.id).options.find((o) => o.a === row.type);
    assert.equal(row.line, option.line);
    assert.equal(row.es.line, es[`line.short.${option.line}`]);
    assert.equal(row.en.line, en[`line.short.${option.line}`]);
  }
});

test('the kind of answer and the voice are written out in words in both languages', () => {
  assert.deepEqual(Object.keys(TYPE_LABELS.es), AUTHORING);
  assert.deepEqual(Object.keys(TYPE_LABELS.en), AUTHORING);
  for (const row of rows) {
    assert.equal(row.es.type, TYPE_LABELS.es[row.type]);
    assert.equal(row.en.type, TYPE_LABELS.en[row.type]);
    assert.ok(['CLIENTE', 'PLANTA', 'ENTORNO', 'ESTRATEGIA'].includes(row.es.voice), row.es.voice);
  }
});

test('the months a problem fits are exported, so the reviewer sees which ones are tied to the calendar', () => {
  const tied = new Set(rows.filter((row) => row.months !== 'any').map((row) => row.id));
  assert.deepEqual([...tied].sort(), PROBLEMS.filter((p) => p.window[0] !== 1 || p.window[1] !== 12).map((p) => p.id).sort());
  assert.ok(rows.filter((row) => row.months !== 'any').every((row) => /^\d{1,2}-\d{1,2}$/.test(row.months)));
});

test('the rows are plain data that survives a round trip through JSON', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(rows)), rows);
});
