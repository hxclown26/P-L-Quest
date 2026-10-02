'use strict';

const { BASE_PL, applyOps, operatingMargin } = require('./model');
const { CARDS } = require('./content/cards');
const { FLOORS } = require('./content/floors');

const oiGain = (ops) => operatingMargin(applyOps(BASE_PL, ops)) - operatingMargin(BASE_PL);

// What a card is worth over the whole run: its own effect plus the costs it defers.
function cardWorth(card) {
  if (typeof card.worth === 'number') return card.worth;
  return oiGain(card.ops) + card.later.reduce((sum, l) => sum + oiGain(l.ops), 0);
}

// Net OI movement per floor: shocks, deferred bills and the cards played there.
function floorImpacts(run) {
  const events = [
    ...run.entries.map((e) => ({ floorIdx: e.floorIdx, oi: e.deferredOi + e.shockOi })),
    ...run.played.map((p) => ({ floorIdx: p.floorIdx, oi: p.delta.oi })),
  ];
  return events.reduce((acc, e) => ({ ...acc, [e.floorIdx]: (acc[e.floorIdx] || 0) + e.oi }), {});
}

function biggestBite(run) {
  const impacts = Object.entries(floorImpacts(run)).map(([idx, oi]) => ({ floorIdx: Number(idx), oi }));
  if (impacts.length === 0) return null;
  return impacts.reduce((worst, next) => (next.oi < worst.oi ? next : worst));
}

function bestInHand(hand) {
  return hand.reduce((best, id) => (cardWorth(CARDS[id]) > cardWorth(CARDS[best]) ? id : best), hand[0]);
}

function costliestChoice(run) {
  const choices = run.played.map((p) => {
    const best = bestInHand(p.hand);
    return { entry: p, best, regret: cardWorth(CARDS[best]) - cardWorth(CARDS[p.cardId]) };
  });
  const worst = choices.reduce((acc, c) => (acc === null || c.regret > acc.regret ? c : acc), null);
  if (!worst || worst.regret <= 0) return null;
  return {
    floor: FLOORS[worst.entry.floorIdx].id,
    turn: worst.entry.turn + 1,
    chosen: worst.entry.cardId,
    best: worst.best,
  };
}

function buildAutopsy(run) {
  const bite = biggestBite(run);
  return {
    biggestLine: bite ? FLOORS[bite.floorIdx].line : null,
    biggestFloor: bite ? FLOORS[bite.floorIdx].id : null,
    worst: costliestChoice(run),
  };
}

module.exports = { buildAutopsy, cardWorth };
