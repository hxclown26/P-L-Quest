'use strict';

// Runs the real bundle inside a browser-shaped sandbox (a canvas that accepts any call, a
// fake AudioContext, in-memory storage) and plays the game with keys and taps. It cannot
// judge how the screen looks, but it proves that every scene draws and every input path
// runs without throwing, in both languages.

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { bundle } = require('../build');

function createEnvironment({ lang = 'es-CL', blockStorage = false, preload = {}, creator = false } = {}) {
  const counters = { fillRect: 0, drawImage: 0 };
  const store = { ...preload };
  const windowHandlers = {};
  const canvasHandlers = {};
  const audios = [];
  const copies = [];
  const intervals = [];
  let raf = null;
  let now = 0;

  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'fillRect') return () => { counters.fillRect += 1; };
      if (prop === 'drawImage') return () => { counters.drawImage += 1; };
      return () => undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });

  class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.state = 'suspended';
      this.destination = {};
      audios.push(this);
    }

    createGain() {
      return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }

    createOscillator() {
      return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
    }

    resume() {
      this.state = 'running';
    }
  }

  const canvas = {
    width: 256,
    height: 240,
    style: {},
    getContext: () => ctx,
    addEventListener: (type, fn) => { canvasHandlers[type] = fn; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 512, height: 480 }),
  };
  const storage = blockStorage ? null : {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
  const win = {
    location: { search: creator ? '?creator' : '' },
    innerWidth: 1024,
    innerHeight: 768,
    AudioContext: FakeAudioContext,
    addEventListener: (type, fn) => { windowHandlers[type] = fn; },
  };
  Object.defineProperty(win, 'localStorage', {
    get() {
      if (!storage) throw new Error('SecurityError');
      return storage;
    },
  });

  const sandbox = {
    window: win,
    document: {
      getElementById: () => canvas,
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ctx,
        style: {},
        setAttribute() {},
        select() { this.selected = true; },
      }),
      body: { appendChild(node) { this.last = node; }, removeChild() {} },
      execCommand(command) {
        copies.push({ command, text: this.body.last ? this.body.last.value : null });
        return true;
      },
    },
    navigator: { language: lang },
    URLSearchParams,
    performance: { now: () => now },
    requestAnimationFrame: (cb) => { raf = cb; },
    setInterval: (cb) => { intervals.push(cb); return intervals.length; },
    clearInterval: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(bundle(), sandbox);

  return {
    store,
    counters,
    copies,
    paste(text) {
      windowHandlers.paste({ clipboardData: { getData: () => text }, preventDefault() {} });
    },
    frame(count = 1) {
      for (let i = 0; i < count; i += 1) {
        now += 16;
        audios.forEach((a) => { a.currentTime += 0.016; });
        intervals.forEach((cb) => cb());
        const cb = raf;
        raf = null;
        cb(now);
      }
    },
    key(key) {
      windowHandlers.keydown({ key, repeat: false, ctrlKey: false, metaKey: false, altKey: false, preventDefault() {} });
    },
    tap(x, y) {
      canvasHandlers.pointerdown({ clientX: x * 2, clientY: y * 2, preventDefault() {} });
    },
    hover(x, y) {
      canvasHandlers.pointermove({ clientX: x * 2, clientY: y * 2, pointerType: 'mouse' });
    },
  };
}

const SEQUENCE = ['Enter', 'ArrowRight', 'Enter', 'ArrowDown', 'Enter', 'ArrowLeft', 'Enter', 'ArrowUp'];

function playThrough(env, steps) {
  for (let i = 0; i < steps; i += 1) {
    env.key(SEQUENCE[i % SEQUENCE.length]);
    env.frame(2);
  }
}

test('the game boots and draws the title screen', () => {
  const env = createEnvironment();
  env.frame(5);
  assert.ok(env.counters.fillRect > 100, 'the title draws rectangles');
  assert.ok(env.counters.drawImage > 20, 'the title draws text');
});

test('a full playthrough in Spanish draws every scene without errors', () => {
  const env = createEnvironment();
  env.frame(3);
  playThrough(env, 700);
  assert.ok(env.counters.drawImage > 1000);
});

test('the same playthrough in English runs without errors', () => {
  const env = createEnvironment({ lang: 'en-US' });
  env.frame(3);
  playThrough(env, 700);
  assert.ok(env.counters.drawImage > 1000);
});

test('note overlay, language and sound keys work on every screen', () => {
  const env = createEnvironment();
  for (let i = 0; i < 260; i += 1) {
    env.key(SEQUENCE[i % SEQUENCE.length]);
    if (i % 7 === 0) env.key('n');
    if (i % 11 === 0) env.key('l');
    if (i % 13 === 0) env.key('m');
    env.frame(2);
  }
  env.frame(5);
  assert.ok(env.counters.fillRect > 1000);
});

test('taps and hover drive the game too', () => {
  const env = createEnvironment();
  env.frame(2);
  for (let i = 0; i < 300; i += 1) {
    env.hover(20 + ((i * 37) % 220), 120 + ((i * 23) % 80));
    env.tap(20 + ((i * 53) % 220), 100 + ((i * 29) % 90));
    env.frame(2);
  }
  assert.ok(env.counters.fillRect > 1000);
});

test('the game still runs when storage is blocked', () => {
  const env = createEnvironment({ blockStorage: true });
  env.frame(2);
  playThrough(env, 120);
  assert.ok(env.counters.fillRect > 100);
});

test('the chosen language and mute switch are persisted', () => {
  const env = createEnvironment();
  env.frame(2);
  env.key('l');
  env.key('m');
  const saved = JSON.parse(env.store['plquest.v1']);
  assert.equal(saved.lang, 'en');
  assert.equal(saved.muted, true);
});

const pressAll = (env, keys, frames = 1) => keys.forEach((key) => {
  env.key(key);
  env.frame(frames);
});

test('the tutorial still plays from the mode menu, in both languages', () => {
  for (const lang of ['es-CL', 'en-US']) {
    const env = createEnvironment({ lang });
    env.frame(3);
    pressAll(env, ['Enter', 'ArrowDown', 'Enter', 'Enter'], 2);
    playThrough(env, 400);
    assert.ok(env.counters.drawImage > 1000, lang);
  }
});

test('a whole year played with Enter ends, saves the best year and starts over from the menu', () => {
  const env = createEnvironment();
  env.frame(3);
  assert.equal(env.store['plquest.v1'], undefined, 'nothing is saved before playing');
  pressAll(env, ['Enter', 'Enter', 'Enter'], 2);
  for (let i = 0; i < 400; i += 1) {
    env.key('Enter');
    env.frame(1);
  }
  const saved = JSON.parse(env.store['plquest.v1']);
  assert.ok(saved.bestYear >= 1 && saved.bestYear <= 6, `bestYear ${saved.bestYear}`);
});

test('the endings list plays all eight simulated years without saving a best year', () => {
  const env = createEnvironment({ lang: 'en-US', creator: true });
  env.frame(3);
  pressAll(env, ['Enter', 'ArrowDown', 'ArrowDown', 'Enter'], 2);
  for (let i = 0; i < 8; i += 1) {
    pressAll(env, ['Enter', 'Enter', 'Enter', 'Enter', 'ArrowDown'], 2);
  }
  assert.equal(env.store['plquest.v1'], undefined, 'a simulated ending never counts as a result');
  assert.ok(env.counters.drawImage > 500);
});

test('reviewer mode, rules and the quit question work in the year with keys and taps', () => {
  const env = createEnvironment({ creator: true });
  env.frame(3);
  pressAll(env, ['Enter', 'Enter', 'Enter', 'r', 'n', 'Enter', 'Escape', 'Escape'], 2);
  pressAll(env, ['Escape', 'Enter'], 2);
  env.tap(100, 60);
  env.hover(40, 130);
  env.frame(4);
  assert.ok(env.counters.fillRect > 500);
});

test('the creator address adds the endings and the workshop to the menu; a plain address does not', () => {
  const menuDraws = (creator) => {
    const env = createEnvironment({ creator });
    env.frame(2);
    pressAll(env, ['Enter'], 2);
    const before = env.counters.drawImage;
    env.frame(1);
    return env.counters.drawImage - before;
  };
  assert.ok(menuDraws(true) > menuDraws(false) + 40, 'two more rows of text on the creator menu');
});

test('the saved best year is loaded when the game starts and shown on the menu', () => {
  const menuDraws = (preload) => {
    const env = createEnvironment({ preload });
    env.frame(2);
    pressAll(env, ['Enter'], 2);
    const before = env.counters.drawImage;
    env.frame(1);
    return env.counters.drawImage - before;
  };
  const saved = JSON.stringify({ lang: 'es', muted: false, bestStars: 0, bestYear: 5 });
  assert.equal(menuDraws({ 'plquest.v1': saved }) - menuDraws({}), 'Mejor año: AÑO BUENO'.length);
});

test('after a year the menu shows the new best year without restarting the game', () => {
  const { RANKS } = require('../src/ui/year-view');
  const es = require('../src/content/es');
  const frameDraws = (env) => {
    const before = env.counters.drawImage;
    env.frame(1);
    return env.counters.drawImage - before;
  };
  const env = createEnvironment();
  env.frame(2);
  pressAll(env, ['Enter'], 2);
  const empty = frameDraws(env);
  pressAll(env, ['Enter', 'Enter'], 2);
  for (let i = 0; i < 400 && !env.store['plquest.v1']; i += 1) {
    env.key('Enter');
    env.frame(1);
  }
  const { bestYear } = JSON.parse(env.store['plquest.v1']);
  const label = `Mejor año: ${es[`year.verdict.${RANKS[bestYear]}`]}`;
  let shown = false;
  for (let i = 0; i < 6 && !shown; i += 1) {
    pressAll(env, ['Enter'], 2);
    shown = frameDraws(env) - empty === label.length;
  }
  assert.ok(shown, `the menu shows "${label}"`);
});

const { encode, decode } = require('../src/year/result-code');
const { decisionsOf } = require('../src/year/replay');
const yearEngine = require('../src/year/engine');
const yearSim = require('../src/year/simulate');

const teamCode = (name, profile, code = 4821) => encode({
  name,
  code,
  choices: decisionsOf(yearSim.simulate(yearSim.PROFILES[profile], 3, yearEngine.newYear(code))),
});

const typeText = (env, text) => [...text].forEach((ch) => {
  env.key(ch);
  env.frame(1);
});

// title -> menu -> workshop menu
const intoWorkshop = (env) => pressAll(env, ['Enter', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter'], 2);

test('a team plays a whole workshop year and copies its result code from the last page', () => {
  const env = createEnvironment({ creator: true });
  env.frame(3);
  intoWorkshop(env);
  pressAll(env, ['Enter'], 2);
  typeText(env, 'HALCONES');
  pressAll(env, ['Enter'], 1);
  typeText(env, '4821');
  pressAll(env, ['Enter', 'Enter'], 2);
  assert.equal(env.copies.length, 0);
  for (let i = 0; i < 600 && env.copies.length === 0; i += 1) {
    env.key('Enter');
    env.frame(1);
    env.key('c');
    env.frame(1);
  }
  assert.ok(env.copies.length > 0, 'the code reached the copy command');
  assert.equal(env.copies[0].command, 'copy');
  const decoded = decode(env.copies[0].text);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.name, 'HALCONES');
  assert.equal(decoded.code, 4821);
  assert.equal(env.store['plquest.v1'], undefined, 'a workshop year saves no best year');
});

test('typing on the workshop screens never triggers the mute, language or reviewer keys', () => {
  const env = createEnvironment({ creator: true });
  env.frame(3);
  intoWorkshop(env);
  pressAll(env, ['Enter'], 2);
  typeText(env, 'mlrnxczwasd');
  assert.equal(env.store['plquest.v1'], undefined, 'no language or sound change was saved');
});

test('the facilitator pastes team codes and the ranking draws them', () => {
  const env = createEnvironment({ creator: true });
  env.frame(3);
  intoWorkshop(env);
  pressAll(env, ['ArrowDown', 'Enter'], 2);
  const frameDraws = () => {
    const before = env.counters.drawImage;
    env.frame(1);
    return env.counters.drawImage - before;
  };
  const empty = frameDraws();
  env.paste(teamCode('Equilibrio', 'expert'));
  const one = frameDraws();
  env.paste(teamCode('Atajos', 'short'));
  const two = frameDraws();
  assert.ok(one > empty + 8, 'a team adds its row');
  assert.ok(two > one + 8, 'a second team adds another');
  env.paste('esto no es un código');
  assert.ok(frameDraws() > 0);
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) pressAll(env, [key], 2);
  env.paste('');
  env.frame(3);
});

test('pasting outside the ranking does nothing', () => {
  const env = createEnvironment();
  env.frame(3);
  env.paste(teamCode('Equilibrio', 'expert'));
  pressAll(env, ['Enter'], 2);
  env.paste('4821');
  env.frame(3);
  assert.equal(env.store['plquest.v1'], undefined);
});
