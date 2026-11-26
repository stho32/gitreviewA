'use strict';
// R00046 Kriterium 1: eine Commitquelle zeigt den Stand aus dem Commit; der Anzeigename ist `<Kurzhash>:<Pfad>`, der Kopf
// nennt den vollen Hash, und „Datei kopieren“ legt genau die Bytes des Blobs ab (nicht c2, nicht den Arbeitsbaum).
const { test, expect } = require('@playwright/test');
const cTreiber = require('../treiber/dateiansicht-repo-c.js');

let c;

test.beforeAll(() => {
  c = cTreiber.repoCAnlegen();
});

test.afterAll(() => {
  cTreiber.entfernen(c.ordner);
});

test.describe('Dateiansicht Commitquelle', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1280, height: 800 } });

  test('Kopf nennt <Kurzhash>:<Pfad> und den vollen Hash, der Inhalt kommt aus dem Commit, „Datei kopieren“ legt SELECT 1; ab', async ({ page }) => {
    const lauf = await cTreiber.starten(c, `${c.c1}:sql/a.sql`);
    try {
      await cTreiber.oeffnen(page, lauf);

      await expect(page.locator('#da-name')).toHaveText(`${c.c1.slice(0, 7)}:sql/a.sql`);
      await expect(page.locator('#da-pfad')).toHaveText(c.c1);
      await expect(page.locator('#da-inhalt .da-text').first()).toHaveText('SELECT 1;');
      await expect(page.locator('#da-inhalt')).not.toContainText('SELECT 2;');
      await expect(page.locator('#da-inhalt')).not.toContainText('SELECT 3;');

      await page.locator('#datei-kopieren').click();

      await expect(page.locator('#da-status')).toHaveText('Datei kopiert (1 Zeile)');
      const text = await page.evaluate(() => navigator.clipboard.readText());
      expect(text).toBe('SELECT 1;\n');
    } finally {
      await cTreiber.beenden(lauf);
    }
  });

  test('Kriterium 5: aus dem Unterordner sql/ zeigt <c1>:./a.sql dieselbe Datei sql/a.sql', async ({ page }) => {
    const lauf = await cTreiber.starten(c, `${c.c1}:./a.sql`, require('path').join(c.ordner, 'sql'));
    try {
      await cTreiber.oeffnen(page, lauf);

      await expect(page.locator('#da-name')).toHaveText(`${c.c1.slice(0, 7)}:sql/a.sql`);
      await expect(page.locator('#da-inhalt .da-text').first()).toHaveText('SELECT 1;');
    } finally {
      await cTreiber.beenden(lauf);
    }
  });
});
