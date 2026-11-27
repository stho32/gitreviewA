'use strict';
// Treiber Oberfläche „Datei abhaken“: der einzige Ort, der die Selektoren von Fortschrittszeile und Kästchen kennt.
const { expect } = require('@playwright/test');

const FORTSCHRITT = '#kopf-fortschritt';
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

/** Das Kästchen der Dateizeile mit genau diesem vollen Pfad (ein Name kann Teil eines anderen sein: `README.md` in `docs/README.md`). */
function kaestchenMitPfad(page, pfad) {
  return page.locator(`${DATEIZEILE}[data-pfad="${pfad}"] input.haken`);
}

async function kaestchenMitPfadBetaetigen(page, pfad) {
  await kaestchenMitPfad(page, pfad).click();
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

/** Das Kästchen der `nummer`-ten Zeile (ab 0) mit genau diesem Pfad (`data-pfad`), auch wenn zwei Zeilen ihn tragen. */
async function kaestchenDerZeile(page, pfad, nummer) {
  const zeilen = page.locator(DATEIZEILE);
  const stellenMitPfad = () => zeilen.evaluateAll((elemente, gesucht) => elemente.flatMap((element, index) => {
    if (element.dataset.pfad === gesucht) {
      return [index];
    }
    return [];
  }), pfad);
  await expect.poll(async () => (await stellenMitPfad()).length, `Dateizeilen mit dem Pfad ${JSON.stringify(pfad)}`).toBeGreaterThan(nummer);
  const stellen = await stellenMitPfad();
  return zeilen.nth(stellen[nummer]);
}

/** Klick (am gesperrten Kästchen ohne Bedienbarkeitsprüfung, denn `aria-disabled` hält Playwright sonst zurück) und danach die Leertaste. */
async function gesperrtesKaestchenBetaetigen(page, pfad, nummer) {
  const zeile = await kaestchenDerZeile(page, pfad, nummer);
  const kaestchenElement = zeile.locator('input.haken');
  await kaestchenElement.click({ force: true });
  await kaestchenElement.focus();
  await page.keyboard.press('Space');
}

/** Zählt die POST-Anfragen an api/haken ab jetzt; liefert eine Funktion, die die Zahl nennt. */
function hakenAnfragenZaehlen(page) {
  let anzahl = 0;
  page.on('request', anfrage => {
    const istHakenSetzen = anfrage.method() === 'POST' && new URL(anfrage.url()).pathname === '/api/haken';
    if (istHakenSetzen) {
      anzahl += 1;
    }
  });
  return () => anzahl;
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

/** Gesperrt: nicht abgehakt, `aria-disabled`, fokussierbar, Grund als Text neben der Zeile, Name „Abgehakt: …“ mit dem Grund. */
async function pruefeGesperrt(page, pfad, nummer, grund) {
  const zeile = await kaestchenDerZeile(page, pfad, nummer);
  const kaestchenElement = zeile.locator('input.haken');
  await expect(kaestchenElement).toHaveAttribute('aria-disabled', 'true');
  await expect(kaestchenElement).not.toBeChecked();
  await expect(kaestchenElement).not.toHaveAttribute('disabled', /.*/);
  await expect(zeile.locator('.haken-grund')).toHaveText(grund);
  await expect(zeile.locator('.haken-grund')).toBeVisible();
  await expect(kaestchenElement).toHaveAccessibleName(new RegExp(`^Abgehakt: .*${grund}$`));
}

async function pruefeBedienbar(page, pfad, nummer) {
  const zeile = await kaestchenDerZeile(page, pfad, nummer);
  const kaestchenElement = zeile.locator('input.haken');
  await expect(kaestchenElement).toBeEnabled();
  await expect(kaestchenElement).toHaveAttribute('aria-disabled', 'false');
  await expect(zeile.locator('.haken-grund')).toHaveText('');
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
  await page.waitForFunction(erwartet => document.querySelector('#kopf-fortschritt .haken-zaehler').textContent === erwartet, text, { polling: 'raf', timeout: 5000 });
  return Date.now() - startMs;
}

module.exports = {
  zaehler,
  kaestchen, kaestchenBetaetigen, kaestchenMitPfad, kaestchenMitPfadBetaetigen, perTastaturAbhaken, hakenSetzenScheitert, hakenSetzenVerzoegern, standLesenScheitert,
  pruefeFortschritt, pruefeBalkenanteil, pruefeAbgehakt, pruefeKaestchenName, pruefeFokusAufKaestchen, pruefeHakenMeldung, pruefeKaestchenGesperrt,
  pruefeKaestchenflaeche, zeitBisFortschritt, gesperrtesKaestchenBetaetigen, hakenAnfragenZaehlen, pruefeGesperrt, pruefeBedienbar,
};
