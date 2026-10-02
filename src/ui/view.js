'use strict';

// Pure helpers that turn a run into what the screens show: card chips and the short messages
// after each move. No drawing here, so all of it is unit tested.

const { CARDS } = require('../content/cards');
const { FLOORS } = require('../content/floors');
const { tierFor, tierDirection } = require('../tiers');
const { tx, num, signed } = require('./tx');

const NEGLIGIBLE = 0.05;

// The levers a card touches, with the direction each lever moves. Never the effect on OI.
function chipsFor(card) {
  const fromOps = card.ops.map((op) => {
    if (op.op === 'price') return { key: 'chip.price', dir: Math.sign(op.pct) };
    if (op.op === 'volume') return { key: 'chip.volume', dir: Math.sign(op.pct) };
    return { key: `line.short.${op.line}`, dir: Math.sign(op.pts) };
  });
  const unlock = card.grants.length > 0 ? [{ key: 'chip.unlock', dir: 0 }] : [];
  const shift = card.later.length > 0 ? [{ key: 'chip.shift', dir: 0 }] : [];
  return [...fromOps, ...unlock, ...shift];
}

const toneOf = (value) => {
  if (value > NEGLIGIBLE) return 'green';
  if (value < -NEGLIGIBLE) return 'red';
  return 'white';
};

function tierLine(app, last) {
  const direction = tierDirection(tierFor(last.oiBefore), tierFor(last.oiAfter));
  if (direction === 'up') return [{ text: tx(app, 'ui.tierUp'), tone: 'gold' }];
  if (direction === 'down') return [{ text: tx(app, 'ui.tierDown'), tone: 'orange' }];
  return [];
}

function revealLines(app) {
  const { last } = app.run;
  const card = CARDS[last.cardId];
  const change = Math.abs(last.delta.oi) < NEGLIGIBLE
    ? tx(app, 'ui.noChange')
    : tx(app, 'ui.oiChange', {
      from: num(app, last.oiBefore),
      to: num(app, last.oiAfter),
      delta: signed(app, last.delta.oi),
    });
  return [
    { text: tx(app, 'ui.played', { card: tx(app, `card.${card.id}.name`) }), tone: 'white' },
    { text: change, tone: toneOf(last.delta.oi) },
    ...card.later.map((l) => ({ text: tx(app, 'ui.shift', { n: l.floor }), tone: 'cyan' })),
    ...(card.grants.includes('scanned') ? [{ text: tx(app, 'ui.scanDone'), tone: 'green' }] : []),
    ...(card.grants.includes('valueMeasured') ? [{ text: tx(app, 'ui.measuredDone'), tone: 'green' }] : []),
    ...tierLine(app, last),
  ];
}

// What hit the factory as the floor began: bills from earlier choices and the floor shock.
function entryLines(app) {
  const { entry } = app.run;
  if (!entry) return [];
  const deferred = Math.abs(entry.deferredOi) >= NEGLIGIBLE
    ? [{ text: tx(app, 'ui.entryDeferred', { delta: signed(app, entry.deferredOi) }), tone: toneOf(entry.deferredOi) }]
    : [];
  const shock = Math.abs(entry.shockOi) >= NEGLIGIBLE
    ? [{ text: tx(app, 'ui.entryShock', { delta: signed(app, entry.shockOi) }), tone: toneOf(entry.shockOi) }]
    : [];
  return [...deferred, ...shock];
}

function noteKeys(app) {
  const { run } = app;
  if (run.phase === 'control') return { title: `room.${run.room}.title`, body: `room.${run.room}.body` };
  if (run.phase === 'final') return { title: 'note.6.title', body: 'note.6.body' };
  const id = FLOORS[run.floorIdx].id;
  return { title: `note.${id}.title`, body: `note.${id}.body` };
}

function autopsyLines(app) {
  const { autopsy, checkpoint } = app.run;
  const name = (id) => tx(app, `card.${id}.name`);
  const biggest = autopsy.biggestLine
    ? [tx(app, 'ui.autopsyBiggest', { line: tx(app, `line.${autopsy.biggestLine}`) })]
    : [];
  const worst = autopsy.worst
    ? [tx(app, 'ui.autopsyWorst', {
      floor: autopsy.worst.floor,
      turn: autopsy.worst.turn,
      chosen: name(autopsy.worst.chosen),
      best: name(autopsy.worst.best),
    })]
    : [];
  return [...biggest, ...worst, checkpoint ? tx(app, 'ui.retryRoom') : tx(app, 'ui.retryStart')];
}

// Three takeaways for the final screen, chosen by what the player actually did.
function lessons(app) {
  const { flags, played } = app.run;
  const measured = flags.scanned ? tx(app, 'lesson.measured') : tx(app, 'lesson.unmeasured');
  const shifted = played.some((p) => p.cardId === 'freight')
    ? tx(app, 'lesson.shifted')
    : tx(app, 'lesson.cts');
  return [measured, shifted, tx(app, 'lesson.fixed')];
}

// The P&L as it was before the last card, rebuilt from the stored line deltas.
const plBefore = (run) => ({
  sales: run.pl.sales - run.last.delta.sales,
  incentives: run.pl.incentives - run.last.delta.incentives,
  cost: run.pl.cost - run.last.delta.cost,
  serve: run.pl.serve - run.last.delta.serve,
  sga: run.pl.sga - run.last.delta.sga,
});

// Net OI movement on the current floor: the shock and bills on arrival plus the cards played.
function floorImpact(run) {
  const entry = run.entries.find((e) => e.floorIdx === run.floorIdx);
  const arrival = entry ? entry.deferredOi + entry.shockOi : 0;
  return run.played
    .filter((p) => p.floorIdx === run.floorIdx)
    .reduce((sum, p) => sum + p.delta.oi, arrival);
}

module.exports = {
  plBefore,
  floorImpact,
  chipsFor,
  revealLines,
  entryLines,
  noteKeys,
  autopsyLines,
  lessons,
  toneOf,
};
