'use strict';
// R00045 Kriterien 1 (Seitenleiste, Wahl) und „Eine Angabe": die Dateiliste steht links in Aufrufreihenfolge, die erste ist
// gewählt, Klick und j/k (mit Umlauf) wählen; auch eine einzige Datei steht als Liste. Ebene: Playwright (Browser-Eigenes).
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

function gewaehlteNummer(seite) {
  return seite.locator('#da-dateien .da-datei[aria-current="true"]').getAttribute('data-nummer');
}

test.describe('Dateiansicht mit mehreren Dateien', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('drei Dateien stehen in Aufrufreihenfolge, die erste ist gewählt, j und k laufen um', async ({ page }) => {
    await mitLauf(['003.sql', '001.sql', '002.sql'], page, async () => {
      const namen = page.locator('#da-dateien .da-datei .da-datei-name');
      await expect(namen).toHaveText(['003.sql', '001.sql', '002.sql']);
      await expect(page.locator('#da-dateien .da-datei')).toHaveCount(3);
      await expect(page.locator('#da-dateien .da-datei').nth(0)).toHaveAttribute('aria-current', 'true');
      await expect(page.locator('#da-name')).toHaveText('003.sql');
      await expect(page.locator('#da-inhalt')).toContainText('SELECT 003;');

      await page.keyboard.press('j');
      await expect(page.locator('#da-name')).toHaveText('001.sql');
      expect(await gewaehlteNummer(page)).toBe('1');
      await expect(page.locator('#da-inhalt')).toContainText('SELECT 001;');

      await page.keyboard.press('k');
      await expect(page.locator('#da-name')).toHaveText('003.sql');
      expect(await gewaehlteNummer(page)).toBe('0');

      await page.keyboard.press('k');
      await expect(page.locator('#da-name')).toHaveText('002.sql');
      expect(await gewaehlteNummer(page)).toBe('2');
    });
  });

  test('ein Klick auf eine Zeile wählt diese Datei', async ({ page }) => {
    await mitLauf(['003.sql', '001.sql', '002.sql'], page, async () => {
      await page.locator('#da-dateien .da-datei').nth(1).click();

      await expect(page.locator('#da-dateien .da-datei').nth(1)).toHaveAttribute('aria-current', 'true');
      await expect(page.locator('#da-dateien .da-datei').nth(0)).toHaveAttribute('aria-current', 'false');
      await expect(page.locator('#da-name')).toHaveText('001.sql');
      await expect(page.locator('#da-inhalt')).toContainText('SELECT 001;');
    });
  });

  test('eine einzige Angabe steht als Liste mit einer Zeile', async ({ page }) => {
    await mitLauf(['a.sql'], page, async () => {
      await expect(page.locator('#da-dateien .da-datei')).toHaveCount(1);
      await expect(page.locator('#da-dateien .da-datei').nth(0)).toHaveAttribute('aria-current', 'true');
      await expect(page.locator('#da-name')).toHaveText('a.sql');
    });
  });
});
