'use strict';

// Chiptune made with the Web Audio API: square-wave lead, triangle bass and short effects.
// Nothing is downloaded. Browsers only allow sound after a user gesture, so the context is
// created on the first call to music() or sfx() (always triggered by a key press or tap).
// The output and the music scheduler keep their timing state in closures; no game data is
// touched.

const NOTE = (semitonesFromA4) => 440 * 2 ** (semitonesFromA4 / 12);
const STEP_SECONDS = 0.16;
const LOOKAHEAD = 0.25;
const MASTER_GAIN = 0.5;

// Lead and bass patterns in semitones from A4; null is a rest.
const THEMES = Object.freeze({
  title: {
    lead: [3, null, 7, null, 10, null, 7, null, 8, null, 12, null, 10, null, 7, null,
      5, null, 8, null, 12, null, 8, null, 7, null, 10, null, 15, null, 12, null],
    bass: [-21, null, null, null, -21, null, -14, null, -16, null, null, null, -16, null, -9, null,
      -19, null, null, null, -19, null, -12, null, -14, null, null, null, -14, null, -7, null],
  },
  play: {
    lead: [0, null, 3, 0, null, 5, null, 3, 7, null, 5, null, 3, null, 0, null,
      -2, null, 3, -2, null, 5, null, 3, 8, null, 7, null, 5, null, 3, null],
    bass: [-24, -24, null, -24, -24, null, -24, null, -22, -22, null, -22, -22, null, -22, null,
      -26, -26, null, -26, -26, null, -26, null, -24, -24, null, -24, -24, null, -24, null],
  },
});

const EFFECTS = Object.freeze({
  select: [[880, 0.03, 'square']],
  confirm: [[660, 0.04, 'square'], [880, 0.06, 'square']],
  good: [[523, 0.06, 'square'], [659, 0.06, 'square'], [784, 0.12, 'square']],
  bad: [[392, 0.08, 'square'], [294, 0.08, 'square'], [220, 0.16, 'sawtooth']],
  tier: [[523, 0.05, 'triangle'], [659, 0.05, 'triangle'], [784, 0.05, 'triangle'], [1047, 0.18, 'triangle']],
  star: [[523, 0.1, 'square'], [659, 0.1, 'square'], [784, 0.1, 'square'], [1047, 0.3, 'square']],
  death: [[330, 0.12, 'sawtooth'], [262, 0.12, 'sawtooth'], [196, 0.12, 'sawtooth'], [110, 0.5, 'sawtooth']],
});

// Owns the AudioContext: created lazily, resumed on demand, silenced by the mute switch.
function createOutput(AudioContextClass) {
  let ctx = null;
  let master = null;
  let muted = false;

  const ensure = () => {
    if (!AudioContextClass) return false;
    if (!ctx) {
      try {
        ctx = new AudioContextClass();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : MASTER_GAIN;
        master.connect(ctx.destination);
      } catch {
        ctx = null;
        return false;
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  };

  const tone = (freq, start, length, type, volume) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + length + 0.02);
  };

  const setMuted = (value) => {
    muted = value;
    if (master) master.gain.value = muted ? 0 : MASTER_GAIN;
  };

  return { ensure, tone, setMuted, now: () => ctx.currentTime };
}

// Schedules the looping theme a quarter of a second ahead of the audio clock.
function createMusic(output) {
  let mode = 'off';
  let timer = null;
  let step = 0;
  let nextTime = 0;

  const schedule = () => {
    const theme = THEMES[mode];
    while (theme && nextTime < output.now() + LOOKAHEAD) {
      const i = step % theme.lead.length;
      if (theme.lead[i] !== null) output.tone(NOTE(theme.lead[i]), nextTime, STEP_SECONDS * 0.9, 'square', 0.05);
      if (theme.bass[i] !== null) output.tone(NOTE(theme.bass[i]), nextTime, STEP_SECONDS * 1.6, 'triangle', 0.09);
      nextTime += STEP_SECONDS;
      step += 1;
    }
  };

  return (next) => {
    if (next === mode) return;
    mode = next;
    if (timer !== null) clearInterval(timer);
    timer = null;
    if (next === 'off' || !output.ensure()) return;
    step = 0;
    nextTime = output.now() + 0.05;
    timer = setInterval(schedule, 40);
  };
}

function createAudio(AudioContextClass) {
  const output = createOutput(AudioContextClass);
  const music = createMusic(output);

  const sfx = (name) => {
    const notes = EFFECTS[name];
    if (!notes || !output.ensure()) return;
    notes.reduce((start, [freq, length, type]) => {
      output.tone(freq, start, length, type, 0.12);
      return start + length;
    }, output.now());
  };

  return { setMuted: output.setMuted, music, sfx };
}

module.exports = { createAudio };
