'use strict';
// Spezifikation R00039 „Werkzeugleiste einzeilig mit Ansicht ▾“, Teil Tastatur (B3803): die Kürzel s, v, l, w wirken bei
// geschlossenem Menü wie bisher, das Menü folgt dem neuen Zustand; das Menü selbst ist per Tastatur bedienbar (APG Menu
// Button): Enter/Leertaste/Pfeil öffnen, Pfeile wandern, Enter/Leertaste wählen, Esc schließt und gibt den Fokus zurück.
const { test, expect } = require('../dsl/diff-lesen.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');

const KNOPF = '#ansicht-knopf';
const MENUE = '#ansicht-menue';

test.describe('Menü per Tastatur (R00039, B3803)', () => {
  test('soll mit Enter öffnen, mit Pfeilen wandern (mit Umlauf) und mit Esc schließen — der Fokus kehrt auf den Knopf zurück', async ({ diff, page }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');

    await page.locator(KNOPF).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(MENUE)).toBeVisible();
    await expect(page.locator(KNOPF)).toHaveAttribute('aria-expanded', 'true');
    await expect(diffSeite.menueEintrag(page, 'nur Änderungen')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(diffSeite.menueEintrag(page, 'ganze Datei')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(diffSeite.menueEintrag(page, 'nur Änderungen')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(diffSeite.menueEintrag(page, 'Umbruch'), 'Umlauf rückwärts zum letzten Eintrag').toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator(MENUE)).toBeHidden();
    await expect(page.locator(KNOPF)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(KNOPF)).toBeFocused();
  });

  test('soll mit Pfeil runter öffnen und den Fokus auf den ersten Eintrag setzen', async ({ diff, page }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');

    await page.locator(KNOPF).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(MENUE)).toBeVisible();
    await expect(diffSeite.menueEintrag(page, 'nur Änderungen')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator(MENUE)).toBeHidden();
  });

  test('soll mit Enter auf einem Eintrag wählen, schließen und den Fokus auf den Knopf zurückgeben', async ({ diff, page }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');

    await page.locator(KNOPF).focus();
    await page.keyboard.press('Enter');
    await diffSeite.menueEintrag(page, 'ganze Datei').focus();
    await page.keyboard.press('Enter');

    await expect(page.locator(MENUE)).toBeHidden();
    await expect(page.locator(KNOPF)).toBeFocused();
    await diff.ansichtIst('ganze Datei');
  });

  test('soll s, v, l, w bei geschlossenem Menü wirken lassen und den Zustand im Menü zeigen', async ({ diff, page }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');

    await page.keyboard.press('s');
    await diff.ansichtIst('ganze Datei');
    await page.keyboard.press('s');
    await diff.ansichtIst('nur Änderungen');

    await page.keyboard.press('w');
    await diff.umbruchIst('aus');
    await page.keyboard.press('w');
    await diff.umbruchIst('an');

    await page.keyboard.press('v');
    await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'nebeneinander');
    await page.keyboard.press('v');
    await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'untereinander');

    await page.keyboard.press('l');
    await diff.leerraumIst('ignorieren');
    await page.keyboard.press('l');
    await diff.leerraumIst('beachten');
  });

  test('soll in der Hilfe „Ansicht ▾“ als Ort der vier Anzeigeverfahren nennen', async ({ diff, page }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');

    await page.keyboard.press('?');
    await expect(page.locator('#hilfe')).toBeVisible();
    const eintraege = await page.locator('#hilfe [data-gruppe="diff"] li').allTextContents();
    for (const stichwort of ['nur Änderungen', 'nebeneinander', 'Leerraum', 'Umbruch']) {
      const zeile = eintraege.find(text => text.includes(stichwort));
      expect(zeile, `Hilfe-Zeile ${stichwort}`).toBeTruthy();
      expect(zeile, `Hilfe nennt Ansicht ▾ (${stichwort})`).toContain('Ansicht ▾');
    }
  });
});
