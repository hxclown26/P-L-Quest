'use strict';

const PLACEHOLDER = /\{(\w+)\}/g;

// Looks a key up in the chosen language, falling back to Spanish and then to the key
// itself, and fills {name} placeholders. It never throws: a missing string must not stop
// the game (the content tests guarantee that both languages are complete).
function createI18n(dicts) {
  const has = (lang, key) =>
    Object.prototype.hasOwnProperty.call(dicts[lang] || {}, key);

  const t = (lang, key, params = {}) => {
    const source = has(lang, key) ? dicts[lang] : dicts.es;
    const raw = Object.prototype.hasOwnProperty.call(source, key) ? source[key] : key;
    return raw.replace(PLACEHOLDER, (match, name) => (name in params ? String(params[name]) : match));
  };

  return { t, has };
}

module.exports = { createI18n };
