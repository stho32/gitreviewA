/* gitreviewA — Anzeigewerte einer Zeile der Commit-Leiste. Reine Funktionen, im Browser und in Node (Bausteintests).
   Herkunft: kanbanD web/commits.js (zeilenwerte, datumText) und web/kultur.js (zeitpunktAusMs). */
(function (ziel) {
  'use strict';

  const nachrichtWerte = typeof module !== 'undefined' ? require('./nachricht-werte.js') : window.gitreviewaNachrichtWerte;
  const nachrichtText = nachrichtWerte.nachrichtText;

  /* Die eine Zeichenliste der Oberfläche (R00054): `markiert` je Zeile für die Message, `sichtbarerName` für Betreff und
     Autor. `commit-werte.js` steht in `index.html` vor `dateiliste-werte.js`; deshalb wird die Liste beim Aufruf geholt,
     nicht beim Laden — sonst fehlt sie im Browser, während der Node-Test sie per `require` findet. */
  const namensWerte = () => (typeof module !== 'undefined' ? require('./dateiliste-werte.js') : window);
  const markierungsWerte = () => (typeof module !== 'undefined' ? require('./absicht-werte.js') : window.gitreviewaAbsichtWerte);

  const sichtbarerName = text => namensWerte().sichtbarerName(text);
  const markiert = text => markierungsWerte().markiert(text);

  const zweistellig = zahl => String(zahl).padStart(2, '0');

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
      Jedes Feld wird erst gekürzt und dann markiert (R00051, R00054): eine Marke zählt als ein Zeichen, der Hinweis
      nennt dieselbe Zahl wie der Streifen „Absicht der KI“, und eine Marke wird nie halbiert. In der Message bleibt LF
      ein Zeilenumbruch (`markiert`), in Betreff und Autor wird auch LF eine Marke. */
  function zeilenwerte(commit) {
    return {
      kurz: commit.kurzHash,
      betreff: sichtbarerName(nachrichtText(commit.betreff)),
      autor: sichtbarerName(nachrichtText(commit.autor)),
      datum: datumText(commit.datum),
      datumHinweis: commit.datum,
      rumpf: markiert(nachrichtText(commit.rumpf)),
      hatRumpf: commit.rumpf.length > 0,
    };
  }

  /** Der Betreff eines Commits der Auswahl, genau wie ihn die Commit-Zeile zeigt; leer, wenn der Hash nicht vorkommt.
      Jede andere Ansicht (etwa der Abschnittskopf ohne Kette) nimmt ihn hier, damit fremder Text nirgends roh erscheint. */
  function betreffVon(commits, hash) {
    const commit = commits.find(eintrag => eintrag.hash === hash);
    return commit ? sichtbarerName(nachrichtText(commit.betreff)) : '';
  }

  Object.assign(ziel, { datumText, zeilenwerte, betreffVon, nachrichtText });
})(typeof module !== 'undefined' ? module.exports : window);