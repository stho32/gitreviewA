'use strict';
// Treiber Oberfläche „Datei abhaken“: der einzige Ort, der die Selektoren von Fortschrittszeile und Kästchen kennt.
const { expect } = require('@playwright/test');

const FORTSCHRITT = '#dateiliste .haken-fortschritt';
const DATEIZEILE = '#datei-zeilen .datei-zeile';
const TAB_HOECHSTENS = 60;

function zaehler(page) {
  return page.locator(`${FORTSCHRITT} .haken-zaehler`);
}

function hakenMeldung(page) {
  return page.locator(`${FORTSCHRITT} .haken-meldung`);
}

function ansage(page) {
  return page.locator(`${FORTSCHRITT} .haken-ansage`);
}

function kaestchen(page, name) {
  return page.locator(DATEIZEILE).filter({ has: page.locator('.pfad', { hasText: name, exact: true }) }).locator('input.haken');
}

function alleKaestchen(page) {
  return page.locator(`${DATEIZEILE} input.haken`);
}

async function kaestchenBetaetigen(page, name) {
  await kaestchen(page, name).click();
}

/** Drückt Tab, bis das Kästchen von `name` den Fokus hat (höchstens TAB_HOECHSTENS-mal), dann die Leertaste. */
async function perTastaturAbhaken(page, name) {
  const ziel = kaestchen(page, name);
  await page.locator('body').focus();
  for (let schritt = 0; schritt < TAB_HOECHSTENS; schritt += 1) {
    await page.keyboard.press('Tab');
    const istFokussiert = await ziel.evaluate(element => element === document.activeElement);
    if (istFokussiert) {
      await page.keyboard.press('Space');
      return;
    }
  }
  throw new Error(`Kästchen von ${name} nach ${TAB_HOECHSTENS}-mal Tab nicht erreicht`);
}

/** Antwortet auf das Setzen eines Hakens mit `status` (nach einer Verzögerung, die Zeichnen dazwischen erlaubt) oder bricht ab. */
async function hakenSetzenScheitert(page, { status, abbrechen = false }) {
  await page.route('**/api/haken', async route => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await new Promise(weiter => setTimeout(weiter, 300));
    if (abbrechen) {
      await route.abort('connectionreset');
      return;
    }
    await route.fulfill({ status, contentType: 'application/json', body: '{"meldung":"abgewiesen"}' });
  });
}

/** Leitet das Setzen eines Hakens erst nach `ms` an den Server weiter; zählt die gesendeten Anfragen. */
async function hakenSetzenVerzoegern(page, ms) {
  const gesendet = [];
  await page.route('**/api/haken', async route => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    gesendet.push(JSON.parse(route.request().postData()));
    await new Promise(weiter => setTimeout(weiter, ms));
    await route.continue();
  });
  return gesendet;
}

async function standLesenScheitert(page) {
  await page.route('**/api/haken', async route => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"meldung":"Fortschritt konnte nicht gelesen werden"}' });
  });
}

/* ── Prüfungen ── */

/** Der sichtbare Zähler und die Live-Region nennen denselben Text. */
async function pruefeFortschritt(page, text) {
  await expect(zaehler(page)).toHaveText(text);
  await expect(ansage(page)).toHaveText(text);
  await expect(ansage(page)).toHaveAttribute('aria-live', 'polite');
}

async function pruefeBalkenanteil(page, anteil) {
  await expect.poll(() => page.locator(`${FORTSCHRITT} .haken-anteil`).evaluate(element => Number(element.style.getPropertyValue('--anteil')))).toBe(anteil);
}

async function pruefeAbgehakt(page, name, istAbgehakt) {
  await expect(kaestchen(page, name)).toBeChecked({ checked: istAbgehakt });
}

async function pruefeKaestchenName(page, name, erwarteterName) {
  await expect(kaestchen(page, name)).toHaveAccessibleName(erwarteterName);
}

async function pruefeFokusAufKaestchen(page, name) {
  await expect(kaestchen(page, name)).toBeFocused();
}

async function pruefeHakenMeldung(page, text) {
  await expect(hakenMeldung(page)).toHaveText(text);
}

/** Alle Kästchen gesperrt (Positivkontrolle: es gibt Kästchen), der Zähler ersetzt durch die Meldung. */
async function pruefeKaestchenGesperrt(page) {
  await expect(alleKaestchen(page).first()).toBeVisible();
  const freie = await alleKaestchen(page).evaluateAll(elemente => elemente.filter(element => !element.disabled).length);
  expect(freie).toBe(0);
  await expect(zaehler(page)).toHaveText('');
}

/** Die Fläche des Kästchens (sein Bezeichnungsrahmen) ist mindestens so hoch und breit wie das Ziel der übrigen Bedienelemente. */
async function pruefeKaestchenflaeche(page, name) {
  const masse = await kaestchen(page, name).evaluate(element => {
    const rahmen = element.closest('label').getBoundingClientRect();
    const ziel = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kd-ziel'));
    return { breite: rahmen.width, hoehe: rahmen.height, ziel };
  });
  expect(masse.breite).toBeGreaterThanOrEqual(masse.ziel);
  expect(masse.hoehe).toBeGreaterThanOrEqual(masse.ziel);
}

/** Wartet ereignisgenau (je Animationsbild) auf den Zählertext und liefert die Zeit seit `startMs`. */
async function zeitBisFortschritt(page, text, startMs) {
  await page.waitForFunction(erwartet => document.querySelector('#dateiliste .haken-zaehler').textContent === erwartet, text, { polling: 'raf', timeout: 5000 });
  return Date.now() - startMs;
}

module.exports = {
  kaestchen, kaestchenBetaetigen, perTastaturAbhaken, hakenSetzenScheitert, hakenSetzenVerzoegern, standLesenScheitert,
  pruefeFortschritt, pruefeBalkenanteil, pruefeAbgehakt, pruefeKaestchenName, pruefeFokusAufKaestchen, pruefeHakenMeldung, pruefeKaestchenGesperrt,
  pruefeKaestchenflaeche, zeitBisFortschritt,
};
