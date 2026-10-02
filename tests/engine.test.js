'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/engine');
const model = require('../src/model');
const { CARDS } = require('../src/content/cards');
const { FLOORS } = require('../src/content/floors');

const near = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const settle = (run) => {
  let r = run;
  while (!['turn', 'dead', 'final'].includes(r.phase)) r = engine.next(r);
  return r;
};
const play = (run, id) => settle(engine.playCard(run, id));
const start = () => settle(engine.newRun());

const GOOD = [
  'scan', 'measured', 'contract3y', 'raise', 'bundle', 'forecast',
  'passValue', 'renegotiate', 'swapInput', 'remote', 'routeOpt', 'fee',
  'restructure', 'freeze', 'trimTravel',
];

test('newRun starts at floor 1 with the base OI', () => {
  const run = engine.newRun();
  assert.equal(run.phase, 'floorIntro');
  assert.equal(run.floorIdx, 0);
  assert.equal(run.attempt, 1);
  near(engine.oiOf(run), 15);
});

test('the floor intro leads to a hand of four unique cards from that floor', () => {
  const run = engine.next(engine.newRun());
  assert.equal(run.phase, 'turn');
  assert.equal(run.hand.length, 4);
  assert.equal(new Set(run.hand).size, 4);
  for (const id of run.hand) assert.equal(CARDS[id].floor, 1);
});

test('floor 2 opens with the approved negotiation scene', () => {
  let run = start();
  run = ['listPrice', 'bundle', 'raise'].reduce(play, run);
  assert.equal(run.floorIdx, 1);
  assert.deepEqual(run.hand, ['give3', 'hold', 'freight', 'scan']);
});

test('playing Scan unlocks Ahorro documentado on the next turn', () => {
  let run = ['listPrice', 'bundle', 'raise'].reduce(play, start());
  run = play(run, 'scan');
  assert.equal(run.flags.scanned, true);
  assert.equal(run.hand[0], 'measured');
  const measured = play(run, 'measured');
  assert.equal(measured.flags.valueMeasured, true);
  assert.equal(measured.hand[0], 'contract3y');
});

test('Ahorro documentado never shows up before Scan is played', () => {
  let run = ['listPrice', 'bundle', 'raise'].reduce(play, start());
  assert.ok(!run.hand.includes('measured'));
  run = play(run, 'hold');
  assert.ok(!run.hand.includes('measured'));
  run = play(run, 'giveHalf');
  assert.ok(!run.hand.includes('measured'));
});

test('measured value changes the price card offered on the Cost floor', () => {
  const opening = ['listPrice', 'bundle', 'raise'].reduce(play, start());
  const withValue = ['scan', 'measured', 'contract3y'].reduce(play, opening);
  assert.equal(withValue.floorIdx, 2);
  assert.ok(withValue.hand.includes('passValue'));
  assert.ok(!withValue.hand.includes('passLight'));

  const without = ['hold', 'giveHalf', 'freight'].reduce(play, opening);
  assert.equal(without.floorIdx, 2);
  assert.ok(without.hand.includes('passLight'));
  assert.ok(!without.hand.includes('passValue'));
});

test('playCard rejects cards outside the hand and calls outside a turn', () => {
  const run = start();
  assert.throws(() => engine.playCard(run, 'fee'), /not in hand/);
  assert.throws(() => engine.playCard(engine.newRun(), 'raise'), /phase/);
});

test('engine functions never mutate their input', () => {
  const run = deepFreeze(start());
  const played = engine.playCard(run, run.hand[0]);
  assert.notEqual(played, run);
  assert.equal(run.played.length, 0);
  assert.equal(played.played.length, 1);
  deepFreeze(played);
  assert.doesNotThrow(() => engine.next(played));
});

test('free freight comes back as freight when floor 4 starts', () => {
  const opening = ['listPrice', 'bundle', 'raise'].reduce(play, start());
  const floor2 = ['freight', 'giveHalf', 'hold'].reduce(play, opening);
  const floor3 = ['renegotiate', 'hedge', 'stockUp'].reduce(play, floor2);
  assert.equal(floor3.floorIdx, 3);
  assert.deepEqual(floor3.entry.fromCards, ['freight']);
  // The bill is 2.5 points of freight; as a margin it is 2.5 over the net sales it lands on.
  near(floor3.entry.deferredOi, (-2.5 / model.netSales(floor3.pl)) * 100);
});

test('a floor lasts three turns and then summarizes', () => {
  let run = engine.next(engine.newRun());
  const phases = [];
  for (let turn = 0; turn < 3; turn += 1) {
    run = engine.playCard(run, run.hand[0]);
    phases.push(run.phase);
    run = engine.next(run);
    phases.push(run.phase);
  }
  assert.deepEqual(phases, ['turnResult', 'turn', 'turnResult', 'turn', 'turnResult', 'floorOutro']);
});

test('control rooms follow floors 3 and 4 and the run ends after floor 5', () => {
  let run = engine.newRun();
  const rooms = [];
  for (let i = 0; i < 300 && run.phase !== 'final' && run.phase !== 'dead'; i += 1) {
    if (run.phase === 'control') rooms.push(run.room);
    run = run.phase === 'turn'
      ? engine.playCard(run, GOOD.find((p) => run.hand.includes(p)) || run.hand[0])
      : engine.next(run);
  }
  assert.equal(run.phase, 'final');
  assert.deepEqual(rooms, ['cm', 'gp']);
});

test('dying after a control room retries from that control room', () => {
  let run = engine.newRun();
  while (run.phase !== 'control') {
    run = run.phase === 'turn'
      ? engine.playCard(run, GOOD.find((p) => run.hand.includes(p)) || run.hand[0])
      : engine.next(run);
  }
  assert.equal(run.room, 'cm');
  // Margins so thin that the first bad card on floor 4 kills the run, before the next room.
  const thin = { ...model.BASE_PL, sga: 28 };
  run = { ...run, pl: thin, checkpoint: { ...run.checkpoint, pl: thin } };
  run = settle(engine.next(run));
  while (run.phase === 'turn') {
    const worst = [...run.hand].sort((a, b) => engine.previewDelta(run, a).oi - engine.previewDelta(run, b).oi)[0];
    run = settle(engine.playCard(run, worst));
  }
  assert.equal(run.phase, 'dead');
  assert.ok(run.autopsy);
  const again = engine.retry(run);
  assert.equal(again.phase, 'control');
  assert.equal(again.room, 'cm');
  assert.equal(again.attempt, 2);
  near(engine.oiOf(again), model.operatingIncome(thin));
});

test('dying before any control room restarts the game', () => {
  // Thin margins plus the floor 3 cost shock kill the run before any control room.
  const thin = { ...model.BASE_PL, sga: 30 };
  const doomed = engine.enterFloor({ ...engine.newRun(), pl: thin }, 2);
  assert.equal(doomed.phase, 'dead');
  assert.equal(doomed.checkpoint, null);
  assert.ok(doomed.autopsy);
  const again = engine.retry(doomed);
  assert.equal(again.phase, 'floorIntro');
  assert.equal(again.floorIdx, 0);
  assert.equal(again.attempt, 2);
  near(engine.oiOf(again), 15);
});

test('stars: none when dead, one alive, two above the minimum, three with the goal and Scan', () => {
  const finalRun = (oi, scanned) => ({
    phase: 'final',
    pl: { ...model.BASE_PL, sga: model.BASE_PL.sga + (15 - oi) },
    flags: { scanned, valueMeasured: false },
  });
  assert.equal(engine.starsFor({ phase: 'dead', pl: model.BASE_PL, flags: {} }), 0);
  assert.equal(engine.starsFor(finalRun(0, true)), 0);
  assert.equal(engine.starsFor(finalRun(9.9, true)), 1);
  assert.equal(engine.starsFor(finalRun(10, false)), 2);
  assert.equal(engine.starsFor(finalRun(15, false)), 2);
  assert.equal(engine.starsFor(finalRun(15, true)), 3);
  assert.equal(engine.starsFor(finalRun(22, true)), 3);
});

test('a hand always has four unique cards, whatever the flags and choices', () => {
  const flagSets = [
    { scanned: false, valueMeasured: false },
    { scanned: true, valueMeasured: false },
    { scanned: true, valueMeasured: true },
  ];
  const explore = (run, turnsLeft) => {
    assert.equal(run.hand.length, 4, `floor ${run.floorIdx + 1} turn ${run.turn + 1}`);
    assert.equal(new Set(run.hand).size, 4);
    if (turnsLeft === 1) return;
    for (const id of run.hand) {
      const played = engine.playCard(run, id);
      if (played.phase === 'turnResult') explore(engine.next(played), turnsLeft - 1);
    }
  };
  for (const flags of flagSets) {
    FLOORS.forEach((_, idx) => {
      const entered = engine.enterFloor({ ...engine.newRun(), flags }, idx);
      if (entered.phase === 'floorIntro') explore(engine.next(entered), 3);
    });
  }
});

test('a tutorial run without a seed deals the authored hands', () => {
  const run = engine.next(engine.newRun());
  assert.equal(run.seed, null);
  assert.deepEqual(run.hand, engine.next(engine.newRun()).hand);
});

test('with a seed the same four cards of a turn come in another order', () => {
  const plain = engine.next(engine.newRun()).hand;
  const orders = new Set();
  for (let seed = 1; seed <= 30; seed += 1) {
    const hand = engine.next(engine.newRun(seed)).hand;
    assert.deepEqual([...hand].sort(), [...plain].sort(), `seed ${seed} keeps the same cards`);
    orders.add(hand.join());
  }
  assert.ok(orders.size >= 10, `${orders.size} different orders in 30 games`);
});

test('the same seed deals the same positions and a retry deals them again in a new order', () => {
  const a = engine.next(engine.newRun(5));
  const b = engine.next(engine.newRun(5));
  assert.deepEqual(a.hand, b.hand);
  const orders = new Set();
  let run = engine.newRun(5);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    orders.add(engine.next({ ...run, attempt: attempt + 1 }).hand.join());
  }
  assert.ok(orders.size >= 2, 'a retry does not repeat the same arrangement every time');
  run = engine.retry(engine.newRun(5));
  assert.equal(run.seed, 5, 'the seed survives a retry');
});

test('shuffled hands still hold four unique eligible cards on every floor and turn', () => {
  for (const seed of [1, 2, 3]) {
    let run = engine.newRun(seed);
    for (let guard = 0; guard < 200 && run.phase !== 'final' && run.phase !== 'dead'; guard += 1) {
      run = run.phase === 'turn' ? engine.playCard(run, run.hand[0]) : engine.next(run);
      if (run.phase === 'turn') {
        assert.equal(run.hand.length, 4);
        assert.equal(new Set(run.hand).size, 4);
      }
    }
  }
});
