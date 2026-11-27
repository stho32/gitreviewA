'use strict';
// Treiber Oberfläche „Fester Rahmen und getrennte Rollbereiche“ (R00033): der einzige Ort, der die Selektoren von Kopf,
// Werkzeugzeilen, Dateiliste, Diff-Bereich und Statuszeile kennt und die Geometrie und den Bildlauf der Seite misst.
// Die Prüfungen der Oberfläche sitzen hier; die Testsprache darüber kennt nur die Fachwörter.
const { expect } = require('@playwright/test');

const KOPF = 'header.kz';
const RAHMEN = '.gr-ansicht';
const COMMIT_ZEILE = '#commit-zeile';
const DATEIEN_KOPF = '#dateiliste .dateien-kopf';
const DATEIEN_WERKZEUGE = '#dateiliste .dateien-werkzeuge';
const LISTE = '#datei-zeilen';
const SEITENLEISTE = '#seitenleiste';
const DIFF_KOPF = '#diff .diff-kopf';
const DIFF_BEREICH = '#diff';
const DIFF = '#diff .df-sc';
const STATUSZEILE = '.statuszeile';
const DATEIZEILE = '#datei-zeilen .datei-zeile';
const TRENNER = '#diff [role="separator"], .gr-ansicht [role="separator"]';
const EINKLAPPEN = '#diff .gr-einklappen, .gr-ansicht .gr-einklappen';
const ANM_ZELLE = '#diff .anm-zelle';
const ANM_DATEI_BEREICH = '#diff .anm-datei-bereich';

/** Der Bildlauf der Seite selbst: Überhang heißt, die Seite scrollt (R00033: „Seite scrollt nicht“ = kein Überhang). */
function seite(page) {
  return page.evaluate(() => ({
    scrollTop: document.scrollingElement.scrollTop,
    scrollHeight: document.scrollingElement.scrollHeight,
    innerHeight: window.innerHeight,
    ueberhang: document.scrollingElement.scrollHeight - window.innerHeight,
  }));
}

/** Der Rollstand eines Bereichs: Versatz, Überhang (scrollbar?) und die Überlauf-Regel. */
function rollstand(page, selektor) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    const stil = getComputedStyle(element);
    return {
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      ueberhang: element.scrollHeight - element.clientHeight,
      overflowY: stil.overflowY,
      overflowX: stil.overflowX,
    };
  }, selektor);
}

function setzeRollversatz(page, selektor, wert) {
  return page.evaluate(([sel, versatz]) => {
    const element = document.querySelector(sel);
    if (element) {
      element.scrollTop = versatz;
    }
  }, [selektor, wert]);
}

/** Die oberste sichtbare Dateizeile der Liste: ihr Rang unter den Dateizeilen und ihr Pfad (`data-pfad`, ohne Ordner- und
    Gruppenzeilen). Eine Zeile gilt als sichtbar, wenn ihre Unterkante unter der Innenkante der Liste liegt — die oberste
    angeschnittene Zeile zählt mit. Die Messgröße für „der Bildlauf bleibt“ in der Liste (R00042 Kriterium 6, PO Zeile 282):
    die Zeilenhöhe wechselt mit der Breite, weil Namen umbrechen (R00056), ein Pixelwert also nicht bleibt. */
function obersteSichtbareDatei(page) {
  return page.evaluate(sel => {
    const liste = document.querySelector(sel);
    if (!liste) {
      return null;
    }
    const innenOben = liste.getBoundingClientRect().top + parseFloat(getComputedStyle(liste).borderTopWidth || '0');
    const zeilen = [...document.querySelectorAll(`${sel} .datei-zeile`)];
    for (let rang = 0; rang < zeilen.length; rang += 1) {
      if (zeilen[rang].getBoundingClientRect().bottom > innenOben + 0.5) {
        return { rang, pfad: zeilen[rang].dataset.pfad };
      }
    }
    return null;
  }, LISTE);
}

/** Rollt die Liste so, dass die Dateizeile mit diesem Rang (0-basiert, nur Dateizeilen) oben steht — die Vorbereitung für
    „die Liste ist gescrollt“ (R00042 Kriterium 6). Liefert den neuen Versatz. */
function setzeObersteDatei(page, rang) {
  return page.evaluate(([sel, rang1]) => {
    const liste = document.querySelector(sel);
    if (!liste) {
      return null;
    }
    const zeilen = [...document.querySelectorAll(`${sel} .datei-zeile`)];
    if (rang1 >= zeilen.length) {
      return null;
    }
    const innenOben = liste.getBoundingClientRect().top + parseFloat(getComputedStyle(liste).borderTopWidth || '0');
    liste.scrollTop += zeilen[rang1].getBoundingClientRect().top - innenOben;
    return liste.scrollTop;
  }, [LISTE, rang]);
}

/** Die Lage eines Elements im Fenster (links, Oberkante und Unterkante), auf Hundertstel gerundet. */
function lage(page, selektor) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    const rechteck = element.getBoundingClientRect();
    return {
      x: Math.round(rechteck.x * 100) / 100,
      y: Math.round(rechteck.y * 100) / 100,
      rechts: Math.round(rechteck.right * 100) / 100,
      unten: Math.round(rechteck.bottom * 100) / 100,
      hoehe: Math.round(rechteck.height * 100) / 100,
    };
  }, selektor);
}

/** Die Lage aller stehenden Teile in einem Zug — der Vergleich vor und nach einem Bildlauf belegt, dass sie stehen. */
function standbild(page) {
  return page.evaluate(selektoren => {
    const teile = {};
    for (const [name, selektor] of Object.entries(selektoren)) {
      const element = document.querySelector(selektor);
      if (!element) {
        teile[name] = null;
        continue;
      }
      const rechteck = element.getBoundingClientRect();
      teile[name] = { y: Math.round(rechteck.y * 100) / 100, unten: Math.round(rechteck.bottom * 100) / 100, hoehe: Math.round(rechteck.height * 100) / 100 };
    }
    return teile;
  }, { kopf: KOPF, commitZeile: COMMIT_ZEILE, dateienKopf: DATEIEN_KOPF, dateienWerkzeuge: DATEIEN_WERKZEUGE, liste: LISTE, diffKopf: DIFF_KOPF, diff: DIFF });
}

/** Die drei stehenden Teile, die ein Bildlauf nicht bewegen darf (Kopf, Commit-Zeile, Werkzeugzeilen) samt Dateiliste. */
function stehendeTeile(bild) {
  return { kopf: bild.kopf, commitZeile: bild.commitZeile, dateienKopf: bild.dateienKopf, dateienWerkzeuge: bild.dateienWerkzeuge, liste: bild.liste };
}

/** Liegt die Zeile ganz im sichtbaren Bereich ihres Rollbereichs? */
function ganzImRollbereich(page, zeileSelektor, rollSelektor) {
  return page.evaluate(([z, r]) => {
    const zeile = document.querySelector(z);
    const roll = document.querySelector(r);
    if (!zeile || !roll) {
      return null;
    }
    const zr = zeile.getBoundingClientRect();
    const rr = roll.getBoundingClientRect();
    return zr.top >= rr.top - 1 && zr.bottom <= rr.bottom + 1;
  }, [zeileSelektor, rollSelektor]);
}

/** Der Abstand der Zeilenunterkante zur Unterkante des Rollbereichs (0 = die Zeile sitzt genau am unteren Rand). */
function abstandZumRand(page, zeileSelektor, rollSelektor) {
  return page.evaluate(([z, r]) => {
    const zeile = document.querySelector(z);
    const roll = document.querySelector(r);
    if (!zeile || !roll) {
      return null;
    }
    const zr = zeile.getBoundingClientRect();
    const rr = roll.getBoundingClientRect();
    return { oben: Math.round((zr.top - rr.top) * 100) / 100, unten: Math.round((rr.bottom - zr.bottom) * 100) / 100 };
  }, [zeileSelektor, rollSelektor]);
}

/** Die Lage der gewählten Zeile, der stehenden Teile und die Bildläufe in einem Zug. */
function lageDerWahl(page) {
  return page.evaluate(() => {
    const zeile = document.querySelector('#datei-zeilen .datei-zeile[aria-current="true"]');
    const liste = document.querySelector('#datei-zeilen');
    const zeileRechteck = zeile ? zeile.getBoundingClientRect() : null;
    const listeRechteck = liste ? liste.getBoundingClientRect() : null;
    return {
      pfad: zeile ? zeile.dataset.pfad : null,
      ganzImBlick: Boolean(zeileRechteck && listeRechteck && zeileRechteck.top >= listeRechteck.top - 1 && zeileRechteck.bottom <= listeRechteck.bottom + 1),
      listenVersatz: liste ? liste.scrollTop : null,
      diffVersatz: document.querySelector('#diff .df-sc').scrollTop,
      seitenVersatz: document.scrollingElement.scrollTop,
    };
  });
}

/** Masse des Diff-Bereichs und der Anmerkungszellen: sichtbare Höhe des Rollbereichs, Zahl und Lage der letzten Zelle,
    Höhe des Datei-Anmerkungsbereichs und Seitenüberhang (Befund B1: feste Kinder dürfen den Diff nicht verdrängen). */
function masseDerAnmerkungen(page) {
  return page.evaluate(([zelle, bereich]) => {
    const sc = document.querySelector('#diff .df-sc');
    const zellen = document.querySelectorAll(zelle);
    const letzte = zellen.length > 0 ? zellen[zellen.length - 1] : null;
    const bereichElement = document.querySelector(bereich);
    const seite = document.scrollingElement;
    return {
      diffClientHoehe: sc ? sc.clientHeight : null,
      anmZellen: zellen.length,
      letzteUnten: letzte ? Math.round(letzte.getBoundingClientRect().bottom) : null,
      fensterHoehe: window.innerHeight,
      anmBereichHoehe: bereichElement ? Math.round(bereichElement.getBoundingClientRect().height) : 0,
      seitenUeberhang: seite.scrollHeight - window.innerHeight,
    };
  }, [ANM_ZELLE, ANM_DATEI_BEREICH]);
}

/* ── Prüfungen ── */

/** Der Diff-Rollbereich bleibt benutzbar: er hat sichtbare Höhe, auch wenn über ihm Anmerkungen stehen (Befund B1). */
async function pruefeDiffRollbereichBenutzbar(page) {
  const masse = await masseDerAnmerkungen(page);
  expect(masse.diffClientHoehe, `Diff-Rollbereich benutzbar — ${JSON.stringify(masse)}`).toBeGreaterThan(0);
}

/** Die letzte Anmerkungszelle liegt ganz im Fenster — die Seite selbst scrollt nicht (Abnahme-Probe B1). */
async function pruefeLetzteAnmerkungImFenster(page) {
  const masse = await masseDerAnmerkungen(page);
  expect(masse.anmZellen, 'es stehen Anmerkungszellen').toBeGreaterThan(0);
  expect(masse.letzteUnten, `letzte Anmerkung im Fenster — ${JSON.stringify(masse)}`).toBeLessThanOrEqual(masse.fensterHoehe);
  expect(masse.seitenUeberhang, 'die Seite selbst scrollt nicht').toBeLessThanOrEqual(0);
}

/** Die letzte Anmerkungszelle ist erreichbar: erst in den Blick gerollt, liegt sie dann ganz im Fenster (Befund B1). */
async function pruefeLetzteAnmerkungErreichbar(page) {
  await page.locator(ANM_ZELLE).last().scrollIntoViewIfNeeded();
  await pruefeLetzteAnmerkungImFenster(page);
}

/** Die Seite selbst hat keinen Bildlauf. */
async function pruefeKeinSeitenbildlauf(page) {
  const stand = await seite(page);
  expect(stand.ueberhang, `Seitenüberhang (scrollHeight ${stand.scrollHeight}, innerHeight ${stand.innerHeight})`).toBeLessThanOrEqual(0);
}

/** Die Seite scrollt (Rückfall unter 590 px: „die Seite scrollt wie bisher“). */
async function pruefeSeitenbildlauf(page) {
  const stand = await seite(page);
  expect(stand.ueberhang, `Seitenüberhang (scrollHeight ${stand.scrollHeight}, innerHeight ${stand.innerHeight})`).toBeGreaterThan(0);
}

/** Ein Bereich ist scrollbar und hat eine eigene Bildlaufleiste. */
async function pruefeRollbereich(page, selektor, name) {
  const stand = await rollstand(page, selektor);
  expect(stand, `${name} vorhanden`).not.toBeNull();
  expect(stand.ueberhang, `${name}: Überhang (scrollHeight ${stand.scrollHeight}, clientHeight ${stand.clientHeight})`).toBeGreaterThan(0);
  expect(stand.overflowY, `${name}: senkrechte Überlauf-Regel`).toMatch(/^(auto|scroll)$/);
}

/** Ein Bereich ist kein Rollbereich (Rückfall: eine Spalte, die Seite scrollt). */
async function pruefeKeinRollbereich(page, selektor, name) {
  const stand = await rollstand(page, selektor);
  expect(stand, `${name} vorhanden`).not.toBeNull();
  expect(stand.ueberhang, `${name}: kein Überhang (scrollHeight ${stand.scrollHeight}, clientHeight ${stand.clientHeight})`).toBeLessThanOrEqual(0);
}

/** Die stehenden Teile haben sich nicht bewegt. */
function pruefeUnveraendert(vorher, nachher, name) {
  expect(nachher, `${name} unverändert`).toEqual(vorher);
}

/** Der Bildlauf eines Bereichs hat sich nicht geändert. */
function pruefeVersatzGleich(vorher, nachher, name) {
  expect(nachher, `${name}: Bildlauf unverändert`).toBe(vorher);
}

/** Der Bildlauf eines Bereichs hat sich geändert. */
function pruefeVersatzGeaendert(vorher, nachher, name) {
  expect(nachher, `${name}: Bildlauf hat sich bewegt`).not.toBe(vorher);
}

/** Der Diff beginnt oben. */
async function pruefeDiffOben(page) {
  const stand = await rollstand(page, DIFF);
  expect(stand.scrollTop, 'Diff-Bildlauf am Anfang').toBe(0);
}

/**
 * Trägt der Aufbau die verlangte Fensterbreite? Eine neue Größe kommt asynchron an, und die Mediengrenze des CSS greift
 * erst mit dem nächsten Zeichnen — bis dahin steht im DOM die Lage (und der Zustand) der alten Größe, und die nächste
 * Prüfung träfe eine Aussage über die alte Größe. Gemessen wird deshalb gegen die **verlangte** Breite und nicht gegen
 * das, was die Seite gerade über sich selbst sagt: ab 590 px (die eine Quelle `passtZweiSpaltig` in `trenner-werte.js`)
 * stehen Seitenleiste und Diff nebeneinander, darunter liegt die Dateiliste über dem Diff; Trennzug und Ausklapp-Knopf
 * gehören nur in den zweispaltigen Aufbau; die Seitenleiste folgt ihrem Zustand (`hidden` ⇔ unsichtbar), und die
 * Einklapp-Stellung am Rahmen deckt sich mit dem Knopf. Jede Zeile, die noch zur alten Größe gehört, lässt die Messung
 * scheitern — gepollt wird, bis beide Seiten wieder zusammenpassen.
 */
function aufbauFolgtBreite(page, breite) {
  return page.evaluate(([leisteSelektor, diffSelektor, rahmenSelektor, knopfSelektor, trennerSelektor, erwarteteBreite]) => {
    const leiste = document.querySelector(leisteSelektor);
    const diff = document.querySelector(diffSelektor);
    const rahmen = document.querySelector(rahmenSelektor);
    const knopf = document.querySelector(knopfSelektor);
    const trenner = document.querySelector(trennerSelektor);
    if (!leiste || !diff || !rahmen) {
      return false;
    }
    const sichtbar = leiste.getClientRects().length > 0;
    const kasten = leiste.getBoundingClientRect();
    const ziel = diff.getBoundingClientRect();
    if (window.gitreviewaTrennerWerte.passtZweiSpaltig(erwarteteBreite)) {
      if (!knopf || !trenner) {
        return false;
      }
      const eingeklappt = knopf.getAttribute('aria-expanded') === 'false';
      return leiste.hidden === eingeklappt
        && sichtbar === !eingeklappt
        && rahmen.classList.contains('gr-eingeklappt') === eingeklappt
        && kasten.right <= ziel.left + 1
        && kasten.top <= ziel.top + 1;
    }
    return !knopf && !trenner && !leiste.hidden && !rahmen.classList.contains('gr-eingeklappt')
      && sichtbar && kasten.bottom <= ziel.top + 1;
  }, [SEITENLEISTE, DIFF_BEREICH, RAHMEN, EINKLAPPEN, TRENNER, breite]);
}

/** Nach dem Setzen einer Fenstergröße warten, bis der Aufbau die verlangte Größe trägt — kein Zustand von gestern, keine
    feste Zeit; die Prüfungen danach lesen damit einen Zustand, der zur neuen Größe gehört. */
async function warteAufAufbau(page, breite) {
  await expect.poll(() => aufbauFolgtBreite(page, breite), `der Aufbau folgt der Fensterbreite (${breite} px)`).toBe(true);
}

/** Es gibt keinen Trenner und keinen Ausklapp-Knopf (Rückfall unter 590 px, R00034/R00035). */
async function pruefeKeinTrennerKeinEinklappen(page) {
  await expect(page.locator(TRENNER), 'Trenner').toHaveCount(0);
  await expect(page.locator(EINKLAPPEN), 'Ausklapp-Knopf').toHaveCount(0);
}

/** Die Dateiliste steht über dem Diff (eine Spalte). */
async function pruefeEineSpalte(page) {
  const liste = await lage(page, '#dateiliste');
  const diff = await lage(page, '#diff');
  expect(liste, 'Dateiliste vorhanden').not.toBeNull();
  expect(diff, 'Diff-Bereich vorhanden').not.toBeNull();
  expect(liste.unten, `Dateiliste (unten ${liste.unten}) über dem Diff (oben ${diff.y})`).toBeLessThanOrEqual(diff.y + 1);
}

/** Die Seitenleiste steht links neben dem Diff (zwei Spalten). */
async function pruefeZweiSpalten(page) {
  const links = await lage(page, '.gr-links');
  const diff = await lage(page, '#diff');
  expect(links, 'Seitenleiste vorhanden').not.toBeNull();
  expect(diff, 'Diff-Bereich vorhanden').not.toBeNull();
  expect(links.rechts, `Seitenleiste (rechts ${links.rechts}) endet vor dem Diff-Bereich (links ${diff.x})`).toBeLessThanOrEqual(diff.x + 1);
  expect(links.y, `Seitenleiste (oben ${links.y}) steht auf Höhe des Diff-Bereichs (oben ${diff.y})`).toBeLessThanOrEqual(diff.y + 1);
}

/** Bringt die letzte Lücke in die Mitte des Diff-Rollbereichs (Vorbereitung des Tests) und liefert den Bildlauf danach.
    Der Test selbst darf den Bildlauf nicht bewegen — deshalb steht die Lücke vor dem Klick schon im Blick. */
async function letzteLueckeInDenBlick(page) {
  await page.evaluate(() => {
    const luecken = document.querySelectorAll('#diff .df-sc .dz-l');
    luecken[luecken.length - 1].scrollIntoView({ block: 'center' });
  });
  return (await rollstand(page, DIFF)).scrollTop;
}

module.exports = {
  KOPF, COMMIT_ZEILE, DATEIEN_KOPF, DATEIEN_WERKZEUGE, LISTE, DIFF_KOPF, DIFF, STATUSZEILE, DATEIZEILE,
  seite, rollstand, setzeRollversatz, lage, obersteSichtbareDatei, setzeObersteDatei, standbild, stehendeTeile, ganzImRollbereich, abstandZumRand, lageDerWahl, letzteLueckeInDenBlick,
  masseDerAnmerkungen, pruefeDiffRollbereichBenutzbar, pruefeLetzteAnmerkungImFenster, pruefeLetzteAnmerkungErreichbar,
  pruefeKeinSeitenbildlauf, pruefeSeitenbildlauf, pruefeRollbereich, pruefeKeinRollbereich, pruefeUnveraendert,
  pruefeVersatzGleich, pruefeVersatzGeaendert, pruefeDiffOben, pruefeKeinTrennerKeinEinklappen, pruefeEineSpalte, pruefeZweiSpalten,
  aufbauFolgtBreite, warteAufAufbau,
};
