'use strict';
// Treiber Oberfläche: der einzige Ort, der Selektoren der Seite kennt; die Prüfungen der Oberfläche sitzen hier.
const { expect } = require('@playwright/test');
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

function ergebnisKopierenKnopf(page) {
  return page.getByRole('button', { name: 'Ergebnis kopieren' });
}

async function ergebnisKopierenBetaetigen(page) {
  await ergebnisKopierenKnopf(page).click({ timeout: 5000 });
}

function kopierenStatus(page) {
  return page.locator('#kopieren-status');
}

/** Hält die Antwort auf `GET /api/ergebnis` zurück, bis die gelieferte Funktion sie freigibt. */
async function ergebnisAntwortZurueckhalten(page) {
  let freigeben;
  const frei = new Promise(weiter => { freigeben = weiter; });
  await page.route('**/api/ergebnis', async route => {
    await frei;
    await route.continue();
  });
  return async () => {
    const antwort = page.waitForResponse('**/api/ergebnis');
    freigeben();
    await antwort;
  };
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

/** Klick auf die `nummer`-te Dateizeile (ab 0) mit genau diesem Pfad: zwei Zeilen können denselben Namen tragen (R00013). */
async function dateizeileMitPfadWaehlen(page, pfad, nummer) {
  const zeilen = page.locator(DATEIZEILE);
  const stellenMitPfad = () => zeilen.evaluateAll((elemente, gesucht) => elemente.flatMap((element, index) => {
    if (element.dataset.pfad === gesucht) {
      return [index];
    }
    return [];
  }), pfad);
  await expect.poll(async () => (await stellenMitPfad()).length, `Dateizeilen mit dem Pfad ${JSON.stringify(pfad)}`).toBeGreaterThan(nummer);
  const stellen = await stellenMitPfad();
  await zeilen.nth(stellen[nummer]).click();
}

/** Klick auf die Dateizeile mit genau diesem Pfad (ein Name kann Teil eines anderen sein: `beispiel.cs` in `beispiel.css`). */
async function dateiMitPfadWaehlen(page, pfad) {
  await page.locator(`${DATEIZEILE}[data-pfad="${pfad}"]`).click();
}

/** Namen der Dateizeilen mit `aria-current="true"`. */
async function gewaehlteDateien(page) {
  return page.locator(`${DATEIZEILE}[aria-current="true"] .pfad`).allTextContents();
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

/* ── Prüfungen ── */

/** Die Leiste hat genau diese Zeilen in dieser Reihenfolge; je Zeile werden nur die genannten Angaben verglichen. */
async function pruefeLeiste(page, erwarteteZeilen) {
  await expect(commitZeilen(page)).toHaveCount(erwarteteZeilen.length);
  const zeilen = await commitDetailsLesen(page);
  erwarteteZeilen.forEach((erwartet, index) => expect(zeilen[index], `Zeile ${index + 1}`).toMatchObject(erwartet));
}

async function pruefeMessageVerborgen(page, kurzHash) {
  await expect(messageSchalter(page, kurzHash)).toHaveAttribute('aria-expanded', 'false');
  await expect(rumpf(page, kurzHash)).toBeHidden();
}

async function pruefeMessage(page, kurzHash, text) {
  await expect(messageSchalter(page, kurzHash)).toHaveAttribute('aria-expanded', 'true');
  await expect(rumpf(page, kurzHash)).toBeVisible();
  await expect(rumpf(page, kurzHash)).toHaveText(text);
}

async function pruefeOhneMessage(page, kurzHash) {
  await expect(commitZeile(page, kurzHash)).toHaveCount(1);
  await expect(messageSchalter(page, kurzHash)).toHaveCount(0);
}

async function pruefeKeineFormatierung(page) {
  expect(await formatierungsElementeZaehlen(page)).toBe(0);
}

async function pruefeGewaehlterCommit(page, kurzHash) {
  await expect(page.locator(`${ZEILE}[aria-current="true"] .kurz-hash`)).toHaveText([kurzHash]);
}

/** Summe und Einträge der Dateiliste (je Eintrag nur die genannten Angaben); `reihenfolgeEgal` vergleicht nach Namen sortiert. */
async function pruefeDateiliste(page, { summe, eintraege, reihenfolgeEgal = false }) {
  await expect(dateiSumme(page)).toHaveText(summe);
  await expect(page.locator(LISTENEINTRAG)).toHaveCount(eintraege.length);
  let gelesen = await dateilisteLesen(page);
  let erwartet = eintraege;
  if (reihenfolgeEgal) {
    gelesen = [...gelesen].sort((a, b) => a.name.localeCompare(b.name));
    erwartet = [...eintraege].sort((a, b) => a.name.localeCompare(b.name));
  }
  expect(gelesen).toMatchObject(erwartet);
}

/** Der sichtbare Text der Dateiliste trägt richtungsändernde Zeichen nur als Marke `⟨U+…⟩`, nie roh (Positivkontrolle: eine Marke ist da). */
async function pruefeRichtungszeichenNurAlsMarke(page) {
  const sichtbarerText = await page.locator(DATEILISTE).textContent();
  expect(sichtbarerText).toMatch(/⟨U\+(061C|200E|200F|202[A-E]|206[6-9])⟩/);
  expect(sichtbarerText).not.toMatch(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/);
}

async function pruefeDateilistenMeldung(page, text) {
  await expect(dateilistenMeldung(page)).toHaveText(text);
  await expect(dateizeilen(page)).toHaveCount(0);
}

async function pruefeGewaehlteDateien(page, namen) {
  await expect(page.locator(`${DATEIZEILE}[aria-current="true"] .pfad`)).toHaveText(namen);
}

async function pruefeDateiwahlen(page, erwartet) {
  expect(await gesammelteDateiwahlen(page)).toEqual(erwartet);
}

/** Wartet ereignisgenau auf `anzahl` Zeilen der Leiste und prüft die Frist ab `startMs`; liefert den Messwert. */
async function pruefeZeilenBinnen(page, anzahl, startMs, fristMs) {
  await aufZeilenWarten(page, anzahl);
  const dauerMs = Date.now() - startMs;
  expect(dauerMs, `${anzahl} Zeilen nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  return dauerMs;
}

/** Klickt den Commit und misst bis `anzahl` Dateizeilen sichtbar sind; liefert den Messwert. */
async function pruefeDateizeilenBinnenNachKlick(page, kurzHash, anzahl, fristMs) {
  const klickUmMs = Date.now();
  await commitWaehlen(page, kurzHash);
  await aufDateizeilenWarten(page, anzahl);
  const dauerMs = Date.now() - klickUmMs;
  expect(dauerMs, `${anzahl} Dateizeilen nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  return dauerMs;
}

/** Hält die Antwort auf die Dateiliste des Commits zurück, bis die gelieferte Funktion sie freigibt (und wartet, bis sie gezeichnet sein könnte). */
async function dateienAntwortZurueckhalten(page, hash) {
  let freigeben;
  const frei = new Promise(weiter => { freigeben = weiter; });
  await page.route(`**/api/commits/${hash}/dateien`, async route => {
    await frei;
    await route.continue();
  });
  return async () => {
    const antwort = page.waitForResponse(`**/api/commits/${hash}/dateien`);
    freigeben();
    await antwort;
    await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
  };
}

/** Zählt Dialoge der Seite ab jetzt; die gelieferte Prüfung erwartet keinen und belegt mit einer Positivkontrolle, dass gezählt wird. */
function dialogeZaehlen(page) {
  let dialoge = 0;
  page.on('dialog', dialog => { dialoge += 1; dialog.dismiss(); });
  return async () => {
    expect(dialoge).toBe(0);
    await page.evaluate(() => alert('Positivkontrolle'));
    expect(dialoge).toBe(1);
  };
}

module.exports = {
  dateiMitPfadWaehlen, dateizeileMitPfadWaehlen,
  pruefeLeiste, pruefeMessageVerborgen, pruefeMessage, pruefeOhneMessage, pruefeKeineFormatierung, pruefeGewaehlterCommit, pruefeDateiliste,
  pruefeDateilistenMeldung, pruefeRichtungszeichenNurAlsMarke, pruefeGewaehlteDateien, pruefeDateiwahlen, pruefeZeilenBinnen, pruefeDateizeilenBinnenNachKlick,
  dateienAntwortZurueckhalten, dialogeZaehlen,
  commitZeilenLesen, commitDetailsLesen, commitZeilen, aufZeilenWarten, commitWaehlen, gewaehlteCommits, messageSchalter, messageUmschalten, rumpf,
  dateilisteLesen, dateizeilen, aufDateizeilenWarten, dateiSumme, dateilistenMeldung, darstellungWaehlen, dateiWaehlen, gewaehlteDateien,
  dateiwahlenSammeln, gesammelteDateiwahlen, formatierungsElementeZaehlen,
  beendenKnopf, beendenBetaetigen, beendetMeldung, beendenFehler, beendenScheitertMit,
  ergebnisKopierenKnopf, ergebnisKopierenBetaetigen, kopierenStatus, ergebnisAntwortZurueckhalten,
};
