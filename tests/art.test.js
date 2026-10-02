'use strict';

// The pictures are drawn from rectangles and discs with no clipping, so a scene that moves must
// never paint outside its own 116x42 window, at any moment of its animation.

const test = require('node:test');
const assert = require('node:assert/strict');
const { drawArt, THEMES, ART_W, ART_H } = require('../src/render/year/art');

function recorder() {
  const rects = [];
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'fillRect') return (x, y, w, h) => rects.push({ x, y, w, h });
      if (prop === 'drawImage') return (...args) => { if (args.length === 9) rects.push({ x: args[5], y: args[6], w: args[7], h: args[8], glyph: true }); };
      return () => undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  // The canvases of the font atlas are separate: their pixels are not part of the picture.
  const scratch = new Proxy({}, { get: () => () => undefined, set: () => true });
  global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => scratch }) };
  return { ctx, rects };
}

test('every scene is clipped to its own window, so nothing it animates can spill over the frame', () => {
  const origin = { x: 100, y: 50 };
  for (const theme of THEMES) {
    const calls = [];
    const ctx = new Proxy({}, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return (...args) => { calls.push([prop, ...args]); };
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    });
    global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => undefined, set: () => true }) }) };
    drawArt(ctx, theme, origin.x, origin.y, 1.7);
    const names = calls.map((call) => call[0]);
    const firstPaint = names.findIndex((name) => name === 'fillRect' || name === 'drawImage');
    assert.deepEqual(calls[0], ['save'], `${theme}: the state is saved before clipping`);
    assert.deepEqual(calls[1], ['beginPath']);
    assert.deepEqual(calls[2], ['rect', origin.x, origin.y, ART_W, ART_H], `${theme}: the clip is the window`);
    assert.equal(names[3], 'clip');
    assert.ok(firstPaint > 3, `${theme}: nothing is painted before the clip`);
    assert.equal(names[names.length - 1], 'restore', `${theme}: the clip is released at the end`);
  }
});

test('the scenes that move are not the same picture a second later', () => {
  const MOVING = ['client', 'plant', 'economy', 'rain', 'snow', 'politics', 'protest', 'truck', 'alert', 'strategy', 'safety', 'water'];
  assert.deepEqual([...THEMES].sort(), [...MOVING].sort(), 'every theme is listed here, so a new one is not forgotten');
  for (const theme of MOVING) {
    const frames = [0.3, 0.9, 1.5, 2.1].map((t) => {
      const { ctx, rects } = recorder();
      drawArt(ctx, theme, 0, 0, t);
      return JSON.stringify(rects);
    });
    assert.ok(new Set(frames).size > 1, `${theme} is a still picture`);
  }
});
