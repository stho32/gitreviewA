'use strict';
// Testsprache für den Abbruch: Strg+C, Beendigungssignal, Tab schließen; die Treiber darunter kennen Signale und Browser.
const { test: basis, expect } = require('./gitreviewa.js');
const signale = require('../treiber/signale.js');

function abbruchSprache() {
  function mitStrgCAbbrechen(lauf) {
    signale.signalSenden(lauf, signale.STRG_C);
  }

  function mitBeendigungssignalAbbrechen(lauf, { anzahl = 1 } = {}) {
    for (let gesendet = 0; gesendet < anzahl; gesendet += 1) {
      signale.signalSenden(lauf, signale.BEENDIGUNGSSIGNAL);
    }
  }

  /** Millisekunden vom Senden von Strg+C bis zum Ende des Prozesses. */
  function mitStrgCAbbrechenUndDauerMessen(lauf) {
    return signale.signalSendenUndEndeMessen(lauf, signale.STRG_C);
  }

  /** Exit 130, stdout 0 Bytes, „Review abgebrochen“ genau einmal als Warnung auf stderr. */
  function sollOhneErgebnisAbgebrochenSein(lauf) {
    return signale.pruefeAbbruchOhneErgebnis(lauf);
  }

  function sollWeiterlaufen(lauf) {
    signale.pruefeLaeuftOhneErgebnis(lauf);
  }

  async function tabSchliessen(page) {
    await page.close();
  }

  async function oberflaecheInNeuemTabOeffnen(context, lauf) {
    const tab = await context.newPage();
    await tab.goto(lauf.adresse);
    return tab;
  }

  return {
    mitStrgCAbbrechen, mitBeendigungssignalAbbrechen, mitStrgCAbbrechenUndDauerMessen, sollOhneErgebnisAbgebrochenSein, sollWeiterlaufen,
    tabSchliessen, oberflaecheInNeuemTabOeffnen,
  };
}

const test = basis.extend({
  // eslint-disable-next-line no-empty-pattern
  abbruch: async ({}, verwenden) => {
    await verwenden(abbruchSprache());
  },
});

module.exports = { test, expect };
