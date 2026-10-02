'use strict';

// The result code: a whole year in one line a team can copy into a chat, such as
//   LOS HALCONES/3K9F-2QPA-77XT-...
// It carries the build fingerprint, the game code and every answer picked (2 bits each), then a
// CRC-12 that catches any mistyped character. Because a year is fully decided by its code and its
// answers, decoding and replaying the line reproduces the team's year exactly.

const { GAME_CODES } = require('../rng');
const { ANSWERS, isAnswer, fingerprint } = require('./replay');

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LOOKALIKES = Object.freeze({ O: '0', I: '1', L: '1' });
const NAME_MAX = 12;
const MAX_DECISIONS = 48;
const FINGERPRINT_BITS = 8;
const CODE_BITS = 14;
const COUNT_BITS = 6;
const CHECK_BITS = 12;
const HEADER_BITS = FINGERPRINT_BITS + CODE_BITS + COUNT_BITS;
const ANSWER_BITS = Math.log2(ANSWERS);
const CRC_POLY = 0x80f;
const CRC_START = 0xfff;
const GROUP = 4;

// A team name: capital letters, digits and single spaces; accents fold (Ñ becomes N).
const cleanName = (text) => String(text ?? '')
  .toUpperCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Z0-9 ]/g, '')
  .replace(/ +/g, ' ')
  .trim()
  .slice(0, NAME_MAX)
  .trim();

const bitsOf = (value, width) => Array.from({ length: width }, (_, i) => (value >> (width - 1 - i)) & 1);
const valueOf = (bits) => bits.reduce((acc, bit) => acc * 2 + bit, 0);

const crc12 = (bits) => bits.reduce((crc, bit) => {
  const feedback = ((crc >> 11) & 1) ^ bit;
  const shifted = (crc << 1) & 0xfff;
  return feedback ? shifted ^ CRC_POLY : shifted;
}, CRC_START);

const pack = ({ print, code, choices }) => {
  const body = [
    ...bitsOf(print, FINGERPRINT_BITS),
    ...bitsOf(code, CODE_BITS),
    ...bitsOf(choices.length, COUNT_BITS),
    ...choices.flatMap((choice) => bitsOf(choice, ANSWER_BITS)),
  ];
  return [...body, ...bitsOf(crc12(body), CHECK_BITS)];
};

// Bits to text: five bits per character, groups of four characters joined by dashes.
function toText(bits) {
  const padded = [...bits, ...Array((5 - (bits.length % 5)) % 5).fill(0)];
  const chars = Array.from({ length: padded.length / 5 }, (_, i) => ALPHABET[valueOf(padded.slice(i * 5, i * 5 + 5))]);
  return chars.join('').match(new RegExp(`.{1,${GROUP}}`, 'g')).join('-');
}

function encode({ name, code, choices, fingerprint: print = fingerprint() }) {
  if (!Number.isInteger(code) || code < 0 || code >= GAME_CODES) throw new Error(`Invalid game code: ${code}`);
  if (choices.length > MAX_DECISIONS) throw new Error(`Too many decisions: ${choices.length}`);
  if (!choices.every(isAnswer)) throw new Error('Invalid decision in the list');
  const payload = toText(pack({ print, code, choices }));
  const label = cleanName(name);
  return label ? `${label}/${payload}` : payload;
}

const fail = (reason) => ({ ok: false, reason });

// Reads a code back: { ok: true, name, code, choices } or { ok: false, reason } where the reason is
// 'format' (not a code, or cut short), 'checksum' (a mistyped character) or 'version' (made by
// another build of the game).
function decode(text) {
  const raw = String(text ?? '');
  const slash = raw.lastIndexOf('/');
  const name = slash >= 0 ? cleanName(raw.slice(0, slash)) : '';
  const payload = (slash >= 0 ? raw.slice(slash + 1) : raw)
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[OIL]/g, (ch) => LOOKALIKES[ch]);
  if (payload.length === 0 || [...payload].some((ch) => !ALPHABET.includes(ch))) return fail('format');
  const bits = [...payload].flatMap((ch) => bitsOf(ALPHABET.indexOf(ch), 5));
  if (bits.length < HEADER_BITS + CHECK_BITS) return fail('format');
  const count = valueOf(bits.slice(FINGERPRINT_BITS + CODE_BITS, HEADER_BITS));
  const length = HEADER_BITS + ANSWER_BITS * count + CHECK_BITS;
  if (count > MAX_DECISIONS || bits.length < length || bits.length - length >= 5) return fail('format');
  if (bits.slice(length).some((bit) => bit !== 0)) return fail('format');
  const body = bits.slice(0, length - CHECK_BITS);
  if (crc12(body) !== valueOf(bits.slice(length - CHECK_BITS, length))) return fail('checksum');
  if (valueOf(bits.slice(0, FINGERPRINT_BITS)) !== fingerprint()) return fail('version');
  const choices = Array.from({ length: count }, (_, i) => {
    const from = HEADER_BITS + i * ANSWER_BITS;
    return valueOf(bits.slice(from, from + ANSWER_BITS));
  });
  return { ok: true, name, code: valueOf(bits.slice(FINGERPRINT_BITS, FINGERPRINT_BITS + CODE_BITS)), choices };
}

module.exports = { NAME_MAX, MAX_DECISIONS, cleanName, encode, decode };
