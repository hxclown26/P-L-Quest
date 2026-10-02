'use strict';

// Routes the year-mode scenes (and their overlays) to the modules that draw them.

const { drawProblem, drawResult } = require('./problem');
const { drawClose, drawRescue } = require('./close');
const { drawVerdict, drawOver } = require('./verdict');
const menus = require('./menus');
const overlays = require('./overlays');
const workshop = require('./workshop');

const PHASES = Object.freeze({
  problem: drawProblem,
  result: drawResult,
  monthClose: drawClose,
  rescue: drawRescue,
  final: drawVerdict,
  over: drawOver,
});

const drawYear = (ctx, app) => PHASES[app.year.phase](ctx, app);

const SCENES = Object.freeze({
  menu: menus.drawMenu,
  yearIntro: menus.drawYearIntro,
  endings: menus.drawEndings,
  year: drawYear,
  workshop: workshop.drawWorkshopMenu,
  setup: workshop.drawSetup,
  rank: workshop.drawRank,
});

const OVERLAYS = Object.freeze({ rules: overlays.drawRules, quit: overlays.drawQuit });

module.exports = { SCENES, OVERLAYS, PHASES };
