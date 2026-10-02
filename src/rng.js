'use strict';

// A small seeded random generator and the helpers built on it. The order of a year (and the
// positions of the cards of a tutorial turn) come from one seed, so a game can be replayed
// exactly and tests stay deterministic.

// mulberry32: 32 bits of state, returns floats in [0, 1).
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A new array in random order (items get a random key and are sorted by it).
const shuffle = (items, rng) =>
  items
    .map((item) => ({ item, key: rng() }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);

// The seed for the game after this one: a linear congruential step, kept to 32 bits.
const nextSeed = (seed) => (Math.imul(seed, 1664525) + 1013904223) >>> 0;

// A game is identified by a code from 0 to 9999: it is the seed of the year, short enough to say
// aloud ("everyone play 4821") and to print on the result screen.
const GAME_CODES = 10000;
const formatCode = (code) => String(code).padStart(4, '0');
const parseCode = (text) => (/^\d{4}$/.test(String(text ?? '').trim()) ? Number(String(text).trim()) : null);

// The code of the next game: another number, never the same one twice in a row.
function nextGameCode(code) {
  const next = nextSeed(code) % GAME_CODES;
  return next === code ? (code + 1) % GAME_CODES : next;
}

module.exports = { mulberry32, shuffle, nextSeed, GAME_CODES, formatCode, parseCode, nextGameCode };
