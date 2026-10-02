'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/year/engine');
const sim = require('../src/year/simulate');
const { decisionsOf, replay, fingerprint } = require('../src/year/replay');

const played = (profile, code, seed = 7) => sim.simulate(sim.PROFILES[profile], seed, engine.newYear(code));

test('decisionsOf lists the answer the player picked each time, in the order shown', () => {
  const run = played('expert', 4821);
  const choices = decisionsOf(run);
  assert.equal(choices.length, 48);
  assert.ok(choices.every((c) => [0, 1, 2, 3].includes(c)));
  assert.deepEqual(choices, run.history.map((h) => h.optionIndex));
});

test('a year ends sooner when the company goes bankrupt, and so does its list of decisions', () => {
  const run = played('short', 4821);
  assert.equal(run.outcome, 'bankrupt');
  assert.ok(decisionsOf(run).length < 48);
});

test('replaying the decisions on the same code gives back the very same year', () => {
  for (const profile of Object.keys(sim.PROFILES)) {
    for (const code of [0, 7, 1234, 9999]) {
      const original = played(profile, code, code + 3);
      const again = replay(code, decisionsOf(original));
      assert.equal(again.complete, true, `${profile} ${code}`);
      assert.equal(again.run.outcome, original.outcome);
      assert.equal(engine.oiOf(again.run), engine.oiOf(original));
      assert.deepEqual(again.run.meters, original.meters);
      assert.deepEqual(again.run.history.map((h) => h.problemId), original.history.map((h) => h.problemId));
      assert.deepEqual(again.run.closes.map((c) => c.oi), original.closes.map((c) => c.oi));
    }
  }
});

test('too few decisions leave the year unfinished and too many are rejected', () => {
  const original = played('expert', 55);
  const choices = decisionsOf(original);
  const short = replay(55, choices.slice(0, 30));
  assert.equal(short.complete, false);
  assert.notEqual(short.run.phase, 'final');
  const extra = replay(55, [...choices, 0]);
  assert.equal(extra.complete, false, 'a decision after the verdict does not belong to this year');
});

test('a decision outside 0-3 is an error, not a silent pick', () => {
  assert.throws(() => replay(5, [0, 1, 4]), /decision/i);
  assert.throws(() => replay(5, [0, -1]), /decision/i);
  assert.throws(() => replay(5, [0, 1.5]), /decision/i);
});

test('the same decisions on another code are another year', () => {
  const choices = decisionsOf(played('expert', 11));
  const here = replay(11, choices).run;
  const there = replay(12, choices).run;
  assert.notEqual(here.schedule.order.join(), there.schedule.order.join());
});

test('the fingerprint is a stable byte that identifies this build of the rules', () => {
  const first = fingerprint();
  assert.ok(Number.isInteger(first) && first >= 0 && first <= 255);
  assert.equal(fingerprint(), first);
});

test('the fingerprint notices a change in the data the rules run on, not only in how a year plays out', () => {
  const { fingerprintFor, currentParts } = require('../src/year/replay');
  const parts = currentParts();
  assert.equal(fingerprintFor(parts), fingerprint());
  const tweaks = {
    archetype: { ...parts, archetypes: { ...parts.archetypes, ign: { ...parts.archetypes.ign, oi: parts.archetypes.ign.oi - 0.05 } } },
    problem: { ...parts, problems: parts.problems.map((p, i) => (i === 20 ? { ...p, size: p.size + 0.1 } : p)) },
    base: { ...parts, base: { ...parts.base, cost: parts.base.cost + 1 } },
    grade: { ...parts, rules: { ...parts.rules, GRADES: [['excellent', 22, 55], ...parts.rules.GRADES.slice(1)] } },
  };
  for (const [name, changed] of Object.entries(tweaks)) {
    assert.notEqual(fingerprintFor(changed), fingerprint(), `${name} change goes unnoticed`);
  }
});
