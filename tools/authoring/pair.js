// usage: node pair.js <candidate.js> <lang> <typeA> <typeB>  -> words that separate two types of answer
const path = require('path');
const root = path.join(__dirname, '..', '..') + path.sep;
const tells = require(root + 'tests/helpers/tells');
const [file, lang, A, B] = process.argv.slice(2);
const cand = require(path.resolve(process.cwd(), file))[lang];
const T = ['smart', 'temp', 'plac', 'ign'];
const rows = Object.entries(cand).flatMap(([id, p]) => T.map((a, i) => ({ id, a, name: p.a[i][0], desc: p.a[i][1] })));
const count = (type) => { const c = {}; rows.filter((r) => r.a === type).forEach((r) => tells.words(r.name + ' ' + r.desc).forEach((w) => { c[w] = (c[w] || 0) + 1; })); return c; };
const ca = count(A); const cb = count(B);
const n = Object.keys(cand).length;
const vocab = new Set([...Object.keys(ca), ...Object.keys(cb)]);
const list = [...vocab].map((w) => ({ w, a: ca[w] || 0, b: cb[w] || 0 })).filter((x) => x.a + x.b >= 3);
const lean = (x) => (x.a - x.b);
console.log(A, 'words (', A, '/', B, '):', list.sort((x, y) => lean(y) - lean(x)).slice(0, 14).map((x) => `${x.w}(${x.a}/${x.b})`).join(' '));
console.log(B, 'words (', A, '/', B, '):', list.sort((x, y) => lean(x) - lean(y)).slice(0, 14).map((x) => `${x.w}(${x.a}/${x.b})`).join(' '));
