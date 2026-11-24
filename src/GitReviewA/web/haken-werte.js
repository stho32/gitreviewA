/* gitreviewA — Werte des Abhakens: Fortschrittstext, Balkenanteil, Schlüssel einer Stelle, nächster Zielzustand. Reine Funktionen, im Browser
   und in Node. Herkunft: kanbanD web/diff.js (gesehenZeileHtml, gesehenAnsage), ohne Tausendertrenner wie die Summe der Dateiliste. */
(function (ziel) {
  'use strict';

  /** Anzeige- und Lesetext zugleich: dieselben Worte stehen sichtbar und in der Live-Region. */
  function fortschrittText(abgehakt, gesamt) {
    if (gesamt === 0) {
      return 'Keine Dateien zum Abhaken';
    }
    return `${abgehakt} von ${gesamt} abgehakt`;
  }

  function balkenAnteil(abgehakt, gesamt) {
    if (gesamt === 0) {
      return 0;
    }
    return abgehakt / gesamt;
  }

  /** Eine Stelle ist Commit und Datei; der volle Hash hat feste Länge, deshalb ist die Verbindung mit dem Pfad eindeutig. */
  function stellenSchluessel(commit, pfad) {
    return `${commit} ${pfad}`;
  }

  /** Ein Klick wünscht das Gegenteil des zuletzt Gewünschten — solange keine Antwort da ist, ist das noch nicht der bestätigte Zustand. */
  function naechsterZielzustand(istBestaetigtAbgehakt, letzterWunsch) {
    if (letzterWunsch === undefined) {
      return !istBestaetigtAbgehakt;
    }
    return !letzterWunsch;
  }

  Object.assign(ziel, { fortschrittText, balkenAnteil, stellenSchluessel, naechsterZielzustand });
})(typeof module !== 'undefined' ? module.exports : window);
