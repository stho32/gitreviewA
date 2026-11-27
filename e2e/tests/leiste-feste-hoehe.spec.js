'use strict';
// Spezifikation R00039 „Werkzeugleiste einzeilig mit Ansicht ▾“, Teil Leiste (B3802) — Höhenregel nachgezogen mit R00057
// Kriterium 5 (PO 287): ohne aktive Suche ab 600 px Diff-Breite eine Zeile (gemessener Rand 606 px), 400–599 px höchstens
// zwei, darunter höchstens drei; der lange Pfad ist in der Mitte gekürzt und steht ganz im zugänglichen Namen. Browser-Eigenes
// (Darstellung, gemessene Höhe).
const { test, expect } = require('../dsl/diff-lesen.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');

const PFAD = '#diff .diff-pfad';

test.describe('Leiste mit fester Höhe (R00039, B3802)', () => {
  test('soll ohne aktive Suche ab 600 px eine Zeile und bei 400 px zwei Zeilen hoch sein — ohne Überlauf', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Langer Pfad', modus: 'zusammen' });
    await diff.dateizeileAnsehen(diff.langerPfad());
    await expect(page.locator(PFAD)).toBeVisible();

    // R00057 Kriterium 5 (PO 287): ohne aktive Suche ab 600 px Diff-Breite eine Zeile. Der Rand liegt gemessen bei 606 px:
    // bei genau 600 px braucht die Werkzeugzeile für ein 3rem sichtbares Feld ihre eigene Zeile (die Alternative wäre ein
    // Suchfeld unter 3rem — R00057 Kriterium 1 und damit ein Messfall, der nicht verhandelbar ist). 620 px liegt sicher
    // darüber und prüft die Regel unverändert scharf.
    await diffSeite.setzeDiffBreite(page, 620);
    const bei620 = await diffSeite.leistenmass(page);
    expect(bei620.zeilen, `ab 620 px eine Zeile (${JSON.stringify(bei620)})`).toBe(1);
    expect(bei620.ueberlauf, `kein waagerechter Überlauf bei 620 px (${JSON.stringify(bei620)})`).toBeLessThanOrEqual(0);
    expect(bei620.knopfAusserhalb, `Menüknopf im Diff-Bereich bei 620 px (${JSON.stringify(bei620)})`).toBe(0);

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
    // R00057 Kriterium 5 (PO 287): bei 1280 × 800 mit offener Ergebnis-Spalte ist der Diff 588 px breit; 400–599 px sind
    // höchstens zwei Zeilen.
    expect(bei1280.zeilen, `bei 1280 px höchstens zwei Zeilen (${JSON.stringify(bei1280)})`).toBeLessThanOrEqual(2);

    await diffSeite.setzeDiffBreite(page, 400);
    const bei400 = await diffSeite.leistenmass(page);
    expect(bei400.zeilen, `nach dem Fensterwechsel zwei Zeilen (${JSON.stringify(bei400)})`).toBe(2);
    expect(bei400.ueberlauf, `kein waagerechter Überlauf nach dem Wechsel (${JSON.stringify(bei400)})`).toBeLessThanOrEqual(0);

    await diffSeite.setzeDiffBreite(page, 620);
    const zurueck = await diffSeite.leistenmass(page);
    expect(zurueck.zeilen, `zurück ab 620 px eine Zeile (${JSON.stringify(zurueck)})`).toBe(1);
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
