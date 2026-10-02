'use strict';

// Screen geometry in logical pixels (the game draws at 256x240, like a PAL SNES). Shared by the
// renderer and by the reducer so a tap lands on exactly what the player sees.

const W = 256;
const H = 256;
// Everything above the footer strip.
const PLAY_H = 244;

// Where the tutorial's boss stands, in the picture column.
const BOSS_CENTER = Object.freeze({ x: 193, y: 41 });

// Four labels side by side. The slots are sized for the longest label of either language
// (an action of 15 letters, then "N reglas", "M sonido" and "L ES/EN"), and the tap zones match.
const FOOTER = Object.freeze({
  y: PLAY_H,
  h: H - PLAY_H,
  labelX: Object.freeze([3, 99, 152, 205]),
  zones: [
    ['confirm', 0, 96],
    ['note', 96, 150],
    ['mute', 150, 203],
    ['lang', 203, 256],
  ],
});

// The decision screens of both modes. The P&L is a tall column at the left, like a report, with
// the picture and the gauges in a column at the right; one dialogue window below holds the
// situation, the answers as a list and the detail of the highlighted answer.
const STATEMENT = Object.freeze({ x: 4, y: 3, w: 124, h: 142 });
const STATEMENT_ROWS = Object.freeze({ top: 13, pitch: 8, header: Object.freeze({ y: 3, h: 9 }) });
const PLATE = Object.freeze({ x: 134, y: 3, w: 118, h: 14 });
const ART = Object.freeze({ x: 134, y: 19, w: 118, h: 44 });
const DASH = Object.freeze({ x: 134, y: 65, w: 118, h: 80 });
// The picture and the gauges as one tall window, for screens that have a chart instead.
const SIDE = Object.freeze({ x: 134, y: 19, w: 118, h: 126 });
const DIALOGUE = Object.freeze({
  x: 4, y: 147, w: 248, h: 95, titleY: 4, sceneY: 13, firstRule: 32, answersY: 35, answerPitch: 9, secondRule: 72, detailY: 75,
});

// Mode menu: tall rows (name + description) and, on the endings screen, a list of one-line play
// styles. The fewer the modes the taller the rows: two, three, four (the endings of a creator
// without the half year) or the five of a creator.
const MENU = Object.freeze({
  panel: Object.freeze({ x: 4, y: 84, w: 248, h: 140 }),
  row: Object.freeze({ x: 8, y: 104, w: 240, h: 26, step: 29 }),
  rowFew: Object.freeze({ x: 8, y: 116, w: 240, h: 34, step: 42 }),
  rowThree: Object.freeze({ x: 8, y: 104, w: 240, h: 30, step: 34 }),
  rowFive: Object.freeze({ x: 8, y: 102, w: 240, h: 22, step: 23 }),
  profile: Object.freeze({ x: 8, y: 105, w: 240, h: 11, step: 11 }),
});

// Workshop setup: the team name, the game code and the start button.
const SETUP = Object.freeze({
  name: Object.freeze({ x: 122, y: 100, w: 124, h: 15 }),
  code: Object.freeze({ x: 122, y: 122, w: 50, h: 15 }),
  start: Object.freeze({ x: 66, y: 146, w: 124, h: 17 }),
});

const inside = (rect, x, y) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;

const FEW_ROWS = 2;
const menuRowRect = (i, count = 4) => {
  const row = count <= FEW_ROWS ? MENU.rowFew : count === 3 ? MENU.rowThree : count >= 5 ? MENU.rowFive : MENU.row;
  return { x: row.x, y: row.y + i * row.step, w: row.w, h: row.h };
};

const profileRowRect = (i) => ({
  x: MENU.profile.x,
  y: MENU.profile.y + i * MENU.profile.step,
  w: MENU.profile.w,
  h: MENU.profile.h,
});

const hitIndex = (rectOf, count, x, y) => {
  for (let i = 0; i < count; i += 1) if (inside(rectOf(i), x, y)) return i;
  return -1;
};

const answerRect = (i) => ({
  x: DIALOGUE.x + 4,
  y: DIALOGUE.y + DIALOGUE.answersY - 1 + i * DIALOGUE.answerPitch,
  w: DIALOGUE.w - 8,
  h: DIALOGUE.answerPitch,
});
const hitAnswer = (x, y, count = 4) => hitIndex(answerRect, count, x, y);
const hitMenuRow = (x, y, count = 4) => hitIndex((i) => menuRowRect(i, count), count, x, y);
const hitSetup = (x, y) => ['name', 'code', 'start'].findIndex((key) => inside(SETUP[key], x, y));
const hitProfileRow = (x, y, count = 8) => hitIndex(profileRowRect, count, x, y);

function hitFooter(x, y) {
  if (y < FOOTER.y || y >= FOOTER.y + FOOTER.h) return null;
  const zone = FOOTER.zones.find(([, from, to]) => x >= from && x < to);
  return zone ? zone[0] : null;
}

module.exports = {
  W,
  H,
  PLAY_H,
  STATEMENT,
  STATEMENT_ROWS,
  PLATE,
  ART,
  DASH,
  SIDE,
  DIALOGUE,
  answerRect,
  hitAnswer,
  BOSS_CENTER,
  MENU,
  SETUP,
  FOOTER,
  menuRowRect,
  profileRowRect,
  hitMenuRow,
  hitProfileRow,
  hitSetup,
  hitFooter,
  inside,
};
