'use strict';
// Treiber Oberfläche: der einzige Ort, der Selektoren der Seite kennt.
const ZEILE = '#commit-liste .commit-zeile';
const DATEILISTE = '#dateiliste';
const LISTENEINTRAG = '#datei-zeilen > li';
const DATEIZEILE = '#datei-zeilen .datei-zeile';

async function commitZeilenLesen(page) {
  return page.locator(ZEILE).evaluateAll(zeilen => zeilen.map(zeile => ({
    kurzHash: zeile.querySelector('.kurz-hash').textContent,
    betreff: zeile.querySelector('.betreff').textContent,
  })));
}

/** Alle Angaben je Zeile der Leiste, auch Autor, Datum und dessen Hinweistext. */
async function commitDetailsLesen(page) {
  return page.locator(ZEILE).evaluateAll(zeilen => zeilen.map(zeile => ({
    kurzHash: zeile.querySelector('.kurz-hash').textContent,
    betreff: zeile.querySelector('.betreff').textContent,
    autor: zeile.querySelector('.autor').textContent,
    datum: zeile.querySelector('.datum').textContent,
    datumHinweis: zeile.querySelector('.datum').getAttribute('title'),
  })));
}

function commitZeilen(page) {
  return page.locator(ZEILE);
}

function commitZeile(page, kurzHash) {
  return page.locator(ZEILE).filter({ has: page.locator('.kurz-hash', { hasText: kurzHash }) });
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

async function commitWaehlen(page, kurzHash) {
  await commitZeile(page, kurzHash).locator('.commit-wahl').click();
}

/** Kurz-Hashes der gewählten Commits (genau einer, wenn alles stimmt). */
async function gewaehlteCommits(page) {
  return page.locator(`${ZEILE}[aria-current="true"] .kurz-hash`).allTextContents();
}

function messageSchalter(page, kurzHash) {
  return commitZeile(page, kurzHash).locator('.message-schalter');
}

async function messageUmschalten(page, kurzHash) {
  await messageSchalter(page, kurzHash).click();
}

function rumpf(page, kurzHash) {
  return commitZeile(page, kurzHash).locator('.rumpf');
}

/** Die Einträge der Dateiliste in Anzeigereihenfolge: Dateien mit Status, Name und Zahlen, Ordner mit `ordner: true`. */
async function dateilisteLesen(page) {
  return page.locator(LISTENEINTRAG).evaluateAll(eintraege => eintraege.map(eintrag => {
    const istOrdner = eintrag.classList.contains('ordner-zeile');
    if (istOrdner) {
      return { ordner: true, name: eintrag.querySelector('.pfad').textContent, tiefe: Number(eintrag.dataset.tiefe) };
    }
    return {
      status: eintrag.querySelector('.status').textContent,
      name: eintrag.querySelector('.pfad').textContent,
      zahlen: eintrag.querySelector('.zahlen').textContent,
      tiefe: Number(eintrag.dataset.tiefe),
    };
  }));
}

function dateizeilen(page) {
  return page.locator(DATEIZEILE);
}

/** Wartet ereignisgenau, bis die Dateiliste `anzahl` Dateizeilen hat. */
async function aufDateizeilenWarten(page, anzahl) {
  await page.waitForFunction(erwartet => document.querySelectorAll('#datei-zeilen .datei-zeile').length === erwartet, anzahl, { polling: 'raf' });
}

function dateiSumme(page) {
  return page.locator(`${DATEILISTE} .dateien-summe`);
}

function dateilistenMeldung(page) {
  return page.locator(`${DATEILISTE} .dateien-meldung`);
}

async function darstellungWaehlen(page, darstellung) {
  await page.locator(`${DATEILISTE} button[data-darstellung="${darstellung}"]`).click();
}

async function dateiWaehlen(page, name) {
  await page.locator(DATEIZEILE).filter({ has: page.locator('.pfad', { hasText: name, exact: true }) }).click();
}

/** Namen der Dateizeilen mit `aria-selected="true"`. */
async function gewaehlteDateien(page) {
  return page.locator(`${DATEIZEILE}[aria-selected="true"] .pfad`).allTextContents();
}

/** Sammelt die Ereignisse `datei-gewaehlt` der Seite; abrufbar über `gesammelteDateiwahlen`. */
async function dateiwahlenSammeln(page) {
  await page.evaluate(() => {
    window.gesammelteDateiwahlen = [];
    document.addEventListener('datei-gewaehlt', ereignis => window.gesammelteDateiwahlen.push(ereignis.detail));
  });
}

function gesammelteDateiwahlen(page) {
  return page.evaluate(() => window.gesammelteDateiwahlen);
}

/** Elemente, die fremdes HTML sichtbar machen würde (fett, kursiv, Skript) — im Inhalt der Seite. */
async function formatierungsElementeZaehlen(page) {
  return page.locator('main b, main strong, main i, main em, main script').count();
}

module.exports = {
  commitZeilenLesen, commitDetailsLesen, commitZeilen, aufZeilenWarten, commitWaehlen, gewaehlteCommits, messageSchalter, messageUmschalten, rumpf,
  dateilisteLesen, dateizeilen, aufDateizeilenWarten, dateiSumme, dateilistenMeldung, darstellungWaehlen, dateiWaehlen, gewaehlteDateien,
  dateiwahlenSammeln, gesammelteDateiwahlen, formatierungsElementeZaehlen,
  beendenKnopf, beendenBetaetigen, beendetMeldung, beendenFehler, beendenScheitertMit,
};
