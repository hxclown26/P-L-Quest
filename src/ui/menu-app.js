'use strict';

// Reducer for the screens before play: the mode menu, the year introduction and the list of
// endings to watch. Starting a mode only changes the scene; the play reducers take over.

const engine = require('../year/engine');
const { showcaseRun } = require('../year/showcase');
const { nextGameCode, parseCode } = require('../rng');
const layout = require('./layout');
const { menuItems, PROFILE_ITEMS } = require('./year-view');
const { verdictEffects } = require('./year-app');
const { sfx, music, result, moved, listMove, selectIndex } = require('./shared');

const SCENE_FOR_MODE = Object.freeze({ year: 'yearIntro', half: 'yearIntro', tutorial: 'intro', endings: 'endings', workshop: 'workshop' });
const HALF_YEAR_MONTHS = 6;
const FULL_YEAR_MONTHS = 12;
const LISTS = Object.freeze({
  menu: { field: 'menuIdx', count: (app) => menuItems(app).length, hit: (app, x, y) => layout.hitMenuRow(x, y, menuItems(app).length) },
  endings: { field: 'profileIdx', count: () => PROFILE_ITEMS.length, hit: (app, x, y) => layout.hitProfileRow(x, y) },
});

const CODE_LENGTH = 4;
const DIGIT = /^digit(\d)$/;

const go = (app, scene) => result(moved(app, { scene, cursor: 0, codeEntry: '' }), [sfx('select')]);

// The half year is the same intro and the same year, six months long.
function openMode(app) {
  const mode = menuItems(app)[app.menuIdx];
  const months = mode === 'half' ? HALF_YEAR_MONTHS : FULL_YEAR_MONTHS;
  return result(moved(app, { scene: SCENE_FOR_MODE[mode], cursor: 0, months }), [sfx('confirm')]);
}

const startYear = (app) => result(
  moved(app, { scene: 'year', year: engine.newYear(app.seed, app.months), sim: false, yearT: 0, cursor: 0, page: 0, codeEntry: '', seed: nextGameCode(app.seed) }),
  [sfx('confirm'), music('play')],
);

// Plays the pinned simulated year of the chosen play style and jumps to its verdict.
function showEnding(app) {
  const year = showcaseRun(app.profileIdx);
  const shown = { ...app, sim: true };
  return result(moved(shown, { scene: 'year', year, cursor: 0, page: 0 }), verdictEffects(shown, year));
}

// Four typed digits fix the code of the year, so a whole room can play the same one.
function typeDigit(app, digit) {
  const entry = `${app.codeEntry}${digit}`;
  if (entry.length < CODE_LENGTH) return result({ ...app, codeEntry: entry }, [sfx('select')]);
  return result({ ...app, codeEntry: '', seed: parseCode(entry) }, [sfx('confirm')]);
}

const eraseDigit = (app) => (app.codeEntry ? result({ ...app, codeEntry: app.codeEntry.slice(0, -1) }, [sfx('select')]) : result(app));

const CONFIRM = Object.freeze({ menu: openMode, yearIntro: startYear, endings: showEnding });
const BACK = Object.freeze({ menu: 'title', yearIntro: 'menu', endings: 'menu' });

// A code that is only partly typed must be finished or erased before the year can start.
const confirm = (app) => (app.scene === 'yearIntro' && app.codeEntry ? result(app) : CONFIRM[app.scene](app));

function key(app, pressed) {
  if (app.scene === 'yearIntro') {
    const digit = DIGIT.exec(pressed);
    if (digit) return typeDigit(app, digit[1]);
    if (pressed === 'delete') return eraseDigit(app);
  }
  if (pressed === 'confirm') return confirm(app);
  if (pressed === 'back') return go(app, BACK[app.scene]);
  if (pressed === 'note' && app.scene === 'yearIntro') return result({ ...app, overlay: 'rules', rulesPage: 0 }, [sfx('select')]);
  const list = LISTS[app.scene];
  if (list && (pressed === 'up' || pressed === 'down')) {
    return selectIndex(app, list.field, listMove(app[list.field], pressed, list.count(app)));
  }
  return result(app);
}

function tap(app, x, y) {
  const list = LISTS[app.scene];
  if (!list) return confirm(app);
  const index = list.hit(app, x, y);
  if (index < 0) return result(app);
  return index === app[list.field] ? confirm(app) : selectIndex(app, list.field, index);
}

function hover(app, x, y) {
  const list = LISTS[app.scene];
  const index = list ? list.hit(app, x, y) : -1;
  return index < 0 ? result(app) : selectIndex(app, list.field, index);
}

const tick = (app) => result(app);

module.exports = { key, tap, hover, tick };
