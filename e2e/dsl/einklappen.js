'use strict';
// Testsprache „Seitenleiste ein- und ausklappen“ (R00035): baut auf der Sprache der Breite (R00034) und der Seitenleiste (R00033)
// auf — Repos S/Z, Anzeigeverfahren, Bildlauf, offenes Notizfeld, Zählung der Diff-Anfragen — und ergänzt die Fachwörter des
// Einklappens: der Knopf am Trenner, der Streifen, der Zustand, der Fokus und die Tab-Reihenfolge. Die Treiber darunter kennen
// Seite, Prozess, git, Tasten und Selektoren.
const { test: basis, expect } = require('./breite.js');
const einkl = require('../treiber/einklappen-oberflaeche.js');

function einklappenSprache(seit, page) {
  return Object.assign({}, seit, {
    /* ── Der Knopf am Trenner ── */
    knopfBetatigen: () => einkl.betatigen(page),
    tasteB: () => einkl.tasteB(page),
    knopf: () => einkl.knopf(page),
    knopfAngaben: () => einkl.knopfAngaben(page),
    knopfPruefen: erwartet => einkl.pruefeKnopf(page, erwartet),
    knopfAnDerGrenze: () => einkl.pruefeKnopfAnDerGrenze(page),
    fokusringPruefen: () => einkl.pruefeFokusUndRing(page),
    fokusVorgaengerDesTrenners: () => einkl.fokusVorgaengerDesTrenners(page),
    tabVomKopf: () => einkl.tabVomKopf(page),
    hilfeOeffnen: () => einkl.hilfeOeffnen(page),
    hilfeEintraege: () => einkl.hilfeEintraege(page),
    fortschritt: () => page.locator('#kopf-fortschritt .haken-zaehler').textContent(),
    sucheFokussieren: () => page.locator('#diff-suche').focus(),
    suchfeldWert: () => page.locator('#diff-suche').inputValue(),
    fokusAufKnopf: async () => {
      const angaben = await einkl.knopfAngaben(page);
      if (!angaben || !angaben.fokussiert) {
        throw new Error(`der Fokus steht nicht auf dem Ausklapp-Knopf: ${JSON.stringify(angaben)}`);
      }
    },

    /* ── Der Zustand ── */
    ausgeklappt: () => einkl.pruefeZustand(page, false),
    eingeklappt: () => einkl.pruefeZustand(page, true),
    zustand: async () => (await einkl.knopfAngaben(page)).erweitert,

    /* ── Die Seitenleiste, der Streifen und die Breite ── */
    seitenleisteVerborgen: () => einkl.pruefeSeitenleisteVerborgen(page),
    seitenleisteSichtbar: () => einkl.pruefeSeitenleisteSichtbar(page),
    streifen: () => einkl.streifenAngaben(page),
    streifenPruefen: () => einkl.pruefeStreifen(page),
    grenzlage: () => einkl.grenzlage(page),
    volleBreite: () => einkl.pruefeVolleBreite(page),
    diffBreiter: vorher => einkl.pruefeDiffBreiter(page, vorher),
    keinTrennzug: () => einkl.pruefeKeinTrennzug(page),
  });
}

const test = basis.extend({
  // eslint-disable-next-line no-empty-pattern
  einklappen: async ({ breite, page }, verwenden) => {
    await verwenden(einklappenSprache(breite, page));
  },
});

module.exports = { test, expect };