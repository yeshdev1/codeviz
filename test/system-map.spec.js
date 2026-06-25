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
const fs = require('fs');

const DEMO = url.pathToFileURL(path.resolve(__dirname, '../examples/demo/system-map.html')).href;
const MODELS = url.pathToFileURL(path.resolve(__dirname, '../examples/demo/data-model.html')).href;
const SCEN_PATH = path.resolve(__dirname, '../examples/demo/scenarios.html');

// Elements the engine depends on — keep this in sync with the template.
const REQUIRED_IDS = [
  'cv', 'levels', 'zin', 'zout', 'fit', 'tourBtn', 'layerKey', 'focusbar', 'focusClear',
  'narr', 'narrHead', 'narrText', 'narrDetail', 'narrJargon',
  'tPrev', 'tPlay', 'tNext', 'tExit', 'tCount', 'scenpick', 'tip',
  'erPanel', 'erScrim', 'erTabs', 'erClose', 'erScroll', 'erLinks', 'erTables', 'erAccess', 'erName', 'erEngine', 'erAbout', 'erFoot',
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

test('clicking a datastore opens its data model (ER diagram + joins)', async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForFunction(() => !!window.__atlas);
  // a datastore node carries a DATAMODEL entry; a non-store does not
  expect(await page.evaluate(() => window.__atlas.isStore('pg'))).toBe(true);
  expect(await page.evaluate(() => window.__atlas.isStore('api'))).toBe(false);
  await page.evaluate(() => window.__atlas.openDataModel('pg'));
  await expect(page.locator('#erPanel')).toBeVisible();
  // tables render with at least one FK connector drawn
  expect(await page.locator('#erTables .er-table').count()).toBeGreaterThanOrEqual(4);
  await expect.poll(() => page.locator('#erLinks path').count(), { timeout: 3000 }).toBeGreaterThanOrEqual(3);
  // the Joins & retrieval tab lists access patterns
  await page.click('#erTabs button[data-t="access"]');
  expect(await page.locator('#erAccess .er-q').count()).toBeGreaterThanOrEqual(1);
  // Escape closes it — and must NOT also clear the underlying node focus
  await page.evaluate(() => window.__atlas.setFocus('pg'));
  await page.evaluate(() => window.__atlas.openDataModel('pg'));
  await page.keyboard.press('Escape');
  await expect(page.locator('#erPanel')).toBeHidden();
  expect(await page.evaluate(() => window.__atlas.dataOpen)).toBe(null);
  expect(await page.evaluate(() => window.__atlas.focus)).toBe('pg'); // focus survived the panel's Escape
});

test('the data model closes via the × button and the backdrop too', async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForFunction(() => !!window.__atlas);
  await page.evaluate(() => window.__atlas.openDataModel('pg'));
  await page.click('#erClose');
  await expect(page.locator('#erPanel')).toBeHidden();
  await page.evaluate(() => window.__atlas.openDataModel('pg'));
  await page.click('#erScrim', { position: { x: 5, y: 5 } });
  await expect(page.locator('#erPanel')).toBeHidden();
  expect(await page.evaluate(() => window.__atlas.dataOpen)).toBe(null);
});

test('FK jump, store-swap, and empty-queries state', async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForFunction(() => !!window.__atlas);
  await page.evaluate(() => window.__atlas.openDataModel('pg'));
  // clicking an FK column flashes its target table
  await page.click('#erTables .er-col.has-fk');
  await expect(page.locator('#erTables .er-table.flash')).toHaveCount(1);
  // an access-tab chip jumps back to the schema view and flashes the target
  await page.click('#erTabs button[data-t="access"]');
  await page.click('#erAccess .er-chip[data-jump]');
  await expect(page.locator('#erTables')).toBeVisible();
  // re-opening a different store without closing swaps the content (no stale pg tables)
  await page.evaluate(() => window.__atlas.openDataModel('redis'));
  expect(await page.evaluate(() => window.__atlas.dataOpen)).toBe('redis');
  const names = await page.locator('#erTables .er-tname').allTextContents();
  expect(names.some((n) => n.includes('orders'))).toBe(false); // pg-only table is gone
  // a store with no queries shows the empty state, not a stale list
  await page.evaluate(() => {
    window.__atlas.DATAMODEL.empt = { engine: 'X', tables: [{ name: 't', cols: [{ name: 'id', pk: true }] }], queries: [] };
    window.__atlas.openDataModel('empt');
  });
  await page.click('#erTabs button[data-t="access"]');
  await expect(page.locator('#erAccess .er-empty')).toBeVisible();
  expect(await page.locator('#erAccess .er-q').count()).toBe(0);
});

test('hostile schema content cannot inject markup or script (XSS)', async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForFunction(() => !!window.__atlas);
  await page.evaluate(() => {
    window.__atlas.DATAMODEL.evil = {
      engine: 'PG',
      about: '<img src=x onerror="window.__x_about=1">',
      tables: [
        // an FK TARGET carrying a non-hex accent — the original injection vector via the --tc CSS round-trip
        { name: 'parent', accent: 'red"><image href=x onerror="window.__x_accent=1">', cols: [{ name: 'id', type: 'uuid', pk: true }] },
        { name: '<img src=x onerror="window.__x_name=1">', cols: [{ name: 'a"<b', type: 'text' }, { name: 'ref', type: 'uuid', fk: 'parent.id' }] },
      ],
      queries: [{ name: 'q</pre><script>window.__x_q=1</script>', tables: ['parent'], sql: '<img src=x onerror="window.__x_sql=1">' }],
    };
    window.__atlas.openDataModel('evil');
  });
  await expect(page.locator('#erPanel')).toBeVisible();
  await page.waitForTimeout(150); // let the connector rAF run
  await page.click('#erTabs button[data-t="access"]');
  // no authored string was ever parsed as markup, in any sink
  expect(await page.locator('#erTables img, #erTables script').count()).toBe(0);
  expect(await page.locator('#erLinks image, #erLinks script').count()).toBe(0);
  expect(await page.locator('#erAccess img, #erAccess script').count()).toBe(0);
  const flags = await page.evaluate(() => [window.__x_about, window.__x_accent, window.__x_name, window.__x_q, window.__x_sql]);
  expect(flags.every((f) => f === undefined)).toBe(true);
  // and the raw text is preserved verbatim (escaped, not stripped)
  const tnames = await page.locator('#erTables .er-tname').allTextContents();
  expect(tnames).toContain('<img src=x onerror="window.__x_name=1">');
});

test('connectors are redrawn after the panel scrolls', async ({ page }) => {
  await page.goto(DEMO);
  await page.waitForFunction(() => !!window.__atlas);
  await page.evaluate(() => window.__atlas.openDataModel('pg'));
  await expect.poll(() => page.locator('#erLinks path').count(), { timeout: 3000 }).toBeGreaterThanOrEqual(3);
  await page.evaluate(() => { const s = document.getElementById('erScroll'); s.scrollTop = s.scrollHeight; s.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(120);
  // still drawn, and coordinates are finite (no NaN paths)
  expect(await page.locator('#erLinks path').count()).toBeGreaterThanOrEqual(3);
  const bad = await page.evaluate(() => Array.from(document.querySelectorAll('#erLinks path')).filter((p) => /NaN|undefined/.test(p.getAttribute('d') || '')).length);
  expect(bad).toBe(0);
});

// --- companion pages (rendered by assets/render-pages.js) ---

test('the data-model page: context, ER diagram with crow-foot cardinality, then explanation', async ({ page }) => {
  await page.goto(MODELS);
  await expect.poll(() => page.locator('.tbl').count()).toBeGreaterThanOrEqual(4);
  // relationship lines drawn (path) + crow's-foot/bar cardinality marks (line segments)
  await expect.poll(() => page.locator('.er-svg path').count(), { timeout: 3000 }).toBeGreaterThanOrEqual(2);
  expect(await page.locator('.er-svg line').count()).toBeGreaterThanOrEqual(4);
  // the three stacked zones, in order: context above, comprehensive explanation below
  expect(await page.locator('.store-context').count()).toBeGreaterThanOrEqual(1);
  expect(await page.locator('.er-explain').count()).toBeGreaterThanOrEqual(1);
  // the SQL "joins" section is gone
  expect(await page.locator('.joins, .sql').count()).toBe(0);
  await expect(page.locator('.top nav a[href="system-map.html"]')).toHaveCount(1);
});

test('the data-model page lays tables out by dependency and spotlights relationships', async ({ page }) => {
  await page.goto(MODELS);
  await expect.poll(() => page.locator('.er.ready').count(), { timeout: 3000 }).toBeGreaterThanOrEqual(1);
  // relationship-aware layout: tables get absolute positions in increasing columns (roots left → dependents right)
  const xs = await page.locator('#store-pg .tbl').evaluateAll(els => els.map(e => Math.round(parseFloat(e.style.left || '0'))));
  expect(new Set(xs).size).toBeGreaterThanOrEqual(3);            // at least 3 distinct columns
  // the junction table (≥2 FKs) is auto-detected and sits in the rightmost column
  await expect(page.locator('#er-pg-order_items .role.junction')).toHaveCount(1);
  const maxX = Math.max(...xs);
  const jx = Math.round(parseFloat(await page.locator('#er-pg-order_items').evaluate(e => e.style.left)));
  expect(jx).toBe(maxX);
  // hovering a table spotlights it: the diagram enters focus and the hovered box is pinned
  await page.hover('#er-pg-users .tbl-h');
  await expect(page.locator('#store-pg .er.focus')).toHaveCount(1);
  await expect(page.locator('#er-pg-users.pin')).toHaveCount(1);
});

test('dig depth: opens at the recommended level and gates digging beyond it', async ({ page }) => {
  await page.goto(MODELS);
  await expect.poll(() => page.locator('.er.ready').count(), { timeout: 3000 }).toBeGreaterThanOrEqual(1);
  const er = page.locator('#store-pg .er');
  // a standard-grain store opens at "Columns" (recommended), with a deeper "Everything" level marked
  await expect(er).toHaveAttribute('data-dig', '2');
  await expect(page.locator('#store-pg .dig button.on')).toHaveText(/Columns/);
  await expect(page.locator('#store-pg .dig button.deep')).toHaveCount(1);
  // the deepest level explains, on hover, WHY it isn't advised — and that it's the floor
  await expect(page.locator('#store-pg .dig button[data-lvl="3"]')).toHaveAttribute('title', /deepest level \(nothing beyond it\)/);
  await page.hover('#store-pg .dig button[data-lvl="3"]');
  await expect(page.locator('#store-pg .dig-hint')).toHaveText(/not insight/);
  // shallower levels switch freely — no gate
  await page.click('#store-pg .dig button[data-lvl="0"]');
  await expect(er).toHaveAttribute('data-dig', '0');
  await expect(page.locator('#store-pg .dig-gate')).toBeHidden();
  // digging past recommended raises the gate and does NOT change the level yet
  await page.click('#store-pg .dig button[data-lvl="3"]');
  await expect(page.locator('#store-pg .dig-gate')).toBeVisible();
  await expect(er).toHaveAttribute('data-dig', '0');
  // declining keeps you put; confirming unlocks the deepest level + its raw reference rows
  await page.click('#store-pg .dig-gate .stay');
  await expect(page.locator('#store-pg .dig-gate')).toBeHidden();
  await page.click('#store-pg .dig button[data-lvl="3"]');
  await page.click('#store-pg .dig-gate .go');
  await expect(er).toHaveAttribute('data-dig', '3');
  await expect(page.locator('#er-pg-orders .cmeta').first()).toBeVisible();
});

test('scenarios live on the map as a diggable tour — no separate page or tab', async ({ page }) => {
  // the standalone scenarios page is gone
  expect(fs.existsSync(SCEN_PATH)).toBe(false);
  await page.goto(DEMO);
  // the map's top nav offers System map + Data models only — no Scenarios tab
  await expect(page.locator('.cv-topnav a', { hasText: 'Scenarios' })).toHaveCount(0);
  await expect(page.locator('.cv-topnav a', { hasText: 'Data models' })).toHaveCount(1);
  // start the guided tour; it opens at the recommended "Walkthrough" depth
  await page.click('#tourBtn');
  await expect(page.locator('#narr')).toBeVisible();
  await expect(page.locator('#narr')).toHaveAttribute('data-dig', '1');
  await expect(page.locator('#tourDig .seg button.on')).toHaveText(/Walkthrough/);
  // hovering Deep dive explains why it isn't advised (before clicking), then restores on leave
  await page.hover('#tourDig .seg button[data-lvl="2"]');
  await expect(page.locator('#tourDigHint')).toHaveText(/not insight/);
  await expect(page.locator('#tourDig .seg button[data-lvl="2"]')).toHaveAttribute('title', /deepest level \(nothing beyond it\)/);
  await page.hover('#narrText');
  await expect(page.locator('#tourDigHint')).not.toHaveText(/not insight/);
  // shallower level (Overview) switches with no gate
  await page.click('#tourDig .seg button[data-lvl="0"]');
  await expect(page.locator('#narr')).toHaveAttribute('data-dig', '0');
  await expect(page.locator('#tourGate')).toBeHidden();
  // digging to Deep dive raises the gate and holds the level; confirming reveals the beginner content
  await page.click('#tourDig .seg button[data-lvl="2"]');
  await expect(page.locator('#tourGate')).toBeVisible();
  await expect(page.locator('#narr')).toHaveAttribute('data-dig', '0');
  await page.click('#tGateGo');
  await expect(page.locator('#narr')).toHaveAttribute('data-dig', '2');
  await expect(page.locator('#narrCallout')).toBeVisible();
  await expect(page.locator('#narrJargon .jt').first()).toBeVisible();
});

// A mock engine echoes the structured context the layer extracted, so we can assert the
// selection → context → tooltip plumbing without downloading the real model weights.
const MOCK_ENGINE = () => {
  window.__cvExplainEngine = {
    generate(system, user, onToken) {
      const g = (re) => (user.match(re) || [, ''])[1];
      const out = 'kind=' + g(/- kind: (.+)/) + ' table=' + g(/- table: (.+)/) +
        ' column=' + g(/- column: (.+)/) + ' sel=' + g(/Selected text: "(.+)"/);
      onToken(out); return Promise.resolve(out);
    }
  };
};
const selectContents = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s); const r = document.createRange(); r.selectNodeContents(el);
  const g = window.getSelection(); g.removeAllRanges(); g.addRange(r);
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}, sel);

test('select-to-explain: explains the selected element inline, at the selection (no side panel)', async ({ page }) => {
  await page.addInitScript(MOCK_ENGINE);
  await page.goto(MODELS);
  await expect(page.locator('.cvx-pill')).toBeVisible();
  // opt in (the mock engine flips it ready instantly — no real download)
  await page.click('.cvx-pill');
  await expect(page.locator('.cvx-card .cvx-enable')).toBeVisible();
  await page.click('.cvx-card .cvx-enable');
  await expect(page.locator('.cvx-pill')).toHaveAttribute('data-state', 'ready');
  // selecting a table name pops a tooltip carrying that table's context
  await selectContents(page, '#er-pg-order_items .nm');
  await expect(page.locator('.cvx-tip')).toBeVisible();
  await expect(page.locator('.cvx-tip .cvx-body')).toContainText('kind=table table=order_items');
  // it's a tooltip, not a side panel: small box anchored near the selection
  const box = await page.locator('.cvx-tip').boundingBox();
  const vp = page.viewportSize();
  expect(box.width).toBeLessThanOrEqual(380);
  expect(box.height).toBeLessThan(vp.height * 0.6);
  expect(box.x).toBeGreaterThan(120);            // not pinned to a screen edge like a panel
  // a column carries its own keys + the parent table
  await selectContents(page, '#er-pg-order_items .col.is-fk .cn');
  await expect(page.locator('.cvx-tip .cvx-body')).toContainText('column=order_id');
  // Esc closes it
  await page.keyboard.press('Escape');
  await expect(page.locator('.cvx-tip')).toBeHidden();
});

test('select-to-explain also works on the map tour narration', async ({ page }) => {
  await page.addInitScript(MOCK_ENGINE);
  await page.goto(DEMO);
  await page.click('.cvx-pill');
  await page.click('.cvx-card .cvx-enable');
  await expect(page.locator('.cvx-pill')).toHaveAttribute('data-state', 'ready');
  await page.click('#tourBtn');
  await expect(page.locator('#narr')).toBeVisible();
  await selectContents(page, '#narrText');
  await expect(page.locator('.cvx-tip .cvx-body')).toContainText('kind=scenario step');
});
