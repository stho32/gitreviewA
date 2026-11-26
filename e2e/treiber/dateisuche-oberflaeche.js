'use strict';
// Treiber Oberfläche „Dateiliste durchsuchen“ (R00049): der einzige Ort, der die Selektoren von Suchfeld, Meldung,
// Leerfall und Kürzel-Hinweis kennt; die Prüfungen der Oberfläche sitzen hier.
const { expect } = require('@playwright/test');

const LISTE = '#dateiliste';
const FELD = `${LISTE} #dateiliste-suche`;
const FELD_MELDUNG = `${LISTE} #dateisuche-fehler`;
const LISTEN_MELDUNG = `${LISTE} .dateien-meldung`;
const HINWEIS = `${LISTE} .abgehakte-hinweis`;
const ZAEHLER = '#kopf-fortschritt .ausblenden-zaehler';
const DATEIZEILE = '#datei-zeilen .datei-zeile';

function feld(page) {
  return page.locator(FELD);
}

/** Trägt den Suchtext ein; die Liste folgt jeder Eingabe ohne Bestätigung (`input`). */
async function sucheEingeben(page, text) {
  await feld(page).fill(text);
}

async function sucheLeeren(page) {
  await feld(page).fill('');
}

function sucheInhalt(page) {
  return feld(page).inputValue();
}

function sucheMeldung(page) {
  return page.locator(FELD_MELDUNG);
}

async function pruefeSucheMeldung(page, text) {
  await expect(sucheMeldung(page)).toHaveText(text);
}

/** Der Leerfall steht statt der Liste: die Meldung trägt den Text und es gibt keine Dateizeile. */
async function pruefeLeerfall(page, text) {
  await expect(page.locator(LISTEN_MELDUNG)).toHaveText(text);
  await expect(page.locator(DATEIZEILE)).toHaveCount(0);
}

function listenMeldungText(page) {
  return page.locator(LISTEN_MELDUNG).textContent();
}

function zaehlerText(page) {
  return page.locator(ZAEHLER).textContent();
}

async function pruefeZaehler(page, text) {
  await expect(page.locator(ZAEHLER)).toHaveText(text);
}

async function pruefeHinweis(page, text) {
  await expect(page.locator(HINWEIS)).toHaveText(text);
}

/** Das Feld ist per Tab erreichbar, sein Name beginnt mit dem sichtbaren Text „Dateien suchen“ und trägt den Platzhalter. */
async function pruefeFeldbeschriftung(page) {
  await expect(feld(page)).toHaveAccessibleName(/^Dateien suchen/);
  await expect(feld(page)).toHaveAttribute('placeholder', 'Name oder Muster, z. B. *.sql');
}

/** Der Katalog legt den Hinweis an das Feld: `aria-keyshortcuts="f"` und ein verborgenes `<kbd>f</kbd>` im Bezeichner. */
async function pruefeKuerzelHinweis(page) {
  await expect(feld(page)).toHaveAttribute('aria-keyshortcuts', 'f');
  await expect(page.locator(`${LISTE} .dateisuche-feld kbd.hinweis-taste`)).toHaveText('f');
}

async function pruefeFokusImSuchfeld(page) {
  await expect(feld(page)).toBeFocused();
}

async function pruefeFokusAufDateizeile(page, pfad) {
  await expect(page.locator(`${DATEIZEILE}[data-pfad="${pfad}"]`)).toBeFocused();
}

/** Zählt die Anfragen der Seite ab jetzt; liefert eine Funktion, die die Zahl nennt. */
function anfragenZaehlen(page) {
  let anzahl = 0;
  page.on('request', () => { anzahl += 1; });
  return () => anzahl;
}

/** Drückt Tab vom Dokumentanfang, bis das Suchfeld den Fokus hat (höchstens 80-mal) — der Tab-Weg zum Feld. */
async function tabBisFeld(page) {
  await page.locator('body').focus();
  for (let schritt = 0; schritt < 80; schritt += 1) {
    await page.keyboard.press('Tab');
    if (await feld(page).evaluate(element => element === document.activeElement)) {
      return;
    }
  }
  throw new Error('das Suchfeld wurde über Tab nicht erreicht');
}

/** Wartet ereignisgenau (je Animationsbild), bis die Dateiliste `anzahl` Zeilen hat; liefert die Zeit seit `startMs`. */
async function zeitBisZeilen(page, anzahl, startMs) {
  await page.waitForFunction(erwartet => document.querySelectorAll('#datei-zeilen .datei-zeile').length === erwartet, anzahl, { polling: 'raf', timeout: 5000 });
  return Date.now() - startMs;
}

/** Der Zähler des gewählten Commits (R00012, Kriterium 8): der Eintrag des Commit-Menüs endet auf „k von n“. */
async function pruefeCommitZaehler(page, text) {
  await expect(page.locator('#waehler-auswahl option:checked')).toHaveText(new RegExp(`${text}$`));
}

module.exports = {
  feld, sucheEingeben, sucheLeeren, sucheInhalt, sucheMeldung, pruefeSucheMeldung, pruefeLeerfall,
  listenMeldungText, zaehlerText, pruefeZaehler, pruefeHinweis, pruefeFeldbeschriftung, pruefeKuerzelHinweis,
  pruefeFokusImSuchfeld, pruefeFokusAufDateizeile, anfragenZaehlen, zeitBisZeilen, tabBisFeld, pruefeCommitZaehler,
};
