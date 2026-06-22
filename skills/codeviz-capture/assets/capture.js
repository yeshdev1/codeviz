#!/usr/bin/env node
// codeviz-capture — record a short clip of a generated codeviz system map.
// Usage:
//   node capture.js --map docs/onboarding/system-map.html --scene health --gif
// Scenes: tour | health | zoom | focus | overview   (drives the map via its window.__atlas hook)
// Output: an MP4 (and optional GIF) via ffmpeg; falls back to .webm if ffmpeg is missing.
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

const drive = (p, fn, a) => p.evaluate(([f, x]) => { if (window.__atlas && window.__atlas[f]) window.__atlas[f](x); }, [fn, a]);

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
  await SCENES[SCENE](p);
  const vid = p.video(); await ctx.close(); await b.close();
  const webm = await vid.path();

  const hasFF = cp.spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  if (!hasFF) {
    const dest = OUT.replace(/\.\w+$/, '') + '.webm'; fs.copyFileSync(webm, dest); fs.rmSync(VID, { recursive: true, force: true });
    console.log('⚠ ffmpeg not found — kept WEBM:', dest, '\n  install ffmpeg for MP4/GIF (e.g. `brew install ffmpeg`).'); return;
  }
  const ff = (a) => cp.spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' });
  ff(['-i', webm, '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=' + W + ':-2', OUT]);
  console.log('✓ MP4:', OUT);
  if (MAKEGIF) { const gif = OUT.replace(/\.\w+$/, '') + '.gif';
    ff(['-i', webm, '-vf', 'fps=15,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', gif]);
    console.log('✓ GIF:', gif); }
  fs.rmSync(VID, { recursive: true, force: true });
})();
