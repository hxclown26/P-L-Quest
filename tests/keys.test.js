'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { keyToAction, toLogical } = require('../src/ui/keys');
const layout = require('../src/ui/layout');

test('Enter, Space and Z confirm', () => {
  for (const key of ['Enter', ' ', 'z', 'Z']) assert.equal(keyToAction(key), 'confirm', key);
});

test('arrows and WASD move the cursor', () => {
  assert.equal(keyToAction('ArrowUp'), 'up');
  assert.equal(keyToAction('ArrowDown'), 'down');
  assert.equal(keyToAction('ArrowLeft'), 'left');
  assert.equal(keyToAction('ArrowRight'), 'right');
  assert.equal(keyToAction('w'), 'up');
  assert.equal(keyToAction('S'), 'down');
  assert.equal(keyToAction('a'), 'left');
  assert.equal(keyToAction('D'), 'right');
});

test('N, M, L, R and Escape open the note, mute, switch language, toggle the reviewer and go back', () => {
  assert.equal(keyToAction('n'), 'note');
  assert.equal(keyToAction('M'), 'mute');
  assert.equal(keyToAction('l'), 'lang');
  assert.equal(keyToAction('r'), 'review');
  assert.equal(keyToAction('R'), 'review');
  assert.equal(keyToAction('Escape'), 'back');
  assert.equal(keyToAction('x'), 'back');
});

test('the digits are keys of their own, so a game code can be typed on the year intro', () => {
  for (const digit of '0123456789') assert.equal(keyToAction(digit), `digit${digit}`);
});

test('unknown keys map to nothing', () => {
  assert.equal(keyToAction('F5'), null);
  assert.equal(keyToAction(undefined), null);
});

test('toLogical converts client coordinates to the 256x256 screen', () => {
  const rect = { left: 10, top: 20, width: 512, height: 512 };
  assert.deepEqual(toLogical(266, 276, rect), { x: 128, y: 128 });
  assert.deepEqual(toLogical(10, 20, rect), { x: 0, y: 0 });
});

test('toLogical survives a zero-size canvas', () => {
  assert.deepEqual(toLogical(5, 5, { left: 0, top: 0, width: 0, height: 0 }), { x: 0, y: 0 });
});

test('the footer maps x positions to its four buttons', () => {
  const y = layout.FOOTER.y + 5;
  assert.equal(layout.hitFooter(20, y), 'confirm');
  assert.equal(layout.hitFooter(120, y), 'note');
  assert.equal(layout.hitFooter(160, y), 'mute');
  assert.equal(layout.hitFooter(230, y), 'lang');
  assert.equal(layout.hitFooter(20, 100), null);
  assert.equal(layout.FOOTER.y + layout.FOOTER.h, layout.H, 'the footer closes the screen');
});

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const within = (inner, outer) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

test('the decision screen fits its windows above the footer without overlapping', () => {
  const names = ['STATEMENT', 'PLATE', 'ART', 'DASH', 'DIALOGUE'];
  const screen = { x: 0, y: 0, w: layout.W, h: layout.PLAY_H };
  for (const name of names) assert.ok(within(layout[name], screen), `${name} stays on the screen`);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      assert.equal(overlap(layout[names[i]], layout[names[j]]), false, `${names[i]} and ${names[j]} overlap`);
    }
  }
  const { STATEMENT, DASH, DIALOGUE } = layout;
  assert.equal(STATEMENT.y + STATEMENT.h, DASH.y + DASH.h, 'the two columns end on the same row');
  assert.ok(DIALOGUE.y > STATEMENT.y + STATEMENT.h, 'the dialogue starts below both columns');
  assert.equal(DIALOGUE.y + DIALOGUE.h + 2, layout.PLAY_H, 'and ends just above the footer');
});

test('the statement has a row for every line and a ratio under each result', () => {
  const rows = layout.STATEMENT_ROWS;
  assert.ok(rows.pitch >= 8, 'a row is at least eight pixels tall');
  assert.ok(rows.top + rows.pitch * 14 <= layout.STATEMENT.h, 'fourteen rows fit inside the window');
});

test('the answers are one row each, stacked inside the dialogue window, and hit-testable', () => {
  const rects = [0, 1, 2, 3].map(layout.answerRect);
  rects.forEach((r, i) => {
    assert.ok(within(r, layout.DIALOGUE), `answer ${i} is inside the dialogue`);
    if (i > 0) assert.ok(r.y >= rects[i - 1].y + rects[i - 1].h, `answer ${i} sits below the previous`);
  });
  rects.forEach((r, i) => assert.equal(layout.hitAnswer(r.x + 2, r.y + 1), i));
  assert.equal(layout.hitAnswer(rects[0].x + 2, 5), -1);
  assert.equal(layout.hitAnswer(rects[3].x + 2, rects[3].y + 1, 3), -1, 'a list of three has no fourth row');
  assert.equal(layout.hitAnswer(2, rects[0].y + 1), -1, 'the margin of the window is not an answer');
});

test('menu rows and play-style rows tile their lists without overlapping and are hit-testable', () => {
  const rows = [0, 1, 2].map((i) => layout.menuRowRect(i));
  for (let i = 1; i < rows.length; i += 1) assert.ok(rows[i].y >= rows[i - 1].y + rows[i - 1].h, `menu row ${i}`);
  const styles = Array.from({ length: 8 }, (_, i) => layout.profileRowRect(i));
  for (let i = 1; i < styles.length; i += 1) assert.ok(styles[i].y >= styles[i - 1].y + styles[i - 1].h, `style row ${i}`);
  assert.ok(rows[2].y + rows[2].h <= layout.MENU.panel.y + layout.MENU.panel.h, 'menu rows stay inside the panel');
  assert.ok(styles[7].y + styles[7].h <= layout.MENU.panel.y + layout.MENU.panel.h - 24, 'styles leave room for the description');
  assert.equal(layout.hitMenuRow(20, rows[1].y + 3), 1);
  assert.equal(layout.hitMenuRow(20, 5), -1);
  assert.equal(layout.hitProfileRow(20, styles[6].y + 1), 6);
  assert.equal(layout.hitProfileRow(20, styles[7].y + styles[7].h + 2), -1);
});

test('the two modes of a player fill the menu panel with taller rows that are hit-testable', () => {
  const rows = [0, 1].map((i) => layout.menuRowRect(i, 2));
  assert.ok(rows[0].h > layout.menuRowRect(0, 4).h, 'two rows are taller than four');
  assert.ok(rows[1].y >= rows[0].y + rows[0].h, 'the rows do not overlap');
  rows.forEach((r, i) => {
    assert.ok(r.y >= layout.MENU.panel.y && r.y + r.h <= layout.MENU.panel.y + layout.MENU.panel.h, `row ${i} stays inside the panel`);
    assert.equal(layout.hitMenuRow(r.x + 4, r.y + 4, 2), i);
  });
  assert.equal(layout.hitMenuRow(20, rows[1].y + rows[1].h + 6, 2), -1, 'below the second row there is nothing');
});

test('Backspace and Delete erase, C copies', () => {
  assert.equal(keyToAction('Backspace'), 'delete');
  assert.equal(keyToAction('Delete'), 'delete');
  assert.equal(keyToAction('c'), 'copy');
  assert.equal(keyToAction('C'), 'copy');
});

test('the four mode rows and the two workshop rows tile the panel and are hit-testable', () => {
  const rows = [0, 1, 2, 3].map((i) => layout.menuRowRect(i));
  for (let i = 1; i < rows.length; i += 1) assert.ok(rows[i].y >= rows[i - 1].y + rows[i - 1].h, `menu row ${i}`);
  assert.ok(rows[3].y + rows[3].h <= layout.MENU.panel.y + layout.MENU.panel.h, 'the fourth row stays inside the panel');
  for (let i = 0; i < 4; i += 1) assert.equal(layout.hitMenuRow(20, rows[i].y + 3, 4), i);
});

test('the three modes of a player and the five of the creator tile the panel and are hit-testable', () => {
  for (const count of [3, 5]) {
    const rows = Array.from({ length: count }, (_, i) => layout.menuRowRect(i, count));
    for (let i = 1; i < rows.length; i += 1) assert.ok(rows[i].y >= rows[i - 1].y + rows[i - 1].h, `${count} rows: row ${i} overlaps the one above`);
    rows.forEach((r, i) => {
      assert.ok(r.y >= layout.MENU.panel.y + 14, `${count} rows: row ${i} runs into the panel title`);
      assert.ok(r.y + r.h <= layout.MENU.panel.y + layout.MENU.panel.h - 6, `${count} rows: row ${i} leaves the panel`);
      assert.ok(r.h >= 22, `${count} rows: row ${i} is too short for two lines of text`);
      assert.equal(layout.hitMenuRow(r.x + 4, r.y + 2, count), i);
    });
    const last = rows[count - 1];
    assert.equal(layout.hitMenuRow(20, last.y + last.h + 3, count), -1, `${count} rows: nothing below the last row`);
  }
  const three = layout.menuRowRect(2, 3);
  assert.ok(three.y + three.h <= layout.MENU.panel.y + layout.MENU.panel.h - 20, 'three rows leave room for the fictional-data notice');
});

test('the setup fields do not overlap, stay inside the panel and are hit-testable', () => {
  const fields = ['name', 'code', 'start'].map((key) => layout.SETUP[key]);
  for (let i = 0; i < fields.length; i += 1) {
    const f = fields[i];
    assert.ok(f.x >= layout.MENU.panel.x && f.x + f.w <= layout.MENU.panel.x + layout.MENU.panel.w, `field ${i} is inside`);
    assert.ok(f.y >= layout.MENU.panel.y && f.y + f.h <= layout.MENU.panel.y + layout.MENU.panel.h, `field ${i} is inside`);
    if (i > 0) assert.ok(f.y >= fields[i - 1].y + fields[i - 1].h, `field ${i} sits below the previous`);
    assert.equal(layout.hitSetup(f.x + 2, f.y + 2), i);
  }
  assert.equal(layout.hitSetup(5, 5), -1);
});
