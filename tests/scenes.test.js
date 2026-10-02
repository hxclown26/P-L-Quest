'use strict';

// Every picture of a problem follows the same art direction (docs/arte/direccion-de-arte.md): colours only from
// the palette, nothing outside its 116x42 window, a still corner under the month label, and a mood that
// changes the picture once the answer is known. The list below is the list of themes of the game.

const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/render/palette');
const { drawArt, THEMES, ART_W, ART_H } = require('../src/render/year/art');
const { recorder } = require('./helpers/screen');

const REDRAWN = ['client', 'plant', 'safety', 'rain', 'snow', 'water', 'politics', 'economy', 'protest', 'truck', 'alert', 'strategy'];
// The rescue alarm is not a voice with a mood: it sounds the same whatever the answer was.
const MOODY = REDRAWN.filter((theme) => theme !== 'alert');
const MOODS = ['neutral', 'good', 'bad'];
const TIMES = [0.1, 1.3, 2.7];

const paletteColors = (value) => {
  if (typeof value === 'string') return value.startsWith('#') ? [value] : [];
  return Object.values(value).flatMap(paletteColors);
};
const ALLOWED = new Set(paletteColors(P));

function scene(theme, t, mood) {
  const { ctx, fills } = recorder();
  drawArt(ctx, theme, 0, 0, t, mood);
  return fills;
}

// The colour that ends up on every pixel of the corner under the month label (the lower right, from x 46, y 34).
function corner(theme, t, mood) {
  const pixels = new Map();
  const tinted = [];
  scene(theme, t, mood).forEach((f) => {
    const solid = f.alpha === 1 || f.alpha === undefined;
    for (let y = Math.max(34, f.y); y < Math.min(ART_H, f.y + f.h); y += 1) {
      for (let x = Math.max(46, f.x); x < Math.min(ART_W, f.x + f.w); x += 1) {
        if (solid) pixels.set(`${x},${y}`, f.color);
        else tinted.push(`${x},${y}`);
      }
    }
  });
  return { pixels, tinted };
}

test('the list of themes here is the list of themes of the game, so a new one is not forgotten', () => {
  assert.deepEqual([...THEMES].sort(), [...REDRAWN].sort());
});

test('no scene writes a colour of its own: every colour is in the palette (gradients are mixed from it)', () => {
  REDRAWN.forEach((theme) => MOODS.forEach((mood) => TIMES.forEach((t) => {
    scene(theme, t, mood).forEach((f) => {
      assert.ok(!(f.color.startsWith('#') && !ALLOWED.has(f.color)), `${theme} ${mood} t=${t}: ${f.color} is not in the palette`);
    });
  })));
});

test('no scene paints outside its 116x42 window, at any moment or mood', () => {
  REDRAWN.forEach((theme) => MOODS.forEach((mood) => [0.1, 0.9, 1.7, 2.9].forEach((t) => {
    scene(theme, t, mood).forEach((f) => {
      assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= ART_W && f.y + f.h <= ART_H, `${theme} ${mood} t=${t}: ${JSON.stringify(f)} leaves the window`);
    });
  })));
});

test('the corner under the month label is painted, still and plain: the same few colours at any moment or mood', () => {
  REDRAWN.forEach((theme) => {
    const base = corner(theme, 0.2, 'neutral');
    assert.equal(base.pixels.size, (ART_W - 46) * (ART_H - 34), `${theme}: every pixel of the corner is painted`);
    assert.ok(new Set(base.pixels.values()).size <= 3, `${theme}: the corner has more than three colours`);
    assert.equal(base.tinted.length, 0, `${theme}: nothing translucent moves under the label`);
    [[1.9, 'neutral'], [0.2, 'good'], [0.2, 'bad'], [2.6, 'bad']].forEach(([t, mood]) => {
      const other = corner(theme, t, mood);
      assert.deepEqual([...other.pixels], [...base.pixels], `${theme}: the corner changes at t=${t} (${mood})`);
      assert.equal(other.tinted.length, 0, `${theme}: something translucent crosses the corner at t=${t} (${mood})`);
    });
  });
});

test('every scene moves: it is not the same picture a second later', () => {
  REDRAWN.forEach((theme) => {
    const frames = [0.2, 0.5, 1.0, 1.7].map((t) => JSON.stringify(scene(theme, t, 'neutral')));
    assert.ok(new Set(frames).size > 1, `${theme} is a still picture`);
  });
});

test('after the answer every voice wears its mood: neutral, good and bad are three pictures', () => {
  MOODY.forEach((theme) => {
    const shots = MOODS.map((mood) => JSON.stringify(scene(theme, 0.3, mood)));
    assert.equal(new Set(shots).size, 3, `${theme}: the moods look the same`);
  });
});

test('the rescue alarm does not change with the mood, and a mood nobody knows is neutral', () => {
  MOODS.forEach((mood) => assert.equal(JSON.stringify(scene('alert', 0.4, mood)), JSON.stringify(scene('alert', 0.4, 'neutral'))));
  REDRAWN.forEach((theme) => assert.equal(JSON.stringify(scene(theme, 0.4, 'whatever')), JSON.stringify(scene(theme, 0.4, 'neutral')), `${theme}: an unknown mood is neutral`));
});

test('a scene is the same picture for the same moment: there is no chance in it', () => {
  REDRAWN.forEach((theme) => assert.equal(JSON.stringify(scene(theme, 1.234, 'good')), JSON.stringify(scene(theme, 1.234, 'good')), theme));
});
