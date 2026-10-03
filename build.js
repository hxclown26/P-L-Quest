'use strict';

// Bundles src/ into one self-contained pl-quest-demo6.html (no network, no other files).
// The earlier demos (pl-quest.html and pl-quest-demo2.html to pl-quest-demo5.html) are frozen
// copies: the default output never touches them.
// The sources are plain CommonJS modules so Node can test them; here each one is wrapped
// in a tiny module registry and inlined into the page.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const ENTRY = 'main';
const DEFAULT_OUT = path.join(ROOT, 'pl-quest-demo6.html');
const REQUIRE = /require\((['"])(\.{1,2}\/[^'"]+)\1\)/g;

// Everything under src/ except the HTML template and the stylesheet, in a stable order.
function listModules(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listModules(full);
      return entry.name.endsWith('.js') ? [full] : [];
    })
    .sort();
}

const moduleId = (file) => path.relative(SRC, file).replace(/\\/g, '/').replace(/\.js$/, '');

// Rewrites relative require() calls to the resolved module id used by the registry.
function rewrite(source, file) {
  return source.replace(REQUIRE, (match, quote, request) => {
    const target = path.resolve(path.dirname(file), request);
    const resolved = fs.existsSync(`${target}.js`) ? target : path.join(target, 'index');
    return `__r(${JSON.stringify(moduleId(`${resolved}.js`))})`;
  });
}

const RUNTIME = `
var __defs = {}, __cache = {};
function __d(id, fn) { __defs[id] = fn; }
function __r(id) {
  if (__cache[id]) return __cache[id].exports;
  if (!__defs[id]) throw new Error('Missing module: ' + id);
  var module = __cache[id] = { exports: {} };
  __defs[id](module, module.exports, __r);
  return module.exports;
}
`;

function bundle() {
  const modules = listModules(SRC).map((file) => {
    const body = rewrite(fs.readFileSync(file, 'utf8'), file);
    return `__d(${JSON.stringify(moduleId(file))}, function (module, exports, __r) {\n${body}\n});`;
  });
  return `(function () {\n${RUNTIME}\n${modules.join('\n')}\n__r(${JSON.stringify(ENTRY)});\n})();`;
}

function build(outFile = DEFAULT_OUT) {
  const template = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');
  const styles = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
  const html = template
    .replace('/*STYLES*/', () => styles)
    .replace('/*SCRIPT*/', () => bundle().replace(/<\/script/gi, '<\\/script'));
  fs.writeFileSync(outFile, html);
  return { file: outFile, bytes: Buffer.byteLength(html) };
}

if (require.main === module) {
  const result = build(process.argv[2]);
  process.stdout.write(`Built ${result.file} (${(result.bytes / 1024).toFixed(1)} KB)\n`);
}

module.exports = { build, bundle, DEFAULT_OUT };
