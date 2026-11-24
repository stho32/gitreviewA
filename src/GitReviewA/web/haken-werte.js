/* gitreviewA — Werte des Abhakens: Fortschrittstext, Balkenanteil, Schlüssel einer Stelle, nächster Zielzustand, Name des Kästchens. Reine Funktionen, im Browser
   und in Node. Herkunft: kanbanD web/diff.js (gesehenZeileHtml, gesehenAnsage), ohne Tausendertrenner wie die Summe der Dateiliste. */
(function (ziel) {
  'use strict';

  /** Anzeige- und Lesetext zugleich: dieselben Worte stehen sichtbar und in der Live-Region. Gesperrte Stellen zählen in m, nie in n (R00014). */
  function fortschrittText(abgehakt, gesamt, nichtLesbar) {
    if (gesamt === 0) {
      return 'Keine Dateien zum Abhaken';
    }
    const zaehler = `${abgehakt} von ${gesamt} abgehakt`;
    const gibtEsGesperrteStellen = nichtLesbar > 0;
    if (gibtEsGesperrteStellen) {
      return `${zaehler} (${nichtLesbar} nicht lesbar)`;
    }
    return zaehler;
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

  /** Zugänglicher Name des Kästchens (Vorlage kanbanD „Gesehen“); an einer gesperrten Stelle nennt er den Grund mit. */
  function kaestchenBezeichnung(sichtbarerPfad, sperrgrund) {
    const bezeichnung = `Abgehakt: ${sichtbarerPfad}`;
    const istGesperrt = sperrgrund.length > 0;
    if (istGesperrt) {
      return `${bezeichnung} — ${sperrgrund}`;
    }
    return bezeichnung;
  }

  Object.assign(ziel, { fortschrittText, balkenAnteil, stellenSchluessel, naechsterZielzustand, kaestchenBezeichnung });
})(typeof module !== 'undefined' ? module.exports : window);
