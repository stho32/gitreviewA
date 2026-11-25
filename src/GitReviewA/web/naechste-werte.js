/* gitreviewA — Nächste ungeprüfte (R00028): Einträge der gezeigten Liste mit Zustand bilden und darin die nächste ungeprüfte Stelle
   finden (mit Umlauf), dazu der Text, wenn nichts mehr offen ist. Reine Funktionen, im Browser und in Node. Die Navigation liest nur
   die schon geladene Liste und den Stand: kein neuer `git`-Aufruf, kein neuer Serverweg, kein Nachladen. */
(function (ziel) {
  'use strict';

  /* Die Modus-Namen kommen aus `modus-werte.js` — eine Domänensprache (J01), keine zweite Kopie: im Browser über das Fenster,
     unter Node per `require`. */
  const modusWerte = typeof require === 'function' ? require('./modus-werte.js') : window.gitreviewaModusWerte;
  const { ZUSAMMEN } = modusWerte;

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

  /** Zustand einer Stelle: gesperrt vor abgehakt, weil eine gesperrte Stelle nie abgehakt wird (R00014). */
  function stelleZustand(istAbgehakt, istGesperrt) {
    if (istGesperrt) {
      return GESPERRT;
    }
    return istAbgehakt ? ABGEHAKT : UNGEPRUEFT;
  }

  /**
   * Zustand einer Datei in „Zusammen“: sie ist abgehakt, wenn alle ihre Stellen abgehakt sind; gesperrt, wenn der Name nicht
   * eindeutig ist (der Sperrgrund der Datei, R00014) oder keine lesbare Stelle mehr offen ist (ihre offenen Stellen sind alle
   * gesperrt, R00028); sonst ungeprüft — auch dann, wenn nur ein Teil abgehakt oder eine Stelle gesperrt ist.
   */
  function dateiZustand(datei, stand) {
    if (datei.sperrgrund) {
      return GESPERRT;
    }
    let offen = 0;
    let gesperrt = 0;
    for (const stelle of datei.stellen) {
      if (stand.istAbgehakt(stelle.commit, stelle.pfad)) {
        continue;
      }
      if (stand.istGesperrt(stelle.commit, stelle.pfad)) {
        gesperrt += 1;
      } else {
        offen += 1;
      }
    }
    if (offen > 0) {
      return UNGEPRUEFT;
    }
    return gesperrt > 0 ? GESPERRT : ABGEHAKT;
  }

  /**
   * Einträge in der Reihenfolge der Suche, je mit Zustand.
   *
   * In „Zusammen“ ist die Datei der Eintrag: `liste` ist die gezeigte Netto-Liste (ausgeblendete Dateien stehen nicht darin und sind
   * deshalb keine Einträge), je Datei mit ihren Stellen.
   *
   * In „Einzeln“ ist die Stelle (voller Commit-Hash und Datei) der Eintrag: `liste` sind die Stellen des Stands — alle Stellen der
   * Auswahl, Commits in der Reihenfolge der Auswahl, je Commit die Dateien in der Reihenfolge von `git`. Dieser Stand trägt jede
   * Stelle auch außerhalb der gerade gezeigten Dateiliste; die Suche läuft deshalb über Commits hinweg.
   *
   * `stand` fragt den bestätigten Zustand je Stelle (`istAbgehakt`, `istGesperrt`) — ein Haken, zwei Sichten.
   */
  function eintraege(modus, liste, stand) {
    if (modus === ZUSAMMEN) {
      return liste.map(datei => ({ art: 'datei', pfad: datei.pfad, zustand: dateiZustand(datei, stand) }));
    }
    return liste.map(stelle => ({
      art: 'stelle',
      commit: stelle.commit,
      pfad: stelle.datei,
      zustand: stelleZustand(stand.istAbgehakt(stelle.commit, stelle.datei), stand.istGesperrt(stelle.commit, stelle.datei)),
    }));
  }

  /** Der Text neben dem Knopf, wenn keine ungeprüfte Stelle mehr erreichbar ist. */
  function meldung({ nichtLesbar, ausgeblendet }) {
    const zusatz = [];
    if (nichtLesbar > 0) {
      zusatz.push(`${nichtLesbar} nicht lesbar`);
    }
    if (ausgeblendet > 0) {
      zusatz.push(`${ausgeblendet} ausgeblendet`);
    }
    if (zusatz.length === 0) {
      return 'Alles abgehakt';
    }
    const kopf = nichtLesbar === 0 ? 'Alles Sichtbare abgehakt' : 'Alles Lesbare abgehakt';
    return `${kopf}, ${zusatz.join(', ')}`;
  }

  const api = { ABGEHAKT, UNGEPRUEFT, GESPERRT, KEINE, naechster, eintraege, meldung };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaNaechsteWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
