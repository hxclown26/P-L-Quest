// Prints the current texts and lines of the first N problems as a candidate module, so that the
// audits of eval.js and pair.js can read what is already in the game.
// usage: node tools/authoring/export.js <count> > current.js
const path = require('path');
const root = path.join(__dirname, '..', '..') + path.sep;
const { PROBLEMS } = require(root + 'src/year/problems');
const dicts = { es: require(root + 'src/content/es'), en: require(root + 'src/content/en') };
const LETTER = { sales: 'S', incentives: 'I', cost: 'C', freight: 'F', direct: 'D', sga: 'G' };

const count = Number(process.argv[2] || PROBLEMS.length);
const out = Object.fromEntries(Object.entries(dicts).map(([lang, d]) => [lang, Object.fromEntries(PROBLEMS.slice(0, count).map((p) => [p.id, {
  title: d[`year.${p.id}.title`],
  scene: d[`year.${p.id}.scene`],
  lines: p.options.map((o) => LETTER[o.line]).join(''),
  a: p.options.map((o) => [d[`year.${p.id}.${o.a}.name`], d[`year.${p.id}.${o.a}.desc`]]),
}]))]));
console.log(`module.exports = ${JSON.stringify(out, null, 1)};`);
