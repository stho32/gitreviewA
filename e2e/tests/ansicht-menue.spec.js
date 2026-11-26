'use strict';
// Spezifikation R00039 „Werkzeugleiste einzeilig mit Ansicht ▾“, Teil Menü (B3801): der Menüknopf, die vier Anzeigeverfahren
// mit ihrem Zustand und die Wahl, die wie der bisherige Schalter wirkt. Die Zustände selbst bleiben in ihren Modulen (eine
// Quelle je Zustand); die Anzeigeverfahren in beiden Modi und die Leistenhöhe prüfen die weiteren Teile dieser Karte.
const { test, expect } = require('../dsl/diff-lesen.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');

const MENUE = '#ansicht-menue';
const KNOPF = '#ansicht-knopf';

test.describe('Menü „Ansicht ▾“ (R00039, B3801)', () => {
  test('soll einen Menüknopf mit aria-haspopup und aria-expanded und ein Menü mit vier Gruppen und sechs Einträgen führen', async ({ diff, page }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');

    await expect(page.locator(KNOPF)).toHaveAttribute('aria-haspopup', 'menu');
    await expect(page.locator(KNOPF)).toHaveAttribute('aria-expanded', 'false');

    await diffSeite.menueOeffnen(page);

    await expect(page.locator(KNOPF)).toHaveAttribute('aria-expanded', 'true');
    const gruppen = await page.locator(`${MENUE} [role="group"]`).evaluateAll(elemente => elemente.map(element => element.getAttribute('aria-label')));
    expect(gruppen).toEqual(['Ansicht', 'Anordnung', 'Leerraum', 'Umbruch']);
    await expect(page.locator(`${MENUE} .menue-eintrag`)).toHaveCount(6);

    await diffSeite.menueSchliessen(page);
    await expect(page.locator(KNOPF)).toHaveAttribute('aria-expanded', 'false');
  });

  test('soll je Eintrag den Zustand als aria-checked und sichtbares Häkchen zeigen', async ({ diff, page }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');

    await diffSeite.menueOeffnen(page);

    await expect(diffSeite.menueEintrag(page, 'nur Änderungen')).toHaveAttribute('aria-checked', 'true');
    await expect(diffSeite.menueEintrag(page, 'ganze Datei')).toHaveAttribute('aria-checked', 'false');
    await expect(diffSeite.menueEintrag(page, 'untereinander')).toHaveAttribute('aria-checked', 'true');
    await expect(diffSeite.menueEintrag(page, 'nebeneinander')).toHaveAttribute('aria-checked', 'false');
    await expect(diffSeite.menueEintrag(page, 'Leerraum ignorieren')).toHaveAttribute('aria-checked', 'false');
    await expect(diffSeite.menueEintrag(page, 'Umbruch')).toHaveAttribute('aria-checked', 'true');

    // Das sichtbare Häkchen steht nur am gewählten Eintrag (Zustand nie nur Farbe).
    await expect(diffSeite.menueEintrag(page, 'nur Änderungen').locator('.menue-haken')).toHaveText('✓');
    await expect(diffSeite.menueEintrag(page, 'ganze Datei').locator('.menue-haken')).toHaveText('');

    await diffSeite.menueSchliessen(page);
  });

  test('soll eine Wahl im Menü wie der bisherige Schalter wirken und das Menü schließen', async ({ diff, page }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');

    await diff.ansichtWaehlen('ganze Datei');
    await diff.ansichtIst('ganze Datei');

    await diff.anordnungWaehlen('nebeneinander');
    await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'nebeneinander');

    await diff.leerraumUmschalten();
    await diff.leerraumIst('ignorieren');

    await diff.umbruchUmschalten();
    await diff.umbruchIst('aus');

    await expect(page.locator(MENUE)).toBeHidden();
  });

  test('soll die vier Schalter nicht mehr einzeln in der Leiste führen', async ({ diff, page }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');

    await expect(page.locator('#diff .diffansicht-wahl, #diff .anordnung-wahl, #diff .leerraum-schalter, #diff .umbruch-schalter')).toHaveCount(0);
    await expect(page.locator(KNOPF)).toBeVisible();
  });
});
