/* gitreviewA — Anzeigewerte einer Zeile der Commit-Leiste. Reine Funktionen, im Browser und in Node (Bausteintests).
   Herkunft: kanbanD web/commits.js (zeilenwerte, datumText, ohneSteuerzeichen) und web/kultur.js (zeitpunktAusMs). */
(function (ziel) {
  'use strict';

  const nachrichtWerte = typeof module !== 'undefined' ? require('./nachricht-werte.js') : window.gitreviewaNachrichtWerte;
  const nachrichtText = nachrichtWerte.nachrichtText;

  const zweistellig = zahl => String(zahl).padStart(2, '0');

  /** Fremder Text: Steuerzeichen der Schreibrichtung (Einbettungen, Isolierungen, LRM, RLM, ALM) würden die Zeile umdrehen
      und Hash oder Datum verdecken. */
  const ohneSteuerzeichen = text => text.replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');

  /** ISO-Zeitpunkt → `TT.MM.JJJJ HH:MM` in der Ortszeit des Browsers; ein Wert, der kein Zeitpunkt ist, bleibt unverändert.
      Ein leeres Datum zeigt „Datum nicht lesbar“: git gibt bei einem NUL im Autorkopf kein Datum aus (R00048 Kriterium 11),
      und die Leiste darf dort keine leere Stelle und keinen Ersatztext wie `%aI` zeigen. */
  function datumText(iso) {
    if (!iso) {
      return 'Datum nicht lesbar';
    }
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) {
      return iso;
    }
    const zeit = new Date(ms);
    return `${zweistellig(zeit.getDate())}.${zweistellig(zeit.getMonth() + 1)}.${zeit.getFullYear()} ${zweistellig(zeit.getHours())}:${zweistellig(zeit.getMinutes())}`;
  }

  /** Alle Anzeigewerte einer Zeile; der volle Zeitpunkt mit der Zeitzone des Autors ist der Hinweistext am Datum.
      Gekürzt wird vor dem DOM und vor dem Entfernen der Richtungszeichen, damit Leiste und Streifen dieselbe Zahl n
      nennen (R00051, Kriterium 5). */
  function zeilenwerte(commit) {
    const rumpf = ohneSteuerzeichen(nachrichtText(commit.rumpf));
    return {
      kurz: commit.kurzHash,
      betreff: ohneSteuerzeichen(nachrichtText(commit.betreff)),
      autor: ohneSteuerzeichen(nachrichtText(commit.autor)),
      datum: datumText(commit.datum),
      datumHinweis: commit.datum,
      rumpf,
      hatRumpf: ohneSteuerzeichen(commit.rumpf).length > 0,
    };
  }

  /** Der Betreff eines Commits der Auswahl, genau wie ihn die Commit-Zeile zeigt; leer, wenn der Hash nicht vorkommt.
      Jede andere Ansicht (etwa der Abschnittskopf ohne Kette) nimmt ihn hier, damit fremder Text nirgends roh erscheint. */
  function betreffVon(commits, hash) {
    const commit = commits.find(eintrag => eintrag.hash === hash);
    return commit ? ohneSteuerzeichen(nachrichtText(commit.betreff)) : '';
  }

  Object.assign(ziel, { datumText, zeilenwerte, betreffVon, nachrichtText });
})(typeof module !== 'undefined' ? module.exports : window);
