# Authoring helpers for the year's problems

Rewriting the answers of the year is easier outside the game files: write a candidate for a batch of
problems, measure it, and only then copy it in. None of this is part of the build.

A candidate is a module that exports `{ es: {...}, en: {...} }`, one entry per problem:

```js
m01c: {
  title: 'Renovación anual',
  scene: 'La minera, 18% de tus ventas, pide 3% de rebate para renovar el contrato.',
  lines: 'ISIS', // the P&L line each answer moves: smart, shortcut, give in, do nothing (S I C F D G)
  a: [['name', 'description'], /* shortcut */, /* give in */, /* do nothing */],
}
```

| Command | What it does |
|---|---|
| `node tools/authoring/eval.js cand.js es` | Screen limits (title 26, name 19, scene and description two rows of 40) and every audit of `tests/content-tells.test.js` on the candidate, plus the words that mark one kind of answer. |
| `node tools/authoring/pair.js cand.js es smart ign` | The words that separate two kinds of answer. |
| `node tools/authoring/apply.js cand.js es` | Writes the candidate rows into `src/content/year.es.js` (or `.en.js`). The line mapping in `src/year/problems.js` is edited by hand. |

Then run `npm test`: the audits of `tests/content-tells.test.js` read all 48 problems, in both languages.
