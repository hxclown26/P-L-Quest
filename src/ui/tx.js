'use strict';

const { createI18n } = require('../i18n');
const { formatNumber, formatDelta } = require('../text');

const i18n = createI18n({ es: require('../content/es'), en: require('../content/en') });

// tx(app, key, params) translates with the app's current language. The content tests scan
// the code for calls with a literal key, so a missing string fails the tests, not the game.
const tx = (app, key, params) => i18n.t(app.lang, key, params);
const num = (app, n) => formatNumber(n, app.lang);
const signed = (app, n) => formatDelta(n, app.lang);

module.exports = { tx, num, signed };
