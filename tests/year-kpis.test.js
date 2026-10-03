'use strict';

// What a CFO reads next to the margin: how much the business grew against the plan and what the OI is in money. And the
// two ways a year can look good and be bad: growth that earns nothing, and a margin kept by shrinking.

const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/model');
const sim = require('../src/year/simulate');
const { kpis, shapeOf } = require('../src/year/kpis');

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be near ${expected}`);
const after = (...ops) => model.applyOps(model.BASE_PL, ops);

test('the plan has no growth, an OI of 15 million and a margin of 15%', () => {
  const k = kpis(model.BASE_PL);
  near(k.growth, 0);
  near(k.oiMoney, 15);
  near(k.margin, 15);
});

test('growth is the net sales against the plan and the OI money is the OI line of the statement', () => {
  const grown = after({ op: 'volume', pct: 10 });
  const k = kpis(grown);
  near(k.growth, 10);
  near(k.oiMoney, model.operatingIncome(grown));
  near(k.margin, model.operatingMargin(grown));
});

test('selling much more at a bad price is growth without profit: sales up, OI money down', () => {
  const tender = after({ op: 'volume', pct: 9, share: 0.9 }, { op: 'price', pct: -3 });
  assert.ok(kpis(tender).growth >= 5);
  assert.ok(kpis(tender).oiMoney < 15);
  assert.equal(shapeOf(tender), 'growthNoMargin');
});

test('a margin that holds only because the business shrank is margin without growth', () => {
  const shrunk = after({ op: 'volume', pct: -12, share: 0.6 }, { op: 'oi', line: 'cost', pts: 5 });
  assert.ok(kpis(shrunk).growth < 0);
  assert.ok(kpis(shrunk).margin >= 17);
  assert.equal(shapeOf(shrunk), 'marginNoGrowth');
});

test('growth that also earns, a flat year and a collapse have no label', () => {
  assert.equal(shapeOf(model.BASE_PL), null);
  assert.equal(shapeOf(after({ op: 'volume', pct: 8, share: 0.6 }, { op: 'price', pct: 1 })), null, 'sales and OI both up');
  assert.equal(shapeOf(after({ op: 'volume', pct: -30, share: 0.6 })), null, 'a collapse is not a trade-off');
});

test('the styles of play that sell without earning are labelled, the expert is not', () => {
  assert.equal(shapeOf(sim.simulate(sim.PROFILES.pleaser, 1).pl), 'growthNoMargin');
  assert.equal(shapeOf(sim.simulate(sim.PROFILES.expert, 1).pl), null);
  assert.equal(shapeOf(sim.simulate(sim.PROFILES.short, 1).pl), null);
});
