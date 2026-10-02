'use strict';

// What the facilitator sees: each team's year replayed from its result code, the ranking and the
// problems where the teams chose most differently. Pure functions over plain data.

const rules = require('./rules');
const { replay } = require('./replay');
const { PROBLEMS_BY_ID, AUTHORING } = require('./problems');
const { oiOf } = require('./engine');

const emptyCounts = () => Object.fromEntries(AUTHORING.map((a) => [a, 0]));

// Replays one decoded code ({ name, code, choices }) and boils the year down to what is compared.
function analyze({ name, code, choices }) {
  const { run, complete } = replay(code, choices);
  if (!complete) return { ok: false, reason: 'incomplete' };
  const counts = run.history.reduce((acc, h) => ({ ...acc, [h.a]: acc[h.a] + 1 }), emptyCounts());
  return {
    ok: true,
    name,
    code,
    outcome: run.outcome,
    margin: oiOf(run),
    meters: run.meters,
    weakest: Math.min(...rules.METER_KEYS.map((key) => run.meters[key])),
    rescued: run.rescued,
    rescueMonth: run.rescueMonth,
    bankruptMonth: run.bankruptMonth,
    counts,
    series: run.closes.map((close) => close.oi),
    decisions: run.history.map((h) => ({
      monthIdx: h.monthIdx,
      problemId: h.problemId,
      voice: PROBLEMS_BY_ID[h.problemId].voice,
      a: h.a,
    })),
  };
}

// Better outcome first, then the higher OI margin, then the stronger weakest meter, then name.
const strength = (team) => rules.OUTCOMES.length - rules.OUTCOMES.indexOf(team.outcome);
const compare = (a, b) => strength(b) - strength(a)
  || b.margin - a.margin
  || b.weakest - a.weakest
  || a.name.localeCompare(b.name);

const rankTeams = (teams) => [...teams].sort(compare);

// The problems where the teams disagreed most. The score is how many teams did not pick the answer
// most teams picked, so a 2-2 split scores higher than a 3-1 split.
function splits(teams, limit = 6) {
  const order = teams.flatMap((team) => team.decisions.map((d) => d.problemId))
    .filter((id, i, all) => all.indexOf(id) === i);
  return order
    .map((problemId) => {
      const byTeam = teams.map((team) => (team.decisions.find((d) => d.problemId === problemId) || {}).a ?? null);
      const answered = byTeam.filter((a) => a !== null);
      const counts = answered.reduce((acc, a) => ({ ...acc, [a]: acc[a] + 1 }), emptyCounts());
      return {
        problemId,
        voice: PROBLEMS_BY_ID[problemId] ? PROBLEMS_BY_ID[problemId].voice : null,
        byTeam,
        counts,
        answered: answered.length,
        score: answered.length - Math.max(...Object.values(counts)),
      };
    })
    .filter((item) => item.answered >= 2 && item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { analyze, rankTeams, splits };
