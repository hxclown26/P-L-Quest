'use strict';

// What each answer does to the P&L must read like its own text: a rebate shows as incentives that go up, a halted
// shipment as lost sales and saved freight, a giveaway discount as sales that rise at the price of incentives. The CFO
// read the first Demo 5 and found answers whose lines moved against what they said; these are those, and the lessons of
// the growth answers (a big win at a bad price is a worse business even if the sales grow).

const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/model');
const rules = require('../src/year/rules');
const { PROBLEMS_BY_ID, PROBLEMS } = require('../src/year/problems');
const { effectOf } = require('../src/year/archetypes');

const EPS = 1e-9;
const state = () => ({ meters: rules.START_METERS, oi: rules.PLAN_OI, rescued: false, flags: {}, pace: 1 });

// The P&L after an answer to a problem, from the plan P&L, and how every line moved.
function moved(id, a) {
  const problem = PROBLEMS_BY_ID[id];
  const option = problem.options.find((o) => o.a === a);
  const after = model.applyOps(model.BASE_PL, effectOf(problem, option, state()).ops);
  return { after, change: model.delta(model.BASE_PL, after) };
}

const sign = (value) => (Math.abs(value) < EPS ? 0 : Math.sign(value));

// [problem, answer, { line: +1 (the line goes up) | -1 (it goes down) | 0 (it does not move) }]
const DIRECTIONS = [
  // a rebate to win the renewal: more sales and a rebate that costs; giving in is only the rebate; doing nothing loses sales
  ['m01c', 'smart', { sales: 1, incentives: 1 }],
  ['m01c', 'temp', { sales: 1, incentives: 1 }],
  ['m01c', 'plac', { sales: 0, incentives: 1 }],
  ['m01c', 'ign', { sales: -1, incentives: 0 }],
  // the replacement lot costs product but keeps the client; blaming the transport saves cost and recovers freight
  ['m03c', 'smart', { sales: 1, cost: 1 }],
  ['m03c', 'temp', { cost: -1, freight: -1 }],
  // the client spends less: the balanced answer bills a service for it, the others move sales alone
  ['m04c', 'smart', { sales: 1, direct: 1 }],
  ['m04c', 'plac', { sales: -1 }],
  // the vacancies: payroll saved, production lost; overtime: sales held, labor cost up
  ['m04p', 'ign', { sales: -1, cost: -1 }],
  ['m04p', 'temp', { sales: 1, cost: 1 }],
  // the rebate that does not freeze purchases: the three hotels' answers
  ['m05e', 'smart', { sales: 1, incentives: 1 }],
  ['m05e', 'temp', { sales: 1, incentives: -1 }],
  ['m05e', 'plac', { incentives: 1 }],
  // the giveaway discounts: sales up, paid with incentives
  ['m09e', 'temp', { sales: 1, incentives: 1 }],
  ['m10s', 'temp', { sales: 1, incentives: 1 }],
  // a halted shipment loses sales and saves the freight
  ['m02e', 'ign', { sales: -1, freight: -1 }],
  ['m07e', 'ign', { sales: -1, freight: -1 }],
  // the route that costs: sales kept, freight up
  ['m02e', 'smart', { sales: 1, freight: 1 }],
  ['m12e', 'plac', { freight: 1 }],
];

test('the lines an answer moves go the way its text says', () => {
  for (const [id, a, expected] of DIRECTIONS) {
    const { change } = moved(id, a);
    for (const [line, direction] of Object.entries(expected)) {
      assert.equal(sign(change[line]), direction, `${id} ${a}: ${line} moved ${change[line]}`);
    }
  }
});

test('the lines that matter exist: every answer moves something and a mix does not hide a line that cancels out', () => {
  for (const problem of PROBLEMS) {
    for (const option of problem.options) {
      const { after } = moved(problem.id, option.a);
      assert.notDeepEqual(after, model.BASE_PL, `${problem.id} ${option.a}: moves nothing`);
    }
  }
});

// ---- the lessons of the growth answers

test('winning a tender at the lowest price is a big business and a terrible one: sales grow, margin and OI money fall', () => {
  const { after } = moved('m08c', 'plac');
  assert.ok(model.salesGrowth(after) >= 5, `sales grow ${model.salesGrowth(after)}%`);
  assert.ok(model.operatingMargin(after) <= rules.PLAN_OI - 1, 'the margin loses a full point');
  assert.ok(model.operatingIncome(after) < model.operatingIncome(model.BASE_PL), 'and the OI itself is smaller');
});

test('a growth answer that gives away price for volume is worse than the balanced one even when it sells more', () => {
  for (const id of ['m06c', 'm08c', 'm09c']) {
    const smart = moved(id, 'smart').after;
    const concede = moved(id, 'plac').after;
    assert.ok(model.operatingMargin(concede) < model.operatingMargin(smart), `${id}: giving in leaves a lower margin`);
  }
  const volume = (id, a) => model.salesGrowth(moved(id, a).after);
  assert.ok(volume('m08c', 'plac') > volume('m08c', 'smart'), 'the tender at any price sells the most');
  assert.ok(volume('m09c', 'plac') > volume('m09c', 'ign'));
});

test('doing nothing in a growth problem loses volume: sales fall below the plan', () => {
  for (const id of ['m06c', 'm08c', 'm09c', 'm12c']) {
    assert.ok(model.salesGrowth(moved(id, 'ign').after) < 0, `${id}: the sales that were at stake leave`);
  }
});

test('the shortcut of a growth problem raises the OI now, the balanced one a little', () => {
  for (const id of ['m06c', 'm08c', 'm09c', 'm12c']) {
    const temp = model.operatingMargin(moved(id, 'temp').after);
    const smart = model.operatingMargin(moved(id, 'smart').after);
    assert.ok(temp > smart, `${id}: the shortcut pays more today`);
    assert.ok(smart >= rules.PLAN_OI - 0.1, `${id}: and the balanced answer does not lose margin`);
  }
});

test('six red lines, all of them shortcuts, and they are the breaches a CFO would not forgive', () => {
  const red = PROBLEMS.filter((problem) => problem.options.some((option) => option.redLine)).map((problem) => problem.id);
  assert.deepEqual(red, ['m01e', 'm02s', 'm05p', 'm06p', 'm12p', 'm12s']);
  PROBLEMS.forEach((problem) => problem.options.filter((option) => option.redLine).forEach((option) => assert.equal(option.a, 'temp')));
});
