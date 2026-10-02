// Writes the candidate rows of one language into the repo's year content file.
// usage: node apply.js <candidate.js> <es|en>
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..') + path.sep;
const [candFile, lang] = process.argv.slice(2);
const cand = require(path.resolve(process.cwd(), candFile))[lang];
const file = `src/content/year.${lang}.js`;
const q = (s) => (s.includes("'") ? (s.includes('"') ? `'${s.replace(/'/g, "\\'")}'` : `"${s}"`) : `'${s}'`);
const lines = fs.readFileSync(root + file, 'utf8').split('\n');
for (const [id, p] of Object.entries(cand)) {
  const start = lines.findIndex((l) => l.startsWith(`  ['${id}',`));
  if (start < 0) throw new Error(`row not found: ${id}`);
  let end = start;
  while (!lines[end].endsWith(']],')) end += 1;
  const rows = [
    `  [${q(id)}, ${q(p.title)}, ${q(p.scene)},`,
    ...p.a.map(([name, desc], i) => `    [${q(name)}, ${q(desc)}]${i === 3 ? '],' : ','}`),
  ];
  lines.splice(start, end - start + 1, ...rows);
}
fs.writeFileSync(root + file, lines.join('\n'));
console.log(`${file}: ${Object.keys(cand).length} rows written`);
