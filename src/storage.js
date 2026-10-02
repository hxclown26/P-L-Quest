'use strict';

// Saves the language, the mute switch, the calm-effects switch and the best stars. Storage can be
// blocked or corrupt (private windows, file:// quirks), so every read is validated and every write
// is allowed to fail: the game must work the same without it. `calm` is null until the player
// chooses: then the game follows the system's reduced-motion preference.

const KEY = 'plquest.v1';
const LANGS = Object.freeze(['es', 'en']);
const DEFAULTS = Object.freeze({ lang: null, muted: false, calm: null, bestStars: 0, bestYear: 0 });

function sanitize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const clamp = (value, max) => (Number.isInteger(value) ? Math.min(max, Math.max(0, value)) : 0);
  return {
    lang: LANGS.includes(source.lang) ? source.lang : null,
    muted: source.muted === true,
    calm: typeof source.calm === 'boolean' ? source.calm : null,
    bestStars: clamp(source.bestStars, 3),
    bestYear: clamp(source.bestYear, 6),
  };
}

function createStorage(backend) {
  const load = () => {
    try {
      const stored = backend ? backend.getItem(KEY) : null;
      return stored ? sanitize(JSON.parse(stored)) : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  };

  const save = (patch) => {
    const current = load();
    const merged = sanitize({
      ...current,
      ...patch,
      bestStars: Math.max(current.bestStars, patch.bestStars ?? 0),
      bestYear: Math.max(current.bestYear, patch.bestYear ?? 0),
    });
    try {
      if (backend) backend.setItem(KEY, JSON.stringify(merged));
    } catch {
      // Storage may be blocked or full; the game keeps working without saving.
    }
    return merged;
  };

  return { load, save };
}

module.exports = { createStorage, DEFAULTS, KEY };
