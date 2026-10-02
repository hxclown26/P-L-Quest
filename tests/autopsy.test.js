'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAutopsy, cardWorth } = require('../src/autopsy');
const { CARDS } = require('../src/content/cards');

test('cardWorth values a card by what it really does, including later costs', () => {
  assert.ok(cardWorth(CARDS.give3) < cardWorth(CARDS.hold));
  assert.ok(cardWorth(CARDS.freight) < 0, 'free freight is not free');
  assert.ok(cardWorth(CARDS.remote) > 0);
});

test('Scan is worth more than a rebate because it unlocks later cards', () => {
  assert.ok(cardWorth(CARDS.scan) > cardWorth(CARDS.hold));
  assert.ok(cardWorth(CARDS.scan) > cardWorth(CARDS.give3));
});

// The biggest bite is the floor with the worst net OI movement once your own cards count:
// here the cost shock (-4) is partly repaid by renegotiating (+1.2), so the rebate floor wins.
test('the autopsy names the line that bit hardest and the costliest choice', () => {
  const run = {
    played: [
      { floorIdx: 1, turn: 0, cardId: 'give3', hand: ['give3', 'hold', 'freight', 'scan'], delta: { oi: -3 } },
      { floorIdx: 2, turn: 0, cardId: 'renegotiate', hand: ['absorb', 'passLight', 'renegotiate', 'swapInput'], delta: { oi: 1.2 } },
    ],
    entries: [
      { floorIdx: 0, deferredOi: 0, shockOi: 0 },
      { floorIdx: 1, deferredOi: 0, shockOi: 0 },
      { floorIdx: 2, deferredOi: 0, shockOi: -4 },
    ],
  };
  const autopsy = buildAutopsy(run);
  assert.equal(autopsy.worst.floor, 2);
  assert.equal(autopsy.worst.turn, 1);
  assert.equal(autopsy.worst.chosen, 'give3');
  assert.equal(autopsy.worst.best, 'scan');
  assert.equal(autopsy.biggestLine, 'incentives');
});

test('the autopsy copes with a run that has no decisions yet', () => {
  const autopsy = buildAutopsy({ played: [], entries: [{ floorIdx: 2, deferredOi: 0, shockOi: -4 }] });
  assert.equal(autopsy.worst, null);
  assert.equal(autopsy.biggestLine, 'cost');
});
