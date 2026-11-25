/* gitreviewA — Reine Rechnung der Modus-Ansicht (R00012): Zählzeile, Zusammenfassung der Commit-Zeile, Wahl beim Moduswechsel,
   Anzahl-Wortlaut. Reine Funktionen, ohne DOM und ohne Zustand. */
(function (ziel) {
  'use strict';

  const ZUSAMMEN = 'zusammen';
  const EINZELN = 'einzeln';

  function anzahlText(anzahl, einzahl, mehrzahl) {
    return `${anzahl} ${anzahl === 1 ? einzahl : mehrzahl}`;
  }

  /** Kopf: „3 Commits · 3 Dateien“ (R00012, Kriterium 1). */
  function kopfZahlen(commitAnzahl, dateiAnzahl) {
    return `${anzahlText(commitAnzahl, 'Commit', 'Commits')} · ${anzahlText(dateiAnzahl, 'Datei', 'Dateien')}`;
  }

  /** Zugeklappte Commit-Zeile: „3 Commits · abc1234..def5678 · lückenlos · netto“ bzw. „… · keine lückenlose Kette · je Commit“. */
  function commitZeileText(commitAnzahl, erstesKurz, letztesKurz, beschriftung) {
    const anzahl = anzahlText(commitAnzahl, 'Commit', 'Commits');
    let hashes = erstesKurz;
    if (letztesKurz && letztesKurz !== erstesKurz) {
      hashes = `${erstesKurz}..${letztesKurz}`;
    }
    return `${anzahl} · ${hashes} · ${beschriftung}`;
  }

  const KETTE_UNBEKANNT = 'Kette wird geprüft …';
  const KETTE_NICHT_LESBAR = 'Kette nicht lesbar';

  /**
   * Beschriftung der zugeklappten Commit-Zeile: die Antwort von `GET /api/zusammen` allein sagt, ob die Auswahl eine lückenlose
   * Kette bildet. Vor der Antwort und nach einem Fehler steht dort nie die Behauptung „lückenlos · netto“ (R00012, Kriterien 2/4).
   */
  function kettenbeschriftung(stand, istGescheitert) {
    if (stand) {
      return stand.beschriftung;
    }
    if (istGescheitert) {
      return KETTE_NICHT_LESBAR;
    }
    return KETTE_UNBEKANNT;
  }

  /**
   * Wahl beim Moduswechsel: kommt die bisherige Wahl in der neuen Sicht vor, bleibt sie; sonst die erste Wahl der neuen Sicht.
   * `wahl` ist `{ pfad }`, `sicht` eine Liste von Einträgen mit `pfad`; `null`, wenn die neue Sicht leer ist.
   */
  function wahlUebernehmen(wahl, sicht) {
    if (sicht.length === 0) {
      return null;
    }
    if (wahl && sicht.some(eintrag => eintrag.pfad === wahl.pfad)) {
      return wahl;
    }
    return sicht[0];
  }

  const api = { ZUSAMMEN, EINZELN, anzahlText, kopfZahlen, commitZeileText, kettenbeschriftung, wahlUebernehmen };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaModusWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
