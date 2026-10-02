'use strict';

// Reads the text of the screens a player sees around the game: the menu, the year intro and the
// end of the year, to check that what they say is what the state of the game says.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/ui/app');
const engine = require('../src/year/engine');
const sim = require('../src/year/simulate');
const { showcaseRun } = require('../src/year/showcase');
const layout = require('../src/ui/layout');
const { textIn, draw, recorder } = require('./helpers/screen');
const { drawRules } = require('../src/render/year/overlays');

const base = (patch = {}) => ({ ...createApp({ lang: 'es', muted: false, best: 0, bestYear: 0, seed: 77 }), t: 1.2, phaseT: 1, ...patch });
const SCREEN = { x: 0, y: 0, w: layout.W, h: layout.H };
const screenText = (app) => textIn(draw(app).glyphs, SCREEN).join('|');

test('the menu of a player lists the year, the half year and the tutorial, and nothing else', () => {
  const text = screenText(base({ scene: 'menu' }));
  assert.match(text, /Año completo/);
  assert.match(text, /Medio año/);
  assert.match(text, /6 meses de 4 problemas/);
  assert.match(text, /Tutorial de 5 pisos/);
  assert.doesNotMatch(text, /finales/);
  assert.doesNotMatch(text, /Taller/);
});

test('the menu names this build: Demo 5, in both modes of the menu', () => {
  for (const creator of [false, true]) {
    const text = screenText(base({ scene: 'menu', creator }));
    assert.match(text, /DEMO 5/);
    assert.doesNotMatch(text, /DEMO [34]/);
  }
});

test('the menu of the creator also lists the endings and the workshop', () => {
  const text = screenText(base({ scene: 'menu', creator: true }));
  assert.match(text, /Medio año/);
  assert.match(text, /Ver los 6 finales/);
  assert.match(text, /Taller en grupo/);
});

test('the intro of the half year says six months and that every decision weighs twice as much', () => {
  const half = screenText(base({ scene: 'yearIntro', months: 6 }));
  assert.match(half, /Medio año/);
  assert.match(half, /6 meses/);
  assert.match(half, /doble/);
  const full = screenText(base({ scene: 'yearIntro', months: 12 }));
  assert.match(full, /Año completo/);
  assert.match(full, /12 meses/);
  assert.doesNotMatch(full, /doble/);
});

test('the rules overlay of the half year names its rescue month', () => {
  assert.match(screenText(base({ scene: 'yearIntro', months: 6, overlay: 'rules' })), /hasta el mes 4/);
  assert.match(screenText(base({ scene: 'yearIntro', months: 12, overlay: 'rules' })), /hasta el mes 9/);
});

test('the fictional-data notice sits under the three modes of a player, and the five rows of the creator leave no room for it', () => {
  assert.match(screenText(base({ scene: 'menu' })), /Datos 100% ficticios/);
  assert.doesNotMatch(screenText(base({ scene: 'menu', creator: true })), /Datos 100% ficticios/);
});

test('the year intro shows the code of the game, then the digits typed with blanks for the rest', () => {
  assert.match(screenText(base({ scene: 'yearIntro' })), /Código de partida: 0077/);
  const typing = screenText(base({ scene: 'yearIntro', codeEntry: '48' }));
  assert.match(typing, /Código de partida: 48__/);
  assert.match(typing, /Faltan dígitos/);
  assert.match(screenText(base({ scene: 'yearIntro' })), /Teclea 4 dígitos/);
});

test('the intro does not advertise the reviewer key to a player', () => {
  const text = screenText(base({ scene: 'yearIntro' }));
  assert.doesNotMatch(text, /revisor/i);
});

test('the end of a year played from a code shows that code on the result and on the report', () => {
  const run = sim.simulate(sim.PROFILES.expert, 1, engine.newYear(4821));
  for (const page of [0, 1]) {
    assert.match(screenText(base({ scene: 'year', year: run, page })), /Código de partida: 4821/, `page ${page}`);
  }
});

test('a pinned ending, which has no code of its own, shows none', () => {
  assert.doesNotMatch(screenText(base({ scene: 'year', year: showcaseRun(0), page: 0, sim: true })), /Código de partida/);
});

test('the rules show the grades with their real thresholds, and the next page the assumptions', () => {
  // The overlay is drawn on its own: behind its opaque window the screen under it is hidden anyway.
  const read = (app) => {
    const { ctx, glyphs } = recorder();
    drawRules(ctx, app);
    return textIn(glyphs, SCREEN).join('|');
  };
  const rules = read(base({ scene: 'yearIntro', overlay: 'rules' }));
  for (const word of ['Excelente', 'Bueno', 'Mediano', 'Malo', 'Muy malo', '21,5%', '17,0%', '13,0%', '8,0%']) assert.ok(rules.includes(word), word);
  assert.match(rules, /\(1\/2\)/);
  const assumptions = read(base({ scene: 'yearIntro', overlay: 'rules', rulesPage: 1 }));
  assert.match(assumptions, /SUPUESTOS DEL MODELO/);
  assert.match(assumptions, /US\$ millones/);
  assert.match(assumptions, /El juego termina en el OI/, 'the page says where the game stops, and so what is left out');
  assert.match(assumptions, /\(2\/2\)/);
});

test('after E the footer names the effects for a moment, in both languages, and then gives its labels back', () => {
  const footer = { x: 0, y: layout.FOOTER.y, w: layout.W, h: layout.FOOTER.h };
  const footerText = (app) => textIn(draw(app).glyphs, footer).join('|');
  const toast = (lang, calm) => base({ scene: 'menu', lang, calm, calmAt: 5, t: 5.5 });
  assert.equal(footerText(toast('es', true)), 'Efectos suaves (E)');
  assert.equal(footerText(toast('es', false)), 'Efectos completos (E)');
  assert.equal(footerText(toast('en', true)), 'Calm effects (E)');
  assert.equal(footerText(toast('en', false)), 'Full effects (E)');
  assert.match(footerText({ ...toast('es', true), t: 5 + 3 }), /^Enter: elegir/, 'the labels are back after a moment');
  assert.match(footerText(base({ scene: 'menu' })), /^Enter: elegir/, 'and a game that never pressed E never shows it');
});
