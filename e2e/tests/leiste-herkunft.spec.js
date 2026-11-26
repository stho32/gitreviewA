'use strict';
// Nacharbeit Karte #48 (R00039): die Herkunft im Diff-Kopf (R00012, Kriterium 3) darf bei Platzmangel gekürzt sein,
// aber nie **still**: der volle Text steht dann in `title` und im zugänglichen Namen. `toHaveText` allein liest
// `textContent` und sieht die Kürzung nicht (Befund des Entwicklertests). Browser-Eigenes (gemessene Breite).
const { test, expect } = require('../dsl/diff-lesen.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');

/** Der volle Text der Herkunft für Repo Z: „netto aus <z1-7>, <z2-7>, <z3-7>“. */
function erwarteteHerkunft(diff) {
  return `netto aus ${diff.kurz('z1')}, ${diff.kurz('z2')}, ${diff.kurz('z3')}`;
}

test.describe('Herkunft im Diff-Kopf (R00012/R00039)', () => {
  test('soll bei 1280, 1440 und 1600 px nie still gekürzt sein — sichtbar oder voll im Namen und Titel', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await diff.dateiAnsehen('src/a.txt');
    const erwartet = erwarteteHerkunft(diff);

    for (const breite of [1280, 1440, 1600]) {
      await page.setViewportSize({ width: breite, height: 800 });
      await diffSeite.pruefeHerkunft(page, erwartet);
      const mass = await diffSeite.herkunftmass(page);
      expect(mass.text, `Herkunft bei ${breite} px`).toBe(erwartet);
    }
  });

  test('soll bei genug Platz (1920 px) voll sichtbar sein', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await diff.dateiAnsehen('src/a.txt');
    const erwartet = erwarteteHerkunft(diff);

    await page.setViewportSize({ width: 1920, height: 800 });
    await diffSeite.pruefeHerkunft(page, erwartet);
    const mass = await diffSeite.herkunftmass(page);
    expect(mass.ueberlauf, `Herkunft voll sichtbar (${JSON.stringify(mass)})`).toBeLessThanOrEqual(1);
  });
});
