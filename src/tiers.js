'use strict';

// Factory states, from worst to best. They follow the projected OI bar.
const TIERS = Object.freeze(['collapse', 'edge', 'worn', 'normal', 'modern', 'hightech']);

function tierFor(oi) {
  if (!(oi > 0)) return 'collapse';
  if (oi < 5) return 'edge';
  if (oi < 10) return 'worn';
  if (oi < 16) return 'normal';
  if (oi < 19) return 'modern';
  return 'hightech';
}

function tierDirection(from, to) {
  const change = TIERS.indexOf(to) - TIERS.indexOf(from);
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'same';
}

module.exports = { TIERS, tierFor, tierDirection };
