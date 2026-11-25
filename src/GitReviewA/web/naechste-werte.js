/* gitreviewA — Nächste ungeprüfte (R00028): Einträge der gezeigten Liste mit Zustand bilden und darin die nächste ungeprüfte Stelle
   finden (mit Umlauf), dazu der Text, wenn nichts mehr offen ist. Reine Funktionen, im Browser und in Node. Die Navigation liest nur
   die schon geladene Liste und den Stand: kein neuer `git`-Aufruf, kein neuer Serverweg, kein Nachladen. */
(function (ziel) {
  'use strict';

  const ABGEHAKT = 'abgehakt';
  const UNGEPRUEFT = 'ungeprueft';
  const GESPERRT = 'gesperrt';
  const KEINE = -1;

  /** Zwei Einträge sind dieselbe Stelle: die Stelle (Commit und Datei) in „Einzeln“, sonst die Datei. */
  function gleicheStelle(eintrag, stelle) {
    if (eintrag.pfad !== stelle.pfad) {
      return false;
    }
    if (eintrag.art !== 'stelle') {
      return true;
    }
    return eintrag.commit === stelle.commit;
  }

  /**
   * Der nächste ungeprüfte Eintrag ab der aktuellen Stelle: es geht vorwärts, abgehakte und gesperrte werden übersprungen, am Ende
   * läuft die Suche zur ersten ungeprüften um (Umlauf). `aktuelle` ist die Stelle der aktuellen Wahl (`{art, commit, pfad}`, in
   * „Zusammen“ genügt `{pfad}`) oder null; ohne sie beginnt die Suche beim ersten Eintrag. `KEINE`, wenn keiner ungeprüft ist.
   */
  function naechster(eintraege, aktuelle) {
    const anzahl = eintraege.length;
    if (anzahl === 0) {
      return KEINE;
    }
    const start = aktuelle ? eintraege.findIndex(eintrag => gleicheStelle(eintrag, aktuelle)) : KEINE;
    for (let schritt = 1; schritt <= anzahl; schritt += 1) {
      const index = (start + schritt + anzahl) % anzahl;
      if (eintraege[index].zustand === UNGEPRUEFT) {
        return index;
      }
    }
    return KEINE;
  }

  Object.assign(ziel, { ABGEHAKT, UNGEPRUEFT, GESPERRT, KEINE, naechster });
})(typeof module !== 'undefined' ? module.exports : window);
