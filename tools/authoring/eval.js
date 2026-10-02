// Evaluates a candidate rewrite of a batch of problems against the tell audits and the fit limits.
// usage: node eval.js <candidate.js> <es|en>
const path = require('path');
const root = path.join(__dirname, '..', '..') + path.sep;
const tells = require(root + 'tests/helpers/tells');
const { wrapText } = require(root + 'src/text');
const { PROBLEMS } = require(root + 'src/year/problems');

const [file, lang] = process.argv.slice(2);
const cand = require(path.resolve(process.cwd(), file))[lang];
const LINE = { S: 'sales', I: 'incentives', C: 'cost', F: 'freight', D: 'direct', G: 'sga' };
const TYPES = ['smart', 'temp', 'plac', 'ign'];

const rows = Object.entries(cand).flatMap(([id, p]) => TYPES.map((a, i) => ({
  id, a, line: LINE[p.lines[i]], name: p.a[i][0], desc: p.a[i][1],
})));
const ids = Object.keys(cand);

// ---- limits of the screen
const problems = [];
for (const [id, p] of Object.entries(cand)) {
  if (!PROBLEMS.find((x) => x.id === id)) problems.push(`${id}: not a problem`);
  if (p.title.length > 26) problems.push(`${id} title ${p.title.length}`);
  if (wrapText(p.scene, 40).length > 2) problems.push(`${id} scene ${wrapText(p.scene, 40).length} rows: ${p.scene}`);
  if (new Set(p.a.map((x) => x[0])).size < 4) problems.push(`${id} duplicate names`);
  p.a.forEach(([name, desc], i) => {
    if (name.length > 19) problems.push(`${id} ${TYPES[i]} name ${name.length}: ${name}`);
    if (wrapText(desc, 40).length > 2) problems.push(`${id} ${TYPES[i]} desc ${wrapText(desc, 40).length} rows: ${desc}`);
  });
}
console.log(problems.length ? 'LIMITS:\n  ' + problems.join('\n  ') : 'limits ok');

// ---- audits
// the test's policy: alpha 2% against the shortcut, the first word and the line; 0.1% against the rest
const f = (r, alpha) => { const limit = tells.surprising(r.n, r.chance, alpha); return `${r.hits}/${r.n} = ${(100 * r.hits / r.n).toFixed(0)}% (guessing ${(100 * r.chance).toFixed(0)}%, fails from ${limit}) ${r.hits < limit ? 'ok' : 'FAIL'}`; };
console.log('4-way  :', f(tells.pickTheBalanced(rows), 0.001));
for (const [a, alpha] of [['temp', 0.02], ['plac', 0.001], ['ign', 0.001]]) console.log('vs', a.padEnd(5), ':', f(tells.pickTheBalanced(rows, [a]), alpha));
console.log('1st wd :', f(tells.firstWordHits(rows), 0.02));
console.log('line   :', f(tells.lineHits(rows), 0.02));
console.log('spread : desc', (100 * tells.lengthSpread(rows, 'desc')).toFixed(1) + '%', 'name', (100 * tells.lengthSpread(rows, 'name')).toFixed(1) + '%');
const share = tells.figureShareByType(rows);
const overall = rows.filter((r) => tells.hasFigure(r.desc)).length / rows.length;
console.log('figures: scenes', Object.values(cand).filter((p) => tells.hasFigure(p.scene)).length + '/' + ids.length, '| desc overall', (100 * overall).toFixed(0) + '%', JSON.stringify(Object.fromEntries(Object.entries(share).map(([a, v]) => [a, +v.toFixed(2)]))));
const mean = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log('mean desc length:', TYPES.map((a) => a + ' ' + mean(rows.filter((r) => r.a === a).map((r) => r.desc.length))).join(' | '));
const first = {};
rows.forEach((r) => { const w = r.name.split(' ')[0].toLowerCase(); first[w] = first[w] || []; first[w].push(r.a[0]); });
console.log('repeated first words:', Object.entries(first).filter(([, v]) => v.length > 1).map(([w, v]) => `${w}:${v.join('')}`).join(' '));

// ---- the words that lean most towards "balanced" and away from it (all rows as training)
const words = tells.words;
const yes = {}; const no = {}; let dy = 0; let dn = 0;
rows.forEach((r) => { const bucket = r.a === 'smart' ? yes : no; r.a === 'smart' ? dy++ : dn++; words(r.name + ' ' + r.desc).forEach((w) => { bucket[w] = (bucket[w] || 0) + 1; }); });
const vocab = new Set([...Object.keys(yes), ...Object.keys(no)]);
const odds = [...vocab].map((w) => ({ w, y: yes[w] || 0, n: no[w] || 0, s: Math.log(((yes[w] || 0) + 1) / (dy + 2)) - Math.log(((no[w] || 0) + 1) / (dn + 2)) })).filter((x) => x.y + x.n >= 3);
console.log('lean balanced:', odds.sort((a, b) => b.s - a.s).slice(0, 12).map((x) => `${x.w}(${x.y}/${x.n})`).join(' '));
console.log('lean against :', odds.sort((a, b) => a.s - b.s).slice(0, 12).map((x) => `${x.w}(${x.y}/${x.n})`).join(' '));

// ---- words that belong to one type of answer (count by type: smart/temp/plac/ign)
const byWord = {};
rows.forEach((r) => words(r.name + ' ' + r.desc).forEach((w) => { byWord[w] = byWord[w] || { smart: 0, temp: 0, plac: 0, ign: 0 }; byWord[w][r.a] += 1; }));
const skewed = Object.entries(byWord).map(([w, c]) => ({ w, c, n: TYPES.reduce((s, a) => s + c[a], 0), top: Math.max(...TYPES.map((a) => c[a])) }))
  .filter((x) => (x.n >= 3 && x.top / x.n >= 0.75) || (x.n >= 5 && x.top / x.n >= 0.6))
  .sort((a, b) => b.n - a.n);
console.log('skewed words (smart/temp/plac/ign):', skewed.map((x) => `${x.w}(${TYPES.map((a) => x.c[a]).join('/')})`).join(' '));
