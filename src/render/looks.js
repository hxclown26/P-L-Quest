'use strict';

const { deepFreeze } = require('../freeze');

// The look of the factory in each state: the same building, repainted. Colours go from
// bright and clean (hightech) to dark and broken (collapse), so OI is readable at a glance.
const LOOKS = deepFreeze({
  hightech: {
    wall: '#eef3fb', shade: '#c4d0e6', roof: '#8fa0c4', roofHi: '#b4c4e4', glass: '#5fe0ff',
    glassHi: '#d4fbff', accent: '#4cf0a0', smoke: '#f4f9ff', ground: '#5a6c80', sky: ['#7fd6ff', '#d6f4ff'],
  },
  modern: {
    wall: '#d6deee', shade: '#a9b6d0', roof: '#6d7fae', roofHi: '#8fa0c8', glass: '#7ccbea',
    glassHi: '#c2efff', accent: '#4cc880', smoke: '#e9f0f8', ground: '#5a6272', sky: ['#6ec0f0', '#bfe6fa'],
  },
  normal: {
    wall: '#b9805a', shade: '#8d5e44', roof: '#5a5a6c', roofHi: '#74748a', glass: '#8cb2d2',
    glassHi: '#f6e09a', accent: '#d8a040', smoke: '#b8b8c2', ground: '#505060', sky: ['#78a8d8', '#c8dcec'],
  },
  worn: {
    wall: '#8c6c58', shade: '#684c3c', roof: '#46464e', roofHi: '#5c5c66', glass: '#566678',
    glassHi: '#7e7658', accent: '#a65a32', smoke: '#6c6c76', ground: '#403c44', sky: ['#7a8898', '#a8b0b8'],
  },
  edge: {
    wall: '#5e4e4a', shade: '#40302c', roof: '#302c34', roofHi: '#443f48', glass: '#2e323a',
    glassHi: '#c04c3c', accent: '#c83434', smoke: '#34343a', ground: '#2c282e', sky: ['#4a3c4c', '#6a5460'],
  },
  collapse: {
    wall: '#7a6660', shade: '#54443f', roof: '#463c3c', roofHi: '#6c5c58', glass: '#1c1c24',
    glassHi: '#1c1c24', accent: '#a03030', smoke: '#5a5a62', ground: '#2e2a30', sky: ['#40283c', '#7c4a50'],
  },
});

module.exports = { LOOKS };
