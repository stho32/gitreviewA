'use strict';
// Spezifikation R00039 „Werkzeugleiste einzeilig mit Ansicht ▾“, Teil Leiste (B3802): ab 600 px Breite des Diff-Bereichs eine
// Zeile, darunter höchstens zwei (die Suche rückt in die zweite); der lange Pfad ist in der Mitte gekürzt und steht ganz im
// zugänglichen Namen. Browser-Eigenes (Darstellung, gemessene Höhe).
const { test, expect } = require('../dsl/diff-lesen.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');

const PFAD = '#diff .diff-pfad';

test.describe('Leiste mit fester Höhe (R00039, B3802)', () => {
  test('soll bei 600 px Diff-Breite eine Zeile und bei 400 px höchstens zwei Zeilen hoch sein', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Langer Pfad', modus: 'zusammen' });
    await diff.dateizeileAnsehen(diff.langerPfad());
    await expect(page.locator(PFAD)).toBeVisible();

    await diffSeite.setzeDiffBreite(page, 600);
    const bei600 = await diffSeite.leistenmass(page);
    expect(bei600.zeilen, `bei 600 px eine Zeile (${JSON.stringify(bei600)})`).toBe(1);

    await diffSeite.setzeDiffBreite(page, 400);
    const bei400 = await diffSeite.leistenmass(page);
    expect(bei400.zeilen, `bei 400 px höchstens zwei Zeilen (${JSON.stringify(bei400)})`).toBeLessThanOrEqual(2);
    expect(bei400.zeilen, `bei 400 px zwei Zeilen (${JSON.stringify(bei400)})`).toBe(2);
  });

  test('soll den langen Pfad in der Mitte kürzen und ganz im zugänglichen Namen nennen', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Langer Pfad', modus: 'zusammen' });
    await diff.dateizeileAnsehen(diff.langerPfad());
    await diffSeite.setzeDiffBreite(page, 400);

    const sichtbar = await page.locator(PFAD).textContent();
    expect(sichtbar, 'in der Mitte gekürzt').toContain('…');
    expect(sichtbar.length, 'kürzer als der volle Pfad').toBeLessThan(diff.langerPfad().length);

    expect(await page.locator(PFAD).getAttribute('aria-label'), 'voller Pfad im Namen').toBe(diff.langerPfad());
    expect(await page.locator(PFAD).getAttribute('title'), 'voller Pfad als Titel').toBe(diff.langerPfad());
    expect(await page.locator(PFAD).getAttribute('aria-label'), 'Marke im Namen').toContain('⟨U+202E⟩');
  });

  test('soll die erste Diff-Zeile unmittelbar unter der Leiste beginnen', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Langer Pfad', modus: 'zusammen' });
    await diff.dateizeileAnsehen(diff.langerPfad());
    await expect(page.locator('#diff .df-sc tr[data-art]').first()).toBeVisible();
    await diffSeite.setzeDiffBreite(page, 400);

    const lage = await page.evaluate(() => {
      const kopf = document.querySelector('#diff .diff-kopf').getBoundingClientRect();
      const roll = document.querySelector('#diff .df-sc').getBoundingClientRect();
      return { kopfUnten: Math.round(kopf.bottom), rollOben: Math.round(roll.top) };
    });
    expect(lage.rollOben, `Rollbereich unter der Leiste (${JSON.stringify(lage)})`).toBeGreaterThanOrEqual(lage.kopfUnten - 1);
    expect(lage.rollOben - lage.kopfUnten, 'ohne Zwischenraum').toBeLessThanOrEqual(16);
  });
});
