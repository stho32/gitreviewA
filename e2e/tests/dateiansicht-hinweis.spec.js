'use strict';
// R00039 (B3): das Kürzel `w` steht in der Dateiansicht am Umbruch-Schalter — `aria-keyshortcuts` und das sichtbare `<kbd>w</kbd>`
// kommen aus dem Katalog (`tasten-werte.js`, Ziel je Laufart). Browser-Eigenes (DOM, Darstellung).
const { test, expect } = require('@playwright/test');
const dTreiber = require('../treiber/dateiansicht-d.js');

let d;

test.beforeAll(() => {
  d = dTreiber.ordnerDAnlegen();
});

test.afterAll(() => {
  dTreiber.entfernen(d);
});

test.describe('Dateiansicht — Kürzel am Umbruch-Schalter (R00039, B3)', () => {
  test('soll am Umbruch-Schalter `aria-keyshortcuts="w"` und ein sichtbares `<kbd>w</kbd>` tragen; der Menüknopf fehlt hier', async ({ page }) => {
    const lauf = await dTreiber.starten(d, 'a.sql');
    try {
      await dTreiber.oeffnen(page, lauf);

      const angaben = await page.evaluate(() => {
        const schalter = document.getElementById('da-umbruch');
        const behaelter = schalter.closest('label') || schalter;
        return {
          aria: schalter.getAttribute('aria-keyshortcuts'),
          kbd: [...behaelter.querySelectorAll('kbd')].map(k => ({ text: k.textContent, sichtbar: k.getBoundingClientRect().width > 0 && k.getBoundingClientRect().height > 0 })),
          hatAnsichtKnopf: Boolean(document.getElementById('ansicht-knopf')),
        };
      });

      expect(angaben.aria, 'aria-keyshortcuts am Schalter').toBe('w');
      expect(angaben.kbd, 'sichtbares <kbd>w</kbd>').toEqual([{ text: 'w', sichtbar: true }]);
      expect(angaben.hatAnsichtKnopf, 'kein Menüknopf in der Dateiansicht').toBe(false);
    } finally {
      await dTreiber.beenden(lauf);
    }
  });
});
