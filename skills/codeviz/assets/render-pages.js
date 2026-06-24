#!/usr/bin/env node
// render-pages — turn a generated codeviz system-map.html into its companion full pages:
//   data-model.html  — every datastore's ER diagram, full-page, + joins/retrieval
//   scenarios.html   — each scenario as a collapsible, beginner-friendly walkthrough, every step
//                      shown against the whole-system schematic with a clear explanation
// Project-agnostic: it reads the data, theme and project name straight out of system-map.html, so it
// works for ANY map. Self-contained — only Node built-ins, no install. Run after writing the map:
//   node render-pages.js [output-dir]      (default output-dir: docs/onboarding)
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = path.resolve(process.argv[2] || 'docs/onboarding');
const MAP = path.join(DIR, 'system-map.html');
if (!fs.existsSync(MAP)) { console.error('✗ no system-map.html in', DIR, '\n  run /codeviz first.'); process.exit(1); }
let src = fs.readFileSync(MAP, 'utf8');

/* ---------- pull the data objects + theme + project name out of the map ---------- */
function extract(name) {
  const m = src.match(new RegExp('var ' + name + ' = ([\\s\\S]*?\\n  [\\}\\]]);'));
  if (!m) return null;
  const ctx = {}; try { vm.runInNewContext('out = ' + m[1], ctx); return ctx.out; } catch (e) { return null; }
}
const NODES = extract('NODES') || {}, DOMAINS = extract('DOMAINS') || [], EDGES = extract('EDGES') || [];
const EDGE_DETAIL = extract('EDGE_DETAIL') || {}, SCENARIOS = extract('SCENARIOS') || [], DATAMODEL = extract('DATAMODEL') || {};
const DOM = {}; DOMAINS.forEach(d => DOM[d.id] = d);
const domOf = {}; DOMAINS.forEach(d => d.members.forEach(id => domOf[id] = d));
const HAS_DM = Object.keys(DATAMODEL).length > 0, HAS_SCEN = SCENARIOS.length > 0;
const rootBlock = (src.match(/:root\{[\s\S]*?\}/) || ['' + ':root{}'])[0];
const project = (src.match(/class="brand"[^>]*>([^<]+)</) || [, 'Codeviz'])[1].trim();
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- shared chrome (theme inherited from the map) ---------- */
const HEAD = (title, extraCss) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${esc(title)}</title>
<style>
  ${rootBlock}
  :root{ --accent2:var(--cv-comet,#b6e890); --req:var(--cv-req,#3b9dff); --resp:var(--cv-resp,#ff9e3d); --down:var(--cv-down,#e5484d); --warn:var(--cv-warn,#f5b34a); }
  *{box-sizing:border-box} html,body{margin:0} body{background:var(--bg);color:var(--ink);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  a{color:inherit;text-decoration:none}
  .top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:16px;padding:11px 20px;background:var(--panel);border-bottom:1px solid var(--line)}
  .top .brand{font-weight:800;color:var(--accent);letter-spacing:.2px;font-size:15px}
  .top nav{display:flex;gap:4px;margin-left:6px}
  .top nav a{padding:6px 13px;border-radius:8px;color:var(--sub);font-weight:600;font-size:13px}
  .top nav a:hover{color:var(--ink);background:rgba(255,255,255,0.05)}
  .top nav a.on{color:#0b1208;background:var(--accent)}
  .top .sp{flex:1} .top .hint{color:var(--sub);font-size:12px}
  .wrap{max-width:1200px;margin:0 auto;padding:26px 22px 80px}
  .lede{color:var(--sub);font-size:14.5px;line-height:1.65;max-width:840px;margin:6px 0 24px} .lede b{color:var(--ink)}
  h1{font-size:22px;margin:18px 0 4px}
  .pill{display:inline-block;font-size:11px;color:var(--sub);border:1px solid var(--line);border-radius:6px;padding:1px 8px}
  ${extraCss || ''}
</style></head><body>`;
const NAV = (active) => `<div class="top">
  <a class="brand" href="system-map.html">${esc(project)}</a>
  <nav>
    <a href="system-map.html"${active === 'map' ? ' class="on"' : ''}>System map</a>
    ${HAS_DM ? `<a href="data-model.html"${active === 'models' ? ' class="on"' : ''}>Data models</a>` : ''}
    ${HAS_SCEN ? `<a href="scenarios.html"${active === 'scenarios' ? ' class="on"' : ''}>Scenarios</a>` : ''}
  </nav>
  <span class="sp"></span><span class="hint">Onboarding · self-contained, offline</span>
</div>`;
const tableColor = (t) => {
  if (t.accent && /^#[0-9a-fA-F]{3,8}$/.test(t.accent)) return t.accent;
  if (t.domain && DOM[t.domain]) return DOM[t.domain].col;
  const p = (t.name.indexOf('.') >= 0 ? t.name.split('.')[0] : '_'); let h = 0;
  for (let i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) >>> 0;
  return ['#7aa2f7', '#3ecf8e', '#bb9af7', '#f7768e', '#7dcfff', '#e0af68'][h % 6];
};
const tid = (store, name) => 'er-' + store + '-' + name.replace(/[^a-zA-Z0-9]/g, '_');

/* ============================ MODELS PAGE ============================ */
// auto fallback: a plain-English relationship walkthrough derived from the FK graph
function autoRelExplain(dm, names) {
  const rels = [];
  (dm.tables || []).forEach(t => (t.cols || []).forEach(c => {
    if (c.fk) { const to = c.fk.split('.').slice(0, -1).join('.'); rels.push({ from: t.name, col: c.name, to, here: names.has(to), self: to === t.name }); }
  }));
  let h = `<p>Read this diagram like a map of how the records connect. Each <b>box is a table</b> — one kind of thing, stored as rows (think of a spreadsheet). <b>PK</b> marks the column that gives each row a unique identity; <b>FK</b> marks a column that <i>points at</i> another table's row. Every FK is drawn as a line that ends in a <b>crow's foot</b> (the “many” side) and a <b>single bar</b> (the “one” side): so <b>many</b> rows on the foot side belong to <b>one</b> row on the bar side.</p>`;
  if (rels.length) {
    h += `<p><b>The relationships here:</b></p><ul class="rel-list">`;
    rels.forEach(r => {
      if (r.self) h += `<li>A <b>${esc(r.from)}</b> can point at another <b>${esc(r.from)}</b> (a self-reference, via <code>${esc(r.from)}.${esc(r.col)}</code>) — e.g. a tree or hierarchy.</li>`;
      else if (r.here) h += `<li>Many <b>${esc(r.from)}</b> rows belong to one <b>${esc(r.to)}</b> — via <code>${esc(r.from)}.${esc(r.col)}</code>. (So one <b>${esc(r.to)}</b> has many <b>${esc(r.from)}</b>.)</li>`;
      else h += `<li>Each <b>${esc(r.from)}</b> references a <b>${esc(r.to)}</b> that lives in <i>another store</i> — via <code>${esc(r.from)}.${esc(r.col)}</code> (shown as an <span class="ext">ext</span> badge, no line drawn here).</li>`;
    });
    h += `</ul>`;
  }
  return h;
}
function modelsPage() {
  const css = `
  .ml{display:grid;grid-template-columns:212px 1fr;gap:0;align-items:start}
  .ml .rail{position:sticky;top:64px;align-self:start;padding:6px 10px 30px;border-right:1px solid var(--line)}
  .ml .rail a{display:block;padding:4px 8px;border-radius:6px;color:var(--sub);font-size:12.5px}
  .ml .rail a.store{color:var(--ink);font-weight:700;margin-top:10px}
  .ml .rail a:hover{background:rgba(255,255,255,0.05);color:var(--ink)}
  .ml .body{padding:4px 4px 0 26px;min-width:0}
  .store{margin-bottom:56px;scroll-margin-top:64px}
  .store-h{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap} .store-h h2{font-weight:800;font-size:18px;margin:0}
  .store-meta{color:var(--sub);font-size:12px} .store-meta b{color:var(--ink)}
  /* 1 — context, above the diagram */
  .store-context{color:#c9cebf;font-size:13.5px;line-height:1.7;max-width:880px;margin:9px 0 18px}
  .store-context p{margin:0 0 10px} .store-context p:last-child{margin-bottom:0} .store-context b{color:var(--ink)} .store-context code{background:rgba(255,255,255,0.08);color:var(--accent2);padding:1px 6px;border-radius:5px}
  /* 2 — the ER diagram */
  .er-legend{display:flex;gap:16px;flex-wrap:wrap;align-items:center;color:var(--sub);font-size:11.5px;margin-bottom:12px;padding:8px 12px;border:1px solid var(--line);border-radius:9px;background:var(--panel)}
  .er-legend b{color:var(--ink)} .er-legend .ky{font-size:8.5px;font-weight:800} .er-legend .ky.pk{color:var(--warn)} .er-legend .ky.fk{color:var(--req)}
  .er-legend svg{vertical-align:middle}
  .er{position:relative} .er-svg{position:absolute;left:0;top:0;pointer-events:none;z-index:0;overflow:visible}
  .er-grid{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:20px;align-content:flex-start}
  .tbl{position:relative;width:256px;background:var(--card);border:1px solid var(--line);border-top:2px solid var(--tc,var(--accent));border-radius:11px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,.28);scroll-margin-top:70px}
  .tbl-h{display:flex;align-items:center;gap:8px;padding:9px 12px;background:rgba(255,255,255,0.04);border-bottom:1px solid var(--line)} .tbl-h .nm{font-weight:800;font-size:13px}
  .tbl-about{padding:7px 12px;color:var(--sub);font-size:11px;line-height:1.45;border-bottom:1px solid var(--line)}
  .col{display:flex;align-items:center;gap:9px;padding:6px 12px;font-size:12.5px;border-bottom:1px solid rgba(255,255,255,0.05)} .col:last-child{border-bottom:0}
  .col.is-fk{background:rgba(59,157,255,0.06)}
  .k{width:22px;flex:none;text-align:center;font-size:8.5px;font-weight:800;letter-spacing:.3px;color:var(--sub)} .k.pk{color:var(--warn)} .k.fk{color:var(--req)}
  .cn{font-weight:600} .ct{margin-left:auto;color:var(--sub);font-family:ui-monospace,Menlo,monospace;font-size:10.5px} .cnote{color:var(--sub);cursor:help;font-size:11px}
  .ext{font-size:9px;color:var(--sub);border:1px solid var(--line);border-radius:5px;padding:0 5px;margin-left:6px}
  /* 3 — comprehensive explanation, below the diagram */
  .er-explain{margin-top:24px;max-width:900px;color:#c9cebf;font-size:13.5px;line-height:1.72;border-top:1px solid var(--line);padding-top:18px}
  .er-explain h3{font-size:14px;color:var(--ink);margin:0 0 10px}
  .er-explain p{margin:0 0 12px} .er-explain b{color:var(--ink);font-weight:700} .er-explain i{color:var(--ink)}
  .er-explain code{background:rgba(255,255,255,0.08);color:var(--accent2);padding:1px 6px;border-radius:5px;font-size:12px}
  .er-explain ul,.rel-list{margin:6px 0 14px;padding-left:20px} .er-explain li{margin:5px 0}
  .note-foot{color:var(--sub);font-size:12px;border-top:1px solid var(--line);padding-top:14px;margin-top:8px}`;
  const stores = Object.keys(DATAMODEL);
  let rail = '<div class="rail">';
  stores.forEach(sid => { const dm = DATAMODEL[sid], label = NODES[sid] ? NODES[sid].label : sid;
    rail += `<a class="store" href="#store-${esc(sid)}">${esc(label)}</a>`;
    (dm.tables || []).forEach(t => rail += `<a href="#${tid(sid, t.name)}">${esc(t.name)}</a>`); });
  rail += '</div>';
  // a tiny inline crow's-foot / bar key for the legend
  const cfKey = `<svg width="34" height="14" viewBox="0 0 34 14"><line x1="6" y1="7" x2="28" y2="7" stroke="var(--sub)" stroke-width="1.4"/><line x1="6" y1="7" x2="0" y2="2" stroke="var(--sub)" stroke-width="1.4"/><line x1="6" y1="7" x2="0" y2="7" stroke="var(--sub)" stroke-width="1.4"/><line x1="6" y1="7" x2="0" y2="12" stroke="var(--sub)" stroke-width="1.4"/><line x1="28" y1="2" x2="28" y2="12" stroke="var(--sub)" stroke-width="1.4"/></svg>`;
  let body = `<div class="body"><h1>Data models</h1><div class="lede">Every datastore behind ${esc(project)}, drawn as an <b>entity-relationship diagram</b>. For each store: first the <b>context</b> (what it holds and why), then the <b>ER diagram</b> itself — boxes are tables, lines are relationships — and then a <b>plain-English walkthrough</b> of how those tables connect, written for someone seeing the schema for the first time.</div>`;
  stores.forEach(sid => {
    const dm = DATAMODEL[sid], label = NODES[sid] ? NODES[sid].label : sid;
    let rel = 0; (dm.tables || []).forEach(t => (t.cols || []).forEach(c => { if (c.fk) rel++; }));
    const names = new Set((dm.tables || []).map(t => t.name));
    const context = dm.context || (dm.about ? `<p>${esc(dm.about)}</p>` : '');
    body += `<section class="store" id="store-${esc(sid)}"><div class="store-h"><h2>${esc(label)}</h2><span class="pill">${esc(dm.engine || '')}</span><span class="store-meta"><b>${(dm.tables || []).length}</b> entities · <b>${rel}</b> relationships${dm.grain ? ` · detail: <b>${esc(dm.grain)}</b>` : ''}</span></div>`;
    // 1 — context
    if (context) body += `<div class="store-context">${context}</div>`;
    // 2 — the ER diagram (with a how-to-read legend)
    body += `<div class="er-legend"><span><b class="ky pk">PK</b> identity</span><span><b class="ky fk">FK</b> points at another table</span><span>${cfKey} <b>many → one</b></span><span><span class="ext">ext</span> in another store</span></div>`;
    body += `<div class="er"><svg class="er-svg" data-store="${esc(sid)}"></svg><div class="er-grid">`;
    (dm.tables || []).forEach(t => {
      body += `<div class="tbl" id="${tid(sid, t.name)}" style="--tc:${tableColor(t)}"><div class="tbl-h"><span class="nm">${esc(t.name)}</span>${t.status && t.status !== 'built' ? `<span class="ext">${esc(t.status)}</span>` : ''}</div>${t.about ? `<div class="tbl-about">${esc(t.about)}</div>` : ''}`;
      (t.cols || []).forEach(c => {
        const here = c.fk && names.has(c.fk.split('.').slice(0, -1).join('.'));
        const k = c.pk ? '<span class="k pk" title="primary key">PK</span>' : (c.fk ? '<span class="k fk" title="foreign key → ' + esc(c.fk) + '">FK</span>' : '<span class="k"></span>');
        body += `<div class="col${c.fk ? ' is-fk' : ''}"${here ? ` data-fk="${esc(c.fk)}"` : ''}>${k}<span class="cn">${esc(c.name)}</span><span class="ct">${esc(c.type || '')}${c.nullable ? '?' : ''}</span>${c.note ? `<span class="cnote" title="${esc(c.note)}">&#9432;</span>` : ''}${c.fk && !here ? '<span class="ext">ext</span>' : ''}</div>`;
      });
      body += '</div>';
    });
    body += '</div></div>';
    // 3 — comprehensive explanation, below the diagram
    body += `<div class="er-explain"><h3>How this data model works</h3>${dm.explain || autoRelExplain(dm, names)}</div>`;
    body += '</section>';
  });
  body += `<div class="note-foot">Modeled from the schema source — verify against your live database.</div></div>`;
  const script = `<script>
  function tid(s,n){return 'er-'+s+'-'+n.replace(/[^a-zA-Z0-9]/g,'_');}
  function seg(svg,NS,x1,y1,x2,y2,col){var l=document.createElementNS(NS,'line');l.setAttribute('x1',x1);l.setAttribute('y1',y1);l.setAttribute('x2',x2);l.setAttribute('y2',y2);l.setAttribute('stroke',col);l.setAttribute('stroke-width','1.5');svg.appendChild(l);}
  function draw(){document.querySelectorAll('.er-svg').forEach(function(svg){
    var store=svg.dataset.store,er=svg.closest('.er'),base=er.getBoundingClientRect();
    svg.setAttribute('width',er.scrollWidth);svg.setAttribute('height',er.scrollHeight);while(svg.firstChild)svg.removeChild(svg.firstChild);
    var NS='http://www.w3.org/2000/svg';
    er.querySelectorAll('.col[data-fk]').forEach(function(row){
      var fk=row.dataset.fk,t=fk.split('.').slice(0,-1).join('.'),tgt=document.getElementById(tid(store,t));if(!tgt)return;
      var th=tgt.querySelector('.tbl-h')||tgt,r1=row.getBoundingClientRect(),r2=th.getBoundingClientRect(),sx=er.scrollLeft,sy=er.scrollTop,y1=r1.top+r1.height/2-base.top+sy,y2=r2.top+r2.height/2-base.top+sy,x1,x2;
      var left=(r2.left+r2.width/2)<(r1.left+r1.width/2);if(left){x1=r1.left-base.left+sx;x2=r2.right-base.left+sx;}else{x1=r1.right-base.left+sx;x2=r2.left-base.left+sx;}
      var col=(getComputedStyle(tgt).getPropertyValue('--tc')||'').trim()||'#888',dir=x2>=x1?1:-1,dx=Math.max(34,Math.abs(x2-x1)*0.4),c1=x1+dir*dx,c2=x2-dir*dx;
      var p=document.createElementNS(NS,'path');p.setAttribute('d','M'+x1+' '+y1+' C '+c1+' '+y1+' '+c2+' '+y2+' '+x2+' '+y2);p.setAttribute('fill','none');p.setAttribute('stroke',col);p.setAttribute('stroke-width','1.6');p.setAttribute('opacity','0.85');svg.appendChild(p);
      // crow's foot (MANY) at the FK row; single bar (ONE) at the target
      var ax=x1+dir*10; seg(svg,NS,ax,y1,x1,y1-5,col); seg(svg,NS,ax,y1,x1,y1,col); seg(svg,NS,ax,y1,x1,y1+5,col);
      var bx=x2-dir*9; seg(svg,NS,bx,y2-6,bx,y2+6,col);
    });});}
  addEventListener('load',function(){draw();setTimeout(draw,60);});addEventListener('resize',draw);
  function flash(){var h=location.hash.slice(1);if(!h)return;var el=document.getElementById(h);if(el&&el.classList.contains('tbl')){el.style.transition='box-shadow .5s';el.style.boxShadow='0 0 0 2px var(--accent),0 8px 26px rgba(0,0,0,.5)';setTimeout(function(){el.style.boxShadow='';},1100);}}
  addEventListener('hashchange',function(){flash();setTimeout(draw,80);});addEventListener('load',flash);
  </script>`;
  return HEAD(project + ' — Data models', css) + NAV('models') + `<div class="wrap"><div class="ml">${rail}${body}</div></div>` + script + '</body></html>';
}

/* ============================ SCENARIOS PAGE ============================ */
function layout() {
  const W = 940, NW = 108, NH = 34, ROW = 86, TOP = 40, GAP = 12, pos = {};
  const maxTier = Math.max.apply(null, DOMAINS.map(d => d.tier));
  DOMAINS.forEach(d => { const m = d.members, n = m.length, tw = n * NW + (n - 1) * GAP, x0 = Math.max(150, (W - tw) / 2);
    m.forEach((id, i) => pos[id] = { x: x0 + i * (NW + GAP), y: TOP + d.tier * ROW, w: NW, h: NH, dom: d }); });
  return { pos, W, H: TOP + (maxTier + 1) * ROW };
}
const LAY = layout();
const ctr = id => ({ x: LAY.pos[id].x + LAY.pos[id].w / 2, y: LAY.pos[id].y + LAY.pos[id].h / 2 });
function schematic(scen, idx) {
  const steps = scen.steps, cur = steps[idx], involved = new Set(); steps.forEach(s => { involved.add(s.from); involved.add(s.to); });
  let svg = `<svg viewBox="0 0 ${LAY.W} ${LAY.H}" class="sch" preserveAspectRatio="xMidYMid meet">`;
  DOMAINS.forEach(d => { const p0 = LAY.pos[d.members[0]]; if (p0) svg += `<text x="14" y="${p0.y + 22}" class="rowlab" fill="${d.col}">${esc(d.label)}</text>`; });
  steps.forEach((s, i) => { if (!LAY.pos[s.from] || !LAY.pos[s.to]) return; const a = ctr(s.from), b = ctr(s.to), st = i < idx ? 'past' : (i === idx ? 'cur' : 'future'), op = st === 'cur' ? 1 : (st === 'past' ? 0.5 : 0.16), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    svg += `<path d="M${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}" fill="none" stroke="var(--accent)" stroke-width="${st === 'cur' ? 2.6 : 1.6}" opacity="${op}" ${st === 'future' ? 'stroke-dasharray="5 5"' : ''} marker-end="url(#schar${st === 'cur' ? 'C' : 'D'})"/>`; });
  if (LAY.pos[cur.from] && LAY.pos[cur.to] && cur.payload) { const a = ctr(cur.from), b = ctr(cur.to), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, w = 8 + cur.payload.length * 6.4;
    svg += `<rect x="${mx - w / 2}" y="${my - 10}" width="${w}" height="19" rx="6" fill="#0d160a" stroke="var(--accent)" opacity="0.96"/><text x="${mx}" y="${my + 3}" class="plab">${esc(cur.payload)}</text>`; }
  Object.keys(NODES).forEach(id => { const p = LAY.pos[id]; if (!p) return; const isCur = (id === cur.from || id === cur.to), op = isCur ? 1 : (involved.has(id) ? 0.85 : 0.28);
    svg += `<g opacity="${op}"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="8" fill="var(--card)" stroke="${isCur ? 'var(--accent)' : p.dom.col}" stroke-width="${isCur ? 2.4 : 1.2}"/><rect x="${p.x}" y="${p.y}" width="3" height="${p.h}" fill="${p.dom.col}"/><text x="${p.x + p.w / 2}" y="${p.y + p.h / 2 + 3.5}" class="nlab">${esc(NODES[id].label)}</text></g>`; });
  svg += `<defs><marker id="scharC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--accent)"/></marker><marker id="scharD" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" opacity="0.5"/></marker></defs></svg>`;
  return svg;
}
function scenariosPage() {
  const css = `
  .sc-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 18px}
  .sc-tabs a{padding:8px 15px;border:1px solid var(--line);border-radius:9px;color:var(--sub);font-weight:600;font-size:13px} .sc-tabs a:hover{color:var(--ink)}
  .legend{display:flex;gap:18px;flex-wrap:wrap;color:var(--sub);font-size:11.5px;margin:0 0 16px}
  .legend span{display:inline-flex;align-items:center;gap:6px} .legend i{width:22px;height:0;border-top:2px solid var(--accent);display:inline-block} .legend i.past{opacity:.5} .legend i.future{border-top-style:dashed;opacity:.5}
  details.scen{border:1px solid var(--line);border-radius:12px;margin-bottom:14px;background:var(--panel);overflow:hidden;scroll-margin-top:64px}
  details.scen>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:16px 18px}
  details.scen>summary::-webkit-details-marker{display:none}
  .scen-title{font-weight:800;font-size:16px;color:var(--ink)} .scen-teaser{color:var(--sub);font-size:12.5px}
  .chev{margin-left:auto;color:var(--sub);font-size:13px;transition:transform .18s} details.scen[open] .chev{transform:rotate(90deg)}
  details.scen[open]>summary{border-bottom:1px solid var(--line)}
  .scen-body{padding:6px 20px 18px}
  .scen-intro{color:var(--sub);font-size:14px;line-height:1.7;max-width:880px;margin:14px 0 4px} .scen-intro b{color:var(--ink)} .scen-intro code{background:rgba(255,255,255,0.08);color:var(--accent2);padding:1px 6px;border-radius:5px}
  .step{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:28px;align-items:start;padding:26px 0;border-top:1px solid var(--line)} .step:first-of-type{border-top:0}
  @media(max-width:820px){.step{grid-template-columns:1fr}}
  .sch-wrap{position:sticky;top:64px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:10px}
  svg.sch{width:100%;height:auto;display:block}
  svg.sch .rowlab{font:700 9px -apple-system,sans-serif;text-transform:uppercase;letter-spacing:.4px;opacity:.85}
  svg.sch .nlab{font:600 9.5px -apple-system,sans-serif;fill:var(--ink);text-anchor:middle}
  svg.sch .plab{font:700 10px ui-monospace,Menlo,monospace;fill:var(--accent2);text-anchor:middle}
  .narr .stepno{font-size:11px;font-weight:800;letter-spacing:.5px;color:var(--accent);text-transform:uppercase}
  .narr .hop{font-weight:800;font-size:15px;margin:5px 0 2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap} .narr .hop i{color:var(--accent);font-style:normal}
  .narr .hop code{background:rgba(255,255,255,0.08);color:var(--accent2);padding:1px 8px;border-radius:6px;font-size:12px}
  .narr .why{color:#c9cebf;font-size:13.5px;line-height:1.72} .narr .why p{margin:0 0 11px} .narr .why p:last-child{margin-bottom:0}
  .narr .why b{color:var(--ink);font-weight:700} .narr .why i{color:var(--ink);font-style:italic} .narr .why code,.callout code{background:rgba(255,255,255,0.08);color:var(--accent2);padding:1px 6px;border-radius:5px;font-size:12px}
  .callout{margin:13px 0;padding:11px 14px;background:rgba(255,255,255,0.045);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:8px;font-size:12.8px;line-height:1.62;color:var(--sub)}
  .callout .ct-h{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:var(--accent);font-weight:800;margin-bottom:4px} .callout b{color:var(--ink);font-weight:700}
  .narr .terms{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
  .narr .terms .jt{font-size:11px;background:rgba(255,255,255,0.05);color:var(--sub);border:1px solid var(--line);border-radius:6px;padding:2px 9px} .narr .terms .jt b{color:var(--ink)}`;
  let tabs = '<div class="sc-tabs">'; SCENARIOS.forEach(s => tabs += `<a href="#scen-${esc(s.id)}">${esc(s.label)}</a>`); tabs += '</div>';
  let body = `<h1>Scenarios</h1><div class="lede">Each scenario is a real path through ${esc(project)}, explained <b>from scratch</b> — no prior knowledge assumed. On the left you always see <b>the whole system</b>: the bright hop is what is happening <i>now</i>, dimmed hops already happened, dashed hops are still to come. On the right, every step is explained in plain language with the jargon defined as it appears. <b>Click a scenario to open it.</b></div>`;
  body += tabs + `<div class="legend"><span><i></i> happening now</span><span><i class="past"></i> already happened</span><span><i class="future"></i> still to come</span></div>`;
  SCENARIOS.forEach(scen => {
    const layers = [...new Set(scen.steps.flatMap(s => [domOf[s.from], domOf[s.to]]).filter(Boolean).map(d => d.label))];
    const intro = scen.intro || `This flow crosses <b>${layers.length}</b> layers — ${layers.map(l => `<b>${esc(l)}</b>`).join(' → ')} — in <b>${scen.steps.length}</b> hops. Follow it top to bottom to see how a single action ripples through the whole system.`;
    body += `<details class="scen" id="scen-${esc(scen.id)}"><summary><span class="scen-title">${esc(scen.label)}</span><span class="scen-teaser">${scen.steps.length} steps · ${layers.map(esc).join(' → ')}</span><span class="chev">&#9654;</span></summary><div class="scen-body"><div class="scen-intro">${intro}</div>`;
    scen.steps.forEach((st, i) => {
      const fromL = NODES[st.from] ? NODES[st.from].label : st.from, toL = NODES[st.to] ? NODES[st.to].label : st.to;
      const lesson = st.lesson || (st.detail ? (st.text ? `<p><b>${esc(st.text)}</b></p>${st.detail}` : st.detail) : `<p>${esc(st.text || '')}</p>`);
      const learn = st.learn || st.terms || [];
      let narr = `<div class="narr"><div class="stepno">Step ${i + 1} of ${scen.steps.length}</div><div class="hop"><b>${esc(fromL)}</b><i>→</i><b>${esc(toL)}</b>${st.payload ? `<code>${esc(st.payload)}</code>` : ''}</div><div class="why">${lesson}</div>`;
      if (st.callout) narr += `<div class="callout"><span class="ct-h">New to this?</span>${st.callout}</div>`;
      if (learn.length) narr += `<div class="terms">${learn.map(t => `<span class="jt"><b>${esc(t[0])}</b> — ${esc(t[1])}</span>`).join('')}</div>`;
      narr += '</div>';
      body += `<div class="step"><div class="sch-wrap">${schematic(scen, i)}</div>${narr}</div>`;
    });
    body += '</div></details>';
  });
  const script = `<script>
  document.querySelectorAll('.sc-tabs a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var d=document.querySelector(a.getAttribute('href'));if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}});});
  function openHash(){if(location.hash){var d=document.querySelector(location.hash);if(d&&d.tagName==='DETAILS'){d.open=true;d.scrollIntoView({block:'start'});}}}
  addEventListener('load',openHash);addEventListener('hashchange',openHash);
  </script>`;
  return HEAD(project + ' — Scenarios', css) + NAV('scenarios') + `<div class="wrap">${body}</div>` + script + '</body></html>';
}

/* ---------- write pages + patch the map nav / datastore links ---------- */
const wrote = [];
if (HAS_DM) { fs.writeFileSync(path.join(DIR, 'data-model.html'), modelsPage()); wrote.push('data-model.html'); }
if (HAS_SCEN) { fs.writeFileSync(path.join(DIR, 'scenarios.html'), scenariosPage()); wrote.push('scenarios.html'); }

let map = src;
if (!map.includes('class="cv-topnav"') && (HAS_DM || HAS_SCEN)) {
  const links = `<nav class="cv-topnav"><a href="system-map.html" class="on">System map</a>${HAS_DM ? '<a href="data-model.html">Data models</a>' : ''}${HAS_SCEN ? '<a href="scenarios.html">Scenarios</a>' : ''}</nav>`;
  map = map.replace('<span class="spacer"></span>', links + '<span class="spacer"></span>');
  map = map.replace('</style>', `  .cv-topnav{display:flex;gap:4px;margin-left:10px}
  .cv-topnav a{padding:5px 12px;border-radius:8px;color:var(--sub);font-weight:600;font-size:12.5px;text-decoration:none}
  .cv-topnav a:hover{color:var(--ink);background:rgba(255,255,255,0.05)}
  .cv-topnav a.on{color:#0b1208;background:var(--accent)}
</style>`);
}
if (HAS_DM) map = map.replace('if(isStore(nid)) openDataModel(nid);', "if(isStore(nid)){ window.location.href='data-model.html#store-'+encodeURIComponent(nid); return; }");
if (map !== src) fs.writeFileSync(MAP, map);

console.log('✓ render-pages:', wrote.length ? wrote.join(' + ') + ' + patched system-map.html' : 'nothing to render (no DATAMODEL / SCENARIOS in the map)');
