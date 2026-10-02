'use strict';

// Freezes constant game data once, at load time, so nothing can mutate it later.
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

module.exports = { deepFreeze };
