'use strict';

// Pure helpers for the ranking screen: who is listed where, and what the notices say.

const { rankTeams } = require('../year/standings');
const { tx } = require('./tx');

const MAX_TEAMS = 8;
const TEAM_COLORS = 8;

// The teams that played the ranking's game, best first, then the ones that played another game.
function rankedTeams(rank) {
  const ranked = rankTeams(rank.teams.filter((team) => team.code === rank.code));
  const others = rank.teams.filter((team) => team.code !== rank.code);
  return { ranked, others, all: [...ranked, ...others] };
}

// Each team keeps its colour for the whole session: the first one nobody is using.
const firstFreeColor = (teams) => [...Array(TEAM_COLORS).keys()].find((i) => !teams.some((t) => t.color === i)) ?? 0;

const noticeText = (app, notice) => (notice ? tx(app, notice.key, notice.params) : null);

module.exports = { MAX_TEAMS, TEAM_COLORS, rankedTeams, firstFreeColor, noticeText };
