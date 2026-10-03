'use strict';

// Pure helpers that turn a year run into what the year-mode screens show. No drawing here,
// so the whole mapping from game state to text and numbers is unit tested.

const rules = require('../year/rules');
const engine = require('../year/engine');
const { walk, feedback } = require('../year/feedback');
const { SHOWCASE } = require('../year/showcase');
const { kpis, shapeOf } = require('../year/kpis');
const { tx, num, signed } = require('./tx');
const { toneOf } = require('./view');
const { reportRows } = require('./statement');
const { netSales } = require('../model');
const { wrapText } = require('../text');

const OUTCOME_TIER = Object.freeze({
  excellent: 'hightech', good: 'modern', fair: 'normal', bad: 'worn', terrible: 'edge', bankrupt: 'collapse',
});
const RANKS = Object.freeze(['', 'bankrupt', 'terrible', 'bad', 'fair', 'good', 'excellent']);
const PLAYER_MENU = Object.freeze(['year', 'half', 'tutorial']);
const CREATOR_MENU = Object.freeze([...PLAYER_MENU, 'endings', 'workshop']);
const PROFILE_ITEMS = Object.freeze(SHOWCASE.map((entry) => entry.profile));
const WHY_TONE = Object.freeze({ smart: 'green', temp: 'orange', plac: 'cyan', ign: 'red' });
const NEGLIGIBLE = 0.05;

const rankOf = (outcome) => RANKS.indexOf(outcome);
// The endings and the workshop are the creator's: a player's menu has the three ways to play.
const menuItems = (app) => (app.creator ? CREATOR_MENU : PLAYER_MENU);
// The months of the year being played, or of the one chosen on the menu before it starts.
const monthsOf = (app) => (app.year ? app.year.months : app.months) ?? 12;
const isHalfYear = (app) => monthsOf(app) === 6;
const meterName = (app, key) => tx(app, `year.meterName.${key}`);
const titleOf = (app, problemId) => tx(app, `year.${problemId}.title`);

// Each problem opens with its brief; the answers come after Enter. `briefedSlot` is the problem whose brief has been read.
const slotOf = (run) => run.monthIdx * engine.PROBLEMS_PER_MONTH + run.problemIdx;
const briefing = (app) => app.year.phase === 'problem' && app.briefedSlot !== slotOf(app.year);

// The brief is up to five rows of 40 columns, typed in letter by letter.
const BRIEF_COLS = 40;
const BRIEF_ROWS = 5;

// The brief of the current problem: its title, who is asking and why now, and three facts ("Label: value").
function briefOf(app) {
  const { id } = engine.currentProblem(app.year);
  return {
    title: tx(app, `year.${id}.title`),
    text: tx(app, `year.${id}.brief`),
    facts: tx(app, `year.${id}.facts`).split('|').map((fact) => {
      const colon = fact.indexOf(':');
      return { label: fact.slice(0, colon), value: fact.slice(colon + 1).trim() };
    }),
  };
}

// The letters the screen types for the brief, counted across its rows (the spaces at the breaks are not drawn).
const briefChars = (app) => wrapText(briefOf(app).text, BRIEF_COLS).slice(0, BRIEF_ROWS).reduce((total, row) => total + row.length, 0);

// The four answers of the current problem as cards: text keys and a P&L chip that names the line
// the answer moves. The chip never says which way the line goes (that would tell the answers that
// raise OI from the ones that lower it) nor what the answer does to the meters.
function yearCards(app) {
  const problem = engine.currentProblem(app.year);
  return engine.options(app.year).map((option, index) => ({
    index,
    a: option.a,
    line: option.line,
    chip: { key: `line.short.${option.line}` },
    nameKey: `year.${problem.id}.${option.a}.name`,
    descKey: `year.${problem.id}.${option.a}.desc`,
    tagKey: `year.tag.${option.a}`,
  }));
}

// Reviewer mode: the hidden character and size of an answer (meters include the delayed bill),
// as two short rows for the gauges window.
function cardReview(app, index) {
  const effect = engine.preview(app.year, index);
  const a = engine.options(app.year)[index].a;
  const total = (key) => effect.meters[key] + (effect.delayed ? effect.delayed[key] : 0);
  const meters = rules.METER_KEYS.map((key) => `${tx(app, `year.meterTag.${key}`)[0]}${signed(app, total(key))}`);
  return { a, lines: [`${tx(app, `year.tag.${a}`)} OI${signed(app, effect.pp)}`, meters.join(' ')] };
}

// The meter at stake in this problem when it is low enough (a crisis) to weaken balanced answers.
function crisisMeter(app) {
  const problem = engine.currentProblem(app.year);
  return app.year.meters[problem.focus] >= rules.CRISIS ? null : problem.focus;
}

function crisisLines(app) {
  const meter = crisisMeter(app);
  if (meter === null) return [];
  return [tx(app, 'year.crisis.l1', { tag: tx(app, `year.meterTag.${meter}`) }), tx(app, 'year.crisis.l2')];
}

// What happened after an answer: what was chosen, what OI did, the story of that answer in this problem (a red line
// in red) and one short row for each rule that bent it.
function resultLines(app) {
  const { last } = app.year;
  const change = Math.abs(last.delta.oi) < NEGLIGIBLE
    ? tx(app, 'ui.noChange')
    : tx(app, 'ui.oiChange', { from: num(app, last.oiBefore), to: num(app, last.oiAfter), delta: signed(app, last.delta.oi) });
  return [
    { text: tx(app, 'year.res.chose', { name: tx(app, `year.${last.problemId}.${last.a}.name`) }), tone: 'white' },
    { text: change, tone: toneOf(last.delta.oi) },
    { text: tx(app, `year.${last.problemId}.${last.a}.why`), tone: last.redLine ? 'red' : WHY_TONE[last.a] },
    ...last.notes.map((note) => ({ text: tx(app, `year.note.${note}`), tone: note === 'redLine' ? 'red' : 'cyan' })),
    ...(last.sets.length > 0 ? [{ text: tx(app, 'year.note.measured'), tone: 'green' }] : []),
  ];
}

// How far the last answer moved the net sales, in percent of what they were: null when it was too little to matter.
const GROWTH_FLOAT_MIN = 0.5;
function resultGrowth(app) {
  const before = netSales(app.year.last.plBefore);
  const pct = (100 * (netSales(app.year.pl) - before)) / before;
  return Math.abs(pct) >= GROWTH_FLOAT_MIN ? pct : null;
}

const meterDeltas = (last) => rules.METER_KEYS.map((key) => ({ key, delta: last.delta[key] }));

function closeLines(app) {
  const close = app.year.lastClose;
  const adjustments = close.adjustments.filter((a) => Math.abs(a.pts) >= NEGLIGIBLE).map((a) => {
    if (a.because === 'fly') return { text: tx(app, 'year.close.fly', { pts: signed(app, a.pts) }), tone: 'green' };
    const key = a.pts < 0 ? 'year.close.drag' : 'year.close.bonus';
    return {
      text: tx(app, key, { meter: meterName(app, a.because), line: tx(app, `line.short.${a.line}`), pts: signed(app, a.pts) }),
      tone: a.pts < 0 ? 'red' : 'green',
    };
  });
  const bills = close.delayedApplied.map((d) => {
    const worst = rules.METER_KEYS.reduce((low, key) => (d.meters[key] < d.meters[low] ? key : low), 'C');
    return {
      text: tx(app, 'year.close.bill', { problem: titleOf(app, d.because), meter: meterName(app, worst), value: signed(app, d.meters[worst]) }),
      tone: 'orange',
    };
  });
  const decay = num(app, rules.DECAY * app.year.pace);
  return [{ text: tx(app, 'year.close.decay', { decay }), tone: 'gray' }, ...adjustments, ...bills];
}

// One slot per month of the year being played; null until the month has closed.
const chartBars = (run) => Array.from({ length: run.months }, (_, i) => ({
  month: i + 1,
  oi: run.closes[i] ? run.closes[i].oi : null,
}));

// A meter at zero: what happened, what it did to the OI and what is left of the meter.
function shockLines(app) {
  const blow = app.year.shocks[app.year.shocks.length - 1];
  return [
    { text: tx(app, 'year.shock.cause', { cause: tx(app, `year.fb.cause.${blow.meter}`) }), tone: 'red' },
    { text: tx(app, `year.shock.body.${blow.meter}`), tone: 'white' },
    { text: tx(app, 'year.shock.oi', { from: num(app, blow.oiBefore), to: num(app, blow.oiAfter) }), tone: 'orange' },
    { text: tx(app, 'year.shock.meter', { n: rules.SHOCK_METER }), tone: 'gold' },
  ];
}

const percent = (share) => Math.round(100 * share);

function rescueLines(app) {
  const rescue = app.year.rescues[app.year.rescues.length - 1];
  const cause = rescue.cause === 'oi' ? 'oi' : rescue.cause;
  return [
    { text: tx(app, 'year.rescue.cause', { cause: tx(app, `year.fb.cause.${cause}`) }), tone: 'red' },
    { text: tx(app, 'year.rescue.body1', { sga: percent(rules.RESTRUCTURING.sga), cost: percent(rules.RESTRUCTURING.cost) }), tone: 'white' },
    { text: tx(app, 'year.rescue.body2', { goal: rules.RESCUE_GOAL }), tone: 'gold' },
    { text: tx(app, 'year.rescue.body3'), tone: 'orange' },
  ];
}

// Turns a feedback line (key + raw numbers) into final text in the current language.
function feedbackText(app, line) {
  const p = line.params;
  const params = { ...p };
  if ('oi' in p) params.oi = num(app, p.oi);
  if ('oiGain' in p) params.oiGain = signed(app, p.oiGain);
  if ('growth' in p) params.growth = num(app, p.growth);
  if ('money' in p) params.money = num(app, p.money);
  if ('oiLost' in p) params.oiLost = num(app, p.oiLost);
  if ('value' in p) params.value = String(Math.round(p.value));
  if ('meter' in p) params.meter = meterName(app, p.meter);
  if ('problem' in p) params.problem = titleOf(app, p.problem);
  if ('cause' in p) params.cause = tx(app, `year.fb.cause.${p.cause}`);
  return tx(app, line.key, params);
}

// Minutes and seconds of play, as "21:40", for a game that was really played.
const clock = (seconds) => {
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
};
const timeText = (app) => (app.sim || !app.yearT ? null : tx(app, 'year.verdict.time', { time: clock(app.yearT) }));

// "Ventas +3,6%": the net sales of the unit against the plan, in one short row.
const growthText = (app) => tx(app, 'year.kpi.growth', { growth: signed(app, kpis(app.year.pl).growth) });

function verdict(app) {
  const run = app.year;
  const oi = engine.oiOf(run);
  const real = kpis(run.pl);
  const shape = shapeOf(run.pl);
  return {
    growthText: growthText(app),
    growthTone: toneOf(real.growth),
    moneyText: tx(app, 'year.kpi.money', { money: num(app, real.oiMoney) }),
    tagKey: shape ? `year.kpi.tag.${shape}` : null,
    timeText: timeText(app),
    outcome: run.outcome,
    titleKey: `year.verdict.${run.outcome}`,
    tier: OUTCOME_TIER[run.outcome],
    oi,
    oiText: tx(app, 'year.verdict.oi', { oi: num(app, oi) }),
    planText: tx(app, 'year.verdict.plan', { plan: rules.PLAN_OI }),
    meters: run.meters,
    walk: walk(run),
    report: reportRows(rules.START_PL, run.pl),
    lines: feedback(run).lines.map((line) => feedbackText(app, line)),
  };
}

// The OI bridge as rows of a floating-bar chart: the plan, one row per P&L line that moved
// (each starting where the previous one ended) and the real OI. A movement too small to show is folded into the next
// bar, and what is left at the end into the last one, so the bars always end on the real OI.
function walkRows(app, walk) {
  const folded = walk.steps.reduce((acc, step) => {
    const pts = acc.carry + step.pts;
    return Math.abs(pts) < NEGLIGIBLE ? { ...acc, carry: pts } : { bars: [...acc.bars, { id: step.id, pts }], carry: 0 };
  }, { bars: [], carry: 0 });
  const last = folded.bars[folded.bars.length - 1];
  const bars = last && folded.carry !== 0 ? [...folded.bars.slice(0, -1), { ...last, pts: last.pts + folded.carry }] : folded.bars;
  const steps = bars.reduce((rows, bar) => {
    const from = rows.length > 0 ? rows[rows.length - 1].to : walk.start;
    return [...rows, { label: tx(app, `line.short.${bar.id}`), from, to: from + bar.pts, text: signed(app, bar.pts), tone: bar.pts > 0 ? 'green' : 'red' }];
  }, []);
  return [
    { label: tx(app, 'year.walk.plan'), from: 0, to: walk.start, text: `${num(app, walk.start)}%`, tone: 'gold' },
    ...steps,
    { label: tx(app, 'year.walk.real'), from: 0, to: walk.end, text: `${num(app, walk.end)}%`, tone: 'white' },
  ];
}

// The five rules of the year as plain sentences; the grades have a table of their own. The wear of
// the meters (rule 2) and the last month of the rescue (rule 4) are the ones a half year changes.
const HALF_RULES = Object.freeze([2, 4]);
const rulesLines = (app) => [1, 2, 3, 4, 5].map((n) => tx(app, isHalfYear(app) && HALF_RULES.includes(n) ? `year.rules.l${n}.half` : `year.rules.l${n}`));

// One row per grade, best first: its name, the least OI and the least weakest meter that earn it
// and the colour of the factory it ends in. The last grade is whatever falls below the rest.
function gradeRows(app) {
  const earned = rules.GRADES.map(([id, oi, meter]) => ({
    id, name: tx(app, `year.grade.${id}`), oi: `${num(app, oi)}%`, meter: String(meter), tier: OUTCOME_TIER[id],
  }));
  const below = tx(app, 'year.rules.below');
  return [...earned, { id: 'terrible', name: tx(app, 'year.grade.terrible'), oi: below, meter: below, tier: OUTCOME_TIER.terrible }];
}

// What the model rests on, for the page of the rules that a finance reader looks for.
const assumptionLines = (app) => [1, 2, 3, 4, 5, 6].map((n) => tx(app, isHalfYear(app) && n === 3 ? 'year.assump.a3.half' : `year.assump.a${n}`));

// A result code on screen: the team name and the code on their own rows, so nothing breaks in
// the middle of the code.
function codeLines(result) {
  const slash = result.lastIndexOf('/');
  return slash < 0 ? [result] : [result.slice(0, slash + 1), result.slice(slash + 1)];
}

const bestLabel = (app) => (app.bestYear > 0 ? tx(app, 'menu.best', { result: tx(app, `year.verdict.${RANKS[app.bestYear]}`) }) : null);

module.exports = {
  OUTCOME_TIER,
  RANKS,
  menuItems,
  monthsOf,
  isHalfYear,
  PROFILE_ITEMS,
  rankOf,
  growthText,
  resultGrowth,
  BRIEF_COLS,
  BRIEF_ROWS,
  slotOf,
  briefing,
  briefOf,
  briefChars,
  yearCards,
  cardReview,
  crisisMeter,
  crisisLines,
  resultLines,
  meterDeltas,
  closeLines,
  chartBars,
  shockLines,
  rescueLines,
  feedbackText,
  verdict,
  codeLines,
  walkRows,
  rulesLines,
  gradeRows,
  assumptionLines,
  bestLabel,
};
