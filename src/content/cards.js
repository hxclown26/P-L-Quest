'use strict';

const { deepFreeze } = require('../freeze');

// Card data only: effects live here, wording lives in content/es.js and content/en.js.
// "later" ops land when the named floor starts: the concession did not vanish, it moved.
// "worth" overrides the computed value for cards whose payoff is unlocking other cards.

const AREAS = Object.freeze(['sales', 'procurement', 'ops', 'finance', 'mgmt']);
const FLAGS = Object.freeze(['scanned', 'valueMeasured']);

const price = (pct) => ({ op: 'price', pct });
const volume = (pct) => ({ op: 'volume', pct });
const add = (line, pts) => ({ op: 'add', line, pts });
const later = (floor, ...ops) => ({ floor, ops });

const define = (def) =>
  deepFreeze({ ops: [], later: [], grants: [], requires: [], excludes: [], ...def });

const CARD_LIST = Object.freeze([
  // Floor 1: Sales (the opening move)
  define({ id: 'raise', floor: 1, area: 'sales', rating: 'good', ops: [price(1.5), volume(-1.5)] }),
  define({ id: 'listPrice', floor: 1, area: 'sales', rating: 'ok' }),
  define({ id: 'discount', floor: 1, area: 'sales', rating: 'bad', ops: [price(-3), volume(6)] }),
  define({ id: 'chase', floor: 1, area: 'sales', rating: 'bad', ops: [volume(3), add('serve', 1.5)] }),
  define({ id: 'bundle', floor: 1, area: 'sales', rating: 'good', ops: [price(1), add('serve', 0.5)] }),
  define({ id: 'forecast', floor: 1, area: 'sales', rating: 'good', ops: [add('serve', -0.4)] }),

  // Floor 2: Incentives (the negotiation room)
  define({ id: 'give3', floor: 2, area: 'sales', rating: 'bad', ops: [add('incentives', 3)] }),
  define({ id: 'hold', floor: 2, area: 'sales', rating: 'ok', ops: [volume(-5)] }),
  define({ id: 'freight', floor: 2, area: 'sales', rating: 'bad', later: [later(4, add('serve', 2.5))] }),
  define({ id: 'scan', floor: 2, area: 'finance', rating: 'good', grants: ['scanned'], worth: 2 }),
  define({
    id: 'measured',
    floor: 2,
    area: 'sales',
    rating: 'good',
    requires: ['scanned'],
    grants: ['valueMeasured'],
    ops: [add('incentives', 0.5)],
    worth: 1.5,
  }),
  define({ id: 'giveHalf', floor: 2, area: 'sales', rating: 'bad', ops: [add('incentives', 1.5)] }),
  define({ id: 'walkAway', floor: 2, area: 'mgmt', rating: 'bad', ops: [volume(-15)] }),
  define({ id: 'contract3y', floor: 2, area: 'sales', rating: 'good', requires: ['valueMeasured'], ops: [price(1)] }),

  // Floor 3: Cost (the supplier raised the input)
  define({ id: 'absorb', floor: 3, area: 'procurement', rating: 'bad' }),
  define({ id: 'passLight', floor: 3, area: 'sales', rating: 'ok', excludes: ['valueMeasured'], ops: [price(2.5), volume(-4)] }),
  define({ id: 'passValue', floor: 3, area: 'sales', rating: 'good', requires: ['valueMeasured'], ops: [price(2.5), volume(-0.5)] }),
  define({ id: 'renegotiate', floor: 3, area: 'procurement', rating: 'good', ops: [add('cost', -1.2)] }),
  define({
    id: 'swapInput',
    floor: 3,
    area: 'procurement',
    rating: 'ok',
    ops: [add('cost', -1.5)],
    later: [later(4, add('serve', 0.8))],
  }),
  define({ id: 'stockUp', floor: 3, area: 'procurement', rating: 'ok', ops: [add('cost', -1)] }),
  define({ id: 'hedge', floor: 3, area: 'procurement', rating: 'ok', ops: [add('cost', -0.8)] }),

  // Floor 4: Cost to serve (dispatch and field)
  define({ id: 'acceptAll', floor: 4, area: 'sales', rating: 'bad', ops: [add('serve', 3.5)] }),
  define({ id: 'routeOpt', floor: 4, area: 'ops', rating: 'good', ops: [add('serve', -0.8)] }),
  define({ id: 'remote', floor: 4, area: 'ops', rating: 'good', ops: [add('serve', -1.2)] }),
  define({ id: 'fee', floor: 4, area: 'finance', rating: 'good', requires: ['valueMeasured'], ops: [price(0.8)] }),
  define({ id: 'comodatoReview', floor: 4, area: 'finance', rating: 'good', ops: [add('serve', -0.6)] }),
  define({ id: 'ignore', floor: 4, area: 'mgmt', rating: 'bad' }),
  define({ id: 'billExtras', floor: 4, area: 'sales', rating: 'ok', ops: [price(0.5)] }),

  // Floor 5: SG&A (offices)
  define({ id: 'freeze', floor: 5, area: 'mgmt', rating: 'good', ops: [add('sga', -1.2)] }),
  define({ id: 'trimTravel', floor: 5, area: 'finance', rating: 'good', ops: [add('sga', -0.8)] }),
  define({ id: 'restructure', floor: 5, area: 'mgmt', rating: 'good', ops: [add('sga', -2.5), volume(-2)] }),
  define({ id: 'hireGrowth', floor: 5, area: 'mgmt', rating: 'bad', ops: [add('sga', 2), volume(3)] }),
  define({ id: 'keep', floor: 5, area: 'mgmt', rating: 'bad' }),
  define({ id: 'priceSmall', floor: 5, area: 'sales', rating: 'ok', ops: [price(1), volume(-1)] }),
]);

const CARDS = Object.freeze(Object.fromEntries(CARD_LIST.map((card) => [card.id, card])));

module.exports = { AREAS, FLAGS, CARD_LIST, CARDS };
