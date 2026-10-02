'use strict';

// Exports the 48 problems of the year as rows for the domain review: one row per answer (192),
// with the texts in both languages, the P&L line the answer moves and what the author meant it to
// be. `tools/make_review_xlsx.py` turns the rows into the workbook the reviewers fill in.
// usage: node tools/export-review.js | python3 tools/make_review_xlsx.py docs/revision/revision-dominio.xlsx

const { PROBLEMS } = require('../src/year/problems');
const dictionaries = { es: require('../src/content/es'), en: require('../src/content/en') };

const TYPE_LABELS = Object.freeze({
  es: Object.freeze({ smart: 'Equilibrada', temp: 'Atajo', plac: 'Ceder', ign: 'Pasiva' }),
  en: Object.freeze({ smart: 'Balanced', temp: 'Shortcut', plac: 'Give in', ign: 'Passive' }),
});

const monthsOf = ([from, to]) => (from === 1 && to === 12 ? 'any' : `${from}-${to}`);

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
  };
};

const reviewRows = () => PROBLEMS.flatMap((problem) => problem.options.map((option) => ({
  id: problem.id,
  months: monthsOf(problem.window),
  type: option.a,
  line: option.line,
  es: textsOf('es', problem, option),
  en: textsOf('en', problem, option),
})));

if (require.main === module) process.stdout.write(JSON.stringify(reviewRows()));

module.exports = { reviewRows, TYPE_LABELS };
