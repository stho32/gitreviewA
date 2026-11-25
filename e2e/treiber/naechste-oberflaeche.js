'use strict';
// Treiber Oberfläche „Nächste ungeprüfte“ (R00028): der einzige Ort, der die Selektoren von Knopf, Meldung, Zeile und Fokus kennt;
// die Prüfungen der Oberfläche sitzen hier. Der Diff-Bereich selbst gehört diff-oberflaeche.js.
const { expect } = require('@playwright/test');

const KNOPF = '#naechste-ungepruefte';
const MELDUNG = '#naechste-meldung';
const LEERER_DIFF_KNOPF = '#diff .erste-ungepruefte';
const ZEILE = '#datei-zeilen .datei-zeile';
const GEWAEHLTER_COMMIT = '#commit-liste .commit-zeile[aria-current="true"]';
const TAB_HOECHSTENS = 60;

function knopf(page) {
  return page.locator(KNOPF);
}

function meldungselement(page) {
  return page.locator(MELDUNG);
}

function zeileMitPfad(page, pfad) {
  return page.locator(`${ZEILE}[data-pfad=${JSON.stringify(pfad)}]`);
}

/** Betätigt den Knopf „Nächste ungeprüfte“ in der Werkzeugzeile der Dateiliste. */
async function springen(page) {
  await knopf(page).click();
}

/** Prüft, dass die `nummer`-te Zeile dieses Pfades (ab 0) gewählt ist — zwei Zeilen können denselben Namen tragen (R00013). */
async function pruefeGewaehlt(page, pfad, nummer = 0) {
  await expect(zeileMitPfad(page, pfad).nth(nummer), `gewählte Zeile ${pfad}`).toHaveAttribute('aria-current', 'true');
}

async function pruefeNichtGewaehlt(page, pfad) {
  await expect(zeileMitPfad(page, pfad), `nicht gewählte Zeile ${pfad}`).not.toHaveAttribute('aria-current', 'true');
}

async function gewaehlteZeilen(page) {
  return page.locator(`${ZEILE}[aria-current="true"]`).evaluateAll(zeilen => zeilen.map(zeile => zeile.dataset.pfad));
}

/** Der Diff-Bereich zeigt diese Datei mit Zeilen (der Sprung lädt ihn, I0027). */
async function pruefeDiffGeladen(page, pfad) {
  await expect(page.locator('#diff .diff-pfad'), `Diff-Pfad von ${pfad}`).toHaveText(pfad);
  await expect(page.locator('#diff .df-sc tr').first(), `Diff-Zeilen von ${pfad}`).toBeVisible();
}

/** Der geladene Diff enthält diesen Text (der Sprung hat den Diff der gefundenen Stelle geladen). */
async function pruefeDiffEnthaelt(page, text) {
  await expect(page.locator('#diff .df-sc'), `Diff enthält »${text}«`).toContainText(text);
}

/** Der gezeigte Commit der Dateiliste (in „Einzeln“ der Commit-Wähler) als voller Hash. */
async function gezeigterCommit(page) {
  return page.locator(GEWAEHLTER_COMMIT).getAttribute('data-hash');
}

async function pruefeGezeigtenCommit(page, hash) {
  await expect(page.locator(GEWAEHLTER_COMMIT), 'gezeigter Commit').toHaveAttribute('data-hash', hash);
}

async function pruefeKnopfBedienbar(page) {
  await expect(knopf(page), 'Knopf „Nächste ungeprüfte“').toBeEnabled();
}

async function pruefeKnopfNichtBedienbar(page) {
  await expect(knopf(page), 'Knopf „Nächste ungeprüfte“').toBeDisabled();
}

async function pruefeMeldung(page, text) {
  await expect(meldungselement(page), 'Meldung neben dem Knopf').toHaveText(text);
}

async function meldungLesen(page) {
  return meldungselement(page).textContent();
}

/** Der Name des Knopfes beginnt mit seinem sichtbaren Text (R00028, Bedienung). */
async function pruefeKnopfname(page) {
  const angaben = await page.locator(KNOPF).evaluate(element => ({ text: element.textContent.trim(), name: element.getAttribute('aria-label') }));
  expect(angaben.text, 'sichtbarer Text des Knopfes').toBe('Nächste ungeprüfte');
  expect(angaben.name === null || angaben.name.startsWith(angaben.text), `Name »${angaben.name}« beginnt mit »${angaben.text}«`).toBe(true);
}

/** Geht mit Tab bis zum Knopf und drückt Enter; danach bleibt der Fokus auf dem Knopf. */
async function springenPerTastatur(page) {
  await page.locator('body').focus();
  for (let schritt = 0; schritt < TAB_HOECHSTENS; schritt += 1) {
    await page.keyboard.press('Tab');
    if (await knopf(page).evaluate(element => element === document.activeElement)) {
      await page.keyboard.press('Enter');
      return;
    }
  }
  throw new Error(`Knopf „Nächste ungeprüfte“ nach ${TAB_HOECHSTENS}-mal Tab nicht erreicht`);
}

async function pruefeFokusAufKnopf(page) {
  await expect(knopf(page), 'Fokus auf dem Knopf').toBeFocused();
}

/** Der Knopf im leeren Diff-Bereich („Erste ungeprüfte öffnen“) ist sichtbar bzw. nicht. */
async function pruefeLeerenDiffKnopf(page, sichtbar) {
  await expect(page.locator(LEERER_DIFF_KNOPF), 'Knopf im leeren Diff-Bereich').toBeVisible({ visible: sichtbar });
}

async function pruefeLeerenDiffKnopfname(page) {
  await expect(page.locator(LEERER_DIFF_KNOPF), 'Name des Knopfes im leeren Diff-Bereich').toHaveText('Erste ungeprüfte öffnen');
}

async function leerenDiffKnopfBetaetigen(page) {
  await page.locator(LEERER_DIFF_KNOPF).click();
}

/** Die Zeile liegt im sichtbaren Bereich (der Sprung holt sie in den Blick). */
async function pruefeZeileImBlick(page, pfad) {
  await expect.poll(
    () => zeileMitPfad(page, pfad).evaluate(zeile => {
      const rechteck = zeile.getBoundingClientRect();
      return rechteck.top >= -1 && rechteck.bottom <= window.innerHeight + 1;
    }),
    { message: `Zeile ${pfad} im sichtbaren Bereich` },
  ).toBe(true);
}

/** Hält die Antwort auf den Diff einer Datei um `ms` zurück (verzögerter Fake, Szenario 7). */
async function diffAntwortVerzoegern(page, ms) {
  await page.route(adresse => /\/api\/.*\/diff$/.test(new URL(adresse).pathname), async route => {
    await new Promise(fertig => setTimeout(fertig, ms));
    await route.continue();
  });
}

module.exports = {
  knopf, meldungselement, zeileMitPfad, springen, pruefeGewaehlt, pruefeNichtGewaehlt, gewaehlteZeilen, pruefeDiffGeladen, pruefeDiffEnthaelt,
  gezeigterCommit, pruefeGezeigtenCommit, pruefeKnopfBedienbar, pruefeKnopfNichtBedienbar, pruefeMeldung, meldungLesen,
  pruefeKnopfname, springenPerTastatur, pruefeFokusAufKnopf, pruefeLeerenDiffKnopf, pruefeLeerenDiffKnopfname, leerenDiffKnopfBetaetigen,
  pruefeZeileImBlick, diffAntwortVerzoegern,
};
