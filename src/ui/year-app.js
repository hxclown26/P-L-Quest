'use strict';

// Year-mode reducer: the answer cursor, the result / month-close / rescue screens, the
// verdict and GAME OVER. Each handler returns { app, effects } like the rest of the UI.

const engine = require('../year/engine');
const { decisionsOf } = require('../year/replay');
const { encode } = require('../year/result-code');
const layout = require('./layout');
const { rankOf, slotOf, briefing, briefChars } = require('./year-view');
const { typedChars, TYPE_RATE } = require('./anim');
const { sfx, music, result, moved, isArrow, listMove, selectIndex, leaveTo } = require('./shared');

const VERDICT_IDLE = 90;
const OVER_SECONDS = 10;
const ANSWERS = 4;
const CELEBRATE_FROM = rankOf('fair');
const ANSWER_SOUND = Object.freeze({ smart: 'good', temp: 'bad', plac: 'confirm', ign: 'bad' });

// A simulated ending (from the endings list), a workshop game or a half year never touches the saved
// best year: it is the best full year.
function verdictEffects(app, run) {
  const rank = rankOf(run.outcome);
  const celebrate = rank >= CELEBRATE_FROM;
  const save = app.sim || app.workshop || run.months !== 12 ? [] : [{ type: 'save', patch: { bestYear: rank } }];
  return [...save, sfx(celebrate ? 'star' : 'death'), music(celebrate ? 'title' : 'off')];
}

function arrival(app, run) {
  if (run.phase === 'final') return verdictEffects(app, run);
  if (run.phase === 'rescue' || run.phase === 'shock') return [sfx('bad')];
  if (run.phase === 'over') return [sfx('select'), music('off')];
  return [sfx('select')];
}

const leaveYear = (app) => leaveTo(app, app.workshop ? 'workshop' : app.sim ? 'endings' : 'menu');

function choose(app) {
  const year = engine.choose(app.year, app.cursor);
  return result(moved(app, { year }), [sfx(ANSWER_SOUND[year.last.a])]);
}

// Enter on the brief of a problem shows its answers; while the brief is still typing it finishes the typing first, so a
// double press never skips a brief nobody has read.
const FINISHED = 0.01;
function readBrief(app) {
  if (typedChars(app.phaseT) < briefChars(app)) return result({ ...app, phaseT: briefChars(app) / TYPE_RATE + FINISHED }, [sfx('select')]);
  return result(moved(app, { briefedSlot: slotOf(app.year), cursor: 0 }), [sfx('select')]);
}

// A workshop team's verdict also carries its result code: the whole year in one line.
function withResultCode(app, year) {
  if (!app.workshop || year.phase !== 'final') return app.workshop;
  const { team, code } = app.workshop;
  return { ...app.workshop, result: encode({ name: team, code, choices: decisionsOf(year) }) };
}

function advance(app) {
  const year = engine.next(app.year);
  return result(moved(app, { year, cursor: 0, page: 0, workshop: withResultCode(app, year) }), arrival(app, year));
}

// The verdict has three pages (the numbers, the P&L report against the plan, then what happened
// and what to try next); a workshop team gets a fourth with its result code.
const lastPage = (app) => (app.workshop ? 3 : 2);

function confirm(app) {
  const { phase } = app.year;
  if (phase === 'problem') return briefing(app) ? readBrief(app) : choose(app);
  if (phase === 'over') return leaveYear(app);
  if (phase === 'final' && app.page < lastPage(app)) return result(moved(app, { page: app.page + 1 }), [sfx('select')]);
  return advance(app);
}

// C copies the result code, from the page that shows it onwards.
function copyCode(app) {
  const code = app.workshop && app.workshop.result;
  const showing = app.year.phase === 'over' || (app.year.phase === 'final' && app.page === lastPage(app));
  if (!code || !showing) return result(app);
  return result({ ...app, copiedAt: app.t }, [{ type: 'copy', text: code }, sfx('select')]);
}

function back(app) {
  if (['final', 'over'].includes(app.year.phase)) return leaveYear(app);
  return result({ ...app, overlay: 'quit' }, [sfx('select')]);
}

function move(app, key) {
  if (app.year.phase !== 'problem' || briefing(app)) return result(app);
  return selectIndex(app, 'cursor', listMove(app.cursor, key, ANSWERS));
}

function key(app, pressed) {
  if (pressed === 'confirm') return confirm(app);
  if (pressed === 'back') return back(app);
  if (pressed === 'note') return result({ ...app, overlay: 'rules', rulesPage: 0 }, [sfx('select')]);
  if (pressed === 'copy') return copyCode(app);
  if (isArrow(pressed)) return move(app, pressed);
  return result(app);
}

function tap(app, x, y) {
  if (app.year.phase !== 'problem' || briefing(app)) return confirm(app);
  const index = layout.hitAnswer(x, y);
  if (index < 0) return result(app);
  return index === app.cursor ? confirm(app) : selectIndex(app, 'cursor', index);
}

function hover(app, x, y) {
  if (app.year.phase !== 'problem' || briefing(app)) return result(app);
  const index = layout.hitAnswer(x, y);
  return index < 0 ? result(app) : selectIndex(app, 'cursor', index);
}

// The verdict waits for a key; left alone it moves on to GAME OVER, which restarts the game.
function tick(app) {
  if (app.workshop) return result(app);
  const { phase } = app.year;
  if (phase === 'final' && app.phaseT >= VERDICT_IDLE) return advance(app);
  if (phase === 'over' && app.phaseT >= OVER_SECONDS) return leaveYear(app);
  return result(app);
}

module.exports = { key, tap, hover, tick, verdictEffects, VERDICT_IDLE, OVER_SECONDS };
