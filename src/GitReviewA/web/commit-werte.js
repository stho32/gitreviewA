/* gitreviewA — Anzeigewerte einer Zeile der Commit-Leiste. Reine Funktionen, im Browser und in Node (Bausteintests).
   Herkunft: kanbanD web/commits.js (zeilenwerte, datumText, ohneSteuerzeichen) und web/kultur.js (zeitpunktAusMs). */
(function (ziel) {
  'use strict';

  const zweistellig = zahl => String(zahl).padStart(2, '0');

  /** Fremder Text: Steuerzeichen der Schreibrichtung (Einbettungen, Isolierungen, LRM, RLM, ALM) würden die Zeile umdrehen
      und Hash oder Datum verdecken. */
  const ohneSteuerzeichen = text => text.replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');

  /** ISO-Zeitpunkt → `TT.MM.JJJJ HH:MM` in der Ortszeit des Browsers; ein Wert, der kein Zeitpunkt ist, bleibt unverändert. */
  function datumText(iso) {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) {
      return iso;
    }
    const zeit = new Date(ms);
    return `${zweistellig(zeit.getDate())}.${zweistellig(zeit.getMonth() + 1)}.${zeit.getFullYear()} ${zweistellig(zeit.getHours())}:${zweistellig(zeit.getMinutes())}`;
  }

  /** Alle Anzeigewerte einer Zeile; der volle Zeitpunkt mit der Zeitzone des Autors ist der Hinweistext am Datum. */
  function zeilenwerte(commit) {
    const rumpf = ohneSteuerzeichen(commit.rumpf);
    return {
      kurz: commit.kurzHash,
      betreff: ohneSteuerzeichen(commit.betreff),
      autor: ohneSteuerzeichen(commit.autor),
      datum: datumText(commit.datum),
      datumHinweis: commit.datum,
      rumpf,
      hatRumpf: rumpf.length > 0,
    };
  }

  Object.assign(ziel, { datumText, zeilenwerte });
})(typeof module !== 'undefined' ? module.exports : window);
