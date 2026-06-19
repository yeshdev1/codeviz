const { defineConfig, devices } = require('@playwright/test');

// The plugin output is a set of static HTML files opened over file://, so there is no
// dev server — tests navigate straight to file URLs. elkjs is served from local
// node_modules via request routing (see test/system-map.spec.js), keeping runs hermetic.
module.exports = defineConfig({
  testDir: './test',
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1200, height: 900 },
  },
});
