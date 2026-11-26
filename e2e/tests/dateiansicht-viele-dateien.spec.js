'use strict';
// R00045 Kriterium 6: 50 Dateien mit langen Namen — die Seitenleiste scrollt für sich, jeder Name steht einzeilig gekürzt,
// Kopf und Inhalt bleiben an Ort und Höhe, ein Name mit U+202E steht als Marke, der volle Name als zugänglicher Name.
// Ebene: Playwright (Darstellung, DOM-Sicherheit).
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const dTreiber = require('../treiber/dateiansicht-d.js');

let d;
let namen;

test.beforeAll(() => {
  d = dTreiber.ordnerDAnlegen();
  namen = [];
  for (let nummer = 0; nummer < 49; nummer += 1) {
    const name = `${'n'.repeat(116)}${String(nummer).padStart(4, '0')}`;
    fs.writeFileSync(d.pfad(name), `SELECT ${nummer};\n`);
    namen.push(name);
  }
  const marke = `\u202e${'m'.repeat(119)}`;
  fs.writeFileSync(d.pfad(marke), 'SELECT 4711;\n');
  namen.push(marke);
});

test.afterAll(() => {
  dTreiber.entfernen(d);
});

test.describe('Dateiansicht mit 50 Dateien', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Kriterium 6: die Seitenleiste scrollt für sich, Namen sind einzeilig gekürzt, Kopf und Inhalt bleiben stehen', async ({ page }) => {
    const lauf = await dTreiber.startenMit(d, namen);
    try {
      await dTreiber.oeffnen(page, lauf);

      const zeilen = page.locator('#da-dateien .da-datei');
      await expect(zeilen).toHaveCount(50);

      const rollen = await page.locator('#da-dateien').evaluate(element => ({
        ueberlauf: getComputedStyle(element).overflowY,
        scrollt: element.scrollHeight > element.clientHeight,
      }));
      expect(rollen.ueberlauf).toBe('auto');
      expect(rollen.scrollt).toBe(true);

      const ersteName = await page.locator('#da-dateien .da-datei').nth(0).locator('.da-datei-name').textContent();
      expect(ersteName).toContain('…');
      expect(ersteName).not.toContain('\n');
      expect(ersteName.length).toBeLessThanOrEqual(100);
      await expect(page.locator('#da-dateien .da-datei').nth(0)).toHaveAttribute('aria-label', namen[0]);

      const kopfVorher = await page.locator('#da-kopf').boundingBox();
      const inhaltVorher = await page.locator('#da-roll').boundingBox();

      await page.locator('#da-dateien').evaluate(element => element.scrollTo(0, element.scrollHeight));

      await expect(page.locator('#da-kopf')).toBeVisible();
      const kopfNachher = await page.locator('#da-kopf').boundingBox();
      const inhaltNachher = await page.locator('#da-roll').boundingBox();
      expect(kopfNachher.y).toBeCloseTo(kopfVorher.y, 0);
      expect(inhaltNachher.y).toBeCloseTo(inhaltVorher.y, 0);
      expect(inhaltNachher.height).toBeCloseTo(inhaltVorher.height, 0);
    } finally {
      await dTreiber.beenden(lauf);
    }
  });

  test('Kriterium 6: ein Name mit U+202E steht als Marke, nie roh', async ({ page }) => {
    const lauf = await dTreiber.startenMit(d, namen);
    try {
      await dTreiber.oeffnen(page, lauf);

      const markiertenZeile = page.locator('#da-dateien .da-datei').nth(49);
      await markiertenZeile.scrollIntoViewIfNeeded();
      const sichtbar = await markiertenZeile.locator('.da-datei-name').textContent();
      expect(sichtbar).toContain('⟨U+202E⟩');
      const roh = await markiertenZeile.evaluate(element => element.textContent.includes('\u202e'));
      expect(roh).toBe(false);
      const zugang = await markiertenZeile.getAttribute('aria-label');
      expect(zugang).toContain('⟨U+202E⟩');
      expect(zugang.includes('\u202e')).toBe(false);
    } finally {
      await dTreiber.beenden(lauf);
    }
  });
});
