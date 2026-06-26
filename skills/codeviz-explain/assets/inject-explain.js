#!/usr/bin/env node
// inject-explain — add the opt-in, on-device "select-to-explain" layer to generated codeviz HTML.
// Inlines explain.css + explain.js before </body> of every page in the output dir (idempotent).
//   node inject-explain.js [output-dir]      (default: docs/onboarding)
const fs = require('fs'), path = require('path');
const DIR = path.resolve(process.argv[2] || 'docs/onboarding');
const A = __dirname;
const MARK = '<!-- cv-explain -->';
const css = fs.readFileSync(path.join(A, 'explain.css'), 'utf8');
const js = fs.readFileSync(path.join(A, 'explain.js'), 'utf8');
if (js.indexOf('</script') >= 0 || css.indexOf('</style') >= 0) { console.error('✗ layer contains a closing tag — refusing to inline'); process.exit(1); }
const BLOCK = `${MARK}\n<style>\n${css}</style>\n<script>\n${js}</script>\n`;

const TARGETS = ['system-map.html', 'data-model.html', 'index.html', 'schema.html', 'api.html'];
let n = 0;
TARGETS.forEach(f => {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) return;
  let h = fs.readFileSync(p, 'utf8');
  if (h.includes(MARK)) { console.log('  · ' + f + ' (already has it)'); return; }
  h = h.includes('</body>') ? h.replace('</body>', BLOCK + '</body>') : h + BLOCK;
  fs.writeFileSync(p, h); n++; console.log('  + ' + f);
});
console.log(n ? `✓ select-to-explain injected into ${n} page(s) in ${DIR}` : 'nothing to inject (no generated HTML found in ' + DIR + ')');
