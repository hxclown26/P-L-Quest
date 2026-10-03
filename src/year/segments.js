'use strict';

const { deepFreeze } = require('../freeze');
const { SERVE_VARIABLE_SHARE } = require('../model');

// The four kinds of client the unit sells to: hotels, hospitals, the food industry and industry in general. What sets
// them apart in the numbers is how much service a sale drags along (visits, audits, documentation): `serve` is the
// share of the freight and direct charges that follows the volume. A hotel chain buys a lot and asks for little; a
// hospital buys less and asks for audits and records on every visit.
const SEGMENTS = deepFreeze({
  hotel: { serve: 0.5 },
  hospital: { serve: 0.9 },
  food: { serve: 0.7 },
  industry: { serve: 0.6 },
});

const SEGMENT_IDS = Object.freeze(Object.keys(SEGMENTS));

// A problem with no segment (a test, a made-up one) follows the volume like the tutorial does.
const serveOf = (segment) => (SEGMENTS[segment] ? SEGMENTS[segment].serve : SERVE_VARIABLE_SHARE);

module.exports = { SEGMENTS, SEGMENT_IDS, serveOf };
