'use strict';

// The case of every problem: what the player reads before deciding (who, why now, three facts) and what happens after each answer.

const test = require('node:test');
const assert = require('node:assert/strict');
const { PROBLEMS, AUTHORING } = require('../src/year/problems');
const { SEGMENT_IDS } = require('../src/year/segments');
const es = require('../src/content/es');
const en = require('../src/content/en');
const { wrapText } = require('../src/text');

const DICTS = { es, en };
const LANGS = Object.keys(DICTS);
const BRIEF_COLS = 40;
const BRIEF_ROWS = 5;
const FACT_CHARS = 38;
const WHY_COLS = 38;
const WHY_ROWS = 3;
const LABEL = Object.freeze({
  es: Object.freeze({ smart: 'Equilibrada:', temp: 'Atajo:', plac: 'Cesión:', ign: 'Pasividad:', red: 'Línea roja:' }),
  en: Object.freeze({ smart: 'Balanced:', temp: 'Shortcut:', plac: 'Concession:', ign: 'Passivity:', red: 'Red line:' }),
});
const MINING = /miner|faena|cobre|royalty|altipl|\bmines?\b|mining|copper/i;

test('every problem has its brief, three facts and a story for each of its four answers, in both languages', () => {
  for (const lang of LANGS) {
    for (const problem of PROBLEMS) {
      const dict = DICTS[lang];
      for (const key of ['brief', 'facts', ...AUTHORING.map((a) => `${a}.why`)]) {
        assert.ok(`year.${problem.id}.${key}` in dict, `${lang} missing ${problem.id} ${key}`);
      }
      assert.equal(dict[`year.${problem.id}.facts`].split('|').length, 3, `${lang} ${problem.id}: three facts`);
    }
  }
});

test('the brief fits five rows, each fact one row, and nothing is left for later: no placeholder, no gap', () => {
  for (const lang of LANGS) {
    for (const problem of PROBLEMS) {
      const dict = DICTS[lang];
      const brief = dict[`year.${problem.id}.brief`];
      const rows = wrapText(brief, BRIEF_COLS).length;
      assert.ok(rows <= BRIEF_ROWS, `${lang} ${problem.id}: the brief takes ${rows} rows of ${BRIEF_ROWS}`);
      assert.ok(!/[{}]|undefined|\s{2}/.test(brief), `${lang} ${problem.id}: ${brief}`);
      dict[`year.${problem.id}.facts`].split('|').forEach((fact) => {
        assert.ok(fact.length > 0 && fact.length <= FACT_CHARS, `${lang} ${problem.id}: fact "${fact}" is ${fact.length} characters`);
        assert.match(fact, /: ?\S|\d/, `${lang} ${problem.id}: a fact names something and says how much`);
      });
    }
  }
});

test('what happens after an answer fits three rows and opens with the kind of answer it was, a red line included', () => {
  for (const lang of LANGS) {
    for (const problem of PROBLEMS) {
      for (const option of problem.options) {
        const why = DICTS[lang][`year.${problem.id}.${option.a}.why`];
        const label = option.redLine ? LABEL[lang].red : LABEL[lang][option.a];
        assert.ok(why.startsWith(label), `${lang} ${problem.id} ${option.a}: should open with "${label}": ${why}`);
        const rows = wrapText(why, WHY_COLS).length;
        assert.ok(rows <= WHY_ROWS, `${lang} ${problem.id} ${option.a}: ${rows} rows of ${WHY_ROWS}`);
        assert.ok(!/[{}]|undefined/.test(why), `${lang} ${problem.id} ${option.a}`);
      }
    }
  }
});

test('the clients are hotels, hospitals, food and industry: no text speaks of mines any more', () => {
  for (const lang of LANGS) {
    const dict = DICTS[lang];
    for (const [key, value] of Object.entries(dict)) {
      if (!/^year\.m\d\d[cpes]\./.test(key)) continue;
      assert.ok(!MINING.test(value), `${lang} ${key} still speaks of mining: ${value}`);
    }
  }
});

test('the four segments have a name, and the segments each read in the problems of every voice', () => {
  for (const lang of LANGS) {
    for (const segment of SEGMENT_IDS) assert.ok(`year.seg.${segment}` in DICTS[lang], `${lang} ${segment}`);
  }
  for (const segment of SEGMENT_IDS) assert.ok(PROBLEMS.some((p) => p.segment === segment));
});
