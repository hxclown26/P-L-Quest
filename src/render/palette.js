'use strict';

// One palette for the whole game. Tone names (white, red, green...) double as keys, so a
// message tagged tone: 'red' is drawn with PALETTE.red.
module.exports = Object.freeze({
  ink: '#0c0c1c',
  white: '#f8f8f8',
  gray: '#a8b0c8',
  dim: '#6a7290',
  gold: '#f8d048',
  red: '#f05858',
  green: '#58e088',
  cyan: '#68d8f8',
  orange: '#f89848',
  ratio: '#86b4ff',
  header: '#2e6fd8',
  winTop: '#2c40a8',
  winBottom: '#0c1452',
  winEdge: '#f4f4fa',
  winShade: '#7284d8',
  selTop: '#5470e0',
  selBottom: '#1c2a80',
  area: Object.freeze({
    sales: '#d85858',
    procurement: '#d8963c',
    ops: '#44a868',
    finance: '#4a92dc',
    mgmt: '#9a64cc',
  }),
});
