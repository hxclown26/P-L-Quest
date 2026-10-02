'use strict';

// Browser entry point: wires the canvas, keyboard, pointer, sound and storage to the pure
// game state in ui/app.js. All game rules live elsewhere; this file only moves events in
// and effects out.

const { createApp, reduce, acceptsText } = require('./ui/app');
const { keyToAction, toLogical } = require('./ui/keys');
const { createStorage } = require('./storage');
const { GAME_CODES } = require('./rng');
const { createAudio } = require('./audio');
const { drawFrame } = require('./render/index');
const { W, H } = require('./ui/layout');

const MAX_DT = 0.1;

// Reading window.localStorage can itself throw (blocked cookies, some file:// setups).
function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// The creator's tools (the endings, the workshop and the reviewer) open with ?creator in the
// address of the page: a player who is just handed the file never sees them.
function isCreator() {
  try {
    return new URLSearchParams(window.location.search).has('creator');
  } catch {
    return false;
  }
}

// A new order of problems and cards on every visit: the one place where chance comes in.
const randomSeed = () => Math.floor(Math.random() * GAME_CODES);

function browserLang() {
  return String(navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
}

// Until the player chooses with E, calm effects follow the system's reduced-motion preference.
function prefersCalm() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Whole-number scaling keeps the pixels square; on very small screens it falls back to a
// fractional scale so the picture still fits.
function fitCanvas(canvas) {
  const fit = Math.max(0.25, Math.min(window.innerWidth / W, window.innerHeight / H));
  const scale = fit >= 2 ? Math.floor(fit) : fit;
  canvas.style.width = `${Math.round(W * scale)}px`;
  canvas.style.height = `${Math.round(H * scale)}px`;
}

// Copies text for the player to paste elsewhere. The modern clipboard API needs a secure page, so
// a file opened from disk falls back to a hidden field and the old copy command (both need a key
// press, which is how this is called). If neither works the code stays on screen to read.
function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => undefined);
      return;
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    document.execCommand('copy');
    document.body.removeChild(field);
  } catch {
    // Nothing to do: the code is on screen.
  }
}

// Owns the current app state and turns actions into state changes plus side effects.
function createRuntime(saved, audio, storage) {
  let app = createApp({
    lang: saved.lang || browserLang(),
    muted: saved.muted,
    calm: saved.calm ?? prefersCalm(),
    best: saved.bestStars,
    bestYear: saved.bestYear,
    seed: randomSeed(),
    creator: isCreator(),
  });
  audio.setMuted(app.muted);

  const perform = (effect) => {
    if (effect.type === 'sfx') audio.sfx(effect.name);
    else if (effect.type === 'music') audio.music(effect.mode);
    else if (effect.type === 'mute') audio.setMuted(effect.value);
    else if (effect.type === 'copy') copyText(effect.text);
    else if (effect.type === 'save') {
      const stored = storage.save(effect.patch);
      app = { ...app, best: stored.bestStars, bestYear: stored.bestYear };
    }
  };

  const dispatch = (action) => {
    const outcome = reduce(app, action);
    app = outcome.app;
    outcome.effects.forEach(perform);
  };

  return { dispatch, current: () => app };
}

// Keys are commands, except on the typing screens where a character is just a character.
// Pasting (Ctrl/Cmd+V) arrives as its own event, so the shortcut itself is left to the browser.
function bindInput(canvas, runtime) {
  const { dispatch } = runtime;
  window.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (acceptsText(runtime.current()) && typeof event.key === 'string' && event.key.length === 1) {
      event.preventDefault();
      dispatch({ type: 'char', char: event.key });
      return;
    }
    const action = keyToAction(event.key);
    if (!action) return;
    event.preventDefault();
    dispatch({ type: 'key', key: action });
  });
  window.addEventListener('paste', (event) => {
    const text = event.clipboardData ? event.clipboardData.getData('text') : '';
    if (!text) return;
    event.preventDefault();
    dispatch({ type: 'paste', text });
  });
  const logical = (event) => toLogical(event.clientX, event.clientY, canvas.getBoundingClientRect());
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    dispatch({ type: 'tap', ...logical(event) });
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') dispatch({ type: 'hover', ...logical(event) });
  });
  window.addEventListener('resize', () => fitCanvas(canvas));
}

function startLoop(ctx, runtime) {
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(MAX_DT, (now - last) / 1000);
    last = now;
    runtime.dispatch({ type: 'tick', dt });
    drawFrame(ctx, runtime.current());
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function start() {
  const canvas = document.getElementById('screen');
  const storage = createStorage(safeStorage());
  const audio = createAudio(window.AudioContext || window.webkitAudioContext);
  const runtime = createRuntime(storage.load(), audio, storage);
  bindInput(canvas, runtime);
  fitCanvas(canvas);
  startLoop(canvas.getContext('2d'), runtime);
}

start();
