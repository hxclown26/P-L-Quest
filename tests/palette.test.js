'use strict';

// The palette is the one place where colours are chosen. Two promises are kept here: every text
// tone can be read on the windows it is drawn on (WCAG contrast), and the colours written straight
// into the renderer never grow: new art takes its colours from the palette.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../src/render/palette');

const channel = (value) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const rgbOf = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const luminance = (hex) => {
  const [r, g, b] = rgbOf(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hexOf = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mixHex = (a, b, t) => hexOf(rgbOf(a).map((v, i) => v + (rgbOf(b)[i] - v) * t));

// A window is a blue gradient. Text rarely sits on its very first row, so the reference is the colour
// a quarter of the way down; the lightest edge is only held to the lower bar of ACCENT_MIN.
const WINDOW_REF = mixHex(P.winTop, P.winBottom, 0.25);
const BODY_MIN = 4.5;
const ACCENT_MIN = 3.5;
const SECONDARY_MIN = 3;

test('body text tones read at 4.5:1 or better on a window', () => {
  ['white', 'gray', 'gold', 'green', 'cyan', 'orange', 'ratio', 'ratioLabel'].forEach((tone) => {
    assert.ok(P[tone], `${tone} is in the palette`);
    assert.ok(contrast(P[tone], WINDOW_REF) >= BODY_MIN, `${tone} ${P[tone]} reads ${contrast(P[tone], WINDOW_REF).toFixed(1)}:1`);
  });
});

test('red, which is never the only cue, still reads at 3.5:1 on a window', () => {
  assert.ok(contrast(P.red, WINDOW_REF) >= ACCENT_MIN, `red ${P.red} reads ${contrast(P.red, WINDOW_REF).toFixed(1)}:1`);
});

test('the secondary tone is dimmer than gray but still reads at 3:1 on a window and 4.5:1 on the footer', () => {
  assert.ok(contrast(P.dim, WINDOW_REF) >= SECONDARY_MIN, `dim ${P.dim} reads ${contrast(P.dim, WINDOW_REF).toFixed(1)}:1`);
  assert.ok(contrast(P.dim, P.ink) >= BODY_MIN, 'and it is easy on the dark footer');
  assert.ok(luminance(P.gray) > luminance(P.dim) * 1.4, 'the hierarchy gray > dim is still visible');
});

test('white text stays readable on the highlighted row of a menu', () => {
  const selected = mixHex(P.selTop, P.selBottom, 0.25);
  assert.ok(contrast(P.white, selected) >= BODY_MIN, `white on ${selected} reads ${contrast(P.white, selected).toFixed(1)}:1`);
});

// ---- Colours written straight into the renderer. -------------------------------------------------
// The old art and the factory carry their own colours; they may not grow and must be lowered here as they
// are moved onto palette ramps. Any file not listed has none. palette.js defines them and draw.js mixes them.
const LITERALS = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/g;
const EXEMPT = new Set(['palette.js', 'draw.js']);
const BASELINE = Object.freeze({
  'backdrops.js': 46,
  'bosses.js': 56,
  'factory.js': 39,
  'looks.js': 66,
  'scenes/battle.js': 1,
  'scenes/hud.js': 1,
  'scenes/screens.js': 2,
  'scenes/statement.js': 2,
  'ui.js': 1,
  'year/close.js': 2,
  'year/frame.js': 2,
  'year/menus.js': 3,
  'year/overlays.js': 1,
  'year/problem.js': 1,
  'year/report.js': 1,
  'year/verdict.js': 5,
  'year/workshop.js': 4,
});

function renderFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return renderFiles(full, base);
    return entry.name.endsWith('.js') ? [path.relative(base, full)] : [];
  });
}

test('colours written into the renderer never grow, and the counts here are kept honest', () => {
  const root = path.join(__dirname, '..', 'src', 'render');
  const found = Object.fromEntries(renderFiles(root)
    .filter((file) => !EXEMPT.has(file))
    .map((file) => [file, (fs.readFileSync(path.join(root, file), 'utf8').match(LITERALS) || []).length])
    .filter(([, count]) => count > 0));
  Object.entries(found).forEach(([file, count]) => {
    assert.ok(file in BASELINE, `${file} writes ${count} colours into the code: take them from the palette`);
    assert.ok(count <= BASELINE[file], `${file} went from ${BASELINE[file]} to ${count} colours written in the code`);
  });
  Object.entries(BASELINE).forEach(([file, count]) => {
    assert.equal(found[file] || 0, count, `${file} has ${found[file] || 0} colours written in the code: lower its baseline from ${count}`);
  });
});
