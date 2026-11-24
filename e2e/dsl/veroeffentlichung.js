'use strict';
// Testsprache Veröffentlichung: Plattform, Dateien im Ordner, allein im leeren Ordner starten; die SDK kennt nur der Treiber.
const { test: basis, expect } = require('./abbrechen.js');
const veroeffentlichen = require('../treiber/veroeffentlichen.js');
const { programmDateiStarten, adresseAbwarten, programmBeenden } = require('../treiber/programm.js');

const STARTZEILE_FRIST_MS = 5000;
const BYTES_JE_MEGABYTE = 1024 * 1024;

function veroeffentlichungSprache(gr) {
  const geraete = veroeffentlichen.neueAblage();
  const laeufe = [];

  function fuerPlattformVeroeffentlichen(plattform) {
    return geraete.fuerPlattformVeroeffentlichen(plattform);
  }

  /** Veröffentlicht und kopiert die Datei in einen sonst leeren Ordner; liefert deren Pfad. */
  async function veroeffentlichteDateiAllein(plattform) {
    const ergebnis = await fuerPlattformVeroeffentlichen(plattform);
    return geraete.alleinInLeerenOrdnerKopieren(ergebnis);
  }

  /** Startet die Datei in `repo` (Arbeitsordner), ohne Browser, auf freiem Port, und wartet auf die Startzeile. */
  async function alleinStarten(datei, repo, hashes) {
    const lauf = programmDateiStarten(datei, repo.ordner, [...hashes, '--kein-browser'], {});
    laeufe.push(lauf);
    lauf.adresse = await adresseAbwarten(lauf, STARTZEILE_FRIST_MS);
    return lauf;
  }

  async function aufraeumen() {
    await Promise.all(laeufe.map(programmBeenden));
    geraete.aufraeumen();
  }

  function dateienImOrdner(ergebnis) {
    return veroeffentlichen.dateienIn(ergebnis.ordner);
  }

  function dateienImOrdnerDerDatei(datei) {
    return veroeffentlichen.dateienIn(veroeffentlichen.ordnerDerDatei(datei));
  }

  function ordnerNamenDerZeile(pfadzeile) {
    return veroeffentlichen.ordnerNameDerDatei(pfadzeile);
  }

  function sollAusfuehrbarSein(ergebnis, dateiname) {
    expect(veroeffentlichen.istAusfuehrbar(ergebnis.ordner, dateiname), `${dateiname} ausführbar`).toBe(true);
  }

  function sollKleinerSeinAlsMegabyte(ergebnis, dateiname, megabyte) {
    expect(veroeffentlichen.groesseIn(ergebnis.ordner, dateiname)).toBeLessThan(megabyte * BYTES_JE_MEGABYTE);
  }

  /** Ruft das Skript auf; Ausgabeordner und Build-Ablage liegen in der Ablage des Tests, nie im Arbeitsbaum. */
  function skriptAufrufen(argumente) {
    return geraete.skriptAufrufen(argumente);
  }

  return {
    fuerPlattformVeroeffentlichen, veroeffentlichteDateiAllein, alleinStarten, dateienImOrdner, dateienImOrdnerDerDatei,
    ordnerNamenDerZeile, sollAusfuehrbarSein, sollKleinerSeinAlsMegabyte, skriptAufrufen, aufraeumen,
  };
}

const test = basis.extend({
  ver: async ({ gr }, verwenden) => {
    const sprache = veroeffentlichungSprache(gr);
    await verwenden(sprache);
    await sprache.aufraeumen();
  },
});

module.exports = { test, expect };
