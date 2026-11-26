'use strict';
// R00045 Kriterium 5 und der Kern „Kopieren wirkt auf die gewählte Datei": eine späte Antwort einer früheren Wahl wird
// verworfen, der Umbruch bleibt über den Wechsel, das Kopieren trifft die gezeigte Datei. Ebene: Playwright (verzögerte
// Antwort über route, Browser-Eigenes).
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const dTreiber = require('../treiber/dateiansicht-d.js');

let d;

test.beforeAll(() => {
  d = dTreiber.ordnerDAnlegen();
});

test.afterAll(() => {
  dTreiber.entfernen(d);
});

async function mitLauf(angaben, seite, pruefung) {
  const lauf = await dTreiber.startenMit(d, angaben);
  try {
    await dTreiber.oeffnen(seite, lauf);
    await pruefung(lauf);
  } finally {
    await dTreiber.beenden(lauf);
  }
}

test.describe('Dateiansicht wechseln', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1280, height: 800 } });

  test('Kriterium 5: eine um 1,5 s verzögerte Antwort wird verworfen, die zuletzt gewählte Datei bleibt stehen', async ({ page }) => {
    await mitLauf(['003.sql', '001.sql', '002.sql'], page, async () => {
      let spaeteAntwort;
      await page.route('**/api/dateiansicht/2', async route => {
        await new Promise(fertig => setTimeout(fertig, 1500));
        await route.continue();
      });
      spaeteAntwort = page.waitForResponse('**/api/dateiansicht/2');

      await page.locator('#da-dateien .da-datei').nth(2).click();
      await page.locator('#da-dateien .da-datei').nth(1).click();

      await expect(page.locator('#da-name')).toHaveText('001.sql');
      await spaeteAntwort;
      await expect(page.locator('#da-name')).toHaveText('001.sql');
      await expect(page.locator('#da-inhalt')).toContainText('SELECT 001;');
      await expect(page.locator('#da-dateien .da-datei').nth(1)).toHaveAttribute('aria-current', 'true');
    });
  });

  test('Kriterium 5: der ausgeschaltete Umbruch bleibt über den Wechsel aus', async ({ page }) => {
    await mitLauf(['003.sql', '001.sql', '002.sql'], page, async () => {
      await page.keyboard.press('w');
      await expect(page.locator('#da-inhalt')).not.toHaveClass(/umbr/);

      await page.keyboard.press('j');
      await expect(page.locator('#da-name')).toHaveText('001.sql');
      await expect(page.locator('#da-inhalt')).not.toHaveClass(/umbr/);
      await expect(page.locator('#da-umbruch')).not.toBeChecked();
    });
  });

  test('Kopieren trifft die gewählte Datei, auch nach einem Wechsel', async ({ page }) => {
    await mitLauf(['003.sql', '001.sql', '002.sql'], page, async () => {
      await page.keyboard.press('j');

      await page.locator('#datei-kopieren').click();

      await expect(page.locator('#da-status')).toHaveText('Datei kopiert (2 Zeilen)');
      const text = await page.evaluate(() => navigator.clipboard.readText());
      expect(text).toBe(fs.readFileSync(d.pfad('001.sql'), 'utf8'));
      expect(text).toContain('SELECT 001;');
    });
  });
});
