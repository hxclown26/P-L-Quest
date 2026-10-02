'use strict';

// Reducer for the 5-floor tutorial (the first demo): its intro screen and the floors played
// card by card. Each handler returns { app, effects } like the rest of the UI.

const engine = require('../engine');
const { tierFor } = require('../tiers');
const { nextGameCode } = require('../rng');
const layout = require('./layout');
const { sfx, music, result, moved, isArrow, listMove, selectIndex, leaveTo } = require('./shared');

// Effects that follow a change of run phase (arriving at the final screen or dying).
function arrival(run) {
  if (run.phase === 'final') {
    return [{ type: 'save', patch: { bestStars: engine.starsFor(run) } }, sfx('star'), music('title')];
  }
  if (run.phase === 'dead') return [sfx('death'), music('off')];
  return [sfx('select')];
}

function advance(app) {
  const run = engine.next(app.run);
  return result(moved(app, { run, cursor: 0 }), arrival(run));
}

function soundFor(after) {
  if (after.phase === 'dead') return sfx('death');
  const change = after.last.delta.oi;
  const tierChanged = tierFor(after.last.oiBefore) !== tierFor(after.last.oiAfter);
  if (tierChanged && change > 0) return sfx('tier');
  if (change > 0.05) return sfx('good');
  if (change < -0.05) return sfx('bad');
  return sfx('confirm');
}

function playSelected(app) {
  const id = app.run.hand[app.cursor];
  const run = engine.playCard(app.run, id);
  const effects = run.phase === 'dead' ? [soundFor(run), music('off')] : [soundFor(run)];
  return result(moved(app, { run, cursor: 0 }), effects);
}

const startRun = (app) => {
  const run = engine.newRun(app.seed);
  return result(
    moved(app, { scene: 'play', run, cursor: 0, overlay: null, seed: nextGameCode(app.seed) }),
    [sfx('confirm'), music('play')],
  );
};

function confirmPlay(app) {
  switch (app.run.phase) {
    case 'turn':
      return playSelected(app);
    case 'final':
      return startRun(app);
    case 'dead': {
      const run = engine.retry(app.run);
      return result(moved(app, { run, cursor: 0 }), [sfx('confirm'), music('play')]);
    }
    default:
      return advance(app);
  }
}

const confirm = (app) => (app.scene === 'intro' ? startRun(app) : confirmPlay(app));

function back(app) {
  if (app.scene === 'intro' || ['final', 'dead'].includes(app.run.phase)) return leaveTo(app, 'menu');
  return result({ ...app, overlay: 'quit' }, [sfx('select')]);
}

const turning = (app) => app.scene === 'play' && app.run.phase === 'turn';

function move(app, pressed) {
  if (!turning(app)) return result(app);
  return selectIndex(app, 'cursor', listMove(app.cursor, pressed, app.run.hand.length));
}

function key(app, pressed) {
  if (pressed === 'confirm') return confirm(app);
  if (pressed === 'back') return back(app);
  if (pressed === 'note') return app.scene === 'play' ? result({ ...app, overlay: 'note' }, [sfx('select')]) : result(app);
  if (isArrow(pressed)) return move(app, pressed);
  return result(app);
}

function tap(app, x, y) {
  if (!turning(app)) return confirm(app);
  const index = layout.hitAnswer(x, y, app.run.hand.length);
  if (index < 0) return result(app);
  return index === app.cursor ? confirm(app) : selectIndex(app, 'cursor', index);
}

function hover(app, x, y) {
  if (!turning(app)) return result(app);
  const index = layout.hitAnswer(x, y, app.run.hand.length);
  if (index < 0) return result(app);
  return selectIndex(app, 'cursor', index);
}

const tick = (app) => result(app);

module.exports = { key, tap, hover, tick };
