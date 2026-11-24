'use strict';
// Treiber Oberfläche: der einzige Ort, der Selektoren der Seite kennt.
const ZEILE = '#commit-liste .commit-zeile';

async function commitZeilenLesen(page) {
  return page.locator(ZEILE).evaluateAll(zeilen => zeilen.map(zeile => ({
    kurzHash: zeile.querySelector('.kurz-hash').textContent,
    betreff: zeile.querySelector('.betreff').textContent,
  })));
}

function commitZeilen(page) {
  return page.locator(ZEILE);
}

/** Wartet ereignisgenau (je Animationsbild), bis die Liste `anzahl` Zeilen hat. */
async function aufZeilenWarten(page, anzahl) {
  await page.waitForFunction(erwartet => document.querySelectorAll('#commit-liste .commit-zeile').length === erwartet, anzahl, { polling: 'raf' });
}

function beendenKnopf(page) {
  return page.getByRole('button', { name: 'Beenden' });
}

async function beendenBetaetigen(page) {
  await beendenKnopf(page).click({ timeout: 5000 });
}

function beendetMeldung(page) {
  return page.getByText('Review beendet', { exact: true });
}

function beendenFehler(page) {
  return page.locator('#beenden-status');
}

/** Lässt die Beenden-Anforderung mit `status` scheitern, nach einer Verzögerung, die Zeichnen dazwischen erlaubt. */
async function beendenScheitertMit(page, status) {
  await page.route('**/api/beenden', async route => {
    await new Promise(weiter => setTimeout(weiter, 300));
    await route.fulfill({ status, contentType: 'application/json', body: '{"meldung":"abgewiesen"}' });
  });
}

module.exports = {
  commitZeilenLesen, commitZeilen, aufZeilenWarten, beendenKnopf, beendenBetaetigen, beendetMeldung, beendenFehler, beendenScheitertMit,
};
