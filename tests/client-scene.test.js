'use strict';

// The client's office, redrawn from the palette's material ramps: nothing in it may be a colour of its own,
// the floor corner under the month label stays flat, the man blinks, and he wears the mood of the answer.

const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/render/palette');
const { drawArt, ART_W, ART_H } = require('../src/render/year/art');
const { HEAD, HEAD_COLORS } = require('../src/render/year/art/client');
const { recorder } = require('./helpers/screen');

const paletteColors = (value) => {
  if (typeof value === 'string') return value.startsWith('#') ? [value] : [];
  return Object.values(value).flatMap(paletteColors);
};
const ALLOWED = new Set(paletteColors(P));

function scene(t, mood) {
  const { ctx, fills } = recorder();
  drawArt(ctx, 'client', 0, 0, t, mood);
  return fills;
}

test('every colour of the office is one of the palette (gradients are mixed from it)', () => {
  ['neutral', 'good', 'bad'].forEach((mood) => {
    [0.1, 1.3, 2.7].forEach((t) => {
      scene(t, mood).forEach((f) => {
        const own = f.color.startsWith('#') && !ALLOWED.has(f.color);
        assert.ok(!own, `${mood} t=${t}: ${f.color} is not in the palette`);
      });
    });
  });
});

test('the corner under the month label is flat floor, whatever the moment or the mood', () => {
  const floor = new Set([P.ramp.floor[1], P.ramp.floor[2]]);
  ['neutral', 'good', 'bad'].forEach((mood) => {
    [0.1, 1.3, 2.7].forEach((t) => {
      const pixels = new Map();
      scene(t, mood).filter((f) => f.alpha === 1 || f.alpha === undefined).forEach((f) => {
        for (let y = Math.max(34, f.y); y < Math.min(ART_H, f.y + f.h); y += 1) {
          for (let x = Math.max(46, f.x); x < Math.min(ART_W, f.x + f.w); x += 1) pixels.set(`${x},${y}`, f.color);
        }
      });
      assert.equal(pixels.size, (ART_W - 46) * (ART_H - 34), 'every pixel of the corner is painted');
      pixels.forEach((color, at) => assert.ok(floor.has(color), `${mood} t=${t}: ${at} is ${color}, not floor`));
    });
  });
});

test('nothing paints outside the 116x42 window', () => {
  ['neutral', 'good', 'bad'].forEach((mood) => {
    [0.1, 0.9, 1.7, 2.9].forEach((t) => {
      scene(t, mood).forEach((f) => {
        assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= ART_W && f.y + f.h <= ART_H, `${mood} t=${t}: ${JSON.stringify(f)} leaves the window`);
      });
    });
  });
});

test('the three moods are three different pictures, and the picture still moves within a mood', () => {
  const shots = ['neutral', 'good', 'bad'].map((mood) => JSON.stringify(scene(0.3, mood)));
  assert.equal(new Set(shots).size, 3);
  assert.notEqual(JSON.stringify(scene(0.3, 'good')), JSON.stringify(scene(1.9, 'good')));
});

test('the mood is ignored when it is not one he knows, and neutral is what is drawn without one', () => {
  assert.equal(JSON.stringify(scene(0.4, undefined)), JSON.stringify(scene(0.4, 'neutral')));
  assert.equal(JSON.stringify(scene(0.4, 'alarm')), JSON.stringify(scene(0.4, 'neutral')));
});

test('he blinks: for a moment every few seconds his eyes are a line, then two dots again', () => {
  const eyes = (t) => scene(t, 'neutral').filter((f) => f.color === P.ink && f.w === 1 && [60, 64].includes(f.x) && f.y >= 12 && f.y <= 17).map((f) => f.h);
  assert.deepEqual(eyes(0.05), [1, 1], 'closed');
  assert.deepEqual(eyes(0.5), [2, 2], 'open');
  assert.deepEqual(eyes(3.2 + 0.05), [1, 1], 'and again a few seconds later');
});

test('the head is a clean 11x11 sprite whose every letter has a colour', () => {
  assert.equal(HEAD.length, 11);
  HEAD.forEach((row, i) => {
    assert.equal(row.length, 11, `row ${i}`);
    [...row].filter((c) => c !== '.').forEach((c) => assert.ok(HEAD_COLORS[c], `${c} in row ${i} has no colour`));
  });
});
