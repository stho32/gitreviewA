'use strict';
// Nacharbeit Karte #53 (I0046, R00045): die Dateiansicht darf beim Laden, beim Wechseln (`j`) und beim
// Schließen mit mehreren Dateien keine unbehandelte Ausnahme in der Browser-Konsole erzeugen.
// Befund 1: der Review-Erkenner der Suche greift auf dem `<main id="diff">` der Dateiansicht und findet
//           kein `#diff-suche`; Befund 2: nach `replaceChildren` sind `#bereich-kopieren`/`#da-status` weg.
// Ebene: Playwright, weil der Fehler nur im Browser als `pageerror` sichtbar wird.
const { test, expect } = require('@playwright/test');
const dTreiber = require('../treiber/dateiansicht-d.js');

let d;

test.beforeAll(() => {
  d = dTreiber.ordnerDAnlegen();
});

test.afterAll(() => {
  dTreiber.entfernen(d);
});

test('Laden, Wechseln und Schließen mit mehreren Dateien hinterlässt keinen pageerror', async ({ page }) => {
  const fehler = [];
  page.on('pageerror', ausnahme => fehler.push(ausnahme.stack || ausnahme.message));

  const lauf = await dTreiber.startenMit(d, ['001.sql', '002.sql', '003.sql']);
  try {
    await dTreiber.oeffnen(page, lauf);
    await page.keyboard.press('j');
    await expect(page.locator('#da-name')).toHaveText('002.sql');

    await page.locator('#schliessen').click();
    await expect(page.locator('.da-geschlossen')).toBeVisible();

    expect(fehler, `pageerror in der Dateiansicht:\n${fehler.join('\n')}`).toEqual([]);
  } finally {
    await dTreiber.beenden(lauf);
  }
});
