'use strict';
// Testsprache „Breite der Seitenleiste ziehen“ (R00034): baut auf der Sprache von R00033 auf (Repos S/Z, Modus, Ansicht,
// Anordnung, Bildlauf, Suche) und ergänzt die Fachwörter des Trennzugs — Breite, Ziehen, Doppelklick, die ARIA-Angaben und
// das Neuladen. Die Treiber darunter kennen Seite, Prozess, git, Tasten und Selektoren.
const { test: basis, expect } = require('./seitenleiste.js');
const trenner = require('../treiber/trenner-oberflaeche.js');
const oberflaeche = require('../treiber/oberflaeche.js');

function breiteSprache(seit, page) {
  return Object.assign({}, seit, {
    /* ── Breite lesen und setzen ── */
    breite: () => trenner.breiteDerSeitenleiste(page),
    breiteIst: erwartet => trenner.pruefeBreite(page, erwartet),
    lage: () => trenner.lageSeitenleiste(page),
    setzeBreite: wert => page.evaluate(breite => window.gitreviewaBreite.setzen(breite), wert),

    /* ── Trenner ── */
    trennerVorhanden: () => trenner.trennerVorhanden(page),
    trennerAngaben: () => trenner.trennerAngaben(page),
    trennerAnDerGrenze: () => trenner.pruefeTrennerAnDerGrenze(page),
    trennerAria: erwartet => trenner.pruefeTrennerAria(page, erwartet),
    ziehen: (deltaX, optionen) => trenner.ziehen(page, deltaX, optionen),
    doppelklick: () => trenner.doppelklick(page),
    fokusAufTrenner: () => trenner.fokusAufTrenner(page),
    fokussiereTrenner: () => trenner.fokussiereTrenner(page),
    fokusring: () => trenner.fokusring(page),
    fokusringSichtbar: async () => {
      const ring = await trenner.fokusring(page);
      if (!ring.sichtbar || ring.stil === 'none' || parseFloat(ring.breite) < 2) {
        throw new Error(`kein sichtbarer Fokusring am Trenner: ${JSON.stringify(ring)}`);
      }
    },
    valuenow: async () => Number((await trenner.trennerAngaben(page)).jetzt),

    /* ── Neuladen ── */
    neuLaden: async () => {
      await page.reload();
      await expect(page.locator('#kopf-fortschritt .haken-zaehler')).not.toHaveText('', { timeout: 5000 });
      await expect(page.locator('#datei-zeilen .datei-zeile').first()).toBeVisible({ timeout: 5000 });
    },

    /* ── Wechselnde Dinge und Suche (aus der Basis) sind vererbt; Suche hier nur als Fachwort benannt ── */
    sucheImDiff: begriff => oberflaeche.sucheSuchen(page, begriff),
  });
}

const test = basis.extend({
  // eslint-disable-next-line no-empty-pattern
  breite: async ({ seit, page }, verwenden) => {
    await verwenden(breiteSprache(seit, page));
  },
});

module.exports = { test, expect };
