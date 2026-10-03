'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const sim = require('../src/year/simulate');
const { decisionsOf } = require('../src/year/replay');
const { analyze, rankTeams, splits } = require('../src/year/standings');

const CODE = 4821;
const entry = (name, profile, seed = 3, code = CODE) => ({
  name,
  code,
  choices: decisionsOf(sim.simulate(sim.PROFILES[profile], seed, engine.newYear(code))),
});

test('analyze replays a team and reports its outcome, margin, weakest meter and answer counts', () => {
  const run = sim.simulate(sim.PROFILES.expert, 3, engine.newYear(CODE));
  const team = analyze(entry('Halcones', 'expert'));
  assert.equal(team.ok, true);
  assert.equal(team.name, 'Halcones');
  assert.equal(team.outcome, 'excellent');
  assert.equal(team.margin, engine.oiOf(run));
  assert.equal(team.weakest, Math.min(...Object.values(run.meters)));
  assert.equal(team.counts.smart + team.counts.temp + team.counts.plac + team.counts.ign, 48);
  assert.equal(team.rescued, false);
});

test('analyze keeps the margin after every month and the kind of each decision', () => {
  const run = sim.simulate(sim.PROFILES.average, 9, engine.newYear(CODE));
  const team = analyze({ name: 'Nube', code: CODE, choices: decisionsOf(run) });
  assert.deepEqual(team.series, run.closes.map((c) => c.oi));
  assert.equal(team.series.length, 12);
  assert.deepEqual(team.decisions.map((d) => d.a), run.history.map((h) => h.a));
  assert.deepEqual(team.decisions.map((d) => d.problemId), run.history.map((h) => h.problemId));
  assert.ok(team.decisions.every((d) => ['cliente', 'planta', 'entorno', 'estrategia'].includes(d.voice)));
  assert.ok(team.decisions.every((d, i) => d.monthIdx === run.history[i].monthIdx));
});

test('a company that went bankrupt keeps a shorter record and says when', () => {
  const team = analyze(entry('Rapidos', 'passive'));
  assert.equal(team.outcome, 'bankrupt');
  assert.ok(team.decisions.length < 48);
  assert.ok(team.bankruptMonth >= 1 && team.bankruptMonth <= 12);
  assert.equal(team.rescued, true);
});

test('a list of answers that does not finish the year is not a result', () => {
  const choices = entry('Cortos', 'expert').choices.slice(0, 20);
  assert.deepEqual(analyze({ name: 'Cortos', code: CODE, choices }), { ok: false, reason: 'incomplete' });
});

const fake = (name, outcome, margin, weakest) => ({ ok: true, name, outcome, margin, weakest });

test('the ranking orders by outcome first, then OI margin, then the weakest meter, then name', () => {
  const ranked = rankTeams([
    fake('Delta', 'bad', 12, 30),
    fake('Alfa', 'good', 17.5, 50),
    fake('Beta', 'excellent', 22, 56),
    fake('Gamma', 'good', 18.2, 46),
    fake('Eco', 'good', 18.2, 49),
    fake('Zeta', 'bankrupt', 7, 0),
    fake('Bravo', 'good', 18.2, 49),
  ]);
  assert.deepEqual(ranked.map((t) => t.name), ['Beta', 'Bravo', 'Eco', 'Gamma', 'Alfa', 'Delta', 'Zeta']);
});

test('ranking never changes the list it is given', () => {
  const teams = Object.freeze([fake('B', 'good', 1, 1), fake('A', 'excellent', 2, 2)]);
  assert.deepEqual(rankTeams(teams).map((t) => t.name), ['A', 'B']);
  assert.deepEqual(teams.map((t) => t.name), ['B', 'A']);
});

const withDecisions = (name, kinds) => ({
  ...fake(name, 'good', 15, 50),
  decisions: kinds.map((a, i) => ({ problemId: `p${i}`, voice: 'cliente', monthIdx: 0, a })),
});

test('splits finds the problems where the teams chose most differently', () => {
  const teams = [
    withDecisions('A', ['smart', 'temp', 'smart', 'plac']),
    withDecisions('B', ['smart', 'temp', 'temp', 'ign']),
    withDecisions('C', ['smart', 'smart', 'plac', 'plac']),
    withDecisions('D', ['smart', 'smart', 'ign', 'ign']),
  ];
  const found = splits(teams, 3);
  assert.equal(found.length, 3);
  assert.ok(found.every((s) => s.problemId !== 'p0'), 'everyone agreed on p0');
  assert.deepEqual(found.map((s) => s.problemId), ['p2', 'p1', 'p3'], 'p1 and p3 tie at 2 and keep their order');
  assert.deepEqual(found[0].byTeam, ['smart', 'temp', 'plac', 'ign']);
  assert.deepEqual(found[0].counts, { smart: 1, temp: 1, plac: 1, ign: 1 });
  assert.equal(found[0].score, 3);
  assert.equal(found[2].score, 2);
});

test('splits ignores problems only one team reached and respects the limit', () => {
  const teams = [withDecisions('A', ['smart', 'temp', 'plac']), withDecisions('B', ['temp'])];
  const found = splits(teams, 5);
  assert.deepEqual(found.map((s) => s.problemId), ['p0']);
  assert.deepEqual(found[0].byTeam, ['smart', 'temp']);
  assert.deepEqual(splits([withDecisions('A', ['smart'])], 5), []);
});

test('three real teams on the same year rank in the order of how they played', () => {
  const teams = [entry('Atajos', 'short'), entry('Cediendo', 'pleaser'), entry('Equilibrio', 'expert')].map(analyze);
  assert.ok(teams.every((t) => t.ok));
  assert.deepEqual(rankTeams(teams).map((t) => t.name), ['Equilibrio', 'Cediendo', 'Atajos']);
  const found = splits(teams, 6);
  assert.equal(found.length, 6);
  assert.ok(found[0].score >= 1);
  assert.ok(found.every((s, i) => i === 0 || found[i - 1].score >= s.score), 'sorted by how split the teams were');
});
