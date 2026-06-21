// Smoke tests for the interactive system-map page (the centerpiece of codeviz output).
// The map is a self-contained "semantic-zoom atlas": a layered, colour-coded substrate you
// pan/zoom through three levels of detail (continents → services → detail), with degree-of-
// interest focus, a minimap, and a fly-to guided tour that teaches each hop step by step.
//
// Fully hermetic: the page ships no framework and no CDN calls, so the suite runs offline
// with no request routing. State is asserted through the page's `window.__atlas` test hook.

const { test, expect } = require('@playwright/test');
const path = require('path');
const url = require('url');

const DEMO = url.pathToFileURL(path.resolve(__dirname, '../examples/demo/system-map.html')).href;

// Elements the engine depends on — keep this in sync with the template.
const REQUIRED_IDS = [
  'cv', 'levels', 'zin', 'zout', 'fit', 'tourBtn', 'layerKey', 'focusbar', 'focusClear',
  'narr', 'narrHead', 'narrText', 'narrDetail', 'narrJargon',
  'tPrev', 'tPlay', 'tNext', 'tExit', 'tCount', 'scenpick', 'tip',
];

// Read the canvas back and decide whether anything was actually painted.
const CANVAS_IS_BLANK = () => {
  const c = document.getElementById('cv');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) { if (d[i] !== 0) return false; }
  return true;
};

test('every required template id is present', async ({ page }) => {
  await page.goto(DEMO);
  for (const id of REQUIRED_IDS) {
    await expect(page.locator('#' + id)).toHaveCount(1);
  }
});

test('the test hook exposes the project data', async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForFunction(() => !!window.__atlas);
  const meta = await page.evaluate(() => ({
    domains: window.__atlas.DOMAINS.length,
    nodes: Object.keys(window.__atlas.NODES).length,
    edges: window.__atlas.EDGES.length,
  }));
  expect(meta.domains).toBeGreaterThan(0);
  expect(meta.nodes).toBeGreaterThan(0);
  expect(meta.edges).toBeGreaterThan(0);
});

test('the canvas paints something (not blank)', async ({ page }) => {
  await page.goto(DEMO);
  // Painted on requestAnimationFrame, which headless Chromium starts lazily — poll for it.
  await expect.poll(() => page.evaluate(CANVAS_IS_BLANK), { timeout: 6000 }).toBe(false);
});

test('semantic zoom: boots at continents, Services reveals the systems', async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForFunction(() => !!window.__atlas);
  expect(await page.evaluate(() => window.__atlas.svc)).toBeLessThan(0.2);
  await page.click('#levels button[data-z="services"]');
  await expect.poll(() => page.evaluate(() => window.__atlas.svc), { timeout: 4000 }).toBeGreaterThan(0.8);
});

test('clicking a system focuses it (degree-of-interest)', async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForFunction(() => !!window.__atlas);
  const id = await page.evaluate(() => Object.keys(window.__atlas.NODES)[1]);
  await page.evaluate((n) => window.__atlas.setFocus(n), id);
  expect(await page.evaluate(() => window.__atlas.focus)).toBe(id);
  await expect(page.locator('#focusbar')).toBeVisible();
  await page.click('#focusClear');
  expect(await page.evaluate(() => window.__atlas.focus)).toBe(null);
});

test('the guided tour runs, teaches each step, and Next advances', async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForFunction(() => !!window.__atlas);
  await page.click('#tourBtn');
  await expect(page.locator('#narr')).toBeVisible();
  await expect(page.locator('#tCount')).toContainText('1 /');
  // each step carries a beginner-level explanation, not just a one-liner
  expect((await page.locator('#narrText').textContent()).length).toBeGreaterThan(10);
  expect((await page.locator('#narrDetail').textContent()).length).toBeGreaterThan(80);
  await page.click('#tNext');
  await expect(page.locator('#tCount')).toContainText('2 /');
  await page.click('#tExit');
  await expect(page.locator('#narr')).toBeHidden();
});
