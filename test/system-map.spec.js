// Smoke tests for the interactive system-map page (the centerpiece of codeviz output).
// Renders the demo in a real browser and asserts the canvas draws, the request tracer
// runs, clicking a node opens its modal, and ?layout=elk actually engages elkjs.
//
// Hermetic: elkjs is served from local node_modules (not the unpkg CDN the page uses in
// production) and the Lucide CDN call is stubbed out, so the suite passes fully offline.

const { test, expect } = require('@playwright/test');
const path = require('path');
const url = require('url');

const DEMO = url.pathToFileURL(path.resolve(__dirname, '../examples/demo/system-map.html')).href;
const ELK_LOCAL = require.resolve('elkjs/lib/elk.bundled.js');

const REQUIRED_IDS = [
  'archCanvas', 'scenSeg', 'scenStep', 'scenBar', 'scenPrev', 'scenPlay',
  'scenNext', 'scenCount', 'scenEdges', 'compDetail', 'compModal',
];

// Read the canvas back and decide whether anything was actually painted.
const CANVAS_IS_BLANK = () => {
  const c = document.getElementById('archCanvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) { if (d[i] !== 0) return false; }
  return true;
};

test.beforeEach(async ({ page }) => {
  // Serve elkjs from disk so the test never depends on the network...
  await page.route('**/elk.bundled.js', (route) =>
    route.fulfill({ path: ELK_LOCAL, contentType: 'application/javascript' }));
  // ...and drop the optional Lucide icon fetch (the page guards `if (window.lucide)`).
  await page.route('**/lucide@*', (route) => route.abort());
});

test('every required template id is present', async ({ page }) => {
  await page.goto(DEMO);
  for (const id of REQUIRED_IDS) {
    await expect(page.locator('#' + id)).toHaveCount(1);
  }
});

test('the canvas paints something (not blank)', async ({ page }) => {
  await page.goto(DEMO);
  // The canvas is painted on requestAnimationFrame, which headless Chromium starts
  // lazily — poll until the first frame lands rather than guessing a fixed delay.
  await expect.poll(() => page.evaluate(CANVAS_IS_BLANK), { timeout: 6000 }).toBe(false);
});

test('the request tracer auto-plays and Next advances the steps', async ({ page }) => {
  await page.goto(DEMO);
  await expect(page.locator('#scenStep')).toContainText('Step 1 / 5');
  await page.click('#scenNext');
  await expect(page.locator('#scenStep')).toContainText('Step 2 / 5');
});

test('clicking a node opens its deep-dive modal (hand-placed layout)', async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForTimeout(400);
  await expect(page.locator('#compModal')).toBeHidden();

  const box = await page.locator('#archCanvas').boundingBox();
  const scale = box.width / 880; // logical coordinate space is 880×510
  // 'api' node: x 360, y 158, w 160, h 54 → logical center ≈ (440, 185)
  await page.mouse.click(box.x + 440 * scale, box.y + 185 * scale);

  await expect(page.locator('#compModal')).toBeVisible();
  await expect(page.locator('#modalTitle')).toContainText('API');
});

test('?layout=elk engages elkjs and re-lays-out the diagram', async ({ page }) => {
  // Baseline geometry with the hand-placed layout.
  await page.goto(DEMO);
  await page.waitForTimeout(700);
  const heightDefault = await page.evaluate(() => document.getElementById('archCanvas').style.height);

  // Same page, auto-layout forced on.
  await page.goto(DEMO + '?layout=elk');
  await page.waitForTimeout(1500); // allow the (routed) elkjs load + async layout
  expect(await page.evaluate(() => typeof window.ELK !== 'undefined')).toBe(true);

  // ELK gives the graph a different aspect ratio, so the rendered canvas height changes.
  const heightElk = await page.evaluate(() => document.getElementById('archCanvas').style.height);
  expect(heightElk).not.toBe(heightDefault);

  // And the page is still fully alive after auto-layout.
  await expect.poll(() => page.evaluate(CANVAS_IS_BLANK), { timeout: 6000 }).toBe(false);
  await expect(page.locator('#scenStep')).toContainText('Step 1 / 5');
});
