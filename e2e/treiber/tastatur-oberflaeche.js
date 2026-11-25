'use strict';
// Treiber Tastatur (R00030): der einzige Ort, der Selektoren und Tastennamen der Tastenschicht kennt; die Prüfungen der
// Bedienung sitzen hier. Die Seite selbst rechnet im Browser — der Treiber drückt Tasten und liest Fokus, DOM und Stil.
const { expect } = require('@playwright/test');

const DIFFZEILE = '#diff .df-sc tr[data-art]';
const DATEIZEILE = '#datei-zeilen .datei-zeile';
const STATUSZEILE = 'footer.statuszeile';
const HILFE = '#hilfe';
const ANSAGE = '#tasten-ansage';

/** Eine Taste ohne Modifikatoren drücken („Kürzel drücken“ der User Story). */
async function taste(page, name) {
  await page.keyboard.press(name);
}

/** Den Diff-Bereich fokussieren — der Weg, den der Mensch per Tab nimmt. */
async function inDenDiffGehen(page) {
  await page.locator('#diff .df-sc').focus();
}

/** Der Fokus als schlichte Angabe: Zeile (Nummer neu), Dateizeile (Pfad), Feld oder Rolle. */
async function fokus(page) {
  return page.evaluate(([diffzeile, dateizeile]) => {
    const aktiv = document.activeElement;
    if (!aktiv || aktiv === document.body) {
      return { art: 'niemand' };
    }
    if (aktiv.matches(diffzeile)) {
      return { art: 'diffzeile', neu: aktiv.dataset.neu, alt: aktiv.dataset.alt, zeilenart: aktiv.dataset.art };
    }
    if (aktiv.matches(dateizeile)) {
      return { art: 'dateizeile', pfad: aktiv.dataset.pfad };
    }
    if (aktiv.matches('input, textarea, select, [contenteditable="true"]')) {
      return { art: 'feld', tag: aktiv.tagName.toLowerCase(), name: aktiv.getAttribute('aria-label') || aktiv.id || '' };
    }
    return { art: 'element', tag: aktiv.tagName.toLowerCase(), klasse: String(aktiv.className), kennung: aktiv.id };
  }, [DIFFZEILE, DATEIZEILE]);
}

async function pruefeFokusDiffzeile(page, neu) {
  await expect.poll(async () => {
    const stand = await fokus(page);
    return stand.art === 'diffzeile' ? stand.neu : null;
  }, { message: `Fokus auf Diff-Zeile ${neu}`, timeout: 5000 }).toBe(String(neu));
}

async function pruefeFokusDateizeile(page, pfad) {
  await expect.poll(async () => {
    const stand = await fokus(page);
    return stand.art === 'dateizeile' ? stand.pfad : null;
  }, { message: `Fokus auf Dateizeile ${pfad}`, timeout: 5000 }).toBe(pfad);
}

async function pruefeFokusFeld(page, name) {
  await expect.poll(async () => {
    const stand = await fokus(page);
    return stand.art === 'feld' ? stand.name : null;
  }, { message: `Fokus im Feld ${name}`, timeout: 5000 }).toBe(name);
}

/** Die gewählte Dateizeile (Wahl der Liste, `aria-current`). */
async function gewaehlteDatei(page) {
  return page.locator(`${DATEIZEILE}[aria-current="true"]`).getAttribute('data-pfad');
}

async function pruefeGewaehlt(page, pfad) {
  await expect.poll(() => gewaehlteDatei(page), { message: `gewählt: ${pfad}`, timeout: 5000 }).toBe(pfad);
}

/** Zustand des Kästchens einer Dateizeile: `true`, `false` oder `gemischt`. */
async function hakenstand(page, pfad) {
  const kaestchen = page.locator(`${DATEIZEILE}[data-pfad="${pfad}"] input.haken`);
  return kaestchen.evaluate(element => (element.indeterminate ? 'gemischt' : String(element.checked)));
}

async function pruefeHaken(page, pfad, erwartet) {
  await expect.poll(() => hakenstand(page, pfad), { message: `Haken ${pfad}: ${erwartet}`, timeout: 5000 }).toBe(erwartet);
}

/** Die Zeile der Statuszeile zu einem Text — oder `null`; liefert ihre Tasten als Text. */
async function statuszeilenTasten(page, text) {
  return page.evaluate(([selektor, gesucht]) => {
    const fuss = document.querySelector(selektor);
    if (!fuss) {
      return null;
    }
    const zeile = [...fuss.querySelectorAll('span')].find(eintrag => eintrag.textContent.includes(gesucht));
    if (!zeile) {
      return null;
    }
    return [...zeile.querySelectorAll('kbd')].map(kbd => kbd.textContent).join(' ');
  }, [STATUSZEILE, text]);
}

async function pruefeStatuszeile(page, text, tasten) {
  await expect.poll(() => statuszeilenTasten(page, text), { message: `Statuszeile ${text}`, timeout: 5000 }).toBe(tasten);
}

/** Alle Texte der Statuszeile in Reihenfolge (für die Modusprüfung). */
async function statuszeileTexte(page) {
  return page.evaluate(selektor => {
    const fuss = document.querySelector(selektor);
    if (!fuss) {
      return null;
    }
    return [...fuss.querySelectorAll('span')].map(zeile => zeile.textContent.trim());
  }, STATUSZEILE);
}

async function pruefeKeinStatuszeilenEintrag(page, text) {
  await expect.poll(async () => {
    const texte = await statuszeileTexte(page);
    return Array.isArray(texte) && texte.some(zeile => zeile.includes(text));
  }, { message: `Statuszeile ohne ${text}`, timeout: 5000 }).toBe(false);
}

/** Die Hilfe: offen, ihre Gruppen und Einträge, die Markierung nicht verfügbarer Aktionen. */
async function hilfeOffen(page) {
  return page.locator(HILFE).evaluate(element => !element.hidden);
}

async function pruefeHilfeOffen(page, offen) {
  await expect.poll(() => hilfeOffen(page), { message: `Hilfe ${offen ? 'offen' : 'zu'}`, timeout: 5000 }).toBe(offen);
}

async function hilfeGruppen(page) {
  return page.evaluate(selektor => {
    const dialog = document.querySelector(selektor);
    return [...dialog.querySelectorAll('[data-gruppe]')].map(gruppe => ({
      titel: gruppe.querySelector('h3').textContent,
      eintraege: [...gruppe.querySelectorAll('li')].map(eintrag => ({
        text: eintrag.textContent,
        verfuegbar: eintrag.getAttribute('data-verfuegbar') !== 'false',
      })),
    }));
  }, HILFE);
}

async function pruefeHilfeNichtVerfuegbar(page, text) {
  const gruppen = await hilfeGruppen(page);
  const eintrag = gruppen.flatMap(gruppe => gruppe.eintraege).find(e => e.text.includes(text));
  expect(eintrag, `Hilfe-Eintrag ${text}`).toBeTruthy();
  expect(eintrag.verfuegbar, `${text} nicht verfügbar`).toBe(false);
}

/** `aria-keyshortcuts`, der sichtbare Hinweis und der zugängliche Name eines Bedienelements. */
async function hinweis(page, selektor) {
  return page.locator(selektor).first().evaluate(element => {
    const kbd = element.querySelector('kbd');
    return {
      aria: element.getAttribute('aria-keyshortcuts'),
      kbd: kbd ? kbd.textContent : null,
      kbdVerborgen: kbd ? kbd.getAttribute('aria-hidden') === 'true' : null,
      name: element.getAttribute('aria-label') || element.textContent.trim(),
    };
  });
}

/** Berechneter Fokusring: Breite, Stil und Farbe von `outline` bzw. `box-shadow`. */
async function fokusring(page, selektor) {
  return page.locator(selektor).first().evaluate(element => {
    const stil = getComputedStyle(element);
    return {
      outlineBreite: parseFloat(stil.outlineWidth) || 0,
      outlineStil: stil.outlineStyle,
      outlineFarbe: stil.outlineColor,
      schatten: stil.boxShadow,
      hintergrund: stil.backgroundColor,
    };
  });
}

/** Der Text der höflichen Live-Region der Kürzel-Aktionen. */
async function ansage(page) {
  return page.locator(ANSAGE).textContent();
}

async function pruefeAnsage(page, text) {
  await expect.poll(() => ansage(page), { message: `Ansage: ${text}`, timeout: 5000 }).toBe(text);
}

async function pruefeAnsageLeer(page) {
  await expect.poll(() => ansage(page), { message: 'keine Ansage', timeout: 5000 }).toBe('');
}

/** Wie viele Diff-Zeilen die Ansicht zeigt und wie viele Abschnittsköpfe sie hat. */
async function diffZeilen(page) {
  return page.evaluate(selektor => {
    const zeilen = [...document.querySelectorAll(selektor)];
    return {
      anzahl: zeilen.length,
      abschnitte: zeilen.filter(zeile => zeile.dataset.art === 'kopf').length,
      ersteZeileNeu: (zeilen.find(zeile => zeile.dataset.art !== 'kopf') || {}).dataset?.neu || null,
    };
  }, DIFFZEILE);
}

/** Wartet, bis der Diff der Datei gezeichnet ist (Pfad im Kopf, mindestens eine Zeile). */
async function aufDiffWarten(page, pfad) {
  await expect(page.locator('#diff .diff-pfad')).toHaveText(pfad, { timeout: 5000 });
  await expect(page.locator(DIFFZEILE).first()).toBeVisible({ timeout: 5000 });
}

/** Zustand eines Kästchen-/Radio-Schalters. */
async function pruefeSchalter(page, selektor, erwartet) {
  await expect(page.locator(selektor)).toHaveJSProperty('checked', erwartet);
}

async function pruefeUmbruch(page, an) {
  await pruefeSchalter(page, '#diff .umbruch-schalter', an);
}

async function pruefeLeerraum(page, an) {
  await pruefeSchalter(page, '#diff .leerraum-schalter', an);
}

/** Die gewählte Diff-Ansicht (`aenderungen` oder `ganz`). */
async function ansichtWert(page) {
  return page.evaluate(() => {
    const gewaehlt = [...document.querySelectorAll('#diff input[name="diffansicht"]')].find(feld => feld.checked);
    return gewaehlt ? gewaehlt.value : null;
  });
}

async function pruefeAnsicht(page, wert) {
  await expect.poll(() => ansichtWert(page), { message: `Ansicht ${wert}`, timeout: 5000 }).toBe(wert);
}

/** Der gewählte Commit (Hash) aus der Commit-Leiste. */
async function gewaehlterCommit(page) {
  return page.evaluate(() => {
    const zeile = document.querySelector('#commit-liste .commit-zeile[aria-current="true"]');
    return zeile ? zeile.dataset.hash : null;
  });
}

async function pruefeCommit(page, hash) {
  await expect.poll(() => gewaehlterCommit(page), { message: `Commit ${hash}`, timeout: 5000 }).toBe(hash);
}

async function keineDateiGewaehlt(page) {
  return page.locator(`${DATEIZEILE}[aria-current="true"]`).count().then(anzahl => anzahl === 0);
}

async function beobachteteTasten(page) {
  return page.evaluate(() => window.__tasten || []);
}

/** Die Dateiliste in den Fokus bringen — der Weg per Tab: das erste Kästchen. */
async function inDieDateiliste(page) {
  await page.locator('#datei-zeilen input.haken').first().focus();
}

/** Fokus nirgends (Dokumentkörper) — für Fälle ohne Anmerkungskopf. */
async function fokusAufSeite(page) {
  await page.evaluate(() => document.activeElement.blur());
}

/** Der Fokus steht auf dem `stelle`-ten Aufklapp-Knopf einer Lücke (0-basiert, Schritt-Knopf). */
async function pruefeFokusLuecke(page, stelle) {
  await expect.poll(() => page.evaluate(plaetze => {
    const knoepfe = [...document.querySelectorAll('#diff .df-sc .dz-l-auf:not([data-ganz])')];
    return knoepfe.indexOf(document.activeElement) === plaetze;
  }, stelle), { message: `Fokus auf Lücke ${stelle}`, timeout: 5000 }).toBe(true);
}

/** Die Texte der Anmerkungszeilen unter einer Diff-Zeile (ohne Feldzeilen), in Reihenfolge. */
async function anmerkungstexteUnter(page, ziel) {
  return page.evaluate(([selektor, neu]) => {
    const zeile = [...document.querySelectorAll(selektor)].find(element => element.dataset.art && element.dataset.neu === String(neu));
    const texte = [];
    let naechste = zeile ? zeile.nextElementSibling : null;
    while (naechste && !naechste.hasAttribute('data-art')) {
      if (naechste.classList.contains('anm')) {
        texte.push(naechste.querySelector('.anm-text').textContent);
      }
      naechste = naechste.nextElementSibling;
    }
    return texte;
  }, [DIFFZEILE, ziel.neu]);
}

async function pruefeAnmerkungstexteUnter(page, ziel, texte) {
  await expect.poll(() => anmerkungstexteUnter(page, ziel), { message: `Anmerkungen unter ${JSON.stringify(ziel)}`, timeout: 5000 }).toEqual(texte);
}

/** Zahl der offenen Änderungsfelder. */
async function pruefeAenderungsfelder(page, anzahl) {
  await expect(page.locator('#diff tr.anm-aendern')).toHaveCount(anzahl);
}

/** Das offene Änderungsfeld trägt den vorhandenen Text und hat den Fokus. */
async function pruefeAenderungsfeld(page, text) {
  const feld = page.locator('#diff tr.anm-aendern textarea');
  await expect(feld).toHaveCount(1);
  await expect(feld).toHaveValue(text);
  await expect(feld).toBeFocused();
}

module.exports = {
  taste,
  aufDiffWarten,
  inDenDiffGehen,
  fokus,
  pruefeFokusDiffzeile,
  pruefeFokusDateizeile,
  pruefeFokusFeld,
  gewaehlteDatei,
  pruefeGewaehlt,
  hakenstand,
  pruefeHaken,
  statuszeilenTasten,
  pruefeStatuszeile,
  statuszeileTexte,
  pruefeKeinStatuszeilenEintrag,
  hilfeOffen,
  pruefeHilfeOffen,
  hilfeGruppen,
  pruefeHilfeNichtVerfuegbar,
  hinweis,
  fokusring,
  ansage,
  pruefeAnsage,
  pruefeAnsageLeer,
  diffZeilen,
  pruefeSchalter,
  pruefeUmbruch,
  pruefeLeerraum,
  pruefeAnsicht,
  pruefeCommit,
  keineDateiGewaehlt,
  beobachteteTasten,
  inDieDateiliste,
  fokusAufSeite,
  pruefeFokusLuecke,
  pruefeAenderungsfeld,
  pruefeAenderungsfelder,
  pruefeAnmerkungstexteUnter,
};