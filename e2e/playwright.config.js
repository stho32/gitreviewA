'use strict';
// Akzeptanztests gegen das echte Programm: jeder Test legt ein Wegwerf-Repo an und startet gitreviewA darin.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./treiber/programm-vorhanden.js'),
  timeout: 30000,
  workers: 2,
  reporter: [['list']],
  use: { headless: true, locale: 'de-DE' },
});
