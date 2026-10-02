'use strict';

// Pure helpers that turn a year run into what the year-mode screens show. No drawing here,
// so the whole mapping from game state to text and numbers is unit tested.

const rules = require('../year/rules');
const engine = require('../year/engine');
const { walk, feedback } = require('../year/feedback');
const { ARCHETYPES } = require('../year/archetypes');
const { SHOWCASE } = require('../year/showcase');
const { tx, num, signed } = require('./tx');
const { toneOf } = require('./view');
const { reportRows } = require('./statement');

const OUTCOME_TIER = Object.freeze({
  excellent: 'hightech', good: 'modern', fair: 'normal', bad: 'worn', terrible: 'edge', bankrupt: 'collapse',
});
const RANKS = Object.freeze(['', 'bankrupt', 'terrible', 'bad', 'fair', 'good', 'excellent']);
const PLAYER_MENU = Object.freeze(['year', 'tutorial']);
const CREATOR_MENU = Object.freeze([...PLAYER_MENU, 'endings', 'workshop']);
const PROFILE_ITEMS = Object.freeze(SHOWCASE.map((entry) => entry.profile));
const WHY_TONE = Object.freeze({ smart: 'green', temp: 'orange', plac: 'cyan', ign: 'red' });
const NEGLIGIBLE = 0.05;

const rankOf = (outcome) => RANKS.indexOf(outcome);
// The endings and the workshop are the creator's: a player's menu has the two ways to play.
const menuItems = (app) => (app.creator ? CREATOR_MENU : PLAYER_MENU);
const meterName = (app, key) => tx(app, `year.meterName.${key}`);
const titleOf = (app, problemId) => tx(app, `year.${problemId}.title`);

// The four answers of the current problem as cards: text keys and a P&L chip that shows which
// line the answer moves and in which direction, but never the hidden effect on the meters.
function yearCards(app) {
  const problem = engine.currentProblem(app.year);
  return engine.options(app.year).map((option, index) => {
    const oiSign = Math.sign(ARCHETYPES[option.a].oi);
    return {
      index,
      a: option.a,
      line: option.line,
      chip: { key: `line.short.${option.line}`, dir: option.line === 'sales' ? oiSign : -oiSign },
      nameKey: `year.${problem.id}.${option.a}.name`,
      descKey: `year.${problem.id}.${option.a}.desc`,
      tagKey: `year.tag.${option.a}`,
    };
  });
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

function resultLines(app) {
  const { last } = app.year;
  const focus = engine.currentProblem(app.year).focus;
  const meter = meterName(app, focus);
  const change = Math.abs(last.delta.oi) < NEGLIGIBLE
    ? tx(app, 'ui.noChange')
    : tx(app, 'ui.oiChange', { from: num(app, last.oiBefore), to: num(app, last.oiAfter), delta: signed(app, last.delta.oi) });
  return [
    { text: tx(app, 'year.res.chose', { name: tx(app, `year.${last.problemId}.${last.a}.name`) }), tone: 'white' },
    { text: change, tone: toneOf(last.delta.oi) },
    { text: tx(app, `year.why.${last.a}`, { meter }), tone: WHY_TONE[last.a] },
    ...last.notes.map((note) => ({ text: tx(app, `year.note.${note}`, { meter }), tone: 'cyan' })),
    ...(last.sets.length > 0 ? [{ text: tx(app, 'year.note.measured'), tone: 'green' }] : []),
  ];
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
  return [{ text: tx(app, 'year.close.decay'), tone: 'gray' }, ...adjustments, ...bills];
}

// One slot per month; null until the month has closed.
const chartBars = (run) => Array.from({ length: engine.MONTHS }, (_, i) => ({
  month: i + 1,
  oi: run.closes[i] ? run.closes[i].oi : null,
}));

function rescueLines(app) {
  const rescue = app.year.rescues[app.year.rescues.length - 1];
  const cause = rescue.cause === 'oi' ? 'oi' : rescue.cause;
  return [
    { text: tx(app, 'year.rescue.cause', { cause: tx(app, `year.fb.cause.${cause}`) }), tone: 'red' },
    { text: tx(app, 'year.rescue.body1'), tone: 'white' },
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
  if ('oiLost' in p) params.oiLost = num(app, p.oiLost);
  if ('value' in p) params.value = String(Math.round(p.value));
  if ('meter' in p) params.meter = meterName(app, p.meter);
  if ('problem' in p) params.problem = titleOf(app, p.problem);
  if ('cause' in p) params.cause = tx(app, `year.fb.cause.${p.cause}`);
  return tx(app, line.key, params);
}

function verdict(app) {
  const run = app.year;
  const oi = engine.oiOf(run);
  return {
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
// (each starting where the previous one ended) and the real OI.
function walkRows(app, walk) {
  const steps = walk.steps
    .filter((step) => Math.abs(step.pts) >= NEGLIGIBLE)
    .reduce((rows, step) => {
      const from = rows.length > 0 ? rows[rows.length - 1].to : walk.start;
      const label = tx(app, `line.short.${step.id}`);
      return [...rows, { label, from, to: from + step.pts, text: signed(app, step.pts), tone: step.pts > 0 ? 'green' : 'red' }];
    }, []);
  return [
    { label: tx(app, 'year.walk.plan'), from: 0, to: walk.start, text: `${num(app, walk.start)}%`, tone: 'gold' },
    ...steps,
    { label: tx(app, 'year.walk.real'), from: 0, to: walk.end, text: `${num(app, walk.end)}%`, tone: 'white' },
  ];
}

// The five rules of the year as plain sentences; the grades have a table of their own.
const rulesLines = (app) => [1, 2, 3, 4, 5].map((n) => tx(app, `year.rules.l${n}`));

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
const assumptionLines = (app) => [1, 2, 3, 4, 5].map((n) => tx(app, `year.assump.a${n}`));

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
  PROFILE_ITEMS,
  rankOf,
  yearCards,
  cardReview,
  crisisMeter,
  crisisLines,
  resultLines,
  meterDeltas,
  closeLines,
  chartBars,
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
