'use strict';

// The game as a state machine. A "run" is an immutable snapshot: every function returns a
// new run and never modifies the one it receives. The UI only reads run.phase and calls
// next / playCard / retry.
//
// Phases: floorIntro -> turn -> turnResult -> (turn ...) -> floorOutro -> [control] ->
//         floorIntro ... -> final.  Any move can end in 'dead'.

const { BASE_PL, applyOps, operatingMargin, delta } = require('./model');
const { CARDS } = require('./content/cards');
const { FLOORS, CONTROL_AFTER } = require('./content/floors');
const { buildAutopsy } = require('./autopsy');
const { mulberry32, shuffle, nextSeed } = require('./rng');

const TURNS_PER_FLOOR = 3;
const HAND_SIZE = 4;
const MIN_OI = 10;
const GOAL_OI = 15;
const START_FLAGS = Object.freeze({ scanned: false, valueMeasured: false });

// The life bar is the OI margin: OI as a percentage of net sales.
const oiOf = (run) => operatingMargin(run.pl);
const isDead = (run) => oiOf(run) <= 0;

const die = (run) => ({ ...run, phase: 'dead', autopsy: buildAutopsy(run) });

const freshRun = (seed) => ({
  seed,
  phase: 'floorIntro',
  floorIdx: 0,
  turn: 0,
  pl: BASE_PL,
  flags: START_FLAGS,
  played: [],
  entries: [],
  deferred: [],
  hand: [],
  entry: null,
  last: null,
  room: null,
  checkpoint: null,
  attempt: 1,
});

// Applies bills deferred from earlier floors, then the floor's own shock.
function enterFloor(run, idx) {
  const floor = FLOORS[idx];
  const due = run.deferred.filter((d) => d.floorIdx === idx);
  const afterDeferred = due.reduce((pl, d) => applyOps(pl, d.ops), run.pl);
  const afterShock = applyOps(afterDeferred, floor.startOps);
  const entry = {
    floorIdx: idx,
    fromCards: due.map((d) => d.cardId),
    deferredOi: operatingMargin(afterDeferred) - operatingMargin(run.pl),
    shockOi: operatingMargin(afterShock) - operatingMargin(afterDeferred),
  };
  const next = {
    ...run,
    phase: 'floorIntro',
    floorIdx: idx,
    turn: 0,
    pl: afterShock,
    deferred: run.deferred.filter((d) => d.floorIdx !== idx),
    hand: [],
    entry,
    entries: [...run.entries, entry],
    last: null,
    room: null,
  };
  return isDead(next) ? die(next) : next;
}

// Without a seed the cards of every turn come in their authored positions (tests, balance);
// with one they are shuffled, so a second game does not repeat the first.
const newRun = (seed = null) => enterFloor(freshRun(seed), 0);

const isEligible = (card, run, playedIds) =>
  !playedIds.has(card.id) &&
  card.requires.every((flag) => run.flags[flag] === true) &&
  card.excludes.every((flag) => run.flags[flag] !== true);

// Cards change position (never the cards) with a seed derived from the run's, the floor, the
// turn and the attempt, so a retry deals them again in a new arrangement.
const dealSeed = (run) => nextSeed(run.seed + (run.floorIdx * TURNS_PER_FLOOR + run.turn) * 7919 + run.attempt * 104729);
const arrange = (run, hand) => (run.seed === null ? hand : shuffle(hand, mulberry32(dealSeed(run))));

// First four eligible cards from this turn's list, topped up from the floor's pool.
function buildHand(run) {
  const floor = FLOORS[run.floorIdx];
  const playedIds = new Set(run.played.map((p) => p.cardId));
  const ordered = [...floor.turns[run.turn], ...floor.pool];
  return arrange(run, ordered
    .filter((id, i) => ordered.indexOf(id) === i)
    .filter((id) => isEligible(CARDS[id], run, playedIds))
    .slice(0, HAND_SIZE));
}

function startTurn(run, turn) {
  const dealt = { ...run, phase: 'turn', turn };
  return { ...dealt, hand: buildHand(dealt) };
}

function afterOutro(run) {
  const room = CONTROL_AFTER[FLOORS[run.floorIdx].id];
  if (room) {
    const control = { ...run, phase: 'control', room, checkpoint: null };
    return { ...control, checkpoint: control };
  }
  return run.floorIdx + 1 < FLOORS.length
    ? enterFloor(run, run.floorIdx + 1)
    : { ...run, phase: 'final' };
}

function next(run) {
  switch (run.phase) {
    case 'floorIntro':
      return startTurn(run, 0);
    case 'turnResult':
      return run.turn + 1 < TURNS_PER_FLOOR
        ? startTurn(run, run.turn + 1)
        : { ...run, phase: 'floorOutro' };
    case 'floorOutro':
      return afterOutro(run);
    case 'control':
      return enterFloor(run, run.floorIdx + 1);
    default:
      return run;
  }
}

function playCard(run, cardId) {
  if (run.phase !== 'turn') throw new Error(`Cannot play a card in phase ${run.phase}`);
  if (!run.hand.includes(cardId)) throw new Error(`Card ${cardId} is not in hand`);
  const card = CARDS[cardId];
  const pl = applyOps(run.pl, card.ops);
  const entry = {
    floorIdx: run.floorIdx,
    turn: run.turn,
    cardId,
    hand: run.hand,
    oiBefore: oiOf(run),
    oiAfter: operatingMargin(pl),
    delta: delta(run.pl, pl),
  };
  const played = {
    ...run,
    pl,
    phase: 'turnResult',
    last: entry,
    flags: card.grants.reduce((flags, grant) => ({ ...flags, [grant]: true }), run.flags),
    deferred: [
      ...run.deferred,
      ...card.later.map((l) => ({ floorIdx: l.floor - 1, ops: l.ops, cardId })),
    ],
    played: [...run.played, entry],
  };
  return isDead(played) ? die(played) : played;
}

// Restarts from the last control room, or from floor 1 if none was reached.
function retry(run) {
  const attempt = run.attempt + 1;
  if (run.checkpoint) return { ...run.checkpoint, checkpoint: run.checkpoint, attempt };
  return { ...newRun(run.seed), attempt };
}

function starsFor(run) {
  if (run.phase === 'dead') return 0;
  const value = oiOf(run);
  if (value <= 0) return 0;
  const reachedGoal = value >= GOAL_OI && run.flags.scanned === true;
  return 1 + (value >= MIN_OI ? 1 : 0) + (reachedGoal ? 1 : 0);
}

// Immediate OI effect of a card, ignoring bills it defers to later floors.
const previewDelta = (run, cardId) => delta(run.pl, applyOps(run.pl, CARDS[cardId].ops));

module.exports = {
  TURNS_PER_FLOOR,
  HAND_SIZE,
  MIN_OI,
  GOAL_OI,
  newRun,
  enterFloor,
  next,
  playCard,
  retry,
  starsFor,
  previewDelta,
  oiOf,
};
