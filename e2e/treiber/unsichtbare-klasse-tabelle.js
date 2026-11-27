'use strict';
// Die gemeinsame Tabelle der einen unsichtbaren Klasse lesen (R00058, B5801): die Node-Abtastung und die Abtastung im Browser
// prüfen gegen dieselbe Datei, die auch die NUnit-Abtastung des Servers liest. Nur hier wird die Datei gelesen.
const fs = require('fs');
const path = require('path');

const TABELLENPFAD = path.resolve(__dirname, '../../tests/GitReviewA.Tests/Fremdtext/unsichtbare-klasse.txt');

/** Die Bereiche der Tabelle als `[von, bis]`; `#` beginnt einen Kommentar. */
function bereicheLesen() {
  const bereiche = [];
  for (const zeile of fs.readFileSync(TABELLENPFAD, 'utf8').split('\n')) {
    const inhalt = zeile.trim();
    if (inhalt.length === 0 || inhalt.startsWith('#')) {
      continue;
    }
    const [von, bis] = inhalt.split('-');
    bereiche.push([parseInt(von, 16), bis === undefined ? parseInt(von, 16) : parseInt(bis, 16)]);
  }
  return bereiche;
}

/** Ob `codepunkt` in einem der Bereiche liegt. */
function inBereichen(codepunkt, bereiche) {
  return bereiche.some(([von, bis]) => codepunkt >= von && codepunkt <= bis);
}

/** Die Anzahl der Codepunkte einer Bereichsliste. */
function anzahlDerBereiche(bereiche) {
  return bereiche.reduce((summe, [von, bis]) => summe + (bis - von + 1), 0);
}

module.exports = { bereicheLesen, inBereichen, anzahlDerBereiche };
