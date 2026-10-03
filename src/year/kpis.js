'use strict';

// What a CFO reads next to the margin: how much the business grew against the plan and what the OI is in money (the
// statement is in US$ millions of plan net sales, so the OI line is the OI in US$ M). And the two ways a year can look
// good and be bad.

const { BASE_PL, salesGrowth, operatingIncome, operatingMargin } = require('../model');

// Sold at least this much more than the plan (percent)...
const GROWTH_FLOOR = 3;
// ...or kept a margin this far over the plan (points) without growing.
const MARGIN_GAIN = 2;

const kpis = (pl) => ({ growth: salesGrowth(pl), oiMoney: operatingIncome(pl), margin: operatingMargin(pl) });

// 'growthNoMargin': sales grew and the OI in money did not (a big business at a bad price); 'marginNoGrowth': the margin
// is up and the sales did not grow (it was kept by shrinking). Anything else is not a trade-off and has no label.
function shapeOf(pl) {
  const real = kpis(pl);
  const plan = kpis(BASE_PL);
  if (real.growth >= GROWTH_FLOOR && real.oiMoney <= plan.oiMoney) return 'growthNoMargin';
  if (real.growth <= 0 && real.margin >= plan.margin + MARGIN_GAIN) return 'marginNoGrowth';
  return null;
}

module.exports = { GROWTH_FLOOR, MARGIN_GAIN, kpis, shapeOf };
