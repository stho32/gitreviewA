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
/* R00052: die Seitenleiste (ihr Innenbereich trägt das Feld), die Suchzeile mit ihrer Feldzeile und der Einklapp-Knopf im
   Streifen an der Grenze (R00035). */
const SEITENLEISTE = '#seitenleiste';
const SUCHZEILE = `${LISTE} .dateisuche`;
const FELDZEILE = `${LISTE} .dateisuche-feld`;
const EINKLAPPEN = '.gr-streifen .gr-einklappen';

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

/** Wartet ereignisgenau (je Animationsbild), bis die Meldung am Feld steht; liefert die Zeit seit `startMs`. */
async function zeitBisSuchmeldung(page, text, startMs) {
  await page.waitForFunction(erwartet => document.querySelector('#dateisuche-fehler').textContent === erwartet, text, { polling: 'raf', timeout: 10000 });
  return Date.now() - startMs;
}

/** Der Zähler des gewählten Commits (R00012, Kriterium 8): der Eintrag des Commit-Menüs endet auf „k von n“. */
async function pruefeCommitZaehler(page, text) {
  await expect(page.locator('#waehler-auswahl option:checked')).toHaveText(new RegExp(`${text}$`));
}

/** Die Messung der Abnahme-Probe (R00052, Kriterien 1–3) in einem Zug: Feld, Suchzeile, Feldzeile und Einklapp-Knopf mit
    `getBoundingClientRect`, die Innenkante der Seitenleiste (Polsterung abgezogen) und was `elementFromPoint` an der rechten
    Feldkante trifft — das Feld selbst oder der Knopf darüber. */
function lage(page) {
  return page.evaluate(([leisteSel, suchSel, feldzeileSel, feldSel, knopfSel]) => {
    const leiste = document.querySelector(leisteSel);
    const suchzeile = document.querySelector(suchSel);
    const feldzeile = document.querySelector(feldzeileSel);
    const feld = document.querySelector(feldSel);
    const knopf = document.querySelector(knopfSel);
    if (!leiste || !suchzeile || !feldzeile || !feld || !knopf) {
      return null;
    }
    const rechteck = element => {
      const r = element.getBoundingClientRect();
      return { links: Math.round(r.left), rechts: Math.round(r.right), breite: Math.round(r.width) };
    };
    const polster = getComputedStyle(leiste);
    const aussen = leiste.getBoundingClientRect();
    const f = feld.getBoundingClientRect();
    const mitte = f.top + f.height / 2;
    const treffer = document.elementFromPoint(f.right - 4, mitte);
    const amFeld = element => element !== null && (element === feld || feld.contains(element));
    const beschreibe = element => (element ? `${element.tagName.toLowerCase()}.${typeof element.className === 'string' ? element.className.replace(/\s+/g, '.') : ''}` : 'nichts');
    return {
      leiste: {
        links: Math.round(aussen.left),
        rechts: Math.round(aussen.right),
        innenLinks: Math.round(aussen.left + parseFloat(polster.paddingLeft)),
        innenRechts: Math.round(aussen.right - parseFloat(polster.paddingRight)),
      },
      suchzeile: rechteck(suchzeile),
      feldzeile: rechteck(feldzeile),
      feld: rechteck(feld),
      knopf: rechteck(knopf),
      trefferFeld: amFeld(treffer),
      treffer: beschreibe(treffer),
      kanteAmFeld: amFeld(document.elementFromPoint(f.right - 1, mitte)),
    };
  }, [SEITENLEISTE, SUCHZEILE, FELDZEILE, FELD, EINKLAPPEN]);
}

/** Klickt an die rechte Feldkante (4 px innen, senkrechte Mitte) — die Stelle, an der heute der Knopf liegt. */
async function klickAnDieRechteFeldkante(page) {
  const box = await feld(page).boundingBox();
  await page.mouse.click(box.x + box.width - 4, box.y + box.height / 2);
}

module.exports = {
  feld, sucheEingeben, sucheLeeren, sucheInhalt, sucheMeldung, pruefeSucheMeldung, pruefeLeerfall,
  zaehlerText, pruefeZaehler, pruefeHinweis, pruefeFeldbeschriftung, pruefeKuerzelHinweis,
  pruefeFokusImSuchfeld, pruefeFokusAufDateizeile, anfragenZaehlen, zeitBisSuchmeldung, tabBisFeld, pruefeCommitZaehler,
  lage, klickAnDieRechteFeldkante,
};
