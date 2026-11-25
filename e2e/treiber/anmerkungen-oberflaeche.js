'use strict';
// Treiber Oberfläche der Zeilenanmerkungen (R00010): der einzige Ort, der Selektoren, Rollen und Antworten von /api/anmerkungen im Browser kennt.
const { expect } = require('@playwright/test');

const ROLLBEREICH = '#diff .df-sc';
const DIFFZEILE = '#diff .dz tr[data-art]';
const ANMERKUNGSZEILE = '#diff .dz tr.anm';
const FELDZEILE = '#diff .dz tr.anm-feld, #diff .dz tr.anm-aendern';
const HINWEIS_ENTFERNT = '#diff .anmerkung-hinweis';
const HINWEIS_AUSSERHALB = '#diff .anmerkungen-ausserhalb';
const ANLEGEN = '**/api/anmerkungen';
const AENDERUNG = /\/api\/anmerkungen\/\d+$/;
const LOESCHUNG = /\/api\/anmerkungen\/\d+\/loeschen$/;
const VERZOEGERUNG_MS = 1500;

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
  return page.locator(ROLLBEREICH).getByRole('textbox', { name, exact: true });
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

async function speichern(page, name) {
  await feldzeile(page, name).getByRole('button', { name: 'Speichern', exact: true }).click();
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

async function pruefeAnmerkungenUnter(page, ziel, erwartet) {
  await expect.poll(() => anmerkungenUnter(page, ziel), `Anmerkungen unter ${JSON.stringify(ziel)}`).toEqual(erwartet);
}

async function pruefeAnzahlAnmerkungszeilen(page, anzahl) {
  await expect(page.locator(ANMERKUNGSZEILE)).toHaveCount(anzahl);
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

/** Fokus auf den Diff-Bereich per Tab vom Umschalter „Umbruch“ aus — der Bereich ist der nächste Tab-Stopp. */
async function inDenDiffTabben(page) {
  await page.locator('#diff .umbruch-schalter').focus();
  await page.keyboard.press('Tab');
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

/** Führt `waehlen` aus und misst bis zu dem Bild, in dem Zeile `letzteNeu`, die Anmerkung an `anmerkungNeu` und genau `anzahl` Anmerkungszeilen stehen. */
async function pruefeAnmerkungenBinnen(page, waehlen, { letzteNeu, anmerkungNeu, anzahl }, fristMs) {
  const klickUmMs = Date.now();
  await waehlen();
  await page.waitForFunction(([diffzeileSelektor, anmerkungSelektor, letzte, an, erwartet]) => {
    const letzteZeile = document.querySelector(`${diffzeileSelektor}[data-neu="${letzte}"]`);
    const zeileMitAnmerkung = document.querySelector(`${diffzeileSelektor}[data-neu="${an}"]`);
    const anmerkungDarunter = zeileMitAnmerkung && zeileMitAnmerkung.nextElementSibling && zeileMitAnmerkung.nextElementSibling.matches(anmerkungSelektor);
    return letzteZeile !== null && anmerkungDarunter && document.querySelectorAll(anmerkungSelektor).length === erwartet;
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
  zeileAnklicken, zeileDoppeltAnklicken, pruefeAnzahlFelder, pruefeFeldtext, pruefeFeldOffenMitFokus, textSchreiben, speichern, zweimalSpeichern, pruefeFeldZu, pruefeKeinFeld, pruefeFeldmeldung,
  pruefeAnmerkungenUnter, pruefeAnzahlAnmerkungszeilen, pruefeAnmerkungszeilenSindKeineDiffzeilen,
  pruefeHinweisEntfernt, pruefeKeinHinweisEntfernt, pruefeHinweisAusserhalb, pruefeKeinHinweisAusserhalb,
  inDenDiffTabben, pfeilAbBis, taste, pruefeFokusAufZeile, anlegenAntwortetEinmal, anlegenVerzoegern, pruefeAnmerkungenBinnen,
  pruefeAnmerkungOhneHtml, sichtbarerAnmerkungstext,
  aenderungOeffnen, pruefeKopfNenntNummer, pruefeFokusAufKopf, pruefeAnzahlAenderungsfelder, pruefeAnmerkungszeileEnthaelt, abbrechen, pruefeSpeichernGesperrt,
  aenderungAntwortetEinmal, aenderungVerzoegern,
  aenderungsfeldTextSchreiben, pruefeAenderungsfeldText, aenderungsfeldSpeichern, caretPosition, fokusAufKnopf, pruefeKnopfHatFokus,
  loeschungOeffnen, zweimalLoeschen, loeschenPerTastatur, pruefeKeineAnmerkungszeile, pruefeLoeschenGesperrt, pruefeKopfmeldung,
  loeschungAntwortetEinmal, loeschungVerzoegern, loeschungVerzoegertAntworten, loeschenErneut, pruefeLoeschenFrei,
};
