'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const model = require('../src/model');
const { CARDS, CARD_LIST, AREAS, FLAGS } = require('../src/content/cards');
const { FLOORS, CONTROL_AFTER } = require('../src/content/floors');
const es = require('../src/content/es');
const en = require('../src/content/en');
const { SUPPORTED_CHARS } = require('../src/render/font');
const { wrapText } = require('../src/text');

const DICTS = { es, en };
const LANGS = Object.keys(DICTS);
const NAME_MAX = 19;
const LINE_COLS = 40;
const NOTE_COLS = 37;

test('every card is well formed and frozen', () => {
  assert.equal(CARD_LIST.length, new Set(CARD_LIST.map((c) => c.id)).size);
  for (const card of CARD_LIST) {
    assert.equal(CARDS[card.id], card);
    assert.ok(Object.isFrozen(card) && Object.isFrozen(card.ops), `${card.id} frozen`);
    assert.ok(card.floor >= 1 && card.floor <= 5, `${card.id} floor`);
    assert.ok(AREAS.includes(card.area), `${card.id} area`);
    assert.ok(['good', 'ok', 'bad'].includes(card.rating), `${card.id} rating`);
    for (const flag of [...card.requires, ...card.excludes, ...card.grants]) {
      assert.ok(FLAGS.includes(flag), `${card.id} flag ${flag}`);
    }
    for (const op of card.ops) {
      assert.doesNotThrow(() => model.applyOp(model.BASE_PL, op), `${card.id} op`);
    }
    for (const later of card.later) {
      assert.ok(later.floor > card.floor && later.floor <= 5, `${card.id} later floor`);
      for (const op of later.ops) {
        assert.doesNotThrow(() => model.applyOp(model.BASE_PL, op), `${card.id} later op`);
      }
    }
  }
});

test('floors reference real cards and keep three turns', () => {
  assert.deepEqual(FLOORS.map((f) => f.id), [1, 2, 3, 4, 5]);
  for (const floor of FLOORS) {
    assert.equal(floor.turns.length, 3, `floor ${floor.id} turns`);
    assert.ok(floor.pool.length >= 6, `floor ${floor.id} pool`);
    for (const id of floor.pool) assert.equal(CARDS[id].floor, floor.id, id);
    for (const id of floor.turns.flat()) assert.ok(floor.pool.includes(id), `floor ${floor.id} lists ${id}`);
    for (const op of floor.startOps) assert.doesNotThrow(() => model.applyOp(model.BASE_PL, op));
  }
  assert.deepEqual(Object.keys(CONTROL_AFTER).map(Number), [3, 4]);
});

test('every card belongs to exactly one floor pool', () => {
  const pooled = FLOORS.flatMap((f) => f.pool);
  assert.deepEqual([...pooled].sort(), CARD_LIST.map((c) => c.id).sort());
});

test('ES and EN define exactly the same keys', () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
});

test('ES and EN use the same placeholders', () => {
  const names = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(es)) assert.deepEqual(names(es[key]), names(en[key]), key);
});

function requiredKeys() {
  const keys = [];
  for (const card of CARD_LIST) keys.push(`card.${card.id}.name`, `card.${card.id}.desc`);
  for (const floor of FLOORS) {
    keys.push(`floor.${floor.id}.name`, `floor.${floor.id}.place`, `boss.${floor.boss}`);
    keys.push(`floor.${floor.id}.t1`, `floor.${floor.id}.t2`, `floor.${floor.id}.t3`);
    keys.push(`note.${floor.id}.title`, `note.${floor.id}.body`);
  }
  keys.push('floor.6.name', 'floor.6.place', 'note.6.title', 'note.6.body');
  for (const line of ['sales', 'incentives', 'cost', 'cm', 'freight', 'direct', 'gp', 'sga', 'oi']) {
    keys.push(`line.${line}`, `line.short.${line}`);
  }
  keys.push('line.delivery');
  for (const area of AREAS) keys.push(`area.${area}`, `area.tag.${area}`);
  for (const tier of ['collapse', 'edge', 'worn', 'normal', 'modern', 'hightech']) keys.push(`tier.${tier}`);
  for (const room of ['cm', 'gp']) keys.push(`room.${room}.title`, `room.${room}.body`);
  return keys;
}

test('every key the content needs exists in both languages', () => {
  for (const lang of LANGS) {
    for (const key of requiredKeys()) assert.ok(key in DICTS[lang], `${lang} is missing ${key}`);
  }
});

test('all strings only use characters the bitmap font can draw', () => {
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(DICTS[lang])) {
      for (const ch of value) {
        assert.ok(SUPPORTED_CHARS.includes(ch) || ch === '\n', `${lang}:${key} has unsupported "${ch}"`);
      }
    }
  }
});

test('card names fit the card box and descriptions fit two lines', () => {
  for (const lang of LANGS) {
    for (const card of CARD_LIST) {
      const name = DICTS[lang][`card.${card.id}.name`];
      const desc = DICTS[lang][`card.${card.id}.desc`];
      assert.ok(name.length <= NAME_MAX, `${lang} ${card.id} name "${name}" is ${name.length} chars`);
      assert.ok(wrapText(desc, LINE_COLS).length <= 2, `${lang} ${card.id} description is too long`);
    }
  }
});

test('boss lines fit two lines and notes fit the note window', () => {
  for (const lang of LANGS) {
    for (const floor of FLOORS) {
      for (const turn of ['t1', 't2', 't3']) {
        const line = DICTS[lang][`floor.${floor.id}.${turn}`];
        assert.ok(wrapText(line, LINE_COLS).length <= 2, `${lang} floor ${floor.id} ${turn}`);
      }
    }
    for (let id = 1; id <= 6; id += 1) {
      assert.ok(DICTS[lang][`note.${id}.title`].length <= 32, `${lang} note ${id} title`);
      assert.ok(wrapText(DICTS[lang][`note.${id}.body`], NOTE_COLS).length <= 7, `${lang} note ${id} body`);
    }
  }
});

test('line and area labels fit their slots', () => {
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(DICTS[lang])) {
      if (key.startsWith('line.short.')) assert.ok(value.length <= 13, `${lang} ${key}`);
      if (key.startsWith('area.tag.')) assert.ok(value.length <= 10, `${lang} ${key}`);
    }
  }
});

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

test('every static UI string key used in the code exists in both languages', () => {
  const pattern = /\btx\(\s*\w+\s*,\s*'([\w.]+)'/g;
  const root = path.join(__dirname, '..', 'src');
  for (const file of sourceFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(pattern)) {
      for (const lang of LANGS) {
        assert.ok(match[1] in DICTS[lang], `${path.relative(root, file)} uses missing key ${match[1]} (${lang})`);
      }
    }
  }
});

// The P&L reads its ratios over net sales (sales less incentives): no text may define the margin as
// a share of plain sales, or the screen would contradict the statement beside it. (A client that
// weighs "14% of sales" is a different thing: its share of what you sell.)
test('the margin is always defined over net sales, never over plain sales', () => {
  const plainSales = /como % de las ventas(?! netas)|\/ ventas(?! netas)|as a % of sales|\/ sales\b/i;
  const offenders = LANGS.flatMap((lang) => Object.entries(DICTS[lang])
    .filter(([, text]) => typeof text === 'string' && plainSales.test(text))
    .map(([key]) => `${lang} ${key}`));
  assert.deepEqual(offenders, []);
});
