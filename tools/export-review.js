'use strict';

// Exports the 48 problems of the year as rows for the domain review: one row per answer (192),
// with the texts in both languages, the P&L line the answer moves and what the author meant it to
// be. `tools/make_review_xlsx.py` turns the rows into the workbook the reviewers fill in.
// usage: node tools/export-review.js | python3 tools/make_review_xlsx.py docs/revision/revision-dominio.xlsx

const { PROBLEMS } = require('../src/year/problems');
const { BASE_PL, applyOps } = require('../src/model');
const rules = require('../src/year/rules');
const { effectOf } = require('../src/year/archetypes');
const { formatDelta } = require('../src/text');
const dictionaries = { es: require('../src/content/es'), en: require('../src/content/en') };

const TYPE_LABELS = Object.freeze({
  es: Object.freeze({ smart: 'Equilibrada', temp: 'Atajo', plac: 'Ceder', ign: 'Pasiva' }),
  en: Object.freeze({ smart: 'Balanced', temp: 'Shortcut', plac: 'Give in', ign: 'Passive' }),
});

const monthsOf = ([from, to]) => (from === 1 && to === 12 ? 'any' : `${from}-${to}`);

// What an answer does to the plan P&L, line by line, as a reviewer reads a statement: "Ventas ↑ · Incentivos ↑". A growth
// answer adds its volume and price, and a red line says so.
const STATE = Object.freeze({ meters: rules.START_METERS, oi: rules.PLAN_OI, rescued: false, flags: {}, pace: 1 });
const LINE_ORDER = Object.freeze(['sales', 'incentives', 'cost', 'freight', 'direct', 'sga']);
const MOVED = 0.005;
const WORDS = Object.freeze({
  es: Object.freeze({ volume: 'volumen', price: 'precio', red: 'LÍNEA ROJA' }),
  en: Object.freeze({ volume: 'volume', price: 'price', red: 'RED LINE' }),
});

// A growth answer is priced in volume and price: the lines that follow the volume on their own are not listed, only what
// the answer adds to a line by itself (a service, an investment).
function effectText(lang, problem, option) {
  const dict = dictionaries[lang];
  const effect = effectOf(problem, option, STATE);
  const after = applyOps(BASE_PL, effect.ops);
  const own = new Set(effect.ops.filter((op) => op.op === 'add' || op.op === 'oi').map((op) => op.line));
  const lines = LINE_ORDER.filter((line) => Math.abs(after[line] - BASE_PL[line]) >= MOVED && (!option.grow || own.has(line)))
    .map((line) => `${dict[`line.short.${line}`]} ${after[line] > BASE_PL[line] ? '↑' : '↓'}`);
  const growth = effect.ops.filter((op) => op.op === 'volume' || op.op === 'price')
    .map((op) => `${WORDS[lang][op.op]} ${formatDelta(op.pct, lang)}%`);
  const note = [...(growth.length > 0 ? [growth.join(', ')] : []), ...(option.redLine ? [WORDS[lang].red] : [])];
  return [...(lines.length > 0 ? [lines.join(' · ')] : []), ...note].join(' · ');
}

const textsOf = (lang, problem, option) => {
  const dict = dictionaries[lang];
  return {
    title: dict[`year.${problem.id}.title`],
    scene: dict[`year.${problem.id}.scene`],
    name: dict[`year.${problem.id}.${option.a}.name`],
    desc: dict[`year.${problem.id}.${option.a}.desc`],
    line: dict[`line.short.${option.line}`],
    type: TYPE_LABELS[lang][option.a],
    voice: dict[`year.voice.${problem.voice}`],
    segment: dict[`year.seg.${problem.segment}`],
    brief: dict[`year.${problem.id}.brief`],
    facts: dict[`year.${problem.id}.facts`].split('|').join(' · '),
    story: dict[`year.${problem.id}.${option.a}.why`],
    effect: effectText(lang, problem, option),
  };
};

const reviewRows = () => PROBLEMS.flatMap((problem) => problem.options.map((option) => ({
  id: problem.id,
  months: monthsOf(problem.window),
  type: option.a,
  line: option.line,
  redLine: option.redLine,
  es: textsOf('es', problem, option),
  en: textsOf('en', problem, option),
})));

if (require.main === module) process.stdout.write(JSON.stringify(reviewRows()));

module.exports = { reviewRows, TYPE_LABELS };
