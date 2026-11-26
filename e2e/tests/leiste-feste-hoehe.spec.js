'use strict';
// Spezifikation R00039 „Werkzeugleiste einzeilig mit Ansicht ▾“, Teil Leiste (B3802): ab 600 px Breite des Diff-Bereichs eine
// Zeile, darunter höchstens zwei (die Suche rückt in die zweite); der lange Pfad ist in der Mitte gekürzt und steht ganz im
// zugänglichen Namen. Browser-Eigenes (Darstellung, gemessene Höhe).
const { test, expect } = require('../dsl/diff-lesen.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');

const PFAD = '#diff .diff-pfad';

test.describe('Leiste mit fester Höhe (R00039, B3802)', () => {
  test('soll bei 600 px Diff-Breite eine Zeile und bei 400 px höchstens zwei Zeilen hoch sein — ohne Überlauf', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Langer Pfad', modus: 'zusammen' });
    await diff.dateizeileAnsehen(diff.langerPfad());
    await expect(page.locator(PFAD)).toBeVisible();

    await diffSeite.setzeDiffBreite(page, 600);
    const bei600 = await diffSeite.leistenmass(page);
    expect(bei600.zeilen, `bei 600 px eine Zeile (${JSON.stringify(bei600)})`).toBe(1);
    expect(bei600.ueberlauf, `kein waagerechter Überlauf bei 600 px (${JSON.stringify(bei600)})`).toBeLessThanOrEqual(0);
    expect(bei600.knopfAusserhalb, `Menüknopf im Diff-Bereich bei 600 px (${JSON.stringify(bei600)})`).toBe(0);

    await diffSeite.setzeDiffBreite(page, 400);
    const bei400 = await diffSeite.leistenmass(page);
    expect(bei400.zeilen, `bei 400 px höchstens zwei Zeilen (${JSON.stringify(bei400)})`).toBeLessThanOrEqual(2);
    expect(bei400.zeilen, `bei 400 px zwei Zeilen (${JSON.stringify(bei400)})`).toBe(2);
    expect(bei400.ueberlauf, `kein waagerechter Überlauf bei 400 px (${JSON.stringify(bei400)})`).toBeLessThanOrEqual(0);
    expect(bei400.knopfAusserhalb, `Menüknopf im Diff-Bereich bei 400 px (${JSON.stringify(bei400)})`).toBe(0);
  });

  test('soll die Zeilenzahl auch nach einem Fensterwechsel von 1280 auf 400 halten', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await diff.dateiAnsehen('src/a.txt');
    const bei1280 = await diffSeite.leistenmass(page);
    expect(bei1280.zeilen, `bei 1280 px eine Zeile (${JSON.stringify(bei1280)})`).toBe(1);

    await diffSeite.setzeDiffBreite(page, 400);
    const bei400 = await diffSeite.leistenmass(page);
    expect(bei400.zeilen, `nach dem Fensterwechsel zwei Zeilen (${JSON.stringify(bei400)})`).toBe(2);
    expect(bei400.ueberlauf, `kein waagerechter Überlauf nach dem Wechsel (${JSON.stringify(bei400)})`).toBeLessThanOrEqual(0);

    await diffSeite.setzeDiffBreite(page, 600);
    const zurueck = await diffSeite.leistenmass(page);
    expect(zurueck.zeilen, `zurück bei 600 px eine Zeile (${JSON.stringify(zurueck)})`).toBe(1);
  });

  test('soll den langen Pfad in der Mitte kürzen, auch nach einer Größenänderung, und ganz im zugänglichen Namen nennen', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Langer Pfad', modus: 'zusammen' });
    await diff.dateizeileAnsehen(diff.langerPfad());
    await diffSeite.setzeDiffBreite(page, 400);

    const mass = await diffSeite.pfadmass(page);
    expect(mass.text, `in der Mitte gekürzt (${JSON.stringify(mass)})`).toContain('…');
    expect(mass.text, `Anfang bleibt (${JSON.stringify(mass)})`).toMatch(/^lang/);
    expect(mass.text, `Ende bleibt (${JSON.stringify(mass)})`).toMatch(/txt$/);
    expect(mass.text.length, `kürzer als der volle Pfad (${JSON.stringify(mass)})`).toBeLessThan(diff.langerPfad().length);
    expect(mass.ueberlauf, `der gekürzte Text füllt den Kasten, ohne ihn zu überlaufen (${JSON.stringify(mass)})`).toBeLessThanOrEqual(1);

    expect(mass.name, 'voller Pfad im Namen').toBe(diff.langerPfad());
    expect(mass.titel, 'voller Pfad als Titel').toBe(diff.langerPfad());
    expect(mass.name, 'Marke im Namen').toContain('⟨U+202E⟩');
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
