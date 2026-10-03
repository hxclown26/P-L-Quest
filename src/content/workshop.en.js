'use strict';

// Group workshop strings, English. Same keys and {placeholders} as workshop.es.js.

module.exports = Object.freeze({
  // Mode menu
  'menu.workshop': 'Group workshop',
  'menu.workshop.desc': 'Same year for all, with a ranking.',
  'ui.btn.paste': 'Paste: Ctrl+V',

  // Workshop menu
  'ws.title': 'GROUP WORKSHOP',
  'ws.play': 'Play with a code',
  'ws.play.desc': "Your team plays the host's year",
  'ws.rank': 'Team ranking',
  'ws.rank.desc': 'Host: paste the team results',

  // Team setup
  'ws.setup.title': 'YOUR TEAM',
  'ws.setup.name': 'Team',
  'ws.setup.code': 'Game code',
  'ws.setup.start': 'Start the year',
  'ws.setup.hint': 'Type your team name and the 4-digit code the host gives you.',
  'ws.setup.needCode': 'The 4-digit code is missing.',
  'ws.team.default': 'TEAM',
  'year.intro.code': 'Game code: {code}',
  'year.intro.code.short': 'Code {code}',

  // Result code (last page of a workshop year)
  'ws.result.title': 'RESULT CODE',
  'ws.result.team': 'Team {name} - Game {code}',
  'ws.result.body': 'Send it to the host in a chat.',
  'ws.result.copy': 'C: copy the code',
  'ws.result.copied': 'Copied!',

  // Ranking
  'rank.title': 'TEAM RANKING',
  'rank.code': 'Game {code}',
  'rank.empty': "Paste each team's code (Ctrl+V).",
  'rank.entry': 'Code:',
  'rank.entry.empty': 'paste here (Ctrl+V)',
  'rank.hint': 'Arrows: view/team  Backspace: remove',
  'rank.chart': 'OI % by month (plan 15%)',
  'rank.other': 'other game',
  'rank.col.team': 'Team',
  'rank.col.result': 'Result',
  'rank.col.oi': 'OI %',
  'rank.col.weak': 'Weak',
  'rank.res.excellent': 'EXCELLENT',
  'rank.res.good': 'GOOD',
  'rank.res.fair': 'FAIR',
  'rank.res.bad': 'BAD',
  'rank.res.terrible': 'TERRIBLE',
  'rank.res.bankrupt': 'BANKRUPT',
  'rank.voice.cliente': 'CLI',
  'rank.voice.planta': 'PLT',
  'rank.voice.entorno': 'ENV',
  'rank.voice.estrategia': 'STR',
  'rank.split.title': 'Where they split the most',
  'rank.split.none': 'No disagreements to show yet.',
  'rank.map.title': 'Decisions of {name}',
  'rank.map.rescued': 'Rescue: mo. {m}',
  'rank.map.bankrupt': 'Bankrupt: mo. {m}',
  'rank.added': 'Added: {name}',
  'rank.updated': 'Updated: {name}',
  'rank.removed': 'Removed: {name}',
  'rank.err.format': 'That does not look like a result code.',
  'rank.err.checksum': 'The code has a typing mistake.',
  'rank.err.version': 'It is from another version of the game.',
  'rank.err.incomplete': 'The code is incomplete.',
  'rank.err.full': 'At most 8 teams.',
  'rank.err.other': '{name} played another game ({code}).',
});
