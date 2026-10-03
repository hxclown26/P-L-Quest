'use strict';

// Group workshop strings, Spanish. Keep the same keys and {placeholders} as workshop.en.js.

module.exports = Object.freeze({
  // Mode menu
  'menu.workshop': 'Taller en grupo',
  'menu.workshop.desc': 'Mismo año para todos y un ranking.',
  'ui.btn.paste': 'Pegar: Ctrl+V',

  // Workshop menu
  'ws.title': 'TALLER EN GRUPO',
  'ws.play': 'Jugar con código',
  'ws.play.desc': 'Tu equipo juega el año del facilitador',
  'ws.rank': 'Ranking de equipos',
  'ws.rank.desc': 'Facilitador: pega los resultados',

  // Team setup
  'ws.setup.title': 'TU EQUIPO',
  'ws.setup.name': 'Equipo',
  'ws.setup.code': 'Código de partida',
  'ws.setup.start': 'Empezar el año',
  'ws.setup.hint': 'Escribe el nombre de tu equipo y el código de 4 dígitos que da el facilitador.',
  'ws.setup.needCode': 'Faltan los 4 dígitos del código.',
  'ws.team.default': 'EQUIPO',
  'year.intro.code': 'Código de partida: {code}',
  'year.intro.code.short': 'Cód. {code}',

  // Result code (last page of a workshop year)
  'ws.result.title': 'CÓDIGO DE RESULTADO',
  'ws.result.team': 'Equipo {name} - Partida {code}',
  'ws.result.body': 'Envíaselo al facilitador por chat.',
  'ws.result.copy': 'C: copiar el código',
  'ws.result.copied': '¡Copiado!',

  // Ranking
  'rank.title': 'RANKING DE EQUIPOS',
  'rank.code': 'Partida {code}',
  'rank.empty': 'Pega el código de cada equipo (Ctrl+V).',
  'rank.entry': 'Código:',
  'rank.entry.empty': 'pega aquí (Ctrl+V)',
  'rank.hint': 'Flechas: vista/equipo  Retroceso: quitar',
  'rank.chart': 'OI % por mes (plan 15%)',
  'rank.other': 'otra partida',
  'rank.col.team': 'Equipo',
  'rank.col.result': 'Resultado',
  'rank.col.oi': 'OI %',
  'rank.col.weak': 'Débil',
  'rank.res.excellent': 'EXCELENTE',
  'rank.res.good': 'BUENO',
  'rank.res.fair': 'MEDIANO',
  'rank.res.bad': 'MALO',
  'rank.res.terrible': 'MUY MALO',
  'rank.res.bankrupt': 'QUIEBRA',
  'rank.voice.cliente': 'CLI',
  'rank.voice.planta': 'PLA',
  'rank.voice.entorno': 'ENT',
  'rank.voice.estrategia': 'EST',
  'rank.split.title': 'Donde más discreparon',
  'rank.split.none': 'Aún no hay desacuerdos que mostrar.',
  'rank.map.title': 'Decisiones de {name}',
  'rank.map.rescued': 'Rescate mes {m}',
  'rank.map.bankrupt': 'Quiebra mes {m}',
  'rank.added': 'Agregado: {name}',
  'rank.updated': 'Actualizado: {name}',
  'rank.removed': 'Quitado: {name}',
  'rank.err.format': 'No parece un código de resultado.',
  'rank.err.checksum': 'El código tiene un error de tipeo.',
  'rank.err.version': 'Viene de otra versión del juego.',
  'rank.err.incomplete': 'El código está incompleto.',
  'rank.err.full': 'Máximo 8 equipos.',
  'rank.err.other': '{name} jugó otra partida ({code}).',
});
