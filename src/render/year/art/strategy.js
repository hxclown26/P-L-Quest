'use strict';

// Strategy: a dartboard under a night sky and an arrow that flies in, sticks and shivers. After an answer, when
// it was good the arrow lands in the bullseye and a glint shines; when it was bad it misses the board and a red
// cross marks the spot. The lower right corner is flat ground, because the month label sits there.

const P = require('../../palette');

const R = P.ramp;
const INK = P.ink;

const BOARD = Object.freeze({ x: 40, y: 17 });
const RINGS = Object.freeze([[14, R.tie[1]], [11, P.white], [8, R.tie[1]], [5, P.white], [2, R.hazard[1]]]);
const START = Object.freeze({ x: 88, y: 12 });
const MISS = Object.freeze({ x: 60, y: 11 });
// The arrow's tail is this far from its tip.
const TAIL = Object.freeze({ dx: 20, dy: -6 });
const CYCLE = 2.6;
const FLIGHT = 1.2;
const STARS = Object.freeze([[8, 6], [18, 23], [28, 4], [78, 27], [104, 6], [110, 20]]);

// The board: a glow when it went well, dimmed when it did not, so the mood shows at any moment of the flight.
function board(g, mood) {
  g.r(39, 31, 3, 3, R.wood[1]);
  if (mood === 'good') {
    g.alpha(0.3);
    g.d(BOARD.x, BOARD.y, 17, R.hazard[2]);
    g.alpha(1);
  }
  g.d(BOARD.x, BOARD.y, 15, INK);
  RINGS.forEach(([radius, color]) => g.d(BOARD.x, BOARD.y, radius, color));
  g.d(BOARD.x - 5, BOARD.y - 6, 1, P.white);
  if (mood === 'bad') {
    g.alpha(0.45);
    g.d(BOARD.x, BOARD.y, 15, INK);
    g.alpha(1);
  }
}

function stars(g, t) {
  STARS.forEach(([x, y], k) => {
    if (Math.floor(t * 0.8 + k * 0.37) % 3 !== 0) g.r(x, y, 1, 1, R.paper[2]);
    else g.glint(x, y, R.glass[2]);
  });
}

// The arrow flies in, sticks for a moment shivering, stays, and fades before it comes again.
function arrow(g, t, mood) {
  const target = mood === 'bad' ? MISS : BOARD;
  const cycle = t % CYCLE;
  const flight = Math.min(1, cycle / FLIGHT);
  const eased = 1 - (1 - flight) ** 2;
  const shiver = flight >= 1 && cycle < FLIGHT + 0.3 ? Math.round(Math.sin(cycle * 40)) : 0;
  const x = Math.round(START.x + (target.x - START.x) * eased);
  const y = Math.round(START.y + (target.y - START.y) * eased) + shiver;
  g.alpha(cycle > CYCLE - 0.4 ? Math.max(0, (CYCLE - cycle) / 0.4) : 1);
  g.l(x, y, x + TAIL.dx, y + TAIL.dy, R.wood[2]);
  g.l(x, y + 1, x + TAIL.dx, y + TAIL.dy + 1, R.wood[1]);
  g.r(x - 1, y - 1, 3, 3, R.metal[2]);
  g.l(x + TAIL.dx - 3, y + TAIL.dy, x + TAIL.dx + 1, y + TAIL.dy - 3, R.tie[1]);
  g.l(x + TAIL.dx - 3, y + TAIL.dy + 1, x + TAIL.dx + 1, y + TAIL.dy + 4, R.tie[1]);
  g.alpha(1);
  return flight >= 1;
}

const draw = (g, t, mood = 'neutral') => {
  g.sky(...P.sky.night);
  g.r(0, 34, 116, 8, R.floor[1]);
  g.r(0, 34, 116, 1, R.floor[2]);
  stars(g, t);
  board(g, mood);
  const landed = arrow(g, t, mood);
  if (!landed) return;
  if (mood === 'good') g.glint(BOARD.x + 4, BOARD.y - 4, Math.floor(t * 3) % 2 === 0 ? P.white : R.hazard[2]);
  if (mood === 'bad') {
    g.l(MISS.x - 3, MISS.y - 3, MISS.x + 3, MISS.y + 3, R.tie[1]);
    g.l(MISS.x + 3, MISS.y - 3, MISS.x - 3, MISS.y + 3, R.tie[1]);
  }
};

module.exports = { draw };
