'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// A canvas that only remembers the letters drawn onto it.
function recorder() {
  const draws = [];
  const ctx = {
    fillRect() {},
    drawImage: (...args) => draws.push({ sx: args[1], sy: args[2], sw: args[3], sh: args[4], dx: args[5], dy: args[6], dw: args[7], dh: args[8] }),
    getContext: () => ctx,
  };
  global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
  return { ctx, draws };
}

const ui = require('../src/render/ui');

test('plain text is one image per letter, six pixels apart', () => {
  const { ctx, draws } = recorder();
  ui.text(ctx, 'AB', 10, 20, '#fff');
  assert.equal(draws.length, 2);
  assert.deepEqual(draws.map((d) => d.dx), [10, 16]);
});

test('bold text strikes every letter twice, one pixel apart', () => {
  const { ctx, draws } = recorder();
  ui.text(ctx, 'AB', 10, 20, '#fff', { bold: true });
  assert.equal(draws.length, 4);
  assert.deepEqual(draws.map((d) => d.dx).sort((a, b) => a - b), [10, 11, 16, 17]);
});

test('slanted text draws each letter in two slices and the top slice leans one pixel to the right', () => {
  const { ctx, draws } = recorder();
  ui.text(ctx, 'A', 10, 20, '#fff', { slant: true });
  assert.equal(draws.length, 2);
  const [top, bottom] = draws;
  assert.equal(top.sy, 0);
  assert.equal(bottom.sy, top.sh, 'the slices meet without a gap');
  assert.equal(top.sh + bottom.sh, 9, 'together they are the whole letter cell');
  assert.equal(top.dx, bottom.dx + 1);
  assert.equal(bottom.dy, top.dy + top.sh);
});

test('slant and bold combine, and the width helpers keep counting six pixels a letter', () => {
  const { ctx, draws } = recorder();
  ui.text(ctx, 'A', 0, 0, '#fff', { bold: true, slant: true });
  assert.equal(draws.length, 4);
  assert.equal(ui.textWidth('ABC'), 18);
});

test('bold text keeps its right edge when it is right aligned', () => {
  const edge = (opts) => {
    const { ctx, draws } = recorder();
    ui.textRight(ctx, '10', 100, 0, '#fff', opts);
    return Math.max(...draws.map((d) => d.dx + 4));
  };
  assert.equal(edge({ bold: true }), edge({}), 'the extra strike goes to the left, not past the edge');
});
