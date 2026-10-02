'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createStorage, DEFAULTS, KEY } = require('../src/storage');

const memory = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    dump: () => data,
  };
};

test('load returns defaults when there is no backend', () => {
  assert.deepEqual(createStorage(null).load(), DEFAULTS);
});

test('load returns defaults when the backend throws', () => {
  const broken = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  assert.deepEqual(createStorage(broken).load(), DEFAULTS);
});

test('load returns defaults for corrupt JSON', () => {
  const backend = memory({ [KEY]: '{not json' });
  assert.deepEqual(createStorage(backend).load(), DEFAULTS);
});

test('load sanitizes invalid values instead of trusting them', () => {
  const backend = memory({ [KEY]: JSON.stringify({ lang: 'fr', muted: 'yes', bestStars: 99 }) });
  assert.deepEqual(createStorage(backend).load(), { lang: null, muted: false, calm: null, bestStars: 3, bestYear: 0 });
  const odd = memory({ [KEY]: JSON.stringify({ lang: 'en', muted: true, bestStars: 1.5 }) });
  assert.deepEqual(createStorage(odd).load(), { lang: 'en', muted: true, calm: null, bestStars: 0, bestYear: 0 });
});

test('save merges with what is stored and keeps the best stars', () => {
  const backend = memory();
  const storage = createStorage(backend);
  const first = storage.save({ lang: 'en', bestStars: 2 });
  assert.deepEqual(first, { lang: 'en', muted: false, calm: null, bestStars: 2, bestYear: 0 });
  const second = storage.save({ bestStars: 1, muted: true });
  assert.deepEqual(second, { lang: 'en', muted: true, calm: null, bestStars: 2, bestYear: 0 });
  assert.deepEqual(storage.load(), second);
});

test('save survives a backend that throws on write', () => {
  const backend = {
    getItem: () => null,
    setItem() {
      throw new Error('quota');
    },
  };
  const saved = createStorage(backend).save({ lang: 'es' });
  assert.equal(saved.lang, 'es');
});

test('the best year is kept as a rank from 0 to 6 and never goes down', () => {
  const storage = createStorage(memory());
  assert.equal(storage.save({ bestYear: 4 }).bestYear, 4);
  assert.equal(storage.save({ bestYear: 2 }).bestYear, 4);
  assert.equal(storage.save({ bestYear: 6 }).bestYear, 6);
  const wild = memory({ [KEY]: JSON.stringify({ bestYear: 99 }) });
  assert.equal(createStorage(wild).load().bestYear, 6);
  const odd = memory({ [KEY]: JSON.stringify({ bestYear: 'x' }) });
  assert.equal(createStorage(odd).load().bestYear, 0);
});

test('calm mode is unset until the player chooses, then remembers true or false', () => {
  assert.equal(DEFAULTS.calm, null, 'unset means: follow the system preference');
  const backend = memory();
  const storage = createStorage(backend);
  assert.equal(storage.load().calm, null);
  assert.equal(storage.save({ calm: true }).calm, true);
  assert.equal(createStorage(backend).load().calm, true);
  assert.equal(storage.save({ calm: false }).calm, false, 'false is a choice too, not "unset"');
  assert.equal(createStorage(backend).load().calm, false);
});

test('a calm value that is not a boolean is thrown away on load', () => {
  const backend = memory({ [KEY]: JSON.stringify({ calm: 'yes', muted: true }) });
  const loaded = createStorage(backend).load();
  assert.equal(loaded.calm, null);
  assert.equal(loaded.muted, true, 'and the rest of the saved settings survive');
});
