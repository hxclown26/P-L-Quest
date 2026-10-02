'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const view = require('../src/ui/view');
const engine = require('../src/engine');
const model = require('../src/model');
const { CARDS } = require('../src/content/cards');

const near = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);

const settle = (run) => {
  let r = run;
  while (!['turn', 'dead', 'final'].includes(r.phase)) r = engine.next(r);
  return r;
};
const play = (run, id) => settle(engine.playCard(run, id));
const atFloor2 = () => ['listPrice', 'bundle', 'raise'].reduce(play, settle(engine.newRun()));

test('chipsFor shows which levers a card touches without revealing OI', () => {
  assert.deepEqual(view.chipsFor(CARDS.raise), [
    { key: 'chip.price', dir: 1 },
    { key: 'chip.volume', dir: -1 },
  ]);
  assert.deepEqual(view.chipsFor(CARDS.freight), [{ key: 'chip.shift', dir: 0 }]);
  assert.deepEqual(view.chipsFor(CARDS.scan), [{ key: 'chip.unlock', dir: 0 }]);
  assert.deepEqual(view.chipsFor(CARDS.give3), [{ key: 'line.short.incentives', dir: 1 }]);
  assert.deepEqual(view.chipsFor(CARDS.keep), []);
});

test('revealLines says what happened, in Spanish and in English', () => {
  const run = play(atFloor2(), 'give3');
  const es = view.revealLines({ lang: 'es', run });
  assert.match(es[0].text, /Dar el 3%/);
  assert.match(es[1].text, /^OI \d+,\d% > \d+,\d% {2}\(-3,0 pp\)$/);
  assert.equal(es[1].tone, 'red');
  const en = view.revealLines({ lang: 'en', run });
  assert.match(en[0].text, /Give the 3%/);
  assert.match(en[1].text, /\(-3\.0 pp\)/);
});

test('revealLines warns that free freight moves to floor 4 and that Scan opens a card', () => {
  const freight = view.revealLines({ lang: 'es', run: play(atFloor2(), 'freight') });
  assert.ok(freight.some((l) => /piso 4/.test(l.text)));
  const scan = view.revealLines({ lang: 'es', run: play(atFloor2(), 'scan') });
  assert.ok(scan.some((l) => /carta nueva/.test(l.text)));
});

test('revealLines announces a factory that modernizes or deteriorates', () => {
  const last = (before, after) => ({ cardId: 'listPrice', oiBefore: before, oiAfter: after, delta: { oi: after - before } });
  const up = view.revealLines({ lang: 'en', run: { last: last(15.9, 16.2) } });
  assert.ok(up.some((l) => /modernizing/.test(l.text)));
  const down = view.revealLines({ lang: 'en', run: { last: last(10.2, 9.8) } });
  assert.ok(down.some((l) => /deteriorating/.test(l.text)));
  const same = view.revealLines({ lang: 'en', run: { last: last(12, 12.1) } });
  assert.ok(!same.some((l) => /plant is/.test(l.text)));
});

test('entryLines reports the floor shock and the bills deferred from earlier floors', () => {
  const opening = atFloor2();
  const toFloor3 = ['scan', 'measured', 'contract3y'].reduce(play, opening);
  const shock = view.entryLines({ lang: 'es', run: toFloor3 });
  assert.ok(shock.some((l) => /Golpe del piso/.test(l.text)));

  const withFreight = ['freight', 'giveHalf', 'hold'].reduce(play, opening);
  const floor4 = ['renegotiate', 'hedge', 'stockUp'].reduce(play, withFreight);
  const bill = view.entryLines({ lang: 'es', run: floor4 });
  assert.ok(bill.some((l) => /factura/.test(l.text)));
});

test('noteKeys picks the note of the floor, the control room or the final room', () => {
  const run = atFloor2();
  assert.deepEqual(view.noteKeys({ run }), { title: 'note.2.title', body: 'note.2.body' });
  assert.deepEqual(view.noteKeys({ run: { ...run, phase: 'control', room: 'gp' } }), {
    title: 'room.gp.title',
    body: 'room.gp.body',
  });
  assert.deepEqual(view.noteKeys({ run: { ...run, phase: 'final' } }), { title: 'note.6.title', body: 'note.6.body' });
});

test('autopsyLines names the line and the costliest choice', () => {
  const run = {
    phase: 'dead',
    checkpoint: null,
    autopsy: { biggestLine: 'serve', worst: { floor: 2, turn: 1, chosen: 'give3', best: 'scan' } },
  };
  const lines = view.autopsyLines({ lang: 'es', run });
  assert.ok(lines.some((l) => /Costo de servir/.test(l)));
  assert.ok(lines.some((l) => /Dar el 3%/.test(l) && /Scan: medir ahorro/.test(l)));
  assert.ok(lines.some((l) => /primer piso/.test(l)));
  const withRoom = view.autopsyLines({ lang: 'en', run: { ...run, checkpoint: {} } });
  assert.ok(withRoom.some((l) => /control room/.test(l)));
});

test('lessons follow what the player did', () => {
  const measured = view.lessons({ lang: 'en', run: { flags: { scanned: true }, played: [] } });
  assert.ok(measured[0].includes('You measured'));
  const unmeasured = view.lessons({ lang: 'en', run: { flags: { scanned: false }, played: [{ cardId: 'freight' }] } });
  assert.ok(unmeasured[0].includes('not measure'));
  assert.ok(unmeasured.some((l) => /free freight/.test(l)));
  assert.ok(unmeasured.length <= 3);
});

test('plBefore rebuilds the P&L as it was before the last card', () => {
  const before = atFloor2();
  const after = engine.playCard(before, 'give3');
  const rebuilt = view.plBefore(after);
  for (const line of Object.keys(model.BASE_PL)) {
    assert.ok(Math.abs(rebuilt[line] - before.pl[line]) < 1e-9, line);
  }
});

test('floorImpact adds the arrival shock to the cards played on the floor', () => {
  const opening = atFloor2();
  const toFloor3 = ['scan', 'measured', 'contract3y'].reduce(play, opening);
  const sales = toFloor3.pl.sales;
  assert.ok(Math.abs(view.floorImpact(toFloor3) - (-4 / sales) * 100) < 1e-9, 'only the cost shock so far');
  const played = engine.playCard(toFloor3, 'renegotiate');
  assert.ok(Math.abs(view.floorImpact(played) - (-2.8 / sales) * 100) < 1e-9);
});
