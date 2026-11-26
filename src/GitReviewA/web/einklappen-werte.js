/* gitreviewA — Zustand des Einklappens (R00035, B3401): die reine Rechnung um die eine Stellung der Seitenleiste. Im Browser und
   in Node, ohne DOM und ohne Zustand (testbarer Entwurf: entscheiden getrennt vom Handeln). Der Zustand ist nur RAM und startet
   ausgeklappt (nichts wird gespeichert, wie alle übrigen Schalter). `aria-expanded` und der Name des Knopfes hängen allein am
   Zustand; die Pfeilrichtung zeigt die Wirkung. Der zweispaltige Aufbau kommt aus derselben Grenze wie der Trennzug (566 px):
   `passtZweiSpaltig` reicht `trenner-werte.js` durch — keine zweite Quelle für die Mediengrenze. */
(function (ziel) {
  'use strict';

  const trenner = typeof module !== 'undefined' && module.exports
    ? require('./trenner-werte.js')
    : ziel.gitreviewaTrennerWerte;

  /** Der Standard der Seite: ausgeklappt. */
  const START = false;

  /** Der Startzustand der Seite (RAM). */
  function start() {
    return START;
  }

  /** Der Zustand nach einer Betätigung: ein und aus in einer Stellung (kein dritter Zustand). */
  function umschalten(eingeklappt) {
    return !eingeklappt;
  }

  /** `aria-expanded` des Bedienelements: `true` ausgeklappt, `false` eingeklappt. */
  function erweitert(eingeklappt) {
    return eingeklappt ? 'false' : 'true';
  }

  /** Der sichtbare Text und der Name des Knopfes: er beginnt mit „<bezeichnung>“ und nennt die Wirkung der Betätigung. */
  function name(bezeichnung, eingeklappt) {
    return `${bezeichnung} ${eingeklappt ? 'ausklappen' : 'einklappen'}`;
  }

  /** Das sichtbare Bild der Wirkung: der Pfeil zeigt, wohin der Bereich geht. Links einklappen zeigt nach links (`«`),
      rechts einklappen nach rechts (`»`); eingeklappt zeigt er jeweils den Weg zurück (R00037). */
  function pfeil(eingeklappt, rechts = false) {
    if (rechts) {
      return eingeklappt ? '«' : '»';
    }
    return eingeklappt ? '»' : '«';
  }

  /** Passt der zweispaltige Aufbau? Dieselbe Grenze wie der Trennzug (R00033/R00034); darunter gibt es kein Einklappen. */
  function passtZweiSpaltig(fensterBreite) {
    return trenner.passtZweiSpaltig(fensterBreite);
  }

  /** Die Mindestfensterbreite des zweispaltigen Aufbaus (566 px) — der Wert der Medienabfrage, aus derselben Quelle. */
  function mindestFensterBreite() {
    return trenner.mindestFensterBreite();
  }

  /** Die Schwellen der Ergebnis-Spalte (R00037) kommen aus derselben Quelle wie die Breitenregel (`trenner-werte.js`). */
  function ergebnisStartetAusgeklappt(fensterBreite) {
    return trenner.ergebnisStartetAusgeklappt(fensterBreite);
  }

  function ergebnisAusklappbar(fensterBreite) {
    return trenner.ergebnisAusklappbar(fensterBreite);
  }

  const api = {
    START, start, umschalten, erweitert, name, pfeil, passtZweiSpaltig, mindestFensterBreite,
    ergebnisStartetAusgeklappt, ergebnisAusklappbar,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaEinklappenWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);