/* gitreviewA — Breitenregel des Trennzugs (R00034, B3301): die reine Rechnung um die Breite der Seitenleiste. Im Browser und
   in Node, ohne DOM und ohne Zustand (testbarer Entwurf: entscheiden getrennt vom Handeln). Die Entscheidung des PO (2026-11-25)
   liegt in den festen Werten: Seitenleiste 240–640 px, Start 360 px, Diff mindestens 320 px, Trennerbreite 6 px, Tastenschritt 16 px;
   die tatsächliche Höchstbreite ist `min(640, Fenster − Diff-Mindest − Trenner)`. Unter der Summe der Mindestbreiten (566 px) gibt es
   keinen Trenner — dann passt der zweispaltige Aufbau nicht und es gilt der Rückfall auf eine Spalte (R00033). */
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

  /** Die feste Mindestbreite der Seitenleiste. */
  function kleinsteBreite() {
    return KLEINSTE;
  }

  /** Die tatsächliche Höchstbreite: die feste Obergrenze, verkleinert durch ein enges Fenster, damit der Diff seine Mindestbreite behält. */
  function hoechsteBreite(fensterBreite, diffMindest = DIFF_MINDEST, trenner = TRENNER) {
    return Math.min(GROESSTE, fensterBreite - diffMindest - trenner);
  }

  /** Passt der zweispaltige Aufbau? Genau dann, wenn dem Diff nach der Mindestbreite der Seitenleiste noch seine Mindestbreite bleibt. */
  function passtZweiSpaltig(fensterBreite) {
    return hoechsteBreite(fensterBreite) >= kleinsteBreite();
  }

  /** Auf die Spanne [kleinste, hoechste] klemmen: ein Wert über der Grenze wird geklemmt, nie verworfen. */
  function klemme(breite, kleinste, hoechste) {
    return Math.min(Math.max(breite, kleinste), hoechste);
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
    kleinsteBreite, hoechsteBreite, passtZweiSpaltig, klemme, breiteNachZug, breiteNachTaste,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaTrennerWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
