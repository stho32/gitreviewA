'use strict';
// Testsprache für den Abbruch: Strg+C, Beendigungssignal, Tab schließen; die Treiber darunter kennen Signale und Browser.
const { test: basis, expect } = require('./gitreviewa.js');
const signale = require('../treiber/signale.js');
const { aufhaltendesGitAnlegen } = require('../treiber/aufhaltendes-git.js');

function abbruchSprache(gr) {
  const aufhaltendeGits = [];

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

  /**
   * Strg+C und die Abbruchanforderung zusammen (R00050, Kriterium 10): beide gehen denselben Einmal-Schalter, die Abbruchzeile
   * bleibt einmal. Die Anforderung kann den fallenden Server nicht mehr erreichen — dann ist die Antwort `null`.
   */
  async function mitStrgCUndAbbruchanforderung(lauf) {
    signale.signalSenden(lauf, signale.STRG_C);
    try {
      return await gr.abbrechenAnfordern(lauf);
    } catch {
      return null;
    }
  }

  function sollWeiterlaufen(lauf) {
    signale.pruefeLaeuftOhneErgebnis(lauf);
  }

  /** Strg+C, während gitreviewA beim Start die Commits liest — vor dem Start des Servers. */
  async function waehrendDesStartsMitStrgCAbbrechen(repo, hashes) {
    const git = aufhaltendesGitAnlegen();
    aufhaltendeGits.push(git);
    const lauf = gr.gitreviewAAufrufen(repo, hashes, { pfadVorne: git.ordner });
    await git.aufGitStartWarten(lauf);
    signale.signalSenden(lauf, signale.STRG_C);
    git.weiterlaufenLassen();
    return lauf;
  }

  function aufraeumen() {
    for (const git of aufhaltendeGits) {
      git.entfernen();
    }
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
    mitStrgCUndAbbruchanforderung,
    waehrendDesStartsMitStrgCAbbrechen, tabSchliessen, oberflaecheInNeuemTabOeffnen, aufraeumen,
  };
}

const test = basis.extend({
  abbruch: async ({ gr }, verwenden) => {
    const sprache = abbruchSprache(gr);
    await verwenden(sprache);
    sprache.aufraeumen();
  },
});

module.exports = { test, expect };
