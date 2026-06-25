/* codeviz select-to-explain — an opt-in, on-device LLM that explains whatever the reader
   selects, inline at the selection. Runs entirely in the browser via WebLLM (WebGPU); after
   a one-time model download it is fully offline. Nothing is sent to a server.

   Test seam: set window.__cvExplainEngine = { generate(system,user,onToken)->Promise } before
   this runs and it is used instead of WebLLM (so the plumbing is testable without the weights). */
(function () {
  if (window.__cvExplain) return; window.__cvExplain = true;

  // ---- the model (swap MODEL_ID for a different WebLLM prebuilt; lighter = faster download) ----
  var MODEL_ID = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';   // best-in-class small instruct model
  var MODEL_LABEL = 'Llama 3.2 3B';
  var MODEL_SIZE = '~1.8 GB';
  var WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm';
  var PREF = 'cv-explain-pref';
  var SYS = 'You are a senior engineer giving a new teammate a crisp, plain-English explanation of one ' +
    'piece of a system-design onboarding diagram. Using the selected text and the structured context ' +
    'around it, explain in 2-4 sentences what it is and what it does. Define any jargon in passing. ' +
    'Do not restate the question, do not use markdown headings, and do not invent anything beyond the context.';

  // ---------------------------------------------------------------- engine
  var engine = null, state = 'idle';                    // idle|loading|ready|error|unsupported
  function useMock() { if (window.__cvExplainEngine) { engine = window.__cvExplainEngine; state = 'ready'; return true; } return false; }
  function loadEngine(onProgress) {
    if (useMock()) { onProgress && onProgress({ progress: 1, text: 'Ready' }); return Promise.resolve(); }
    if (!('gpu' in navigator)) { state = 'unsupported'; return Promise.reject(new Error('This browser has no WebGPU — use Chrome or Edge.')); }
    state = 'loading';
    return import(WEBLLM_URL).then(function (webllm) {
      return webllm.CreateMLCEngine(MODEL_ID, { initProgressCallback: onProgress });
    }).then(function (mlc) {
      engine = {
        generate: function (system, user, onToken) {
          return Promise.resolve(mlc.chat.completions.create({
            stream: true, temperature: 0.4, max_tokens: 320,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
          })).then(function (stream) {
            var text = '';
            return (function pump(it) {
              return it.next().then(function (r) {
                if (r.done) return text;
                var d = r.value && r.value.choices && r.value.choices[0] && r.value.choices[0].delta && r.value.choices[0].delta.content || '';
                if (d) { text += d; onToken(text); }
                return pump(it);
              });
            })(stream[Symbol.asyncIterator]());
          });
        }
      };
      state = 'ready';
    });
  }

  // ---------------------------------------------------------------- context from a selection
  function t(el, sel) { var n = el && el.querySelector && el.querySelector(sel); return n ? n.textContent.trim() : ''; }
  function gather(selection) {
    var c = { selected: selection.toString().trim().slice(0, 1000) };   // cap huge selections (e.g. Ctrl+A)
    var node = selection.anchorNode, el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
    if (!el || !el.closest) return c;
    var col = el.closest('.col'), tbl = el.closest('.tbl'), store = el.closest('[id^="store-"], .store'), narr = el.closest('.narr');
    if (col) {
      c.kind = 'column';
      c.column = t(col, '.cn'); c.dataType = t(col, '.ct');
      if (col.classList.contains('is-pk')) c.primaryKey = true;
      if (col.classList.contains('is-fk')) c.foreignKey = true;
      if (col.dataset && col.dataset.fk) c.references = col.dataset.fk;
      var cn = col.querySelector('.cnote'); if (cn && cn.title) c.note = cn.title;
    }
    if (tbl) {
      c.table = (tbl.dataset && tbl.dataset.tname) || t(tbl, '.nm');
      var about = t(tbl, '.tbl-about'); if (about) c.tableAbout = about;
      var role = t(tbl, '.role'); if (role) c.tableRole = role;
      c.tableColumns = [].slice.call(tbl.querySelectorAll('.col .cn')).map(function (n) { return n.textContent.trim(); });
      if (c.kind !== 'column') c.kind = 'table';
    }
    if (store) { var h = store.querySelector('h2'); if (h) c.datastore = h.textContent.trim(); }
    if (narr) { c.kind = 'scenario step'; var hop = t(narr, '.hop'); if (hop) c.hop = hop.replace(/\s+/g, ' '); var st = t(narr, '.ntext'); if (st) c.step = st; }
    if (el.closest('.er-explain')) c.kind = c.kind || 'data-model explanation';
    if (el.closest('.store-context')) c.kind = c.kind || 'datastore overview';
    if (!c.kind) { var b = el.closest('p,li,td,th,h1,h2,h3,figcaption,div'); if (b) { var s = b.textContent.trim().replace(/\s+/g, ' '); if (s && s.length < 480) c.around = s; } }
    return c;
  }
  function prompt(c) {
    var out = ['Selected text: "' + c.selected + '"', '', 'Context:'];
    Object.keys(c).forEach(function (k) {
      if (k === 'selected') return;
      var v = c[k]; if (Array.isArray(v)) v = v.join(', ');
      out.push('- ' + k + ': ' + v);
    });
    out.push('', 'Explain what the selected item is and what it does.');
    return out.join('\n');
  }

  // ---------------------------------------------------------------- selection tooltip
  var tip = null, body = null;
  function ensureTip() {
    if (tip) return;
    tip = document.createElement('div'); tip.className = 'cvx-tip'; tip.setAttribute('role', 'tooltip');
    var arrow = document.createElement('div'); arrow.className = 'cvx-arrow';
    var head = document.createElement('div'); head.className = 'cvx-head';
    head.innerHTML = '<b>On-device explanation</b>';
    var x = document.createElement('button'); x.className = 'cvx-x'; x.setAttribute('aria-label', 'close'); x.textContent = '×';
    x.addEventListener('click', hideTip); head.appendChild(x);
    body = document.createElement('div'); body.className = 'cvx-body';
    tip.appendChild(arrow); tip.appendChild(head); tip.appendChild(body);
    document.body.appendChild(tip);
  }
  function showTip(rect) {
    ensureTip(); tip.style.display = 'block';
    tip._ax = rect.left + rect.width / 2; tip._aTop = rect.top; tip._aBottom = rect.bottom;
    reposition();
  }
  function reposition() {
    if (!tip || tip.style.display === 'none') return;
    var r = tip.getBoundingClientRect(), pad = 8;
    var left = Math.min(Math.max(pad, tip._ax - r.width / 2), window.innerWidth - r.width - pad);
    var top, below = tip._aBottom + 10;
    if (below + r.height < window.innerHeight - pad) { top = below; tip.classList.remove('cvx-above'); }
    else { top = tip._aTop - r.height - 10; tip.classList.add('cvx-above'); }
    tip.style.left = left + 'px'; tip.style.top = Math.max(pad, top) + 'px';
    var arrow = tip.querySelector('.cvx-arrow'); if (arrow) arrow.style.left = Math.min(Math.max(14, tip._ax - left), r.width - 22) + 'px';
  }
  function setBody(text, spinning) {
    ensureTip();
    if (spinning) { body.innerHTML = '<span class="cvx-spin"></span>Reading the selection…'; }
    else { body.textContent = text; }      // textContent: model output can never inject markup
    reposition();
  }
  function hideTip() { if (tip) tip.style.display = 'none'; }

  // ---------------------------------------------------------------- the pill + offer card
  var pill, card;
  function setPill(s) { state = s; if (pill) { pill.dataset.state = s; pill.querySelector('.cvx-label').textContent = s === 'ready' ? 'Explain: on' : s === 'loading' ? 'Loading model…' : 'Explain'; } }
  function buildUI() {
    pill = document.createElement('div'); pill.className = 'cvx-pill'; pill.dataset.state = 'idle';
    pill.innerHTML = '<span class="cvx-dot"></span><span class="cvx-label">Explain</span>';
    pill.addEventListener('click', toggleCard);
    card = document.createElement('div'); card.className = 'cvx-card cvx-hidden';
    document.body.appendChild(pill); document.body.appendChild(card);
  }
  function toggleCard() { if (state === 'ready') { card.classList.toggle('cvx-hidden'); renderReady(); } else if (state === 'loading') { card.classList.remove('cvx-hidden'); } else { card.classList.toggle('cvx-hidden'); renderOffer(); } }
  function renderOffer() {
    card.innerHTML = '<h4><span class="cvx-dot"></span>Explain anything you select</h4>' +
      '<p>Download a local AI model (<b>' + MODEL_LABEL + '</b>, ' + MODEL_SIZE + ') into your browser. Then select any text — a table, a column, a tour step — and it explains that piece right where you selected it. Runs on your device; offline after the one-time download.</p>' +
      '<div class="cvx-row"><button class="cvx-enable">Enable</button><button class="cvx-later">Not now</button></div>';
    card.querySelector('.cvx-enable').addEventListener('click', enable);
    card.querySelector('.cvx-later').addEventListener('click', function () { card.classList.add('cvx-hidden'); try { localStorage.setItem(PREF, 'later'); } catch (e) {} });
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]; }); }
  function renderLoading(p) {
    var pct = Math.round((p && p.progress || 0) * 100);
    var note = (p && p.text) ? esc(p.text).slice(0, 90) : (pct + '%');
    card.innerHTML = '<h4><span class="cvx-dot"></span>Downloading ' + MODEL_LABEL + '…</h4>' +
      '<div class="cvx-prog"><i style="width:' + pct + '%"></i></div>' +
      '<p class="cvx-note">' + note + ' — keep this tab open; it caches for next time.</p>';
  }
  function renderReady() { card.innerHTML = '<h4><span class="cvx-dot"></span>Ready</h4><p>Select any text on the page — a table, a column, a step — for an on-device explanation, right at the selection.</p>'; }
  function renderError(msg) { card.innerHTML = '<h4><span class="cvx-dot"></span>Couldn’t enable</h4><p>' + (msg || 'Failed to load the model.') + '</p>'; }
  function enable() {
    try { localStorage.setItem(PREF, 'enabled'); } catch (e) {}
    setPill('loading'); card.classList.remove('cvx-hidden'); renderLoading({ progress: 0 });
    loadEngine(function (p) { if (state === 'loading') renderLoading(p); }).then(function () {
      setPill('ready'); renderReady(); setTimeout(function () { card.classList.add('cvx-hidden'); }, 3500);
    }).catch(function (err) { setPill(state === 'unsupported' ? 'unsupported' : 'error'); renderError(err && err.message); });
  }

  // ---------------------------------------------------------------- selection wiring
  var reqId = 0;
  function onSelectionEnd(ev) {
    if (tip && ev && tip.contains(ev.target)) return;        // ignore selecting inside the tip
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    var text = sel.toString().trim();
    if (text.length < 2) return;
    var rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return;
    if (state !== 'ready') { card.classList.remove('cvx-hidden'); renderOffer(); return; }   // nudge: enable first
    var my = ++reqId, ctx = gather(sel);
    showTip(rect); setBody('', true);
    engine.generate(SYS, prompt(ctx), function (tok) { if (my === reqId) setBody(tok, false); })
      .then(function (full) { if (my === reqId && !String(full || '').trim()) setBody('(no explanation returned)', false); })
      .catch(function (err) { if (my === reqId) setBody('Could not explain: ' + (err && err.message || err), false); });
  }
  document.addEventListener('mouseup', function (e) { setTimeout(function () { onSelectionEnd(e); }, 0); });
  document.addEventListener('mousedown', function (e) { if (tip && !tip.contains(e.target)) hideTip(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', hideTip, true);
  window.addEventListener('resize', reposition);

  // ---------------------------------------------------------------- init
  function init() {
    buildUI();
    var pref; try { pref = localStorage.getItem(PREF); } catch (e) { pref = null; }
    if (pref === 'enabled') enable();             // honor a prior opt-in (weights are cached)
    setPill(state);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
