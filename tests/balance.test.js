'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/engine');

const settle = (run) => {
  let r = run;
  while (!['turn', 'dead', 'final'].includes(r.phase)) r = engine.next(r);
  return r;
};
const apply = (run, id) => settle(engine.playCard(run, id));
const oi = engine.oiOf;

const stateKey = (run) => [
  run.floorIdx,
  run.turn,
  ...Object.values(run.pl).map((v) => v.toFixed(3)),
  run.flags.scanned,
  run.flags.valueMeasured,
  run.deferred.map((d) => d.cardId).sort().join('+'),
].join('|');

// Beam search over every card choice, keeping the best `width` states per flag combination.
function search(rank, { allow = () => true, width = 700 } = {}) {
  let frontier = [settle(engine.newRun())];
  const finished = [];
  while (frontier.length > 0) {
    const unique = new Map();
    for (const run of frontier) {
      for (const id of run.hand.filter(allow)) {
        const child = apply(run, id);
        if (child.phase === 'turn') unique.set(stateKey(child), child);
        else finished.push(child);
      }
    }
    const groups = new Map();
    for (const child of unique.values()) {
      const group = `${child.flags.scanned}${child.flags.valueMeasured}`;
      groups.set(group, [...(groups.get(group) || []), child]);
    }
    frontier = [...groups.values()].flatMap((g) => g.sort((a, b) => rank(b) - rank(a)).slice(0, width));
  }
  return finished;
}

const best = (runs) => runs.reduce((a, b) => (oi(b) > oi(a) ? b : a));

test('perfect play reaches a high-tech factory and three stars', () => {
  const finals = search(oi).filter((r) => r.phase === 'final');
  const top = best(finals);
  assert.ok(oi(top) >= 19, `best OI was ${oi(top).toFixed(2)}`);
  assert.equal(engine.starsFor(top), 3);
});

test('measuring the customer savings is worth real OI', () => {
  const withScan = best(search(oi).filter((r) => r.phase === 'final'));
  const noScan = best(search(oi, { allow: (id) => id !== 'scan' }).filter((r) => r.phase === 'final'));
  assert.ok(oi(withScan) - oi(noScan) >= 1, `scan gain was ${(oi(withScan) - oi(noScan)).toFixed(2)}`);
});

test('careless play can kill the factory', () => {
  const finished = search((r) => -oi(r), { width: 300 });
  assert.ok(finished.some((r) => r.phase === 'dead'));
});

function playGreedy(run) {
  let r = run;
  while (r.phase === 'turn') {
    const pick = r.hand.reduce((a, b) => (engine.previewDelta(r, b).oi > engine.previewDelta(r, a).oi ? b : a));
    r = apply(r, pick);
  }
  return r;
}

test('short-sighted greedy play falls into the free-freight trap and trails perfect play', () => {
  const perfect = best(search(oi).filter((r) => r.phase === 'final'));
  const result = playGreedy(settle(engine.newRun()));
  assert.equal(result.phase, 'final');
  assert.ok(result.played.some((p) => p.cardId === 'freight'), 'greedy takes the card that looks free');
  assert.ok(oi(perfect) - oi(result) >= 1.5, `gap ${(oi(perfect) - oi(result)).toFixed(2)}`);
});

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('random play often survives but rarely masters the game', () => {
  const rand = mulberry32(2026);
  const runs = 1500;
  let survived = 0;
  let masters = 0;
  for (let i = 0; i < runs; i += 1) {
    let r = settle(engine.newRun());
    while (r.phase === 'turn') r = apply(r, r.hand[Math.floor(rand() * r.hand.length)]);
    if (r.phase === 'final') survived += 1;
    if (engine.starsFor(r) === 3) masters += 1;
  }
  assert.ok(survived / runs >= 0.45, `survival ${(survived / runs).toFixed(2)}`);
  assert.ok(masters / runs <= 0.1, `mastery ${(masters / runs).toFixed(2)}`);
});
