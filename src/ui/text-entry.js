'use strict';

// Editing the text fields of the workshop screens. Pure: each function returns the new value
// and never touches the one it receives.

const { NAME_MAX } = require('../year/result-code');

const CODE_DIGITS = 4;
const FREE_MAX = 90;

const fold = (char) => char.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// A team name grows one character at a time: capitals, digits and single spaces.
function typeName(value, char) {
  if (value.length >= NAME_MAX) return value;
  if (char === ' ') return value === '' || value.endsWith(' ') ? value : `${value} `;
  const folded = fold(char);
  return /^[A-Z0-9]$/.test(folded) ? `${value}${folded}` : value;
}

const typeDigit = (value, char) => (/^\d$/.test(char) && value.length < CODE_DIGITS ? `${value}${char}` : value);

// Anything printable: a pasted or typed result code.
const typeFree = (value, char) => {
  const code = char.length === 1 ? char.charCodeAt(0) : 0;
  return code >= 32 && code <= 126 && value.length < FREE_MAX ? `${value}${char}` : value;
};

const erase = (value) => value.slice(0, -1);

module.exports = { CODE_DIGITS, FREE_MAX, typeName, typeDigit, typeFree, erase };
