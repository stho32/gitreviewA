/* gitreviewA — Auffrischregel der Ergebnis-Spalte (R00037, B3601): die reine Rechnung, wann eine neue Anfrage an
   `GET /api/ergebnis` gestellt wird. Im Browser und in Node, ohne DOM und ohne Zustand (testbarer Entwurf: entscheiden getrennt
   vom Handeln). Höchstens eine Anfrage läuft gleichzeitig; kommen währenddessen weitere Änderungen, folgt genau eine
   nachlaufende. Jede Anfrage trägt eine fortlaufende Fassung; eine Antwort wirkt nur, wenn sie zur laufenden Fassung gehört und
   jünger als die zuletzt angewendete ist — eine ältere Antwort überschreibt so nie eine neuere. Nach „Beenden“ wird nichts mehr
   angefragt und keine Antwort mehr angewendet (R00037). Die eine Wegwerf-Stelle bleibt die Antwort mit `erfolg: false`; sie
   zählt nicht als angewendet, die nächste Änderung fragt erneut. */
(function (ziel) {
  'use strict';

  const AENDERUNG = 'aenderung';
  const ANTWORT = 'antwort';
  const BEENDEN = 'beenden';
  const ANFRAGEN = 'anfragen';
  const WARTEN = 'warten';
  const NICHTS = 'nichts';

  /** Der Ausgangszustand: keine Anfrage unterwegs, noch nichts angewendet, der Lauf läuft. */
  function start() {
    return { laeuft: false, ausstehend: false, fassung: 0, angewendet: 0, beendet: false };
  }

  /**
   * Die Entscheidung zu einem Ereignis. `ereignis` ist `'aenderung'`, `'beenden'` oder `{ art: 'antwort', fassung, erfolg }`.
   * Rückgabe: `art` (`'anfragen'`, `'warten'`, `'nichts'`), der neue `zustand`, bei `'anfragen'` die `fassung` und bei einer
   * Antwort `anwenden` (der Text gehört in die Spalte).
   */
  function naechsteAnfrage(zustand, ereignis) {
    const art = typeof ereignis === 'string' ? ereignis : ereignis.art;
    if (art === BEENDEN) {
      return nichts({ ...zustand, beendet: true });
    }
    if (zustand.beendet) {
      return nichts(zustand);
    }
    if (art === AENDERUNG) {
      return anfrageStarten(zustand);
    }
    if (art === ANTWORT) {
      return antwortVerarbeiten(zustand, ereignis.fassung, ereignis.erfolg);
    }
    return nichts(zustand);
  }

  /** Eine Änderung: läuft schon eine Anfrage, nur die eine nachlaufende merken; sonst sofort anfragen. */
  function anfrageStarten(zustand) {
    if (zustand.laeuft) {
      return { art: WARTEN, zustand: { ...zustand, ausstehend: true }, anwenden: false };
    }
    const fassung = zustand.fassung + 1;
    return { art: ANFRAGEN, fassung, zustand: { ...zustand, laeuft: true, ausstehend: false, fassung }, anwenden: false };
  }

  /**
   * Eine Antwort: gehört sie nicht zur laufenden Fassung oder ist sie älter als die zuletzt angewendete, wird sie verworfen.
   * Sonst endet die Anfrage; erfolgreich wird die Fassung angewendet. War eine Änderung nachgelaufen, folgt genau eine Anfrage.
   */
  function antwortVerarbeiten(zustand, fassung, erfolg) {
    const passtNichtZurLaufenden = !zustand.laeuft || fassung !== zustand.fassung;
    const istAelter = fassung <= zustand.angewendet;
    if (passtNichtZurLaufenden || istAelter) {
      return nichts(zustand);
    }
    const angewendet = erfolg ? fassung : zustand.angewendet;
    const nachAntwort = { ...zustand, laeuft: false, angewendet };
    if (!zustand.ausstehend) {
      return { art: NICHTS, zustand: nachAntwort, anwenden: erfolg, fehler: !erfolg };
    }
    const naechste = nachAntwort.fassung + 1;
    return {
      art: ANFRAGEN,
      fassung: naechste,
      zustand: { ...nachAntwort, laeuft: true, ausstehend: false, fassung: naechste },
      anwenden: erfolg,
      fehler: !erfolg,
    };
  }

  function nichts(zustand) {
    return { art: NICHTS, zustand, anwenden: false, fehler: false };
  }

  const api = { start, naechsteAnfrage };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaErgebnisWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
