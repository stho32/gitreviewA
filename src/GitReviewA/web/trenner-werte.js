/* gitreviewA — die eine Breitenregel für drei Bereiche (R00034, R00037, R00042, B4101): die reine Rechnung um die gezeigten
   Breiten der Seitenleiste, des Diffs und der Ergebnis-Spalte. Im Browser und in Node, ohne DOM und ohne Zustand (testbarer
   Entwurf: entscheiden getrennt vom Handeln). Die Entscheidungen des PO liegen in den festen Werten: je Seite 240–640 px, Start
   360 (links) und 320 (rechts), Diff mindestens 320 px, zwei Trenner je 6 px, eine eingeklappte Seite belegt nur ihren Streifen
   (24 px); die Ergebnis-Spalte startet ab 1012 px ausgeklappt und lässt sich ab 812 px (240 + 320 + 240 + 2 × 6) ausklappen. Die
   eine Rechnung bestimmt beide gezeigten Breiten, die Stellung der Spalte (selbständig eingeklappt, klebend) und den Vorrang;
   Ziehen, Tastatur, Doppelklick, Ein- und Ausklappen, Fensteränderung, `aria-valuemax` und die Sperre des Knopfs lesen nur hier.
   Es gibt keine zweite Rechnung für „passt die Spalte noch?“.

   Die Rechnung kennt zwei Arten von Grenzen (R00042): beim Ziehen gibt die andere Seite nicht nach — die Grenze einer Seite ist
   `Fenster − 320 − 6 − Belegung der anderen Seite` (je Seite höchstens 640), siehe `hoechstLinks`/`hoechstRechts`; bei
   Fensteränderung und Ausklappen gilt die Reihenfolge: zuerst gibt die Ergebnis-Spalte nach (bis 240, dann klappt sie ein und
   bleibt zu), danach die Seitenleiste (bis 240) — außer beim ausdrücklichen Ausklappen der Spalte im engen Fenster (Vorrang):
   dann gibt zuerst die Seitenleiste nach, danach die Spalte, und die Spalte klappt nicht wieder ein.

   Unter der Summe der Mindestbreiten (566 px) gibt es keinen Trenner — dann gilt der Rückfall auf eine Spalte (R00033). Die Summe
   ist `mindestFensterBreite()`; die CSS-Mediengrenze muss dazu passen (Test). */
(function (ziel) {
  'use strict';

  /** Seitenleiste und Ergebnis-Spalte: dieselbe feste Spanne und Startbreite (Doppelklick setzt darauf zurück). */
  const KLEINSTE = 240;
  const GROESSTE = 640;
  const START = 360;
  /** Der Diff darf nie schmaler als seine Mindestbreite werden; jeder Trenner belegt eine eigene Spalte. */
  const DIFF_MINDEST = 320;
  const TRENNER = 6;
  /** Ein Pfeildruck verstellt um so viele Pixel; Pos1/Ende setzen auf die vollen Grenzen. */
  const SCHRITT = 16;
  /** Die Ergebnis-Spalte (R00037/R00042): Wunschbreite, Start- und Ausklappgrenze, Breite des Streifens. */
  const ERGEBNIS = 320;
  const ERGEBNIS_MINDEST = 240;
  const ERGEBNIS_START = 1012;
  const ERGEBNIS_AUSKLAPPBAR = 812;
  const ERGEBNIS_STREIFEN = 24;

  const VORRANG_RECHTS = 'rechts';

  /** Die feste Mindestbreite der Seitenleiste. */
  function kleinsteBreite() {
    return KLEINSTE;
  }

  /** Die Mindestfensterbreite für zwei Spalten: Seitenleiste + Diff + Trenner (240 + 320 + 6 = 566 px). */
  function mindestFensterBreite() {
    return KLEINSTE + DIFF_MINDEST + TRENNER;
  }

  /** Passt der zweispaltige Aufbau? Die Grenze ist fest (566 px); darunter gilt der Rückfall auf eine Spalte (R00033). */
  function passtZweiSpaltig(fensterBreite) {
    return fensterBreite >= mindestFensterBreite();
  }

  /** Startet die Ergebnis-Spalte ausgeklappt? Ab 1012 px (Seitenleiste 360 + Diff 320 + Spalte 320 + 2 × 6). */
  function ergebnisStartetAusgeklappt(fensterBreite) {
    return fensterBreite >= ERGEBNIS_START;
  }

  /** Lässt sich die Ergebnis-Spalte ausklappen? Ab 812 px (die drei Mindestbreiten 240 + 320 + 240 + 2 × 6). */
  function ergebnisAusklappbar(fensterBreite) {
    return fensterBreite >= ERGEBNIS_AUSKLAPPBAR;
  }

  /** Gibt es die Ergebnis-Spalte (und ihren Streifen) überhaupt? Nur im zweispaltigen Aufbau (ab 566 px, R00033). */
  function ergebnisVorhanden(fensterBreite) {
    return passtZweiSpaltig(fensterBreite);
  }

  /** Auf die Spanne [kleinste, hoechste] klemmen: ein Wert über der Grenze wird geklemmt, nie verworfen. */
  function klemme(breite, kleinste, hoechste) {
    return Math.max(Math.min(breite, hoechste), kleinste);
  }

  /** Eine Zahl aus einer Angabe, sonst der Ersatzwert — so bleibt die Rechnung auch mit fehlenden Angaben definiert. */
  function zahl(wert, ersatz) {
    const n = Number(wert);
    return Number.isFinite(n) ? n : ersatz;
  }

  /** Der Platz, den eine Seite belegt: ausgeklappt Trenner + Breite, eingeklappt nur der Streifen (24 px). */
  function belegung(breite, eingeklappt) {
    return eingeklappt ? ERGEBNIS_STREIFEN : TRENNER + breite;
  }

  /** Der Platz, der einer offenen Seite bleibt, wenn die andere nur ihren Streifen belegt (Diff genau 320 px). */
  function streifenPlatz(fensterBreite) {
    return Math.max(KLEINSTE, fensterBreite - ERGEBNIS_STREIFEN - TRENNER - DIFF_MINDEST);
  }

  /**
   * Die eine Rechnung: Fensterbreite + Wunschbreiten + Stellung → gezeigte Breiten, Stellung der Spalte und neuer Vorrang.
   * `wunsch` ist `{links, rechts}` (je 240–640, geklemmt), `stellung` ist `{linksEin, rechtsEin, vorrang}`. `rechtsEin` kommt
   * als klebende Stellung herein und geht als klebende Stellung hinaus (das selbständige Einklappen bleibt).
   */
  function anzeige(fensterBreite, wunsch, stellung) {
    const w = wunsch || {};
    const s = stellung || {};
    const l = klemme(zahl(w.links, START), KLEINSTE, GROESSTE);
    const r = klemme(zahl(w.rechts, ERGEBNIS), KLEINSTE, GROESSTE);
    const linksEin = Boolean(s.linksEin);
    let rechtsEin = Boolean(s.rechtsEin);
    let vorrang = s.vorrang === VORRANG_RECHTS ? VORRANG_RECHTS : null;

    if (!passtZweiSpaltig(fensterBreite)) {
      return { links: l, rechts: r, linksEin, rechtsEin, vorrang: null };
    }
    // Unter 812 px ist die Spalte nicht ausklappbar: sie bleibt zu (klebend).
    if (!ergebnisAusklappbar(fensterBreite)) {
      rechtsEin = true;
    }
    // Der Vorrang gilt nur, solange die Spalte offen und ausklappbar ist.
    const vorrangAktiv = vorrang === VORRANG_RECHTS && !rechtsEin;
    if (vorrang && !vorrangAktiv) {
      vorrang = null;
    }

    if (rechtsEin) {
      // Die Spalte ist zu: nur ihr Streifen belegt; die Seitenleiste nimmt den Rest, bis der Diff 320 px behält.
      return { links: Math.min(l, streifenPlatz(fensterBreite)), rechts: r, linksEin, rechtsEin: true, vorrang };
    }

    if (vorrangAktiv && !linksEin) {
      // Ausdrückliches Ausklappen im engen Fenster (Kriterium 7): zuerst gibt die Seitenleiste nach (bis 240), dann die Spalte.
      const platz = fensterBreite - 2 * TRENNER - DIFF_MINDEST;
      if (l + r <= platz) {
        // Die gewählten Breiten passen wieder: der Vorrang endet.
        return { links: l, rechts: r, linksEin, rechtsEin: false, vorrang: null };
      }
      const linksGezeigt = Math.max(KLEINSTE, platz - r);
      return {
        links: linksGezeigt,
        rechts: Math.min(r, Math.max(KLEINSTE, platz - linksGezeigt)),
        linksEin,
        rechtsEin: false,
        vorrang: VORRANG_RECHTS,
      };
    }

    // Normale Reihenfolge: zuerst gibt die Ergebnis-Spalte nach (bis 240), dann klappt sie ein, dann die Seitenleiste.
    const linksBelegt = linksEin ? ERGEBNIS_STREIFEN : TRENNER + l;
    const rechtsPlatz = fensterBreite - linksBelegt - TRENNER - DIFF_MINDEST;
    if (rechtsPlatz < KLEINSTE) {
      return { links: Math.min(l, streifenPlatz(fensterBreite)), rechts: r, linksEin, rechtsEin: true, vorrang };
    }
    return { links: l, rechts: Math.min(r, rechtsPlatz), linksEin, rechtsEin: false, vorrang };
  }

  /**
   * Die Höchstbreite der Seitenleiste beim Ziehen: die andere Seite gibt nicht nach. `gezeigt` ist der gezeigte Stand
   * `{links, rechts, linksEin, rechtsEin}` — offen belegt die Spalte Trenner + Breite, eingeklappt nur den Streifen.
   */
  function hoechstLinks(fensterBreite, gezeigt) {
    if (!passtZweiSpaltig(fensterBreite)) {
      return GROESSTE;
    }
    const g = gezeigt || {};
    const rechtsBelegt = g.rechtsEin ? ERGEBNIS_STREIFEN : TRENNER + zahl(g.rechts, ERGEBNIS);
    return klemme(fensterBreite - rechtsBelegt - TRENNER - DIFF_MINDEST, KLEINSTE, GROESSTE);
  }

  /** Die Höchstbreite der Ergebnis-Spalte beim Ziehen: die Seitenleiste gibt nicht nach (Spiegel von `hoechstLinks`). */
  function hoechstRechts(fensterBreite, gezeigt) {
    if (!passtZweiSpaltig(fensterBreite)) {
      return GROESSTE;
    }
    const g = gezeigt || {};
    const linksBelegt = g.linksEin ? ERGEBNIS_STREIFEN : TRENNER + zahl(g.links, START);
    return klemme(fensterBreite - linksBelegt - TRENNER - DIFF_MINDEST, KLEINSTE, GROESSTE);
  }

  /** Die Breite der linken Seite aus der Zeigerposition: `zeigerX − rahmenLinks`, geklemmt; ein ungültiger Zug lässt sie stehen. */
  function breiteNachZug(zeigerX, rahmenLinks, hoechste, aktuell) {
    const wunsch = Math.round(Number(zeigerX) - Number(rahmenLinks));
    if (!Number.isFinite(wunsch)) {
      return aktuell;
    }
    return klemme(wunsch, KLEINSTE, hoechste);
  }

  /** Die Breite der rechten Seite aus dem rechten Rahmen: `rahmenRechts − Trennerkante − 6`, geklemmt (die Spalte wächst nach links). */
  function breiteNachZugRechts(trennerKante, rahmenRechts, hoechste, aktuell) {
    const wunsch = Math.round(Number(rahmenRechts) - Number(trennerKante) - TRENNER);
    if (!Number.isFinite(wunsch)) {
      return aktuell;
    }
    return klemme(wunsch, KLEINSTE, hoechste);
  }

  /**
   * Die Breite nach einer Taste am Trenner: an der linken Seite verbreitert Pfeil rechts und verschmälert Pfeil links, an der
   * rechten Seite umgekehrt (`richtung = -1`, APG „Window Splitter“: die Spalte wächst nach links); Pos1/Ende auf die Grenzen.
   */
  function breiteNachTaste(breite, taste, hoechste, richtung = 1, schritt = SCHRITT) {
    if (taste === 'Home') {
      return KLEINSTE;
    }
    if (taste === 'End') {
      return hoechste;
    }
    const vorwaerts = taste === 'ArrowRight' ? 1 : taste === 'ArrowLeft' ? -1 : 0;
    if (vorwaerts === 0) {
      return breite;
    }
    return klemme(breite + richtung * vorwaerts * schritt, KLEINSTE, hoechste);
  }

  const api = {
    KLEINSTE, GROESSTE, START, DIFF_MINDEST, TRENNER, SCHRITT,
    ERGEBNIS, ERGEBNIS_MINDEST, ERGEBNIS_START, ERGEBNIS_AUSKLAPPBAR, ERGEBNIS_STREIFEN, VORRANG_RECHTS,
    kleinsteBreite, mindestFensterBreite, passtZweiSpaltig, ergebnisStartetAusgeklappt,
    ergebnisAusklappbar, ergebnisVorhanden,
    klemme, belegung, anzeige, hoechstLinks, hoechstRechts,
    breiteNachZug, breiteNachZugRechts, breiteNachTaste,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaTrennerWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
