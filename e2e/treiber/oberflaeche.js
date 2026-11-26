'use strict';
// Treiber Oberfläche: der einzige Ort, der Selektoren der Seite kennt; die Prüfungen der Oberfläche sitzen hier.
const { expect } = require('@playwright/test');
const ZEILE = '#commit-liste .commit-zeile';
const DATEILISTE = '#dateiliste';
const WAEHLER_MENUE = '#waehler-auswahl';
const KOPFAKTIONEN = '.gr-kopfaktionen';
const LISTENEINTRAG = '#datei-zeilen > .datei-zeile, #datei-zeilen > .ordner-zeile';
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

/** Hält die Antwort auf die Commit-Liste zurück; vor dem Öffnen der Seite aufrufen. */
async function commitsAntwortVerzoegern(page, ms) {
  await page.route('**/api/commits', async route => {
    await new Promise(weiter => setTimeout(weiter, ms));
    await route.continue();
  });
}

/** Wartet auf die Antwort der Commit-Liste; vor dem Öffnen der Seite aufrufen. */
function commitsAntwortAbwarten(page) {
  return page.waitForResponse('**/api/commits');
}

/** Öffnet die Commit-Zeile sofort, ohne auf die geladene Liste zu warten (für die Probe der Ladephase). */
async function commitZeileSofortAufklappen(page) {
  await commitZeileZusammenfassung(page).click();
  await expect(page.locator('#commit-zeile')).toHaveJSProperty('open', true);
}

/** Die Commit-Zeile ist offen. */
async function commitZeileBleibtOffen(page) {
  await expect(page.locator('#commit-zeile'), 'die Commit-Zeile bleibt offen').toHaveJSProperty('open', true);
}

/** Der Knopf „Beenden“ über Rolle und sichtbaren Namen, gesucht im Kopfbereich seiner Aktionen.
    Eine Rollen-Abfrage über das ganze Dokument löst den Namen jedes Knopfes auf und liest je Knopf dessen `labels` über das
    ganze Dokument: bei 20 000 Diff-Zeilen mit 500 Anmerkungen (1 020 Knöpfe) kostet eine solche Abfrage über fünf Sekunden. */
function beendenKnopf(page) {
  return page.locator(KOPFAKTIONEN).getByRole('button', { name: 'Beenden' });
}

/** Wählt den Modus über den Umschalter im Kopf und wartet, bis er steht (`body[data-modus]`). */
async function modusWaehlen(page, modus) {
  const knopf = modus === 'zusammen' ? '#modus-zusammen' : '#modus-einzeln';
  await page.locator(knopf).click();
  await expect(page.locator('body')).toHaveAttribute('data-modus', modus);
}

function kopfZahlen(page) {
  return page.locator('#kopf-zahlen');
}

function fortschrittZaehler(page) {
  return page.locator('#kopf-fortschritt .haken-zaehler');
}

function commitZeileZusammenfassung(page) {
  return page.locator('#commit-summary');
}

async function pruefeKopfZahlen(page, text) {
  await expect(kopfZahlen(page)).toHaveText(text);
}

async function pruefeFortschritt(page, text) {
  await expect(fortschrittZaehler(page)).toHaveText(text);
}

async function pruefeCommitZeileZusammenfassung(page, text) {
  await expect(commitZeileZusammenfassung(page)).toHaveText(text);
}

/** Die zugeklappte Commit-Zeile enthält `text` (wartet, bis es so weit ist). */
async function pruefeCommitZeileEnthaelt(page, text) {
  await expect(commitZeileZusammenfassung(page)).toContainText(text);
}

/** Die zugeklappte Commit-Zeile enthält `text` nicht — erst nach einer Positivprüfung aufrufen, sonst gilt es vor dem Laden. */
async function pruefeCommitZeileEnthaeltNicht(page, text) {
  await expect(commitZeileZusammenfassung(page)).not.toContainText(text);
}

/** Wartet, bis die Commit-Zeile die Kürzel der Commits nennt (die Commit-Leiste ist geladen), und liefert ihren Text. */
async function commitZeileText(page) {
  return commitZeileZusammenfassung(page).textContent();
}

/** Hält die Antwort auf die Zusammen-Ansicht `ms` zurück; die Commit-Zeile steht dann, bevor die Kette bekannt ist. */
async function zusammenAntwortVerzoegern(page, ms) {
  await page.route('**/api/zusammen', async route => {
    await new Promise(weiter => setTimeout(weiter, ms));
    await route.continue();
  });
}

/** Klappt die zugeklappte Commit-Zeile auf und wartet, bis der Zustand steht: erst die geladene Liste, dann der Klick. */
async function commitZeileAufklappen(page) {
  await expect(page.locator('#commit-liste .commit-zeile'), 'die Commit-Liste ist geladen').not.toHaveCount(0);
  await commitZeileZusammenfassung(page).click();
  await expect(page.locator('#commit-zeile')).toHaveJSProperty('open', true);
}

/** Klappt die aufgeklappte Commit-Zeile zu und wartet, bis der Zustand steht. */
async function commitZeileZuklappen(page) {
  await commitZeileZusammenfassung(page).click();
  await expect(page.locator('#commit-zeile')).toHaveJSProperty('open', false);
}

/** Die Commit-Zeile steht im Dokument vor der Dateiliste und auf dem Bildschirm über ihr; liefert ihre Höhe in px (R00012, Kriterium 2). */
async function pruefeCommitZeileUeberDerListe(page) {
  const imDokumentDavor = await page.evaluate(() => {
    const zeile = document.getElementById('commit-zeile');
    const liste = document.getElementById('dateiliste');
    return Boolean(zeile.compareDocumentPosition(liste) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  const zeile = await page.locator('#commit-zeile').boundingBox();
  const liste = await page.locator('#dateiliste').boundingBox();
  expect(imDokumentDavor, 'im Dokument vor der Dateiliste').toBe(true);
  expect(zeile.y + zeile.height, 'auf dem Bildschirm über der Dateiliste').toBeLessThanOrEqual(liste.y + 1);
  return zeile.height;
}

/** Beantwortet die Zusammen-Ansicht mit `status` und leerem Rumpf — die Kette bleibt unbekannt. */
async function zusammenAntwortScheitert(page, status) {
  await page.route('**/api/zusammen', async route => {
    await route.fulfill({ status, contentType: 'application/json', body: '{"meldung":"Zusammen-Ansicht konnte nicht gelesen werden"}' });
  });
}

/** Lädt die Seite neu; das Neuladen beginnt im Standard der Seite, ein Startmodus (Init-Skript) gilt weiter. */
async function neuLaden(page, modus = null) {
  await page.reload();
  if (modus) {
    await modusWaehlen(page, modus);
  }
}

/** Der Knopf „Ergebnis kopieren“ ebenso über Rolle und sichtbaren Namen, im Kopfbereich gesucht (siehe `beendenKnopf`). */
function ergebnisKopierenKnopf(page) {
  return page.locator(KOPFAKTIONEN).getByRole('button', { name: 'Ergebnis kopieren' });
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

/** Betätigt „Beenden“ und misst bis zum Klick; die Frist gilt für die Bedienbarkeit der Seite nach der Anzeige. */
async function beendenBetaetigenBinnen(page, fristMs) {
  const startUmMs = Date.now();
  await beendenBetaetigen(page);
  const dauerMs = Date.now() - startUmMs;
  expect(dauerMs, `„Beenden“ geklickt nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  return dauerMs;
}

/** Sammelt ab jetzt die Aufgaben des Hauptfadens (Long Tasks ab 50 ms) mit ihrer Startzeit; vor der Aktion aufrufen.
    Die Anzeige stempelt ihre Zeit selbst (`gitreviewaAnzeigeUmMs`), so lassen sich die Aufgaben danach trennen. */
async function aufgabenSammeln(page) {
  await page.evaluate(() => {
    window.gitreviewaAufgaben = [];
    window.gitreviewaAnzeigeUmMs = null;
    const beobachter = new PerformanceObserver(liste => {
      for (const eintrag of liste.getEntries()) {
        window.gitreviewaAufgaben.push({ start: Math.round(eintrag.startTime), dauer: Math.round(eintrag.duration) });
      }
    });
    beobachter.observe({ type: 'longtask', buffered: false });
  });
}

/** Die Aufgaben, die **nach** der Anzeige begonnen haben; keine darf länger als `fristMs` sein. Setzt `aufgabenSammeln` voraus. */
async function pruefeAufgabenNachAnzeige(page, fristMs) {
  const aufgaben = await page.evaluate(() => {
    const zeiten = window.gitreviewaAufgaben;
    if (!zeiten) {
      return null;
    }
    const anzeigeUmMs = window.gitreviewaAnzeigeUmMs;
    if (anzeigeUmMs === null) {
      return zeiten;
    }
    return zeiten.filter(aufgabe => aufgabe.start >= anzeigeUmMs);
  });
  expect(aufgaben, 'die Aufgaben wurden seit dem Klick gesammelt (aufgabenSammeln)').not.toBeNull();
  for (const aufgabe of aufgaben) {
    expect(aufgabe.dauer, `Aufgabe des Hauptfadens nach der Anzeige: ${aufgabe.dauer} ms`).toBeLessThanOrEqual(fristMs);
  }
  return aufgaben;
}

/** Positivkontrolle des Aufgaben-Zählers: eine künstliche Aufgabe von 300 ms im Hauptfaden muss im Zähler erscheinen. */
async function pruefeAufgabenZaehler(page) {
  await page.evaluate(() => {
    const endeUmMs = performance.now() + 300;
    while (performance.now() < endeUmMs) {
      // Der Hauptfaden ist beschäftigt, bis die Zeit um ist.
    }
  });
  await page.waitForFunction(() => window.gitreviewaAufgaben.some(aufgabe => aufgabe.dauer >= 300), undefined, { polling: 'raf', timeout: 2000 });
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

/* ── Musterfeld zum Ausblenden (R00025) ── */

function ausblendenZaehler(page) {
  return page.locator('#kopf-fortschritt .ausblenden-zaehler');
}

/** Der Zähler im Kopf nennt diese ausgeblendeten Dateien (R00025). */
async function pruefeAusblendenZaehler(page, text) {
  await expect(ausblendenZaehler(page)).toHaveText(text);
}

function ausblendenEingabe(page) {
  return page.locator(`${DATEILISTE} #ausblenden-eingabe`);
}

function ausblendenFehler(page) {
  return page.locator(`${DATEILISTE} #ausblenden-fehler`);
}

function ausblendenMuster(page) {
  return page.locator(`${DATEILISTE} #ausblenden-muster .muster-text`);
}

/** Trägt ein Muster ein und bestätigt mit Enter (der Fokus bleibt im Feld). */
async function musterEingeben(page, muster) {
  await ausblendenEingabe(page).fill(muster);
  await ausblendenEingabe(page).press('Enter');
}

/** Entfernt das Muster über seinen Knopf, dessen Name mit dem sichtbaren Muster beginnt. */
async function musterEntfernen(page, muster) {
  await page.getByRole('button', { name: `${muster} entfernen` }).click();
}

/* ── Schalter „Abgehakte ausblenden“ (R00029) ── */

function abgehakteSchalter(page) {
  return page.locator(`${DATEILISTE} #ausblenden`);
}

async function abgehakteSchalterBetatigen(page) {
  await abgehakteSchalter(page).click();
}

/** Der Schalter steht an/aus; sein Name beginnt mit dem sichtbaren Text (Zugänglicher Name). */
async function pruefeAbgehakteSchalter(page, an) {
  await expect(abgehakteSchalter(page)).toBeChecked({ checked: an });
  await expect(abgehakteSchalter(page)).toHaveAccessibleName(/^Abgehakte ausblenden/);
}

function abgehakteHinweis(page) {
  return page.locator(`${DATEILISTE} .abgehakte-hinweis`);
}

/* ── Suche im Diff (R00027) ── */

function sucheFeld(page) {
  return page.locator('#diff .diff-schalter #diff-suche');
}

function sucheZaehler(page) {
  return page.locator('#diff .diff-schalter .diff-suche-zaehler');
}

function sucheFehler(page) {
  return page.locator('#diff .diff-schalter #diff-suche-fehler');
}

/** Trägt den Begriff ein und bestätigt mit Enter (suchen und zum nächsten Treffer). */
async function sucheSuchen(page, begriff) {
  await sucheFeld(page).fill(begriff);
  await sucheFeld(page).press('Enter');
}

/** Nächster Treffer (Enter im Feld). */
async function sucheWeiter(page) {
  await sucheFeld(page).press('Enter');
}

/** Voriger Treffer (Umschalt+Enter im Feld). */
async function sucheZurueck(page) {
  await sucheFeld(page).press('Shift+Enter');
}

/** Alle Treffermarken im Diff in Dokumentreihenfolge, je mit Text und ob sie der aktuelle Treffer sind. */
async function sucheMarkenLesen(page) {
  return page.locator('#diff .df-sc .suche-treffer').evaluateAll(marks => marks.map(mark => ({
    text: mark.textContent,
    aktuell: mark.classList.contains('suche-treffer-aktuell'),
  })));
}

/** Die Anzahl der Treffermarken (kurz für Prüfungen). */
function sucheMarken(page) {
  return page.locator('#diff .df-sc .suche-treffer');
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

/** Das Menü des Commit-Wählers nennt genau diese Einträge in dieser Reihenfolge (R00012, Kriterien 6 und 8). */
async function pruefeWaehlerMenue(page, erwarteteEintraege) {
  const eintraege = () => page.locator(`${WAEHLER_MENUE} option`).evaluateAll(optionen => optionen.map(option => option.textContent));
  await expect.poll(eintraege, 'Einträge des Commit-Menüs').toEqual(erwarteteEintraege);
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
  pruefeLeiste, pruefeMessageVerborgen, pruefeMessage, pruefeOhneMessage, pruefeKeineFormatierung, pruefeGewaehlterCommit, pruefeWaehlerMenue, pruefeDateiliste,
  pruefeDateilistenMeldung, pruefeRichtungszeichenNurAlsMarke, pruefeGewaehlteDateien, pruefeDateiwahlen, pruefeZeilenBinnen, pruefeDateizeilenBinnenNachKlick,
  dateienAntwortZurueckhalten, dialogeZaehlen,
  commitZeilenLesen, commitDetailsLesen, commitZeilen, aufZeilenWarten, commitWaehlen, gewaehlteCommits, messageSchalter, messageUmschalten, rumpf,
  dateilisteLesen, dateizeilen, aufDateizeilenWarten, dateiSumme, dateilistenMeldung, darstellungWaehlen, dateiWaehlen, gewaehlteDateien,
  ausblendenZaehler, pruefeAusblendenZaehler, ausblendenEingabe, ausblendenFehler, ausblendenMuster, musterEingeben, musterEntfernen,
  abgehakteSchalter, abgehakteSchalterBetatigen, pruefeAbgehakteSchalter, abgehakteHinweis,
  sucheFeld, sucheZaehler, sucheFehler, sucheSuchen, sucheWeiter, sucheZurueck, sucheMarken, sucheMarkenLesen,
  dateiwahlenSammeln, gesammelteDateiwahlen, formatierungsElementeZaehlen,
  beendenKnopf, beendenBetaetigen, beendenBetaetigenBinnen, aufgabenSammeln, pruefeAufgabenNachAnzeige, pruefeAufgabenZaehler, beendetMeldung, beendenFehler, beendenScheitertMit, modusWaehlen, neuLaden,
  kopfZahlen, fortschrittZaehler, commitZeileZusammenfassung, commitZeileText, pruefeKopfZahlen, pruefeFortschritt, pruefeCommitZeileZusammenfassung,
  pruefeCommitZeileEnthaelt, pruefeCommitZeileEnthaeltNicht, zusammenAntwortVerzoegern, zusammenAntwortScheitert,
  commitZeileAufklappen, commitZeileZuklappen, pruefeCommitZeileUeberDerListe,
  commitsAntwortVerzoegern, commitsAntwortAbwarten, commitZeileSofortAufklappen, commitZeileBleibtOffen,
  ergebnisKopierenKnopf, ergebnisKopierenBetaetigen, kopierenStatus, ergebnisAntwortZurueckhalten,
};
