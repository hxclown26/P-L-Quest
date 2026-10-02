'use strict';

const { W, H, toolsFor } = require('./tools');
const client = require('./client');
const strategy = require('./strategy');
const economy = require('./economy');
const rain = require('./rain');
const snow = require('./snow');
const water = require('./water');
const politics = require('./politics');
const protest = require('./protest');
const truck = require('./truck');
const safety = require('./safety');
const alert = require('./alert');
const plant = require('./plant');

// The picture on top of each problem: one small pixel scene per theme. A scene wears a mood ('neutral',
// 'good' or 'bad') once the answer is known; any other value is neutral.

const MOODS = Object.freeze(['neutral', 'good', 'bad']);
const SCENES = {
  client: client.draw,
  plant: plant.draw,
  strategy: strategy.draw,
  economy: economy.draw,
  rain: rain.draw,
  snow: snow.draw,
  water: water.draw,
  politics: politics.draw,
  protest: protest.draw,
  truck: truck.draw,
  safety: safety.draw,
  alert: alert.draw,
};

const THEMES = Object.freeze(Object.keys(SCENES));

// Draws the scene of `theme` with its top-left corner at (x, y), clipped to its window.
function drawArt(ctx, theme, x, y, t = 0, mood = 'neutral') {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, W, H);
  ctx.clip();
  SCENES[theme](toolsFor(ctx, x, y), t, MOODS.includes(mood) ? mood : 'neutral');
  ctx.restore();
}

module.exports = { drawArt, THEMES, ART_W: W, ART_H: H };
