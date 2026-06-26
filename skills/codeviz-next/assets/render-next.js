#!/usr/bin/env node
// render-next — read a generated codeviz system-map.html and emit `next-steps.html`: an advisor that
// suggests the next component to build / visualize. It reads the map's real state (partial & planned
// nodes, whether a data model / scenarios exist) and blends that with a pool of next-visualization
// ideas. The page surfaces a DIFFERENT suggestion every time it's opened (a persisted, reshuffling
// queue in localStorage) plus an "Another idea" button. Self-contained — Node built-ins only.
//   node render-next.js [output-dir]      (default: docs/onboarding)
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = path.resolve(process.argv[2] || 'docs/onboarding');
const MAP = path.join(DIR, 'system-map.html');
if (!fs.existsSync(MAP)) { console.error('✗ no system-map.html in', DIR, '\n  run /codeviz first.'); process.exit(1); }
const src = fs.readFileSync(MAP, 'utf8');
function extract(name) { const m = src.match(new RegExp('var ' + name + ' = ([\\s\\S]*?\\n  [\\}\\]]);')); if (!m) return null; const ctx = {}; try { vm.runInNewContext('out = ' + m[1], ctx); return ctx.out; } catch (e) { return null; } }
const NODES = extract('NODES') || {}, DOMAINS = extract('DOMAINS') || [], EDGES = extract('EDGES') || [], DATAMODEL = extract('DATAMODEL') || {}, SCENARIOS = extract('SCENARIOS') || [];
const rootBlock = (src.match(/:root\{[\s\S]*?\}/) || [':root{}'])[0];
const project = (src.match(/class="brand"[^>]*>([^<]+)</) || [, 'Codeviz'])[1].trim();
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- read the map's state ---------- */
const ids = Object.keys(NODES);
const byStatus = { built: [], partial: [], planned: [] };
ids.forEach(id => { const s = (NODES[id].status || 'built'); (byStatus[s] || (byStatus[s] = [])).push(id); });
const partials = (byStatus.partial || []).concat(byStatus.planned || []);
const hasDM = Object.keys(DATAMODEL).length > 0;
const scenCount = SCENARIOS.length;
const lbl = id => NODES[id] ? NODES[id].label : id;
// a datastore-ish node not yet modeled
const storeLike = ids.filter(id => /db|database|postgres|mysql|cache|redis|store|queue|kafka|search|index|s3|blob|mongo|warehouse/i.test((NODES[id].sub || '') + ' ' + (NODES[id].label || '')));
const unmodeledStores = storeLike.filter(id => !DATAMODEL[id]);

/* ---------- build the suggestion pool ---------- */
const S = [];
const add = (o) => S.push(o);

// 1) tailored to THIS map — partial / planned components
partials.forEach(id => {
  const n = NODES[id], planned = n.status === 'planned';
  add({
    kind: planned ? 'Planned component' : 'Partial component', area: n.label,
    title: `Build out “${n.label}” — it's marked ${n.status}`,
    why: `${n.label} is on the map but ${planned ? 'not built yet' : 'only partly built'}. A diagram is only as trustworthy as its least-finished box; closing this one raises confidence in the whole picture.`,
    how: [`Confirm its real responsibilities and the calls in/out of it`, `Walk one request that passes through it (\`/codeviz steps\`)`, n.status === 'planned' ? `When it ships, flip its status to \`built\`` : `Fill the gaps, then flip \`partial\`→\`built\``],
    impact: planned ? 2 : 3, effort: 2
  });
});
// 2) tailored — data layer gaps
if (!hasDM) add({ kind: 'Data layer', area: 'datastores', title: 'Model the data behind your datastores', why: 'The systems are mapped but the data inside them is not. The ER view is where most "how does this actually work?" questions get answered.', how: ['Run `/codeviz-datamodel` to draw each store\'s ER diagram from the real schema', 'Start at `standard` grain; deepen the stores that matter'], impact: 3, effort: 2 });
else if (unmodeledStores.length) add({ kind: 'Data layer', area: unmodeledStores.map(lbl).join(', '), title: `Model the remaining store(s): ${unmodeledStores.map(lbl).join(', ')}`, why: 'Some datastores still have no ER diagram, so part of the data story is missing.', how: ['Run `/codeviz-datamodel` and add a `DATAMODEL` entry per remaining store'], impact: 2, effort: 2 });
// 3) tailored — flows
if (scenCount < 2) add({ kind: 'Scenario', area: 'request flows', title: 'Add a second flow — a failure path', why: `The tour covers ${scenCount === 1 ? 'one happy path' : 'no flows yet'}. The flows people remember are the ones that go wrong: a timeout, a retry, a cache miss, a dead-letter.`, how: ['Author a `SCENARIOS` entry for an error/retry path', 'Mark fire-and-forget hops `oneway:true`'], impact: 3, effort: 2 });

// 4) the standing pool — "what visualization to build next" (always available, keeps each open fresh)
const POOL = [
  { kind: 'Visualization', title: 'A sequence / swimlane view of a scenario', why: 'The tour shows hops on the map; a vertical sequence diagram shows ordering and concurrency — who waits on whom — which the map can\'t express.', how: ['Render each `SCENARIOS` flow as lanes (one per system) with time flowing down', 'Show request and response as paired arrows; mark async hops'], impact: 3, effort: 3 },
  { kind: 'Visualization', title: 'A latency heatmap over time', why: 'Edges carry a latency number but it\'s static. Animating it across a simulated minute shows where time actually goes under load.', how: ['Drive edge colour by a play-head over sampled latencies', 'Reuse the viridis ramp already in the atlas'], impact: 2, effort: 3 },
  { kind: 'Visualization', title: 'A dependency matrix', why: 'A node-link map hides coupling once there are many edges. An N×N who-calls-whom grid makes hubs, cycles and hidden fan-out obvious at a glance.', how: ['Build a matrix from `EDGES`; mark sync vs async vs back-edges', 'Sort rows by layer so clusters surface'], impact: 2, effort: 2 },
  { kind: 'Visualization', title: 'Error & retry paths', why: 'The happy path is drawn; the failure paths (timeouts, retries, circuit-breakers, dead-letter queues) are where real incidents live and they\'re invisible today.', how: ['Add a `style:\'error\'` edge kind and a Failure overlay toggle', 'Author one "what breaks" scenario with `/codeviz-scenario`'], impact: 3, effort: 2 },
  { kind: 'Visualization', title: 'A deployment / topology layer', why: 'The map shows logical systems, not where they run. An infra overlay (region, AZ, pod, replicas) answers "what\'s co-located, what\'s a network hop?".', how: ['Group nodes by a `deploy` field (region/cluster)', 'Add a Logical ↔ Physical toggle'], impact: 2, effort: 3 },
  { kind: 'Data', title: 'Data lineage for one important field', why: 'Schemas show structure; lineage shows life. Tracing a single field from where it\'s written to everywhere it\'s read is the clearest way to teach a data model.', how: ['Pick a field (e.g. `orders.total_cents`)', 'Draw its path: writer → store → readers, across services'], impact: 3, effort: 3 },
  { kind: 'Visualization', title: 'A blast-radius simulator', why: 'Static maps don\'t answer "what happens if X dies?". Click a node and propagate failure up the call graph to see what degrades.', how: ['You already have `/codeviz-scenario` — wire a click to compute & highlight the blast radius', 'Show degraded vs down vs unaffected'], impact: 3, effort: 2 },
  { kind: 'Visualization', title: 'Caching map (what\'s cached, where, TTLs)', why: 'Caches are where correctness bugs hide. Surfacing every cache, its key pattern, TTL and invalidation trigger turns folklore into a diagram.', how: ['Tag cache reads/writes on edges', 'Annotate each cache node with TTL + invalidation'], impact: 2, effort: 2 },
  { kind: 'Visualization', title: 'Read path vs write path', why: 'Most systems behave very differently reading vs writing. Splitting the two makes CQRS, replicas and write-amplification legible.', how: ['Tag edges read/write; add a toggle that dims the other path'], impact: 2, effort: 2 },
  { kind: 'Visualization', title: 'Auth / identity overlay', why: 'Security reviews ask "where is identity checked?". An overlay showing which hops carry a token and which verify it answers that in one view.', how: ['Mark edges that carry/verify identity', 'Highlight the trust boundary'], impact: 2, effort: 2 },
  { kind: 'Visualization', title: 'Capacity annotations (RPS · p99 · fan-out)', why: 'Numbers turn a pretty diagram into a capacity model. Per-edge RPS and fan-out reveal the amplification points before they page someone.', how: ['Extend `EDGES` with rps/p99', 'Size or label edges by throughput'], impact: 2, effort: 2 },
  { kind: 'Visualization', title: 'Event / stream choreography', why: 'For anything event-driven, request/response is the wrong lens. A topic-and-subscriber view shows who emits and who reacts.', how: ['Model topics as nodes; producers/consumers as edges', 'Show at-least-once vs exactly-once where it matters'], impact: 2, effort: 3 },
  { kind: 'Depth', title: 'A glossary page', why: 'Every tour step defines jargon inline; collecting those terms into one searchable glossary gives newcomers a single place to look things up.', how: ['Harvest the `learn`/`terms` pairs across `SCENARIOS`', 'Render an A–Z, linked from the nav'], impact: 1, effort: 1 },
  { kind: 'Depth', title: 'A "Day 1 / Week 1" reading path', why: 'A map is a reference, not a curriculum. A guided order ("start here, then this") gets a new hire productive faster than free exploration.', how: ['Curate an ordered path through the map + pages', 'Surface it on `index.html`'], impact: 2, effort: 1 },
  { kind: 'Visualization', title: 'Cost overlay ($ per service / per call)', why: 'Architecture decisions are cost decisions. Putting dollars on the diagram makes the expensive paths impossible to ignore.', how: ['Annotate nodes/edges with unit cost', 'Add a Cost view that scales by spend'], impact: 2, effort: 2 },
  { kind: 'Visualization', title: 'A cold-start trace', why: 'The first request after a deploy behaves nothing like the thousandth (empty caches, cold pools, JIT). A dedicated trace teaches that gap.', how: ['Author a cold-start `SCENARIOS` flow', 'Contrast its latencies with the warm path'], impact: 2, effort: 2 },
  { kind: 'Depth', title: 'Make the atlas usable on a phone', why: 'Onboarding happens on couches and commutes. A responsive map widens who actually reads it.', how: ['Add touch pan/zoom; collapse panels on small screens'], impact: 1, effort: 2 },
  { kind: 'Visualization', title: 'Test-coverage overlay', why: 'Showing which paths integration tests actually exercise turns the map into a coverage gap-finder, not just documentation.', how: ['Tag covered edges from a coverage/report file', 'Dim the untested paths'], impact: 2, effort: 3 },
];
POOL.forEach(add);
S.forEach((o, i) => o.id = i);

/* ---------- HTML ---------- */
const dot = (n) => '<span class="meter">' + [1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('') + '</span>';
const built = (byStatus.built || []).length;
const css = `
  *{box-sizing:border-box} html,body{margin:0} body{background:var(--bg);color:var(--ink);font:14.5px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;min-height:100vh}
  .wrap{max-width:760px;margin:0 auto;padding:30px 22px 60px}
  .top{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px}
  .brand{font-weight:800;color:var(--accent);font-size:15px} h1{font-size:23px;margin:2px 0 4px}
  .lede{color:var(--sub);max-width:640px;margin:0 0 18px}
  .cov{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 22px}
  .chip{font-size:12px;color:var(--sub);border:1px solid var(--line);border-radius:999px;padding:3px 11px;background:var(--panel)} .chip b{color:var(--ink)}
  .chip.warn{color:var(--warn,#f5b34a);border-color:var(--warn,#f5b34a)}
  .card{position:relative;border:1px solid var(--line);border-top:3px solid var(--accent);border-radius:15px;background:var(--card);box-shadow:0 12px 40px rgba(0,0,0,.32);padding:22px 24px;min-height:240px}
  .kindrow{display:flex;align-items:center;gap:10px;margin-bottom:11px}
  .kind{font-size:10.5px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#0b1208;background:var(--accent);border-radius:6px;padding:3px 9px}
  .kind.partial{background:var(--warn,#f5b34a)} .kind.idea{background:var(--accent)}
  .area{color:var(--sub);font-size:12.5px} .area b{color:var(--ink)}
  .st h2{font-size:20px;margin:2px 0 10px;line-height:1.3}
  .why{color:#cfd3c8;margin:0 0 15px}
  .how{margin:0 0 6px;padding:0;list-style:none}
  .how li{position:relative;padding:5px 0 5px 24px;color:var(--ink)} .how li:before{content:"→";position:absolute;left:2px;color:var(--accent);font-weight:800}
  .how code,.why code{background:rgba(255,255,255,0.09);color:var(--accent2,#b6e890);padding:1px 6px;border-radius:5px;font-size:12.5px}
  .gauges{display:flex;gap:22px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
  .gauge{font-size:11.5px;color:var(--sub);text-transform:uppercase;letter-spacing:.4px}
  .meter{display:inline-flex;gap:3px;margin-left:7px;vertical-align:-1px} .meter i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.16)} .meter i.on{background:var(--accent)}
  .gauge.effort .meter i.on{background:var(--warn,#f5b34a)}
  .controls{display:flex;align-items:center;gap:14px;margin-top:18px}
  button.again{appearance:none;font:700 13.5px inherit;border-radius:10px;padding:10px 18px;cursor:pointer;border:1px solid var(--accent);background:var(--accent);color:#0b1208}
  button.again:hover{filter:brightness(1.06)}
  .count{color:var(--sub);font-size:12.5px} .count b{color:var(--ink)}
  details.partials{margin-top:26px;border:1px solid var(--line);border-radius:11px;background:var(--panel);overflow:hidden}
  details.partials>summary{cursor:pointer;list-style:none;padding:12px 15px;font-weight:700;color:var(--ink)} details.partials>summary::-webkit-details-marker{display:none}
  details.partials .pl{padding:2px 15px 14px;color:var(--sub);font-size:13px}
  details.partials .pl span{display:inline-block;border:1px solid var(--line);border-radius:7px;padding:2px 9px;margin:3px 5px 3px 0;color:var(--ink)} .pl span.planned{color:var(--warn,#f5b34a);border-color:var(--warn,#f5b34a)}
  .foot{color:var(--sub);font-size:12px;margin-top:26px}`;
const covChips = [
  `<span class="chip"><b>${ids.length}</b> systems</span>`,
  `<span class="chip"><b>${built}</b> built</span>`,
  (byStatus.partial || []).length ? `<span class="chip warn"><b>${byStatus.partial.length}</b> partial</span>` : '',
  (byStatus.planned || []).length ? `<span class="chip warn"><b>${byStatus.planned.length}</b> planned</span>` : '',
  `<span class="chip">data model: <b>${hasDM ? 'yes' : 'not yet'}</b></span>`,
  `<span class="chip"><b>${scenCount}</b> flow${scenCount === 1 ? '' : 's'}</span>`,
].filter(Boolean).join('');
const partialsList = partials.length ? `<details class="partials"><summary>Unfinished components (${partials.length})</summary><div class="pl">${partials.map(id => `<span class="${NODES[id].status === 'planned' ? 'planned' : ''}">${esc(lbl(id))} · ${esc(NODES[id].status)}</span>`).join('')}</div></details>` : '';
const SUGG_JSON = JSON.stringify(S.map(o => ({ kind: o.kind, area: o.area || '', title: o.title, why: o.why, how: o.how, impact: o.impact, effort: o.effort })));
const SIG = require('crypto').createHash('sha1').update(SUGG_JSON).digest('hex').slice(0, 8);   // discard a stored queue if the suggestions changed

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(project)} — What to build next</title><style>${rootBlock}
:root{--accent2:var(--cv-comet,#b6e890);--warn:var(--cv-warn,#f5b34a)}
${css}</style></head><body><div class="wrap">
<div class="top"><span class="brand">${esc(project)}</span></div>
<h1>What to build next</h1>
<p class="lede">A fresh suggestion each time you open this page — for the next component to build or visualize, weighted to what's still unfinished on your map.</p>
<div class="cov">${covChips}</div>
<div class="card" id="card"></div>
<div class="controls"><button class="again" id="again">Another idea →</button><span class="count" id="count"></span></div>
${partialsList}
<div class="foot">Suggestions blend your map's real state (partial/planned nodes, missing data model or flows) with a rotating pool of visualization ideas. Pick the one that fits; ignore the rest.</div>
</div>
<script>
var SUGG = ${SUGG_JSON};
var SIG = ${JSON.stringify(SIG)};   // content signature — ignore a stored queue if the suggestion set changed
var KEY = 'cv-next-' + ${JSON.stringify(project.toLowerCase().replace(/[^a-z0-9]+/g, '-'))};
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function load(){try{var d=JSON.parse(localStorage.getItem(KEY));if(d&&d.sig===SIG&&d.order&&d.order.length===SUGG.length)return d;}catch(e){}return null;}
function save(d){try{d.sig=SIG;localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}
var data = load() || {order:shuffle(SUGG.map(function(_,i){return i;})),idx:0};
var order = data.order, idx = data.idx % order.length;
function meter(n,cls){var h='<span class="meter">';for(var i=1;i<=3;i++)h+='<i class="'+(i<=n?'on':'')+'"></i>';return h+'</span>';}
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function md(s){return esc(s).replace(/\`([^\`]+)\`/g,'<code>$1</code>');}
function paint(){
  var s = SUGG[order[idx]];
  var kc = /Partial|Planned/.test(s.kind) ? 'partial' : 'idea';
  document.getElementById('card').innerHTML =
    '<div class="kindrow"><span class="kind '+kc+'">'+esc(s.kind)+'</span>'+(s.area?'<span class="area">'+md(s.area)+'</span>':'')+'</div>'+
    '<div class="st"><h2>'+md(s.title)+'</h2><p class="why">'+md(s.why)+'</p>'+
    '<ul class="how">'+s.how.map(function(h){return '<li>'+md(h)+'</li>';}).join('')+'</ul>'+
    '<div class="gauges"><span class="gauge impact">Impact'+meter(s.impact)+'</span><span class="gauge effort">Effort'+meter(s.effort)+'</span></div></div>';
  document.getElementById('count').textContent = (idx+1)+' of '+order.length;
}
// advance the in-page pointer and persist it together, so storage never desyncs from the session
function advance(){ idx=(idx+1)%order.length; if(idx===0) order=shuffle(order); }
function persist(){ save({order:order, idx:idx}); }
paint();                      // show the current one (chosen on the last visit)
advance(); persist();         // queue a fresh one for the next open; in-page state == stored state
document.getElementById('again').addEventListener('click', function(){
  paint(); advance(); persist();
});
</script></body></html>`;

fs.writeFileSync(path.join(DIR, 'next-steps.html'), html);
console.log('✓ render-next: next-steps.html (' + S.length + ' suggestions · ' + partials.length + ' unfinished on the map) in ' + DIR);
