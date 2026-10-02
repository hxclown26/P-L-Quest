'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { build, bundle } = require('../build');

test('the bundle is valid JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(bundle()));
});

test('every source module is registered in the bundle', () => {
  const code = bundle();
  for (const id of ['model', 'engine', 'main', 'ui/app', 'render/index', 'content/es', 'content/en', 'render/scenes/battle']) {
    assert.ok(code.includes(`__d(${JSON.stringify(id)}`), `${id} missing`);
  }
});

test('the page is one self-contained file: no network, no other files', () => {
  const out = path.join(os.tmpdir(), `plquest-${process.pid}.html`);
  const { bytes } = build(out);
  const html = fs.readFileSync(out, 'utf8');
  fs.unlinkSync(out);
  assert.ok(!/https?:\/\//i.test(html), 'no external URLs');
  assert.ok(!/<script[^>]+src=/i.test(html), 'no external scripts');
  assert.ok(!/<link[^>]+href=/i.test(html), 'no external stylesheets');
  assert.ok(html.includes('<canvas id="screen"'));
  assert.ok(bytes < 600 * 1024, `page is ${bytes} bytes`);
});

test('the placeholders in the template are all replaced', () => {
  const out = path.join(os.tmpdir(), `plquest-ph-${process.pid}.html`);
  build(out);
  const html = fs.readFileSync(out, 'utf8');
  fs.unlinkSync(out);
  assert.ok(!html.includes('/*STYLES*/') && !html.includes('/*SCRIPT*/'));
});

test('the default build writes the Demo 5 file and never overwrites the earlier demos', () => {
  const { DEFAULT_OUT } = require('../build');
  assert.equal(path.basename(DEFAULT_OUT), 'pl-quest-demo5.html');
  for (const frozen of ['pl-quest.html', 'pl-quest-demo2.html', 'pl-quest-demo3.html', 'pl-quest-demo4.html']) {
    assert.notEqual(path.basename(DEFAULT_OUT), frozen);
  }
});

test('the page says Demo 5', () => {
  const template = fs.readFileSync(path.join(__dirname, '..', 'src', 'template.html'), 'utf8');
  assert.match(template, /<title>P&amp;L Quest - Demo 5<\/title>/);
  assert.ok(!/Demo [234]/i.test(template));
});

// The landing page names the build that is published, which can lag the one being built.
test('the landing page of the published site opens a build that exists and keeps what follows the address', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const target = /location\.replace\('([^']+)' \+ location\.search/.exec(html)?.[1];
  assert.ok(target, 'it jumps to a build and keeps ?creator');
  assert.ok(fs.existsSync(path.join(__dirname, '..', target)), `${target} is in the repo`);
  assert.ok(html.includes(`href="${target}"`), 'and offers a link in case the jump does not happen');
  assert.match(html, /<title>P&amp;L Quest - Demo \d<\/title>/);
});

// Demo 5 is the published build now: the one link that gets shared must not open the demo before it.
test('the landing page of the published site opens Demo 5 and says so in its title and its preview', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /location\.replace\('pl-quest-demo5\.html' \+ location\.search/);
  assert.match(html, /<title>P&amp;L Quest - Demo 5<\/title>/);
  assert.match(html, /<meta property="og:title" content="P&amp;L Quest - Demo 5">/);
});

test('the year mode modules are registered in the bundle', () => {
  const code = bundle();
  for (const id of ['year/engine', 'year/showcase', 'ui/year-app', 'ui/menu-app', 'ui/demo-app', 'render/year/index']) {
    assert.ok(code.includes(`__d(${JSON.stringify(id)}`), `${id} missing`);
  }
});
