'use strict';
// Treiber Oberfläche der Zeilenanmerkungen (R00010): der einzige Ort, der Selektoren, Rollen und Antworten von /api/anmerkungen im Browser kennt.
const { expect } = require('@playwright/test');
const diffSeite = require('./diff-oberflaeche.js');

const ROLLBEREICH = '#diff .df-sc';
/** Der ganze Diff-Bereich: er trägt die Notiz- und Änderungsfelder der Zeilen (im Rollbereich) wie das „Datei anmerken“-Feld
    (im Datei-Kopf über dem Rollbereich, R00022). */
const ANMERKUNGSBEREICH = '#diff';
const DIFFZEILE = '#diff .dz tr[data-art]';
const ANMERKUNGSZEILE = '#diff .dz tr.anm';
const FELDZEILE = '#diff .dz tr.anm-feld, #diff .dz tr.anm-aendern';
const DATEI_ANMERKUNGSZEILE = '#diff .anm-datei tr.anm';
const DATEI_KNOPF = '#diff .diff-datei-anmerken';
const DATEI_KNOPF_BUTTON = '#diff .datei-anmerken';
const HINWEIS_ENTFERNT = '#diff .anmerkung-hinweis';
const HINWEIS_AUSSERHALB = '#diff .anmerkungen-ausserhalb';
const ANLEGEN = '**/api/anmerkungen';
const AENDERUNG = /\/api\/anmerkungen\/\d+$/;
const LOESCHUNG = /\/api\/anmerkungen\/\d+\/loeschen$/;
const VERZOEGERUNG_MS = 1500;
/** Die Antwort auf „Speichern“ ist kein Leistungsurteil: gewartet wird bis zum Testende, nicht 5 s (fremde Last auf dem Rechner). */
const ANTWORT_FRIST_MS = 30000;

/** `ziel`: `{ neu }`, `{ alt }` (entfernte Zeile), `'kopf'` oder `'hinweis'` (`\ No newline at end of file`). */
function diffzeile(page, ziel) {
  if (ziel === 'kopf' || ziel === 'hinweis') {
    return page.locator(`${DIFFZEILE}[data-art="${ziel}"]`).first();
  }
  if ('alt' in ziel) {
    return page.locator(`${DIFFZEILE}[data-art="minus"][data-alt="${ziel.alt}"]`);
  }
  return page.locator(`${DIFFZEILE}[data-neu="${ziel.neu}"]`);
}

/** Der Abschnitt einer Ansicht ohne Kette (`data-commit`) — bei doppelten Zeilennummern je Abschnitt eindeutig. */
function abschnitt(page, commit) {
  return page.locator(`#diff .diff-abschnitt[data-commit="${commit}"]`);
}

async function zeileImAbschnittAnklicken(page, commit, ziel) {
  await abschnitt(page, commit).locator(`tr[data-art][data-neu="${ziel.neu}"] td`).last().click();
}

/** Anmerkungszeilen direkt unter der Zeile `ziel.neu` innerhalb des Abschnitts `commit` (wie `anmerkungenUnter`, aber je Abschnitt). */
async function anmerkungenUnterImAbschnitt(page, commit, ziel) {
  return abschnitt(page, commit).locator(`tr[data-art][data-neu="${ziel.neu}"]`).evaluate(zeile => {
    const texte = [];
    let naechste = zeile.nextElementSibling;
    while (naechste && !naechste.hasAttribute('data-art')) {
      if (naechste.classList.contains('anm')) {
        texte.push({ text: naechste.querySelector('.anm-text').textContent, stelle: naechste.querySelector('.anm-stelle').textContent });
      }
      naechste = naechste.nextElementSibling;
    }
    return texte;
  });
}

async function pruefeAnmerkungenUnterImAbschnitt(page, commit, ziel, erwartet) {
  await expect.poll(() => anmerkungenUnterImAbschnitt(page, commit, ziel), `Anmerkungen unter ${commit}:${ziel.neu}`).toEqual(erwartet);
}

async function zeileAnklicken(page, ziel) {
  await diffzeile(page, ziel).locator('td').last().click();
}

/** Doppelklick auf die Textzelle (`'text'`) oder die Nummernzelle neu (`'nummer'`) der Zeile. */
async function zeileDoppeltAnklicken(page, ziel, zelle) {
  let zelleLocator = diffzeile(page, ziel).locator('td.c');
  if (zelle === 'nummer') {
    zelleLocator = diffzeile(page, ziel).locator('td.n.neu');
  }
  await zelleLocator.dblclick();
}

function feld(page, name) {
  return page.locator(ANMERKUNGSBEREICH).getByRole('textbox', { name, exact: true });
}

function feldzeile(page, name) {
  return page.locator(FELDZEILE).filter({ has: page.getByRole('textbox', { name, exact: true }) });
}

async function pruefeFeldOffenMitFokus(page, name) {
  await expect(feld(page, name)).toBeFocused();
}

async function textSchreiben(page, name, text) {
  await feld(page, name).fill(text);
}

/** „Speichern“ und warten, bis der Server die Anfrage beantwortet hat: er trägt die Anmerkung in seinen Stand ein, bevor er
    antwortet — deshalb darf „Beenden“ erst danach klicken (sonst überholt es das Anlegen). */
async function speichern(page, name) {
  const antwort = anfrageBeantwortet(page);
  await feldzeile(page, name).getByRole('button', { name: 'Speichern', exact: true }).click();
  await antwort;
}

/** Die nächste Schreibanfrage auf /api/anmerkungen und ihre Antwort; ein abgebrochener Request antwortet nie — auf ihn endet das
    Warten ohne Antwort, der Zustand steht dann im Feld (Meldung). */
async function anfrageBeantwortet(page) {
  const anfrage = await page.waitForRequest(eineSchreibanfrage, { timeout: ANTWORT_FRIST_MS });
  await anfrage.response();
}

function eineSchreibanfrage(anfrage) {
  return anfrage.method() === 'POST' && /\/api\/anmerkungen(\/\d+)?$/.test(anfrage.url());
}

/** Zwei Klicks kurz hintereinander auf „Speichern“, der zweite ohne Warten auf Bedienbarkeit. */
async function zweimalSpeichern(page, name) {
  const knopf = feldzeile(page, name).getByRole('button', { name: 'Speichern', exact: true });
  await knopf.click();
  await knopf.click({ force: true });
}

async function pruefeAnzahlFelder(page, name, anzahl) {
  await expect(feld(page, name)).toHaveCount(anzahl);
}

async function pruefeFeldtext(page, name, text) {
  await expect(feld(page, name)).toHaveValue(text);
}

async function pruefeFeldZu(page, name) {
  await expect(feld(page, name)).toHaveCount(0);
}

async function pruefeKeinFeld(page) {
  await expect(page.locator('#diff .dz tr.anm-feld')).toHaveCount(0);
}

async function pruefeFeldmeldung(page, name, meldung, text) {
  await expect(feldzeile(page, name).getByRole('alert')).toHaveText(meldung);
  await expect(feld(page, name)).toHaveValue(text);
}

/** Texte der Anmerkungszeilen direkt unter der Diff-Zeile, in ihrer Reihenfolge; ein offenes Notizfeld unterbricht die Folge nicht. */
async function anmerkungenUnter(page, ziel) {
  return diffzeile(page, ziel).evaluate(zeile => {
    const texte = [];
    let naechste = zeile.nextElementSibling;
    while (naechste && !naechste.hasAttribute('data-art')) {
      if (naechste.classList.contains('anm')) {
        texte.push({ text: naechste.querySelector('.anm-text').textContent, stelle: naechste.querySelector('.anm-stelle').textContent });
      }
      naechste = naechste.nextElementSibling;
    }
    return texte;
  });
}

/* ── Bereich (R00031) ── */

/** Die Textzelle der Zeile, an der ein Klick die Zeile wählt: einspaltig `td.c`, nebeneinander die Seite der Nummer neu. */
async function textzelle(page, neu) {
  const zeile = diffzeile(page, { neu });
  const nebeneinanderZelle = zeile.locator('td.c-neu');
  return (await nebeneinanderZelle.count()) > 0 ? nebeneinanderZelle.first() : zeile.locator('td.c').first();
}

/** Ein Bereich über Umschalt-Klick: Klick auf die Zeile `von`, dann Umschalt-Klick auf `bis`. */
async function bereichWaehlen(page, von, bis) {
  await (await textzelle(page, von)).click();
  await (await textzelle(page, bis)).click({ modifiers: ['Shift'] });
}

/** Ein Bereich über Ziehen: Druck auf die Nummer-neu-Zelle von `von`, Zug bis `bis`, loslassen. */
async function bereichZiehen(page, von, bis) {
  await zieheZwischen(await diffzeile(page, { neu: von }).locator('td.n.neu'), await diffzeile(page, { neu: bis }).locator('td.n.neu'), page);
}

/** Druck auf die Nummernzelle `start`, Zug bis `ende`, loslassen. */
async function zieheZwischen(startElement, endeElement, page) {
  const start = await startElement.boundingBox();
  const ende = await endeElement.boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(ende.x + ende.width / 2, ende.y + ende.height / 2, { steps: 5 });
  await page.mouse.up();
}

/** Ein Bereich über Umschalt-Klick im Abschnitt `commit` — dieselbe Datei zeigt je Commit einen Abschnitt (Ansicht ohne Kette). */
async function bereichImAbschnittWaehlen(page, commit, von, bis) {
  const abschnittElement = abschnitt(page, commit);
  await abschnittElement.locator(`tr[data-art][data-neu="${von}"] td`).last().click();
  await abschnittElement.locator(`tr[data-art][data-neu="${bis}"] td`).last().click({ modifiers: ['Shift'] });
}

/** Ein Bereich über Ziehen über die Nummernzellen im Abschnitt `commit`. */
async function bereichImAbschnittZiehen(page, commit, von, bis) {
  const abschnittElement = abschnitt(page, commit);
  await zieheZwischen(
    abschnittElement.locator(`tr[data-art][data-neu="${von}"] td.n.neu`),
    abschnittElement.locator(`tr[data-art][data-neu="${bis}"] td.n.neu`),
    page);
}

/** Die markierten Zeilen eines Abschnitts als Nummern neu (eine Markierung im falschen Commit fällt hier auf). */
async function markierteImAbschnitt(page, commit) {
  return abschnitt(page, commit).locator('tr[data-art].bereich').evaluateAll(zeilen => zeilen.map(zeile => Number(zeile.dataset.neu)));
}

async function pruefeMarkiertImAbschnitt(page, commit, nummern) {
  expect(await markierteImAbschnitt(page, commit), `markierte Zeilen im Abschnitt ${commit.slice(0, 7)}`).toEqual(nummern);
}

/** Das offene Bereichsfeld mit Fokus steht im Abschnitt `commit`. */
async function pruefeBereichsfeldImAbschnitt(page, commit, name) {
  await expect(abschnitt(page, commit).getByRole('textbox', { name, exact: true }), 'Bereichsfeld im Abschnitt').toBeFocused();
}

/** Text ins Bereichsfeld des Abschnitts, „Speichern“, auf die Antwort warten, danach ist das Feld zu. */
async function bereichImAbschnittSpeichern(page, commit, name, text) {
  const feldElement = abschnitt(page, commit).getByRole('textbox', { name, exact: true });
  await feldElement.fill(text);
  const antwort = anfrageBeantwortet(page);
  await abschnitt(page, commit).locator('tr.anm-feld').getByRole('button', { name: 'Speichern', exact: true }).click();
  await antwort;
  await expect(feldElement).toHaveCount(0);
}

/** Die Anordnung umstellen (untereinander | nebeneinander, R00023) — über das Menü „Ansicht ▾“ (R00039). */
async function anordnungWaehlen(page, wert) {
  await diffSeite.menueWaehlen(page, wert);
}

/** Die markierten Zeilen (Klasse `bereich`) als Nummern neu in Reihenfolge. */
async function markierteZeilen(page) {
  return page.locator(`${DIFFZEILE}.bereich`).evaluateAll(zeilen => zeilen.map(zeile => Number(zeile.dataset.neu)));
}

async function pruefeMarkiert(page, nummern) {
  expect(await markierteZeilen(page), 'markierte Zeilen').toEqual(nummern);
}

/** Die Markierung ist nicht allein Farbe: die erste Zelle trägt einen Balken (`box-shadow`). */
async function pruefeMarkierungNichtNurFarbe(page, neu) {
  const schatten = await diffzeile(page, { neu }).locator('td').first().evaluate(zelle => getComputedStyle(zelle).boxShadow);
  expect(schatten, 'Markierung ohne Balken').not.toBe('none');
}

async function pruefeKeineMarkierung(page) {
  expect(await markierteZeilen(page), 'keine markierte Zeile').toEqual([]);
}

/** Der Text des Hinweises über dem Diff (entfernte Zeile, Abschnittsgrenze). */
async function pruefeHinweis(page, text) {
  await expect(page.locator(HINWEIS_ENTFERNT)).toHaveText(text);
}

async function pruefeKeinHinweis(page) {
  await expect(page.locator(HINWEIS_ENTFERNT)).toHaveText('');
}

async function pruefeAnmerkungenUnter(page, ziel, erwartet) {
  await expect.poll(() => anmerkungenUnter(page, ziel), `Anmerkungen unter ${JSON.stringify(ziel)}`).toEqual(erwartet);
}

async function pruefeAnzahlAnmerkungszeilen(page, anzahl) {
  await expect(page.locator(ANMERKUNGSZEILE)).toHaveCount(anzahl);
}

/** Alle Anmerkungszeilen der stabilen Nummer `nummer` im ganzen Diff-Bereich: Datei-Block (`#diff .anm-datei`) **und** Zeilen
    (`#diff .dz`). Eine Anmerkung steht genau einmal (Abnahme der Anzeige, R00031). */
async function pruefeAnzahlAnmerkungszeilenMitNummer(page, nummer, anzahl) {
  await expect(page.locator(`#diff tr.anm[data-anmerkung="${nummer}"]`), `Anmerkungszeilen der Nummer ${nummer}`).toHaveCount(anzahl);
}

/* ── Dateianmerkungen über den Diff-Zeilen (R00022) ── */

/** Die Dateianmerkungen über den Diff-Zeilen: je Eintrag Text und Stelle, in Reihenfolge. */
async function dateianmerkungenOben(page) {
  return page.locator(DATEI_ANMERKUNGSZEILE).evaluateAll(zeilen => zeilen.map(zeile => ({
    text: zeile.querySelector('.anm-text').textContent,
    stelle: zeile.querySelector('.anm-stelle').textContent,
  })));
}

async function pruefeDateianmerkungenOben(page, erwartet) {
  await expect.poll(() => dateianmerkungenOben(page), 'Dateianmerkungen über den Diff-Zeilen').toEqual(erwartet);
}

async function pruefeKeineDateianmerkung(page) {
  await expect(page.locator(DATEI_ANMERKUNGSZEILE)).toHaveCount(0);
}

async function anzahlDateianmerkungen(page, anzahl) {
  await expect(page.locator(DATEI_ANMERKUNGSZEILE)).toHaveCount(anzahl);
}

/** Die Dateianmerkungen stehen im Dokument über den Diff-Zeilen und auf dem Bildschirm über der ersten (Positivkontrolle). */
async function pruefeDateianmerkungUeberDenZeilen(page) {
  const obenImDokument = await page.evaluate(() => {
    const block = document.querySelector('#diff .anm-datei');
    const ersteZeile = document.querySelector('#diff .dz tr[data-art]');
    return Boolean(block && ersteZeile && (block.compareDocumentPosition(ersteZeile) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(obenImDokument, 'Dateianmerkung im Dokument vor der ersten Diff-Zeile').toBe(true);
  const block = await page.locator('#diff .anm-datei').boundingBox();
  const ersteZeile = await page.locator('#diff .dz tr[data-art]').first().boundingBox();
  expect(block.y + block.height, 'auf dem Bildschirm über der ersten Diff-Zeile').toBeLessThanOrEqual(ersteZeile.y + 1);
}

/** Der Knopf „Datei anmerken“ im Diff-Kopf (sichtbar nur, wenn ein Diff gezeichnet ist). */
async function dateiAnmerken(page) {
  await page.locator(DATEI_KNOPF_BUTTON).click();
}

async function pruefeDateiKnopfSichtbar(page) {
  await expect(page.locator(DATEI_KNOPF)).toBeVisible();
}

/** Legt `anzahl` Datei-Anmerkungen über den echten Knopf „Datei anmerken“ an; jede bekommt `text` samt laufender Nummer.
    Nacheinander, damit jede Antwort abgewartet ist, bevor die nächste Anmerkung entsteht (Befund B1: viele Datei-Anmerkungen). */
async function dateiAnmerkungenAnlegen(page, anzahl, text) {
  for (let nummer = 1; nummer <= anzahl; nummer += 1) {
    await page.locator(DATEI_KNOPF_BUTTON).click();
    await page.locator('#diff .anm-datei-bereich textarea.anm-eingabe').fill(`${text} (${nummer})`);
    await page.locator('#diff .anm-datei-bereich button.btn-haupt').click();
    await expect(page.locator('#diff .anm-text'), `Datei-Anmerkungen nach Nummer ${nummer}`).toHaveCount(nummer, { timeout: 5000 });
  }
}

async function pruefeDateiKnopfVerborgen(page) {
  await expect(page.locator(DATEI_KNOPF)).toBeHidden();
}

/** Der Knopf „Datei anmerken“ am Hinweis einer entfernten Zeile (R00022). */
async function dateiAnmerkenAmHinweis(page) {
  await page.locator('#diff .datei-anmerken-hinweis').click();
}

async function pruefeHinweisAnmerkenSichtbar(page) {
  await expect(page.locator('#diff .anmerkung-hinweis-anmerken')).toBeVisible();
}

async function pruefeHinweisAnmerkenVerborgen(page) {
  await expect(page.locator('#diff .anmerkung-hinweis-anmerken')).toBeHidden();
}

/** Beantwortet `GET /api/haken` mit diesem Stand — für die Sperre am „Datei anmerken“-Knopf (R00014). */
async function hakenAntwortetMit(page, stand) {
  await page.route('**/api/haken', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stand) });
  });
}

async function pruefeDateiKnopfGesperrt(page, grund) {
  await expect(page.locator(DATEI_KNOPF_BUTTON)).toBeDisabled();
  await expect(page.locator('#diff .diff-datei-grund')).toHaveText(grund);
}

async function pruefeDateiKnopfBedienbar(page) {
  await expect(page.locator(DATEI_KNOPF_BUTTON)).toBeEnabled();
}

/** Positiv geprüft: die Anmerkungszeilen tragen keine Merkmale einer Diff-Zeile und keine Zeilenklassen der Färbung. */
async function pruefeAnmerkungszeilenSindKeineDiffzeilen(page) {
  const merkmale = await page.locator(ANMERKUNGSZEILE).evaluateAll(zeilen => zeilen.map(zeile => ({
    klasse: zeile.className, art: zeile.hasAttribute('data-art'), alt: zeile.hasAttribute('data-alt'), neu: zeile.hasAttribute('data-neu'), textzelle: zeile.querySelector('.c') !== null,
  })));
  expect(merkmale.length).toBeGreaterThan(0);
  for (const merkmal of merkmale) {
    expect(merkmal).toEqual({ klasse: 'anm', art: false, alt: false, neu: false, textzelle: false });
  }
}

async function pruefeHinweisEntfernt(page, text) {
  await expect(page.locator(HINWEIS_ENTFERNT)).toHaveText(text);
}

async function pruefeKeinHinweisEntfernt(page) {
  await expect(page.locator(HINWEIS_ENTFERNT)).toHaveText('');
}

async function pruefeHinweisAusserhalb(page, text) {
  await expect(page.locator(HINWEIS_AUSSERHALB)).toHaveText(text);
}

async function pruefeKeinHinweisAusserhalb(page) {
  await expect(page.locator(HINWEIS_AUSSERHALB)).toHaveCount(0);
}

/** Fokus auf den Diff-Bereich per Tab vom Menüknopf „Ansicht ▾“ aus — der Bereich ist unter den nächsten Tab-Stopps (das Suchfeld, R00027, liegt davor). */
async function inDenDiffTabben(page) {
  await expect(page.locator(ROLLBEREICH)).toBeVisible();
  await page.locator('#ansicht-knopf').focus();
  for (let versuch = 0; versuch < 8; versuch += 1) {
    await page.keyboard.press('Tab');
    const hatFokus = await page.locator(ROLLBEREICH).evaluate(element => element === document.activeElement);
    if (hatFokus) {
      return;
    }
  }
  await expect(page.locator(ROLLBEREICH)).toBeFocused();
}

/** Pfeil ab, bis die Zeile mit Nummer neu `neu` den Fokus hat (höchstens 40 Mal). */
async function pfeilAbBis(page, neu) {
  const zeile = diffzeile(page, { neu });
  for (let versuch = 0; versuch < 40; versuch += 1) {
    await page.keyboard.press('ArrowDown');
    const hatFokus = await zeile.evaluate(element => element === document.activeElement);
    if (hatFokus) {
      return;
    }
  }
  throw new Error(`Zeile ${neu} hat nach 40 Mal Pfeil ab keinen Fokus`);
}

async function taste(page, name) {
  await page.keyboard.press(name);
}

async function pruefeFokusAufZeile(page, ziel) {
  await expect(diffzeile(page, ziel)).toBeFocused();
}

/** Je Antwort auf das Anlegen: `{ status, meldung }` erfüllt sie ohne Server, `'netz'` bricht ab; danach wieder der echte Server. */
async function anlegenAntwortetEinmal(page, antwort) {
  let istBeantwortet = false;
  await page.route(ANLEGEN, async route => {
    const istErstesAnlegen = route.request().method() === 'POST' && !istBeantwortet;
    if (!istErstesAnlegen) {
      await route.fallback();
      return;
    }
    istBeantwortet = true;
    if (antwort === 'netz') {
      await route.abort('failed');
      return;
    }
    await route.fulfill({ status: antwort.status, contentType: 'application/json', body: JSON.stringify({ meldung: antwort.meldung }) });
  });
}

/** Hält jedes Anlegen 1,5 s zurück; `eingetroffen` wartet auf die erste Antwort des Servers. */
async function anlegenVerzoegern(page) {
  await page.route(ANLEGEN, async route => {
    const istAnlegen = route.request().method() === 'POST';
    if (istAnlegen) {
      await new Promise(weiter => setTimeout(weiter, VERZOEGERUNG_MS));
    }
    await route.fallback();
  });
  const antwort = page.waitForResponse(response => response.url().endsWith('/api/anmerkungen') && response.request().method() === 'POST');
  return { eingetroffen: () => antwort };
}

/* ── Art der Anmerkung (R00036) ── */

/** Die Gruppe „Art“ des jüngsten offenen Felds (Zeile, Bereich, Datei oder Ändern). */
function artgruppe(page) {
  return page.locator(`${ANMERKUNGSBEREICH} [role="radiogroup"][aria-label="Art"]`).last();
}

/** Die Gruppe steht im Feld, trägt genau diese Wahlen in dieser Reihenfolge und liegt vor dem Textfeld. */
async function pruefeArtgruppe(page, name, wahlen) {
  const gruppe = artgruppe(page);
  await expect(gruppe).toBeVisible();
  await expect(gruppe.locator('.anm-art-wahl')).toHaveText(wahlen);
  const gruppeHandle = await gruppe.elementHandle();
  const feldHandle = await feld(page, name).elementHandle();
  const liegtDavor = await page.evaluate(([gruppeElement, feldElement]) => Boolean(gruppeElement.compareDocumentPosition(feldElement) & Node.DOCUMENT_POSITION_FOLLOWING), [gruppeHandle, feldHandle]);
  expect(liegtDavor, 'die Gruppe „Art“ steht vor dem Textfeld').toBe(true);
}

/** Die Wahl dieses Namens („ohne“, „Muss“, „Frage“, „Idee“) ist die gewählte. */
async function pruefeArtGewaehlt(page, name) {
  await expect(artgruppe(page).getByRole('radio', { name, exact: true })).toBeChecked();
}

/** Die Wahl mit der Maus treffen. */
async function artWaehlen(page, name) {
  await artgruppe(page).getByRole('radio', { name, exact: true }).check();
}

/** Vom Textfeld mit Umschalt+Tab in die Gruppe, dann mit den Pfeiltasten bis zur Wahl — die Bedienung ohne Maus. */
async function artMitTastaturWaehlen(page, name) {
  const gruppe = artgruppe(page);
  const ziel = gruppe.getByRole('radio', { name, exact: true });
  await page.keyboard.press('Shift+Tab');
  await expect(gruppe.locator('input[type="radio"]:checked')).toBeFocused();
  for (let versuch = 0; versuch < 4; versuch += 1) {
    if (await ziel.isChecked()) {
      return;
    }
    await page.keyboard.press('ArrowRight');
  }
  await expect(ziel).toBeChecked();
}

/** Der Stand aller Anmerkungen, wie ihn `GET /api/anmerkungen` liefert (mit `art`). */
async function anmerkungenAufDemServer(page) {
  return page.evaluate(async () => {
    const antwort = await fetch('api/anmerkungen', { headers: { Accept: 'application/json' } });
    return antwort.json();
  });
}

/** Der Kopf der Anmerkung zeigt die Art als Wort vor dem Text (R00036). */
async function pruefeArtAmKopf(page, nummer, wort) {
  await expect(anmerkungszeile(page, nummer).locator('.anm-kopf .anm-art-wort')).toHaveText(wort);
}

/** Ohne Art steht im Kopf nichts Zusätzliches. */
async function pruefeKeineArtAmKopf(page, nummer) {
  await expect(anmerkungszeile(page, nummer).locator('.anm-kopf .anm-art-wort')).toHaveCount(0);
}

/** Anmerkungszeile über ihre stabile Nummer im Kopf („Anmerkung n“), nicht über ihre Stelle. */
function anmerkungszeile(page, nummer) {
  return page.locator(`${ANMERKUNGSZEILE}[data-anmerkung="${nummer}"]`);
}

/** Klick auf „Ändern“ im Anmerkungskopf; ein zweiter Klick auf dieselbe Nummer ist erlaubt und darf kein zweites Feld öffnen. */
async function aenderungOeffnen(page, nummer) {
  await anmerkungszeile(page, nummer).getByRole('button', { name: 'Ändern', exact: true }).click();
}

async function pruefeKopfNenntNummer(page, nummer) {
  await expect(anmerkungszeile(page, nummer).locator('.anm-kopf .anm-nummer')).toHaveText(`Anmerkung ${nummer}`);
}

async function pruefeFokusAufKopf(page, nummer) {
  await expect(anmerkungszeile(page, nummer).locator('.anm-kopf')).toBeFocused();
}

async function pruefeAnzahlAenderungsfelder(page, anzahl) {
  await expect(page.locator('#diff .dz tr.anm-aendern')).toHaveCount(anzahl);
}

/** Das offene Änderungsfeld über die stabile Nummer adressiert — zwei Felder an derselben Zeile tragen denselben Namen. */
function aenderungsfeldziele(nummer) {
  return `${ANMERKUNGSZEILE}[data-anmerkung="${nummer}"] + tr.anm-aendern`;
}

function aenderungsfeld(page, nummer) {
  return page.locator(`${aenderungsfeldziele(nummer)} textarea`);
}

async function aenderungsfeldTextSchreiben(page, nummer, text) {
  await aenderungsfeld(page, nummer).fill(text);
}

async function pruefeAenderungsfeldText(page, nummer, text) {
  await expect(aenderungsfeld(page, nummer)).toHaveValue(text);
}

async function aenderungsfeldSpeichern(page, nummer) {
  await page.locator(aenderungsfeldziele(nummer)).getByRole('button', { name: 'Speichern', exact: true }).click();
}

/** Wie `aenderungsfeldSpeichern`, aber erst weiter, wenn der Server geantwortet hat — sonst überholt die nächste Anfrage die Änderung. */
async function aenderungsfeldSpeichernUndWarten(page, nummer) {
  const antwort = anfrageBeantwortet(page);
  await aenderungsfeldSpeichern(page, nummer);
  await antwort;
}

/** Caret-Stelle (`selectionStart`) des offenen Felds: prüft, dass die Pfeiltaste den Caret bewegt statt den Fokus zu reißen. */
async function caretPosition(page, name) {
  return feld(page, name).evaluate(element => element.selectionStart);
}

async function fokusAufKnopf(page, name, knopfname) {
  await feldzeile(page, name).getByRole('button', { name: knopfname, exact: true }).focus();
}

async function pruefeKnopfHatFokus(page, name, knopfname) {
  await expect(feldzeile(page, name).getByRole('button', { name: knopfname, exact: true })).toBeFocused();
}

/** Der alte Text steht während der Änderung weiter unter seiner Zeile in der Anmerkungszeile. */
async function pruefeAnmerkungszeileEnthaelt(page, nummer, text) {
  await expect(anmerkungszeile(page, nummer).locator('.anm-text')).toHaveText(text);
}

async function abbrechen(page, name) {
  await feldzeile(page, name).getByRole('button', { name: 'Abbrechen', exact: true }).click();
}

async function pruefeSpeichernGesperrt(page, name) {
  await expect(feldzeile(page, name).getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled();
}

/** Je Antwort auf das Ändern: `{ status, meldung }` erfüllt sie ohne Server, `'netz'` bricht ab; danach wieder der echte Server. */
async function aenderungAntwortetEinmal(page, antwort) {
  let istBeantwortet = false;
  await page.route(AENDERUNG, async route => {
    const istErsteAenderung = route.request().method() === 'POST' && !istBeantwortet;
    if (!istErsteAenderung) {
      await route.fallback();
      return;
    }
    istBeantwortet = true;
    if (antwort === 'netz') {
      await route.abort('failed');
      return;
    }
    await route.fulfill({ status: antwort.status, contentType: 'application/json', body: JSON.stringify({ meldung: antwort.meldung }) });
  });
}

/** Hält jede Änderung 1,5 s zurück; `eingetroffen` wartet auf die erste Antwort, `anzahl` zählt die Anfragen des Browsers. */
async function aenderungVerzoegern(page) {
  let anzahl = 0;
  await page.route(AENDERUNG, async route => {
    const istAenderung = route.request().method() === 'POST';
    if (istAenderung) {
      anzahl += 1;
      await new Promise(weiter => setTimeout(weiter, VERZOEGERUNG_MS));
    }
    await route.fallback();
  });
  const antwort = page.waitForResponse(response => AENDERUNG.test(response.url()) && response.request().method() === 'POST');
  return { eingetroffen: () => antwort, anzahl: () => anzahl };
}

/** Führt `waehlen` aus und misst bis zu dem Bild, in dem Zeile `letzteNeu`, die Anmerkung an `anmerkungNeu` und genau `anzahl` Anmerkungszeilen stehen.
    In diesem Bild stempelt die Seite ihre Zeit (`gitreviewaAnzeigeUmMs`) — daran hängen die Aufgaben nach der Anzeige. */
async function pruefeAnmerkungenBinnen(page, waehlen, { letzteNeu, anmerkungNeu, anzahl }, fristMs) {
  const klickUmMs = Date.now();
  await waehlen();
  await page.waitForFunction(([diffzeileSelektor, anmerkungSelektor, letzte, an, erwartet]) => {
    const letzteZeile = document.querySelector(`${diffzeileSelektor}[data-neu="${letzte}"]`);
    const zeileMitAnmerkung = document.querySelector(`${diffzeileSelektor}[data-neu="${an}"]`);
    const anmerkungDarunter = zeileMitAnmerkung && zeileMitAnmerkung.nextElementSibling && zeileMitAnmerkung.nextElementSibling.matches(anmerkungSelektor);
    const steht = letzteZeile !== null && anmerkungDarunter && document.querySelectorAll(anmerkungSelektor).length === erwartet;
    if (steht) {
      window.gitreviewaAnzeigeUmMs = performance.now();
    }
    return steht;
  }, [DIFFZEILE, ANMERKUNGSZEILE, letzteNeu, anmerkungNeu, anzahl], { polling: 'raf', timeout: 10000 });
  const dauerMs = Date.now() - klickUmMs;
  expect(dauerMs, `${anzahl} Anmerkungen nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  return dauerMs;
}

/** Positiv geprüft: in den Anmerkungszeilen kein `img` und kein `b`, obwohl Anmerkungszeilen da sind. */
async function pruefeAnmerkungOhneHtml(page) {
  await expect(page.locator(ANMERKUNGSZEILE).first()).toBeVisible();
  await expect(page.locator(`${ANMERKUNGSZEILE} img, ${ANMERKUNGSZEILE} b`)).toHaveCount(0);
}

/** Sichtbarer Text der ersten Anmerkung: Zeilenumbrüche als eigene Bildschirmzeilen (innerText), spitze Klammern und Sternchen als Text. */
async function sichtbarerAnmerkungstext(page) {
  return page.locator(`${ANMERKUNGSZEILE} .anm-text`).first().innerText();
}

/** Klick auf „Löschen“ im Anmerkungskopf (R00019). */
async function loeschungOeffnen(page, nummer) {
  await anmerkungszeile(page, nummer).getByRole('button', { name: 'Löschen', exact: true }).click();
}

/** Zweiter Klick auf „Löschen“ kurz hintereinander, ohne auf Bedienbarkeit zu warten — darf keine zweite Anfrage senden. */
async function zweimalLoeschen(page, nummer) {
  const knopf = anmerkungszeile(page, nummer).getByRole('button', { name: 'Löschen', exact: true });
  await knopf.click();
  await knopf.click({ force: true });
}

/** „Löschen“ per Tastatur: Fokus auf den Knopf, Enter. */
async function loeschenPerTastatur(page, nummer) {
  await anmerkungszeile(page, nummer).getByRole('button', { name: 'Löschen', exact: true }).focus();
  await page.keyboard.press('Enter');
}

async function pruefeKeineAnmerkungszeile(page, nummer) {
  await expect(page.locator(`${ANMERKUNGSZEILE}[data-anmerkung="${nummer}"]`)).toHaveCount(0);
}

async function pruefeLoeschenGesperrt(page, nummer) {
  await expect(anmerkungszeile(page, nummer).getByRole('button', { name: 'Löschen', exact: true })).toBeDisabled();
}

async function pruefeKopfmeldung(page, nummer, meldung) {
  await expect(anmerkungszeile(page, nummer).locator('.anm-kopf .anm-kopf-fehler')).toHaveText(meldung);
}

/** Je Antwort auf das Löschen: `{ status, meldung }` erfüllt sie ohne Server, `'netz'` bricht ab; danach wieder der echte Server. */
async function loeschungAntwortetEinmal(page, antwort) {
  let istBeantwortet = false;
  await page.route(LOESCHUNG, async route => {
    const istErsteLoeschung = route.request().method() === 'POST' && !istBeantwortet;
    if (!istErsteLoeschung) {
      await route.fallback();
      return;
    }
    istBeantwortet = true;
    if (antwort === 'netz') {
      await route.abort('failed');
      return;
    }
    await route.fulfill({ status: antwort.status, contentType: 'application/json', body: JSON.stringify({ meldung: antwort.meldung }) });
  });
}

/** Hält jede Löschung 1,5 s zurück; `eingetroffen` wartet auf die erste Antwort, `anzahl` zählt die Anfragen des Browsers. */
async function loeschungVerzoegern(page) {
  let anzahl = 0;
  await page.route(LOESCHUNG, async route => {
    const istLoeschung = route.request().method() === 'POST';
    if (istLoeschung) {
      anzahl += 1;
      await new Promise(weiter => setTimeout(weiter, VERZOEGERUNG_MS));
    }
    await route.fallback();
  });
  const antwort = page.waitForResponse(response => LOESCHUNG.test(response.url()) && response.request().method() === 'POST');
  return { eingetroffen: () => antwort, anzahl: () => anzahl };
}

/** Die erste Löschung 1,5 s verzögert mit dieser Antwort beantworten (`{ status, meldung }` oder `'netz'`), danach wieder der echte Server. */
async function loeschungVerzoegertAntworten(page, antwort) {
  let anzahl = 0;
  let istBeantwortet = false;
  await page.route(LOESCHUNG, async route => {
    const istLoeschung = route.request().method() === 'POST';
    if (!istLoeschung || istBeantwortet) {
      await route.fallback();
      return;
    }
    istBeantwortet = true;
    anzahl += 1;
    await new Promise(weiter => setTimeout(weiter, VERZOEGERUNG_MS));
    if (antwort === 'netz') {
      await route.abort('failed');
      return;
    }
    await route.fulfill({ status: antwort.status, contentType: 'application/json', body: JSON.stringify({ meldung: antwort.meldung }) });
  });
  const eingetroffen = page.waitForResponse(response => LOESCHUNG.test(response.url()) && response.request().method() === 'POST');
  return { eingetroffen: () => eingetroffen, anzahl: () => anzahl };
}

/** Weiterer Klick auf „Löschen“ ohne Warten auf Bedienbarkeit: ein gesperrter Knopf sendet dabei nichts. */
async function loeschenErneut(page, nummer) {
  await anmerkungszeile(page, nummer).getByRole('button', { name: 'Löschen', exact: true }).click({ force: true });
}

async function pruefeLoeschenFrei(page, nummer) {
  await expect(anmerkungszeile(page, nummer).getByRole('button', { name: 'Löschen', exact: true })).toBeEnabled();
}

module.exports = {
  anordnungWaehlen,
  bereichWaehlen,
  bereichZiehen,
  bereichImAbschnittWaehlen,
  bereichImAbschnittZiehen,
  pruefeMarkiertImAbschnitt,
  pruefeBereichsfeldImAbschnitt,
  bereichImAbschnittSpeichern,
  pruefeMarkiert, markierteZeilen,
  pruefeMarkierungNichtNurFarbe,
  pruefeKeineMarkierung,
  pruefeHinweis,
  pruefeKeinHinweis,
  zeileAnklicken, zeileDoppeltAnklicken, zeileImAbschnittAnklicken, pruefeAnmerkungenUnterImAbschnitt, pruefeAnzahlFelder, pruefeFeldtext, pruefeFeldOffenMitFokus, textSchreiben, speichern, zweimalSpeichern, pruefeFeldZu, pruefeKeinFeld, pruefeFeldmeldung,
  pruefeAnmerkungenUnter, pruefeAnzahlAnmerkungszeilen, pruefeAnzahlAnmerkungszeilenMitNummer, pruefeAnmerkungszeilenSindKeineDiffzeilen,
  dateianmerkungenOben, pruefeDateianmerkungenOben, pruefeKeineDateianmerkung, anzahlDateianmerkungen, pruefeDateianmerkungUeberDenZeilen, dateiAnmerken, pruefeDateiKnopfSichtbar, dateiAnmerkungenAnlegen, pruefeDateiKnopfVerborgen, hakenAntwortetMit, pruefeDateiKnopfGesperrt, pruefeDateiKnopfBedienbar,
  dateiAnmerkenAmHinweis, pruefeHinweisAnmerkenSichtbar, pruefeHinweisAnmerkenVerborgen,
  pruefeHinweisEntfernt, pruefeKeinHinweisEntfernt, pruefeHinweisAusserhalb, pruefeKeinHinweisAusserhalb,
  inDenDiffTabben, pfeilAbBis, taste, pruefeFokusAufZeile, anlegenAntwortetEinmal, anlegenVerzoegern, pruefeAnmerkungenBinnen,
  pruefeAnmerkungOhneHtml, sichtbarerAnmerkungstext,
  aenderungOeffnen, pruefeKopfNenntNummer, pruefeFokusAufKopf, pruefeAnzahlAenderungsfelder, pruefeAnmerkungszeileEnthaelt, abbrechen, pruefeSpeichernGesperrt,
  aenderungAntwortetEinmal, aenderungVerzoegern,
  aenderungsfeldTextSchreiben, pruefeAenderungsfeldText, aenderungsfeldSpeichern, aenderungsfeldSpeichernUndWarten, caretPosition, fokusAufKnopf, pruefeKnopfHatFokus,
  pruefeArtgruppe, pruefeArtGewaehlt, artWaehlen, artMitTastaturWaehlen, anmerkungenAufDemServer, pruefeArtAmKopf, pruefeKeineArtAmKopf,
  loeschungOeffnen, zweimalLoeschen, loeschenPerTastatur, pruefeKeineAnmerkungszeile, pruefeLoeschenGesperrt, pruefeKopfmeldung,
  loeschungAntwortetEinmal, loeschungVerzoegern, loeschungVerzoegertAntworten, loeschenErneut, pruefeLoeschenFrei,
};
