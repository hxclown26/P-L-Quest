'use strict';

// Reducer for the group workshop: its small menu, the team setup and the facilitator's ranking.
// Typing and pasting arrive as 'char' and 'paste' actions; everything else as keys and taps.

const engine = require('../year/engine');
const { decode, cleanName } = require('../year/result-code');
const { analyze } = require('../year/standings');
const { formatCode, parseCode } = require('../rng');
const layout = require('./layout');
const { MAX_TEAMS, rankedTeams, firstFreeColor } = require('./rank-view');
const { tx } = require('./tx');
const { typeName, typeDigit, typeFree, erase } = require('./text-entry');
const { sfx, music, result, moved, listMove, selectIndex } = require('./shared');

const WORKSHOP_ITEMS = Object.freeze(['play', 'rank']);
const FIELD = Object.freeze({ name: 0, code: 1, start: 2 });
const VIEWS = 3;

const go = (app, scene) => result(moved(app, { scene, cursor: 0 }), [sfx('select')]);

// ---------------------------------------------------------------- the workshop menu

function openItem(app) {
  if (WORKSHOP_ITEMS[app.workshopIdx] === 'play') {
    return result(moved(app, { scene: 'setup', setup: { ...app.setup, field: FIELD.name, notice: null } }), [sfx('confirm')]);
  }
  return go(app, 'rank');
}

const menu = {
  key(app, pressed) {
    if (pressed === 'confirm') return openItem(app);
    if (pressed === 'back') return go(app, 'menu');
    if (pressed === 'up' || pressed === 'down') {
      return selectIndex(app, 'workshopIdx', listMove(app.workshopIdx, pressed, WORKSHOP_ITEMS.length));
    }
    return result(app);
  },
  tap(app, x, y) {
    const index = layout.hitMenuRow(x, y, WORKSHOP_ITEMS.length);
    if (index < 0) return result(app);
    return index === app.workshopIdx ? openItem(app) : selectIndex(app, 'workshopIdx', index);
  },
  hover(app, x, y) {
    const index = layout.hitMenuRow(x, y, WORKSHOP_ITEMS.length);
    return index < 0 ? result(app) : selectIndex(app, 'workshopIdx', index);
  },
};

// ---------------------------------------------------------------- the team setup

const withSetup = (app, patch, effects) => result({ ...app, setup: { ...app.setup, ...patch } }, effects);

const needCode = (app) => withSetup(app, { field: FIELD.code, notice: { key: 'ws.setup.needCode', kind: 'error' } }, [sfx('bad')]);

function startTeam(app) {
  const code = parseCode(app.setup.code);
  if (code === null) return needCode(app);
  const team = cleanName(app.setup.name) || tx(app, 'ws.team.default');
  return result(
    moved(app, {
      scene: 'year',
      year: engine.newYear(code),
      workshop: { team, code, result: null },
      sim: false,
      review: false,
      cursor: 0,
      page: 0,
      overlay: null,
    }),
    [sfx('confirm'), music('play')],
  );
}

function confirmSetup(app) {
  const { field } = app.setup;
  if (field === FIELD.start) return startTeam(app);
  if (field === FIELD.name) return withSetup(app, { field: FIELD.code }, [sfx('select')]);
  return parseCode(app.setup.code) === null ? needCode(app) : withSetup(app, { field: FIELD.start }, [sfx('select')]);
}

function typeInSetup(app, char) {
  const { name, code, field } = app.setup;
  if (field === FIELD.name) return withSetup(app, { name: typeName(name, char), notice: null });
  if (field === FIELD.code) return withSetup(app, { code: typeDigit(code, char), notice: null });
  return result(app);
}

function eraseInSetup(app) {
  const { name, code, field } = app.setup;
  if (field === FIELD.name) return withSetup(app, { name: erase(name), notice: null });
  if (field === FIELD.code) return withSetup(app, { code: erase(code), notice: null });
  return result(app);
}

const setup = {
  key(app, pressed) {
    if (pressed === 'confirm') return confirmSetup(app);
    if (pressed === 'back') return go(app, 'workshop');
    if (pressed === 'delete') return eraseInSetup(app);
    if (pressed === 'up' || pressed === 'down') {
      const field = listMove(app.setup.field, pressed, FIELD.start + 1);
      return field === app.setup.field ? result(app) : withSetup(app, { field }, [sfx('select')]);
    }
    return result(app);
  },
  char: typeInSetup,
  paste(app, text) {
    return parseCode(text) === null ? result(app) : withSetup(app, { code: String(text).trim(), notice: null });
  },
  tap(app, x, y) {
    const field = layout.hitSetup(x, y);
    if (field < 0) return result(app);
    if (field === FIELD.start) return startTeam(app);
    return field === app.setup.field ? result(app) : withSetup(app, { field }, [sfx('select')]);
  },
  hover: (app) => result(app),
};

// ---------------------------------------------------------------- the facilitator's ranking

const withRank = (app, patch, effects) => result({ ...app, rank: { ...app.rank, ...patch } }, effects);

const notify = (app, notice) => withRank(app, { notice, entry: '' }, [sfx('bad')]);

const sameTeam = (a, b) => a.name === b.name && a.code === b.code;

// Adds (or updates) the team a result code describes, replaying its year to rank it.
function addTeam(app, text) {
  const decoded = decode(text);
  if (!decoded.ok) return notify(app, { key: `rank.err.${decoded.reason}`, kind: 'error' });
  const { rank } = app;
  const name = decoded.name || `${tx(app, 'ws.team.default')} ${rank.teams.length + 1}`;
  const team = analyze({ ...decoded, name });
  if (!team.ok) return notify(app, { key: `rank.err.${team.reason}`, kind: 'error' });
  const known = rank.teams.find((t) => sameTeam(t, team));
  if (!known && rank.teams.length >= MAX_TEAMS) return notify(app, { key: 'rank.err.full', kind: 'error' });
  const teams = known
    ? rank.teams.map((t) => (t === known ? { ...team, color: t.color } : t))
    : [...rank.teams, { ...team, color: firstFreeColor(rank.teams) }];
  const code = rank.code === null ? team.code : rank.code;
  const listed = { ...rank, teams, code };
  const selected = rankedTeams(listed).all.findIndex((t) => sameTeam(t, team));
  const params = { name: team.name };
  let notice = { key: 'rank.added', kind: 'ok', params };
  if (known) notice = { key: 'rank.updated', kind: 'ok', params };
  else if (team.code !== code) notice = { key: 'rank.err.other', kind: 'error', params: { ...params, code: formatCode(team.code) } };
  return withRank(app, { teams, code, selected, entry: '', notice }, [sfx(notice.kind === 'ok' ? 'good' : 'bad')]);
}

function removeSelected(app) {
  const { all } = rankedTeams(app.rank);
  const target = all[app.rank.selected];
  if (!target) return result(app);
  const teams = app.rank.teams.filter((t) => t !== target);
  const stillThere = teams.some((t) => t.code === app.rank.code);
  const code = stillThere ? app.rank.code : (teams[0] ? teams[0].code : null);
  const next = { ...app.rank, teams, code };
  const selected = Math.max(0, Math.min(app.rank.selected, rankedTeams(next).all.length - 1));
  return withRank(app, { teams, code, selected, notice: { key: 'rank.removed', kind: 'ok', params: { name: target.name } } }, [sfx('select')]);
}

function eraseInRank(app) {
  if (app.rank.entry.length > 0) return withRank(app, { entry: erase(app.rank.entry), notice: null });
  return removeSelected(app);
}

function moveSelection(app, pressed) {
  const count = rankedTeams(app.rank).all.length;
  if (count === 0) return result(app);
  const selected = listMove(app.rank.selected, pressed, count);
  return selected === app.rank.selected ? result(app) : withRank(app, { selected }, [sfx('select')]);
}

function cycleView(app, pressed) {
  const step = pressed === 'right' ? 1 : VIEWS - 1;
  return withRank(app, { view: (app.rank.view + step) % VIEWS }, [sfx('select')]);
}

const rank = {
  key(app, pressed) {
    if (pressed === 'back') return go(app, 'workshop');
    if (pressed === 'confirm') return app.rank.entry.length > 0 ? addTeam(app, app.rank.entry) : result(app);
    if (pressed === 'delete') return eraseInRank(app);
    if (pressed === 'left' || pressed === 'right') return cycleView(app, pressed);
    if (pressed === 'up' || pressed === 'down') return moveSelection(app, pressed);
    return result(app);
  },
  char: (app, char) => withRank(app, { entry: typeFree(app.rank.entry, char), notice: null }),
  paste: addTeam,
  tap: (app) => cycleView(app, 'right'),
  hover: (app) => result(app),
};

// ---------------------------------------------------------------- routing by scene

const SCENES = Object.freeze({ workshop: menu, setup, rank });

const key = (app, pressed) => SCENES[app.scene].key(app, pressed);
const tap = (app, x, y) => SCENES[app.scene].tap(app, x, y);
const hover = (app, x, y) => SCENES[app.scene].hover(app, x, y);
const char = (app, typed) => (SCENES[app.scene].char ? SCENES[app.scene].char(app, typed) : result(app));
const paste = (app, text) => (SCENES[app.scene].paste ? SCENES[app.scene].paste(app, text) : result(app));
const tick = (app) => result(app);

module.exports = { key, tap, hover, tick, char, paste, WORKSHOP_ITEMS };
