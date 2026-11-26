/* gitreviewA — Breitenregel des Trennzugs und der Ergebnis-Spalte (R00034, R00037, B3301/B3605): die reine Rechnung um die
   Breite der Seitenleiste und die drei Bereiche. Im Browser und in Node, ohne DOM und ohne Zustand (testbarer Entwurf:
   entscheiden getrennt vom Handeln). Die Entscheidung des PO (2026-11-25, Zeile 194) liegt in den festen Werten: Seitenleiste
   240–640 px, Start 360 px, Diff mindestens 320 px, Trennerbreite 6 px, Tastenschritt 16 px; Ergebnis-Spalte 320 px breit
   (Mindestbreite 240 px), ausgeklappt ab 1012 px, unter 812 px nicht ausklappbar, Streifen 24 px. Die tatsächliche
   Höchstbreite der Seitenleiste rechnet die Ergebnis-Spalte ein (R00037), sodass der Diff nie unter 320 px fällt. Unter der
   Summe der Mindestbreiten (566 px) gibt es keinen Trenner — dann passt der zweispaltige Aufbau nicht und es gilt der Rückfall
   auf eine Spalte (R00033). Die Summe ist `mindestFensterBreite()`; die CSS-Mediengrenze muss dazu passen (Test). */
(function (ziel) {
  'use strict';

  /** Seitenleiste: die feste Unter- und Obergrenze und die Startbreite (Doppelklick setzt darauf zurück). */
  const KLEINSTE = 240;
  const GROESSTE = 640;
  const START = 360;
  /** Der Diff darf nie schmaler als seine Mindestbreite werden; der Trenner belegt eine eigene Spalte. */
  const DIFF_MINDEST = 320;
  const TRENNER = 6;
  /** Ein Pfeildruck verstellt um so viele Pixel; Pos1/Ende setzen auf die vollen Grenzen. */
  const SCHRITT = 16;
  /** Die Ergebnis-Spalte (R00037): Wunschbreite, Mindestbreite, Start- und Ausklappgrenze, Breite des Streifens. */
  const ERGEBNIS = 320;
  const ERGEBNIS_MINDEST = 240;
  const ERGEBNIS_START = 1012;
  const ERGEBNIS_AUSKLAPPBAR = 812;
  const ERGEBNIS_STREIFEN = 24;

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

  /**
   * Die Breite der ausgeklappten Ergebnis-Spalte aus der Fensterbreite: 320 px, wenn neben der Mindestbreite der Seitenleiste
   * und dem Diff (320 px) noch Platz bleibt, sonst bis auf 240 px verkleinert (R00037/R00042). Bei 812 px ergibt das 240,
   * bei 892 px und darüber 320.
   */
  function ergebnisBreite(fensterBreite) {
    const platz = fensterBreite - KLEINSTE - DIFF_MINDEST - 2 * TRENNER;
    return Math.min(ERGEBNIS, Math.max(ERGEBNIS_MINDEST, platz));
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

  /**
   * Die tatsächliche Höchstbreite der Seitenleiste: die feste Obergrenze, verkleinert durch ein enges Fenster und die
   * Ergebnis-Spalte. Ist die Spalte ausgeklappt, belegt sie ihre Breite plus den Trenner; ist sie eingeklappt, den Streifen
   * (24 px). So bleibt dem Diff immer seine Mindestbreite. Unter der Mindestbreite gibt die Formel die Mindestbreite zurück.
   */
  function hoechsteBreite(fensterBreite, ergebnisBreiteJetzt = 0) {
    const rechts = ergebnisBreiteJetzt > 0 ? ergebnisBreiteJetzt + TRENNER : ERGEBNIS_STREIFEN;
    return Math.max(KLEINSTE, Math.min(GROESSTE, fensterBreite - DIFF_MINDEST - TRENNER - rechts));
  }

  /** Auf die Spanne [kleinste, hoechste] klemmen: ein Wert über der Grenze wird geklemmt, nie verworfen. */
  function klemme(breite, kleinste, hoechste) {
    return Math.max(Math.min(breite, hoechste), kleinste);
  }

  /** Die Breite aus der Zeigerposition: `zeigerX − rahmenLinks`, geklemmt; ein ungültiger Zug lässt die Breite unverändert. */
  function breiteNachZug(zeigerX, rahmenLinks, hoechste, aktuell) {
    const wunsch = Math.round(Number(zeigerX) - Number(rahmenLinks));
    if (!Number.isFinite(wunsch)) {
      return aktuell;
    }
    return klemme(wunsch, KLEINSTE, hoechste);
  }

  /** Die Breite nach einer Taste am Trenner: Pfeil rechts/links um `schritt`, Pos1/Ende auf die Grenzen, sonst unverändert. */
  function breiteNachTaste(breite, taste, hoechste, schritt = SCHRITT) {
    if (taste === 'ArrowRight') {
      return klemme(breite + schritt, KLEINSTE, hoechste);
    }
    if (taste === 'ArrowLeft') {
      return klemme(breite - schritt, KLEINSTE, hoechste);
    }
    if (taste === 'Home') {
      return KLEINSTE;
    }
    if (taste === 'End') {
      return hoechste;
    }
    return breite;
  }

  const api = {
    KLEINSTE, GROESSTE, START, DIFF_MINDEST, TRENNER, SCHRITT,
    ERGEBNIS, ERGEBNIS_MINDEST, ERGEBNIS_START, ERGEBNIS_AUSKLAPPBAR, ERGEBNIS_STREIFEN,
    kleinsteBreite, mindestFensterBreite, passtZweiSpaltig, ergebnisBreite, ergebnisStartetAusgeklappt,
    ergebnisAusklappbar, ergebnisVorhanden, hoechsteBreite, klemme, breiteNachZug, breiteNachTaste,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaTrennerWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
