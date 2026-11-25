/* gitreviewA — Werte des Umschalters „Umbruch“ (R00032): die Stellung nach dem Laden („an“, lange Diff-Zeilen sind umbrochen),
   die andere Stellung und die Frage, ob eine Stellung die Zeilen umbricht (die Klasse `.umbr` am Diff-Bereich).
   Der Start „an“ löst den Start „aus“ aus R00004 ab (R00032, „Abgelöste Zusagen“); die Stellung selbst bleibt am Diff-Bereich
   (RAM) und wird nicht gespeichert. Reine Werte, ohne DOM und ohne Zustand, im Browser und in Node. */
(function (ziel) {
  'use strict';

  const AN = 'an';
  const AUS = 'aus';

  /** Die Stellung des Umschalters nach dem Laden der Seite: „an“ (R00032). */
  function startstellung() {
    return AN;
  }

  /** Die andere Stellung des Umschalters: „an“ ↔ „aus“ — der Umschalter bleibt wie bisher bedienbar. */
  function umschalten(stellung) {
    return stellung === AN ? AUS : AN;
  }

  /** Ob diese Stellung die Zeilen umbricht: die Umbruch-Regeln hängen an der Klasse `.umbr` am Diff-Bereich. */
  function umbrochen(stellung) {
    return stellung === AN;
  }

  const api = { AN, AUS, startstellung, umschalten, umbrochen };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaUmbruchWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
