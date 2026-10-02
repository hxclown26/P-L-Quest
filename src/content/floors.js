'use strict';

const { deepFreeze } = require('../freeze');
const { CARD_LIST } = require('./cards');

// Each floor is one P&L line and one boss. "turns" lists candidate cards per turn in
// display order; the engine deals the first four that are eligible, then falls back to the
// rest of the pool. startOps is the shock that lands as the floor begins.

const add = (line, pts) => ({ op: 'add', line, pts });
const volume = (pct) => ({ op: 'volume', pct });

const poolOf = (floorId) =>
  Object.freeze(CARD_LIST.filter((card) => card.floor === floorId).map((card) => card.id));

const floor = (def) => deepFreeze({ startOps: [], ...def, pool: poolOf(def.id) });

const FLOORS = Object.freeze([
  floor({
    id: 1,
    line: 'sales',
    boss: 'order',
    turns: [
      ['raise', 'listPrice', 'discount', 'chase'],
      ['discount', 'bundle', 'chase', 'forecast', 'listPrice', 'raise'],
      ['chase', 'raise', 'forecast', 'discount', 'bundle', 'listPrice'],
    ],
  }),
  floor({
    id: 2,
    line: 'incentives',
    boss: 'rebate',
    turns: [
      ['give3', 'hold', 'freight', 'scan'],
      ['measured', 'giveHalf', 'walkAway', 'scan', 'give3', 'hold', 'freight'],
      ['contract3y', 'measured', 'giveHalf', 'hold', 'give3', 'freight', 'walkAway', 'scan'],
    ],
  }),
  floor({
    id: 3,
    line: 'cost',
    boss: 'cost',
    startOps: [add('cost', 4)],
    turns: [
      ['absorb', 'passValue', 'passLight', 'renegotiate', 'swapInput', 'hedge', 'stockUp'],
      ['passValue', 'swapInput', 'passLight', 'hedge', 'renegotiate', 'stockUp', 'absorb'],
      ['renegotiate', 'stockUp', 'passValue', 'passLight', 'swapInput', 'hedge', 'absorb'],
    ],
  }),
  floor({
    id: 4,
    line: 'serve',
    boss: 'truck',
    turns: [
      ['acceptAll', 'routeOpt', 'remote', 'fee', 'comodatoReview', 'billExtras', 'ignore'],
      ['fee', 'ignore', 'remote', 'routeOpt', 'comodatoReview', 'billExtras', 'acceptAll'],
      ['routeOpt', 'remote', 'fee', 'billExtras', 'comodatoReview', 'ignore', 'acceptAll'],
    ],
  }),
  floor({
    id: 5,
    line: 'sga',
    boss: 'fixed',
    startOps: [volume(-8)],
    turns: [
      ['freeze', 'restructure', 'hireGrowth', 'keep', 'trimTravel', 'priceSmall'],
      ['hireGrowth', 'trimTravel', 'restructure', 'priceSmall', 'freeze', 'keep'],
      ['keep', 'trimTravel', 'freeze', 'priceSmall', 'restructure', 'hireGrowth'],
    ],
  }),
]);

// A control room follows these floors; the game is saved there.
const CONTROL_AFTER = Object.freeze({ 3: 'cm', 4: 'gp' });

module.exports = { FLOORS, CONTROL_AFTER };
