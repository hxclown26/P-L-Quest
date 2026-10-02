'use strict';

function splitLongWord(word, maxCols) {
  const chunks = [];
  for (let i = 0; i < word.length; i += maxCols) chunks.push(word.slice(i, i + maxCols));
  return chunks;
}

function wrapParagraph(paragraph, maxCols) {
  const words = paragraph
    .split(' ')
    .filter((word) => word.length > 0)
    .flatMap((word) => splitLongWord(word, maxCols));
  if (words.length === 0) return [''];
  return words.reduce((lines, word) => {
    const last = lines[lines.length - 1];
    if (last === undefined) return [word];
    return last.length + 1 + word.length <= maxCols
      ? [...lines.slice(0, -1), `${last} ${word}`]
      : [...lines, word];
  }, []);
}

// Greedy word wrap on a monospace grid; explicit newlines start a new paragraph.
const wrapText = (text, maxCols) =>
  String(text)
    .split('\n')
    .flatMap((paragraph) => wrapParagraph(paragraph, maxCols));

function formatNumber(n, lang, digits = 1) {
  const negligible = Math.abs(n) < 0.5 * 10 ** -digits;
  const fixed = negligible ? (0).toFixed(digits) : n.toFixed(digits);
  return lang === 'es' ? fixed.replace('.', ',') : fixed;
}

function formatDelta(n, lang, digits = 1) {
  const body = formatNumber(n, lang, digits);
  const isZero = /^0[.,]0+$/.test(body);
  return n > 0 && !isZero ? `+${body}` : body;
}

module.exports = { wrapText, formatNumber, formatDelta };
