'use strict';

// The UI state machine. reduce(app, action) returns { app, effects }: a new app state plus
// a list of side effects (sounds, saving) for the shell to perform. No drawing and no DOM
// in here, so the whole flow of the game can be tested in Node.
//
// Every scene has a small reducer of its own (title here, menu-app, demo-app, year-app,
// workshop-app); this file routes to the right one and owns what they share: mute, language,
// the overlays, the reviewer switch and the two kinds of text input (typing and pasting).

const layout = require('./layout');
const demo = require('./demo-app');
const menu = require('./menu-app');
const year = require('./year-app');
const workshop = require('./workshop-app');
const { sfx, music, result, moved, leaveTo } = require('./shared');

const createApp = ({ lang, muted, best, bestYear = 0, seed = 1, creator = false }) => ({
  scene: 'title',
  lang,
  muted,
  best,
  bestYear,
  seed,
  months: 12,
  yearT: 0,
  codeEntry: '',
  rulesPage: 0,
  creator,
  run: null,
  year: null,
  sim: false,
  review: false,
  cursor: 0,
  page: 0,
  menuIdx: 0,
  profileIdx: 0,
  workshop: null,
  workshopIdx: 0,
  setup: { name: '', code: '', field: 0, notice: null },
  rank: { teams: [], code: null, view: 0, selected: 0, entry: '', notice: null },
  copiedAt: -10,
  overlay: null,
  t: 0,
  phaseT: 0,
});

const title = {
  key: (app, pressed) => (pressed === 'confirm'
    ? result(moved(app, { scene: 'menu' }), [sfx('confirm'), music('title')])
    : result(app)),
  tap: (app) => title.key(app, 'confirm'),
  hover: (app) => result(app),
  tick: (app) => result(app),
};

const HANDLERS = Object.freeze({
  title,
  menu,
  yearIntro: menu,
  endings: menu,
  intro: demo,
  play: demo,
  year,
  workshop,
  setup: workshop,
  rank: workshop,
});

// The scenes where the letters of the keyboard are text, not commands.
const TEXT_SCENES = Object.freeze(['setup', 'rank']);
const acceptsText = (app) => TEXT_SCENES.includes(app.scene);

function toggleMute(app) {
  const muted = !app.muted;
  return result({ ...app, muted }, [{ type: 'mute', value: muted }, { type: 'save', patch: { muted } }]);
}

function toggleLang(app) {
  const lang = app.lang === 'es' ? 'en' : 'es';
  return result({ ...app, lang }, [{ type: 'save', patch: { lang } }]);
}

// The reviewer sees every answer's hidden effect: it is the creator's tool, so a player's R does
// nothing, and a workshop (where answers are the point) keeps it locked.
const toggleReview = (app) => (app.creator && !app.workshop ? result({ ...app, review: !app.review }, [sfx('select')]) : result(app));

// While an overlay is open it swallows every key; confirm on the quit question leaves.
const RULES_PAGES = 2;
const TURNS = Object.freeze(['left', 'right', 'up', 'down']);

function onOverlayKey(app, pressed) {
  if (app.overlay === 'quit' && pressed === 'confirm') return leaveTo(app, app.workshop ? 'workshop' : 'menu');
  if (app.overlay === 'rules' && TURNS.includes(pressed)) return result({ ...app, rulesPage: (app.rulesPage + 1) % RULES_PAGES }, [sfx('select')]);
  const closes = ['confirm', 'back', 'note'].includes(pressed);
  return closes ? result({ ...app, overlay: null }, [sfx('select')]) : result(app);
}

function onKey(app, pressed) {
  if (pressed === 'mute') return toggleMute(app);
  if (pressed === 'lang') return toggleLang(app);
  if (app.overlay) return onOverlayKey(app, pressed);
  if (pressed === 'review') return toggleReview(app);
  return HANDLERS[app.scene].key(app, pressed);
}

// A stray tap must never confirm leaving the game: on the quit question it counts as "no".
function onTap(app, x, y) {
  const button = layout.hitFooter(x, y);
  if (button) return onKey(app, button);
  if (app.overlay) return onKey(app, app.overlay === 'quit' ? 'back' : 'confirm');
  return HANDLERS[app.scene].tap(app, x, y);
}

const onHover = (app, x, y) => (app.overlay ? result(app) : HANDLERS[app.scene].hover(app, x, y));

// The clock of a game runs from the first problem to the verdict (the rules read in between count).
const PLAYED_PHASES = Object.freeze(['problem', 'result', 'monthClose', 'rescue']);
const playing = (app) => app.scene === 'year' && !app.sim && app.year !== null && PLAYED_PHASES.includes(app.year.phase);

function onTick(app, dt) {
  const ticked = { ...app, t: app.t + dt, phaseT: app.phaseT + dt, yearT: playing(app) ? app.yearT + dt : app.yearT };
  return app.overlay ? result(ticked) : HANDLERS[app.scene].tick(ticked);
}

const onChar = (app, typed) => (app.overlay || !HANDLERS[app.scene].char ? result(app) : HANDLERS[app.scene].char(app, typed));
const onPaste = (app, text) => (app.overlay || !HANDLERS[app.scene].paste ? result(app) : HANDLERS[app.scene].paste(app, text));

function reduce(app, action) {
  switch (action.type) {
    case 'tick':
      return onTick(app, action.dt);
    case 'key':
      return onKey(app, action.key);
    case 'tap':
      return onTap(app, action.x, action.y);
    case 'hover':
      return onHover(app, action.x, action.y);
    case 'char':
      return onChar(app, action.char);
    case 'paste':
      return onPaste(app, action.text);
    default:
      return result(app);
  }
}

module.exports = { createApp, reduce, acceptsText };
