'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PROBLEMS, THEMES, VOICES, AUTHORING, LINES, PERMUTATIONS, displayOrder, displayOptions, problemAt,
} = require('../src/year/problems');
const es = require('../src/content/es');
const en = require('../src/content/en');
const { wrapText } = require('../src/text');

const DICTS = { es, en };
const LANGS = Object.keys(DICTS);

test('the year has 48 problems: 12 months x client, plant, environment, strategy', () => {
  assert.equal(PROBLEMS.length, 48);
  PROBLEMS.forEach((problem, i) => {
    assert.equal(problem.month, Math.floor(i / 4) + 1, problem.id);
    assert.equal(problem.voice, VOICES[i % 4], problem.id);
    assert.equal(problem.id, `m${String(problem.month).padStart(2, '0')}${'cpes'[i % 4]}`);
  });
  assert.equal(new Set(PROBLEMS.map((p) => p.id)).size, 48);
});

test('every problem is well formed and frozen', () => {
  for (const problem of PROBLEMS) {
    assert.ok(Object.isFrozen(problem) && Object.isFrozen(problem.options), problem.id);
    assert.ok(['C', 'P', 'E'].includes(problem.focus), problem.id);
    assert.ok(problem.size >= 0.8 && problem.size <= 1.5, `${problem.id} size`);
    assert.ok(THEMES.includes(problem.theme), `${problem.id} theme`);
    assert.deepEqual(problem.options.map((o) => o.a), [...AUTHORING], problem.id);
    for (const option of problem.options) {
      assert.ok(LINES.includes(option.line), `${problem.id} ${option.a} line`);
      assert.ok(option.k > 0, `${problem.id} ${option.a} factor`);
    }
  }
});

test('client, plant and strategy problems put their own meter at stake', () => {
  const meter = { cliente: 'C', planta: 'P', estrategia: 'E' };
  for (const problem of PROBLEMS.filter((p) => p.voice !== 'entorno')) {
    assert.equal(problem.focus, meter[problem.voice], problem.id);
  }
});

test('only the measuring answer of month 1 sets the "value measured" flag', () => {
  for (const problem of PROBLEMS) {
    for (const option of problem.options) {
      const expected = problem.id === 'm01s' && option.a === 'smart' ? ['valueMeasured'] : [];
      assert.deepEqual(option.sets, expected, `${problem.id} ${option.a}`);
    }
  }
});

test('answers are scattered so each position holds each character exactly 12 times', () => {
  assert.equal(PERMUTATIONS.length, 24);
  const counts = AUTHORING.map(() => [0, 0, 0, 0]);
  for (let n = 0; n < 48; n += 1) {
    const order = displayOrder(n);
    assert.deepEqual([...order].sort(), [0, 1, 2, 3]);
    order.forEach((authoringIndex, position) => { counts[authoringIndex][position] += 1; });
  }
  counts.forEach((row) => assert.deepEqual(row, [12, 12, 12, 12]));
});

test('displayOptions returns the four answers of the problem in the scattered order', () => {
  const shown = displayOptions(0, 0);
  assert.equal(shown.length, 4);
  assert.deepEqual(shown.map((o) => o.a).sort(), [...AUTHORING].sort());
  assert.deepEqual(displayOptions(0, 0), shown);
  assert.equal(problemAt(11, 3).id, 'm12s');
});

test('every problem has its title, scene and four answers in both languages', () => {
  for (const lang of LANGS) {
    for (const problem of PROBLEMS) {
      for (const key of ['title', 'scene']) {
        assert.ok(`year.${problem.id}.${key}` in DICTS[lang], `${lang} missing ${problem.id} ${key}`);
      }
      for (const a of AUTHORING) {
        for (const part of ['name', 'desc']) {
          assert.ok(`year.${problem.id}.${a}.${part}` in DICTS[lang], `${lang} missing ${problem.id} ${a} ${part}`);
        }
      }
    }
  }
});

test('titles, scenes, names and descriptions fit their boxes', () => {
  for (const lang of LANGS) {
    for (const problem of PROBLEMS) {
      const d = DICTS[lang];
      const title = d[`year.${problem.id}.title`];
      assert.ok(title.length <= 26, `${lang} ${problem.id} title "${title}" is ${title.length}`);
      assert.ok(wrapText(d[`year.${problem.id}.scene`], 40).length <= 2, `${lang} ${problem.id} scene`);
      const names = AUTHORING.map((a) => d[`year.${problem.id}.${a}.name`]);
      assert.equal(new Set(names).size, 4, `${lang} ${problem.id} names must differ`);
      for (const a of AUTHORING) {
        const name = d[`year.${problem.id}.${a}.name`];
        const desc = d[`year.${problem.id}.${a}.desc`];
        assert.ok(name.length <= 19, `${lang} ${problem.id} ${a} name "${name}" is ${name.length}`);
        assert.ok(wrapText(desc, 40).length <= 2, `${lang} ${problem.id} ${a} desc is too long: "${desc}"`);
      }
    }
  }
});
