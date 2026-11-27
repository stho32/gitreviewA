'use strict';
// Abnahme R00039 „Werkzeugleiste einzeilig mit Ansicht ▾“ (B3804): die Akzeptanzkriterien 1, 2 und 4 über den Weg, den der
// Mensch geht. Kriterium 3 (Kürzel, Hilfe) prüft `ansicht-menue-tastatur.spec.js` samt Bausteintest, Kriterium 5
// (Leistenhöhe, gekürzter Pfad) `leiste-feste-hoehe.spec.js`.
const { test, expect } = require('../dsl/diff-lesen.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');

const KNOPF = '#ansicht-knopf';
const MENUE = '#ansicht-menue';

test.describe('R00039 Werkzeugleiste einzeilig', () => {
  test('Kriterium 1: die Leiste ist eine Zeile mit Pfad, Haken, Datei anmerken, In VS Code, Suche und Ansicht ▾ — ohne die vier Schalter', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await diff.dateiAnsehen('src/a.txt');

    await expect(page.locator('#diff .diff-pfad')).toHaveText('src/a.txt');
    await expect(page.locator('#diff .gr-diff-haken')).toBeVisible();
    await expect(page.locator('#diff .datei-anmerken')).toBeVisible();
    await expect(page.locator('#diff .sprung-knopf')).toBeVisible();
    await expect(page.locator('#diff .diff-werkzeuge #diff-suche')).toBeVisible();
    await expect(page.locator(KNOPF)).toBeVisible();

    // Die vier Schalter stehen nicht mehr einzeln in der Leiste.
    await expect(page.locator('#diff .diffansicht-wahl, #diff .anordnung-wahl, #diff .leerraum-schalter, #diff .umbruch-schalter')).toHaveCount(0);

    const mass = await diffSeite.leistenmass(page);
    // R00057 Kriterium 5 (PO 287) löst die Höhenregel für 400–599 px Diff-Breite: höchstens zwei Zeilen — bei 1280 × 800
    // mit offener Ergebnis-Spalte (Diff 588 px) steht die Werkzeugzeile darum in der zweiten Zeile.
    expect(mass.zeilen, `höchstens zwei Zeilen (${JSON.stringify(mass)})`).toBeLessThanOrEqual(2);
  });

  test('Kriterium 2: das Menü schaltet alle vier Verfahren in beiden Modi; die Wahl bleibt über Datei- und Moduswechsel, das Neuladen setzt die Startwerte', async ({ diff, page }) => {
    for (const modus of ['zusammen', 'einzeln']) {
      await diff.starten({ vorbereitung: 'Repo Z', modus });
      await diff.dateiAnsehen('src/a.txt');

      await diff.ansichtWaehlen('ganze Datei');
      await diff.ansichtIst('ganze Datei');
      await diff.anordnungWaehlen('nebeneinander');
      await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'nebeneinander');
      await diff.leerraumUmschalten();
      await diff.leerraumIst('ignorieren');
      await diff.umbruchUmschalten();
      await diff.umbruchIst('aus');

      // Die Wahl bleibt über Datei- und Moduswechsel.
      await diff.dateiAnsehen('README.md');
      await diff.ansichtIst('ganze Datei');
      await diff.leerraumIst('ignorieren');
      await diff.umbruchIst('aus');
      await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'nebeneinander');

      await diff.modusWaehlen(modus === 'zusammen' ? 'einzeln' : 'zusammen');
      await diff.dateiAnsehen('src/a.txt');
      await diff.ansichtIst('ganze Datei');
      await diff.leerraumIst('ignorieren');
      await diff.umbruchIst('aus');
      await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'nebeneinander');

      // Nach dem Neuladen gelten die Startwerte (nichts wird gespeichert).
      await diff.neuLaden();
      await diff.ansichtIst('nur Änderungen');
      await diff.leerraumIst('beachten');
      await diff.umbruchIst('an');
      await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'untereinander');
    }
  });

  test('Kriterium 4: Enter öffnet, Pfeil runter zu „nebeneinander“, Enter wählt, erneut öffnen und Esc schließt — Fokus und aria-expanded folgen', async ({ diff, page }) => {
    await diff.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await diff.dateiAnsehen('src/a.txt');

    await page.locator(KNOPF).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(KNOPF)).toHaveAttribute('aria-expanded', 'true');
    await expect(diffSeite.menueEintrag(page, 'nur Änderungen')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(diffSeite.menueEintrag(page, 'ganze Datei')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(diffSeite.menueEintrag(page, 'untereinander')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(diffSeite.menueEintrag(page, 'nebeneinander')).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'nebeneinander');
    await expect(page.locator(MENUE)).toBeHidden();
    await expect(page.locator(KNOPF)).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator(KNOPF)).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator(MENUE)).toBeHidden();
    await expect(page.locator(KNOPF)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(KNOPF)).toBeFocused();
  });
});
