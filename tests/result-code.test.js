'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const sim = require('../src/year/simulate');
const { decisionsOf, replay, fingerprint } = require('../src/year/replay');
const { cleanName, encode, decode } = require('../src/year/result-code');

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const sample = (code = 4821, profile = 'expert') => decisionsOf(sim.simulate(sim.PROFILES[profile], 3, engine.newYear(code)));

test('cleanName keeps capital letters, digits and single spaces, up to 12 characters', () => {
  assert.equal(cleanName(' los halcones!! '), 'LOS HALCONES');
  assert.equal(cleanName('Equipo   Azul'), 'EQUIPO AZUL');
  assert.equal(cleanName('ÑANDÚ/#1'), 'NANDU1');
  assert.equal(cleanName('un nombre larguísimo'), 'UN NOMBRE LA');
  assert.equal(cleanName('   '), '');
  assert.equal(cleanName(null), '');
});

test('a result code is the team name, a slash and groups of four characters from a clear alphabet', () => {
  const text = encode({ name: 'Los Halcones', code: 4821, choices: sample() });
  const [name, payload] = text.split('/');
  assert.equal(name, 'LOS HALCONES');
  assert.match(payload, /^([0-9A-HJKMNP-TV-Z]{4}-)*[0-9A-HJKMNP-TV-Z]{1,4}$/);
  for (const ch of payload.replace(/-/g, '')) assert.ok(ALPHABET.includes(ch), ch);
});

test('a full year fits in 28 characters of code, a shorter one in less', () => {
  const full = encode({ name: '', code: 1, choices: sample(1) }).replace(/-/g, '');
  assert.equal(full.length, 28);
  const bankrupt = sample(1, 'passive');
  assert.ok(encode({ name: '', code: 1, choices: bankrupt }).replace(/-/g, '').length < 28);
});

test('a code without a name is just the payload', () => {
  const text = encode({ name: '', code: 9, choices: sample(9) });
  assert.ok(!text.includes('/'));
  assert.equal(decode(text).name, '');
});

test('decode gives back the name, the game code and every decision', () => {
  for (const profile of Object.keys(sim.PROFILES)) {
    for (const code of [0, 1, 4821, 9999]) {
      const choices = sample(code, profile);
      const result = decode(encode({ name: 'Equipo 7', code, choices }));
      assert.equal(result.ok, true, `${profile} ${code}`);
      assert.equal(result.name, 'EQUIPO 7');
      assert.equal(result.code, code);
      assert.deepEqual(result.choices, choices);
    }
  }
});

test('decode forgives lower case, spaces for dashes and the look-alike characters', () => {
  const text = encode({ name: 'Azul', code: 77, choices: sample(77) });
  const [name, payload] = text.split('/');
  const messy = `${name.toLowerCase()} / ${payload.toLowerCase().replace(/-/g, ' ')}`;
  assert.equal(decode(messy).ok, true);
  const swapped = payload.replace(/0/g, 'O').replace(/1/g, 'l');
  assert.equal(decode(`${name}/${swapped}`).ok, true);
});

test('a mistake in any single character is always caught', () => {
  const text = encode({ name: 'Azul', code: 4821, choices: sample() });
  const payload = text.split('/')[1].replace(/-/g, '');
  let checked = 0;
  for (let i = 0; i < payload.length; i += 1) {
    for (const ch of ALPHABET) {
      if (ch === payload[i]) continue;
      const wrong = `${payload.slice(0, i)}${ch}${payload.slice(i + 1)}`;
      assert.equal(decode(`AZUL/${wrong}`).ok, false, `position ${i} -> ${ch}`);
      checked += 1;
    }
  }
  assert.equal(checked, 28 * 31);
});

test('swapping two neighbouring characters is caught too', () => {
  const payload = encode({ name: '', code: 4821, choices: sample() }).replace(/-/g, '');
  let caught = 0;
  let swaps = 0;
  for (let i = 0; i + 1 < payload.length; i += 1) {
    if (payload[i] === payload[i + 1]) continue;
    const swapped = `${payload.slice(0, i)}${payload[i + 1]}${payload[i]}${payload.slice(i + 2)}`;
    swaps += 1;
    if (!decode(swapped).ok) caught += 1;
  }
  assert.equal(caught, swaps);
});

test('the reasons for a bad code are told apart', () => {
  const good = encode({ name: 'Azul', code: 4821, choices: sample() });
  const payload = good.split('/')[1];
  assert.deepEqual(decode(''), { ok: false, reason: 'format' });
  assert.deepEqual(decode('hola, esto no es un código'), { ok: false, reason: 'format' });
  assert.deepEqual(decode('AZUL/ABCD'), { ok: false, reason: 'format' });
  const compact = payload.replace(/-/g, '');
  const flipped = `${compact.slice(0, 12)}${compact[12] === '2' ? '3' : '2'}${compact.slice(13)}`;
  assert.equal(decode(`AZUL/${flipped}`).reason, 'checksum');
  const otherBuild = encode({ name: 'Azul', code: 4821, choices: sample(), fingerprint: (fingerprint() + 1) % 256 });
  assert.deepEqual(decode(otherBuild), { ok: false, reason: 'version' });
});

test('encode refuses what cannot be a year', () => {
  assert.throws(() => encode({ name: 'X', code: 10000, choices: [] }), /code/i);
  assert.throws(() => encode({ name: 'X', code: -1, choices: [] }), /code/i);
  assert.throws(() => encode({ name: 'X', code: 5, choices: Array(49).fill(0) }), /decisions/i);
  assert.throws(() => encode({ name: 'X', code: 5, choices: [0, 4] }), /decision/i);
});

test('a decoded code replays into the very same year it came from', () => {
  const original = sim.simulate(sim.PROFILES.careful, 12, engine.newYear(2024));
  const result = decode(encode({ name: 'Nube', code: 2024, choices: decisionsOf(original) }));
  const again = replay(result.code, result.choices);
  assert.equal(again.complete, true);
  assert.equal(again.run.outcome, original.outcome);
  assert.equal(engine.oiOf(again.run), engine.oiOf(original));
});
