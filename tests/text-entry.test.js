'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { typeName, typeDigit, typeFree, erase } = require('../src/ui/text-entry');

const typed = (fn, text) => [...text].reduce(fn, '');

test('a team name takes capitals, digits and single spaces, up to twelve characters', () => {
  assert.equal(typed(typeName, 'los halcones'), 'LOS HALCONES');
  assert.equal(typed(typeName, 'los halcones azules'), 'LOS HALCONES');
  assert.equal(typed(typeName, '  hola   mundo'), 'HOLA MUNDO');
  assert.equal(typed(typeName, 'equipo #7!'), 'EQUIPO 7');
  assert.equal(typed(typeName, 'ñandú'), 'NANDU');
});

test('a game code takes digits only, four at most', () => {
  assert.equal(typed(typeDigit, '48a2b1'), '4821');
  assert.equal(typed(typeDigit, '123456'), '1234');
  assert.equal(typed(typeDigit, 'abc'), '');
});

test('free text takes any printable character and stops at a sensible length', () => {
  assert.equal(typed(typeFree, 'AZUL/3K9F-2QPA'), 'AZUL/3K9F-2QPA');
  assert.equal(typed(typeFree, 'a\tb'), 'ab', 'control characters are ignored');
  assert.equal(typeFree('x'.repeat(90), 'y'), 'x'.repeat(90));
});

test('erase removes the last character and copes with nothing to erase', () => {
  assert.equal(erase('LOS'), 'LO');
  assert.equal(erase('A'), '');
  assert.equal(erase(''), '');
});

test('editing never changes the value it is given', () => {
  const original = 'ABC';
  typeName(original, 'D');
  erase(original);
  assert.equal(original, 'ABC');
});
