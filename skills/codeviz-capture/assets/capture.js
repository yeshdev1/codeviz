#!/usr/bin/env node
// codeviz-capture — record a short clip of a generated codeviz system map.
// Usage:
//   node capture.js --map docs/onboarding/system-map.html --scene health --gif
//   node capture.js --scene tour --speed 2 --secs 5 --caption "Guided tour: a live request"
// Scenes: tour | health | zoom | focus | datamodel | overview   (drives the map via its window.__atlas hook)
// Output: an MP4 (and optional GIF) via ffmpeg; falls back to .webm if ffmpeg is missing.
// Tighten/brand: --speed <x> time-compresses, --secs <n> hard-trims to ~n s, --caption "<text>"
//   burns a lower-third caption into both MP4 and GIF.
// Deps: @playwright/test (+ chromium: `npx playwright install chromium`) and ffmpeg.
const { chromium } = require('@playwright/test');
const path = require('path'), url = require('url'), fs = require('fs'), cp = require('child_process');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes('--' + n);
const MAP = path.resolve(arg('map', 'docs/onboarding/system-map.html'));
const SCENE = arg('scene', 'tour');
const W = +arg('w', 1280), H = +arg('h', 800);
const OUT = path.resolve(arg('out', 'codeviz-' + SCENE + '.mp4'));
const MAKEGIF = has('gif');
const SPEED = +arg('speed', '1') || 1;          // playback multiplier (2 = twice as fast)
const SECS = +arg('secs', arg('t', '0')) || 0;  // hard-trim final clip to ~n seconds (0 = full)
const CAPTION = arg('caption', arg('cap', ''));  // lower-third caption burned into the clip

const drive = (p, fn, a) => p.evaluate(([f, x]) => { if (window.__atlas && window.__atlas[f]) window.__atlas[f](x); }, [fn, a]);

// Bake a lower-third caption straight into the page so it's recorded as part of the video —
// no ffmpeg drawtext / system font needed (those aren't present on every box).
const injectCaption = (p, text) => p.evaluate((t) => {
  const d = document.createElement('div');
  d.textContent = t;
  Object.assign(d.style, {
    position: 'fixed', left: '50%', bottom: '40px', transform: 'translateX(-50%)', zIndex: '2147483647',
    padding: '12px 22px', borderRadius: '12px', maxWidth: '82vw', textAlign: 'center', whiteSpace: 'pre-wrap',
    background: 'rgba(10,12,18,0.62)', color: '#fff', letterSpacing: '0.2px', pointerEvents: 'none',
    font: '600 22px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
    boxShadow: '0 6px 26px rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
  });
  document.body.appendChild(d);
}, text);

const SCENES = {
  // pan the three zoom levels
  async overview(p){ await p.waitForTimeout(700); await drive(p,'goLevel','services'); await p.waitForTimeout(1500);
    await drive(p,'goLevel','detail'); await p.waitForTimeout(1500); await drive(p,'goLevel','continents'); await p.waitForTimeout(1200); },
  async zoom(p){ await p.waitForTimeout(700); await drive(p,'goLevel','services'); await p.waitForTimeout(1500); await drive(p,'goLevel','detail'); await p.waitForTimeout(1700); },
  // click a system → degree-of-interest focus fly-in
  async focus(p){ await drive(p,'goLevel','services'); await p.waitForTimeout(1000);
    const id = await p.evaluate(()=>{ const k=Object.keys(window.__atlas.NODES); return k[Math.floor(k.length/2)]; });
    await p.evaluate((i)=>window.__atlas.setFocus(i), id); await p.waitForTimeout(2200);
    await p.evaluate(()=>window.__atlas.setFocus(null)); await p.waitForTimeout(900); },
  // walk a few guided-tour hops (request → response)
  async tour(p){ await p.waitForTimeout(600); await p.evaluate(()=>window.__atlas.startTour(0)); await p.waitForTimeout(2200);
    for(let i=0;i<3;i++){ await p.evaluate(()=>window.__atlas.next && window.__atlas.next()); await p.waitForTimeout(2200); }
    await p.evaluate(()=>window.__atlas.exitTour()); await p.waitForTimeout(700); },
  // open a datastore's data model, then flip to its joins & retrieval view
  async datamodel(p){ await drive(p,'goLevel','services'); await p.waitForTimeout(1100);
    const id = await p.evaluate(()=>{ var dm=window.__atlas.DATAMODEL||{}; return Object.keys(dm)[0]||null; });
    if(!id){ await p.waitForTimeout(800); return; }
    await p.evaluate((i)=>window.__atlas.openDataModel(i), id); await p.waitForTimeout(2400);
    await p.click('#erTabs button[data-t="access"]').catch(()=>{}); await p.waitForTimeout(2200);
    await p.click('#erTabs button[data-t="schema"]').catch(()=>{}); await p.waitForTimeout(1200); },
  // toggle Health, then click affected systems in the summary to fly to them
  async health(p){ await drive(p,'goLevel','services'); await p.waitForTimeout(1100);
    await p.click('#viewmode button[data-v="health"]').catch(()=>{}); await p.waitForTimeout(1700);
    const ids = await p.evaluate(()=>Array.from(document.querySelectorAll('#healthSummary .hs-row')).map(r=>r.dataset.id));
    for(const id of ids.slice(0,2)){ await p.click('.hs-row[data-id="'+id+'"]').catch(()=>{}); await p.waitForTimeout(1900); } },
};

(async () => {
  if (!fs.existsSync(MAP)) { console.error('✗ map not found:', MAP, '\n  run /codeviz first, or pass --map <path>'); process.exit(1); }
  if (!SCENES[SCENE]) { console.error('✗ unknown scene:', SCENE, '\n  choose:', Object.keys(SCENES).join(' · ')); process.exit(1); }
  const VID = path.resolve(path.dirname(OUT), '.codeviz-vid'); fs.rmSync(VID, { recursive: true, force: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: VID, size: { width: W, height: H } } });
  const p = await ctx.newPage();
  await p.goto(url.pathToFileURL(MAP).href);
  const okHook = await p.waitForFunction(() => !!window.__atlas, { timeout: 8000 }).then(() => true).catch(() => false);
  if (!okHook) { console.error('✗ window.__atlas not found — is this a codeviz system map?'); await b.close(); process.exit(1); }
  await p.waitForTimeout(300);
  if (CAPTION) await injectCaption(p, CAPTION);
  await SCENES[SCENE](p);
  const vid = p.video(); await ctx.close(); await b.close();
  const webm = await vid.path();

  const hasFF = cp.spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  if (!hasFF) {
    const dest = OUT.replace(/\.\w+$/, '') + '.webm'; fs.copyFileSync(webm, dest); fs.rmSync(VID, { recursive: true, force: true });
    console.log('⚠ ffmpeg not found — kept WEBM:', dest, '\n  install ffmpeg for MP4/GIF (e.g. `brew install ffmpeg`).'); return;
  }
  const ff = (a) => cp.spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' });
  const trim = SECS > 0 ? ['-t', String(SECS)] : [];
  // setpts time-compresses the clip; -t then caps it. Combined, `--speed 2 --secs 5` ≈ a tight 5s demo.
  const speedF = (SPEED !== 1) ? ['setpts=' + (1 / SPEED).toFixed(4) + '*PTS'] : [];
  // (The caption is a DOM overlay baked into the recording — see injectCaption — so no font/ffmpeg-drawtext dep.)

  const mp4vf = [...speedF, 'scale=' + W + ':-2'].join(',');
  ff(['-i', webm, ...trim, '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', mp4vf, OUT]);
  console.log('✓ MP4:', OUT);
  if (MAKEGIF) { const gif = OUT.replace(/\.\w+$/, '') + '.gif';
    const pre = [...speedF, 'fps=15', 'scale=960:-1:flags=lanczos'].join(',');
    ff(['-i', webm, ...trim, '-vf', pre + ',split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', gif]);
    console.log('✓ GIF:', gif); }
  fs.rmSync(VID, { recursive: true, force: true });
})();
