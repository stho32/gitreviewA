'use strict';
// Bausteintests (ohne Browser) der Breitenregel des Trennzugs (R00034, B3301): die festen Werte der Entscheidung des PO,
// die Höchstbreite aus der Fensterbreite, das Klemmen an beiden Grenzen, die Taste je Richtung und Pos1/Ende und der
// ungültige Zug (unverändert). Lehre „Wert aus einer Einstellung als Spanne prüfen“: die Mutanten „nur Obergrenze“,
// „nur Untergrenze“ und „fest/ignoriert“ stehen als eigene Zeilen.
const { test, expect } = require('@playwright/test');
const {
  kleinsteBreite, hoechsteBreite, klemme, breiteNachZug, breiteNachTaste, passtZweiSpaltig,
  KLEINSTE, GROESSTE, START, DIFF_MINDEST, TRENNER, SCHRITT,
} = require('../../../src/GitReviewA/web/trenner-werte.js');

test.describe('Baustein Trenner-Werte — feste Werte (R00034)', () => {
  test('soll die Grenzen und den Start aus der Entscheidung des PO tragen', () => {
    expect(KLEINSTE).toBe(240);
    expect(GROESSTE).toBe(640);
    expect(START).toBe(360);
    expect(DIFF_MINDEST).toBe(320);
    expect(TRENNER).toBe(6);
    expect(SCHRITT).toBe(16);
    expect(kleinsteBreite()).toBe(240);
  });
});

test.describe('Baustein Trenner-Werte — Höchstbreite aus der Fensterbreite (R00034)', () => {
  test('soll die Höchstbreite als min(640, Fenster − 320 − 6) rechnen', () => {
    expect(hoechsteBreite(1280)).toBe(640);
    expect(hoechsteBreite(966)).toBe(640); // 966 − 320 − 6 = 640, genau die feste Obergrenze
    expect(hoechsteBreite(700)).toBe(374);
    expect(hoechsteBreite(566)).toBe(240);
    expect(hoechsteBreite(400)).toBe(74);
  });

  test('soll den zweispaltigen Aufbau an 566 px festmachen (Fallback darunter, R00033)', () => {
    expect(passtZweiSpaltig(1280)).toBe(true);
    expect(passtZweiSpaltig(566)).toBe(true);
    expect(passtZweiSpaltig(565)).toBe(false);
    expect(passtZweiSpaltig(560)).toBe(false);
  });
});

test.describe('Baustein Trenner-Werte — Klemmen an beiden Grenzen (R00034)', () => {
  test('soll an der Untergrenze klemmen (Mutant „nur Obergrenze“ entlarvt)', () => {
    expect(klemme(100, 240, 640)).toBe(240);
    expect(klemme(-1000, 240, 640)).toBe(240);
    expect(klemme(239, 240, 640)).toBe(240);
    expect(klemme(240, 240, 640)).toBe(240); // genau an der Grenze
  });

  test('soll an der Obergrenze klemmen (Mutant „nur Untergrenze“ entlarvt)', () => {
    expect(klemme(900, 240, 640)).toBe(640);
    expect(klemme(1000, 240, 640)).toBe(640);
    expect(klemme(641, 240, 640)).toBe(640);
    expect(klemme(640, 240, 640)).toBe(640); // genau an der Grenze
  });

  test('soll einen Wert innerhalb der Spanne unverändert lassen (Mutant „fest/ignoriert“ entlarvt)', () => {
    expect(klemme(460, 240, 640)).toBe(460);
    expect(klemme(241, 240, 640)).toBe(241);
    expect(klemme(639, 240, 640)).toBe(639);
  });
});

test.describe('Baustein Trenner-Werte — Zug (R00034)', () => {
  test('soll die Breite aus der Zeigerposition und dem linken Rahmen rechnen', () => {
    expect(breiteNachZug(460, 0, 640, 360)).toBe(460);
    expect(breiteNachZug(460, 0, 640, 360)).toBe(460); // Startbreite 360 + 100 px Zug = 460
    expect(breiteNachZug(700 + 374, 700, 374, 360)).toBe(374); // Rahmen bei 700, Höchstbreite 374
    expect(breiteNachZug(700 + 200, 700, 640, 360)).toBe(240); // 200 px gewünscht, unter der Mindestbreite → 240
  });

  test('soll den Zug an beiden Grenzen klemmen', () => {
    expect(breiteNachZug(100, 0, 640, 360)).toBe(240); // unter Min
    expect(breiteNachZug(900, 0, 640, 360)).toBe(640); // über Max
  });

  test('soll bei ungültigem Zug die Breite unverändert lassen', () => {
    expect(breiteNachZug(NaN, 0, 640, 360)).toBe(360);
    expect(breiteNachZug(undefined, 0, 640, 360)).toBe(360);
    expect(breiteNachZug('x', 0, 640, 360)).toBe(360);
  });
});

test.describe('Baustein Trenner-Werte — Taste (R00034)', () => {
  test('soll Pfeil rechts/links um 16 px verstellen und an den Grenzen klemmen', () => {
    expect(breiteNachTaste(360, 'ArrowRight', 640)).toBe(376);
    expect(breiteNachTaste(360, 'ArrowLeft', 640)).toBe(344);
    expect(breiteNachTaste(240, 'ArrowLeft', 640)).toBe(240); // schon auf Min: nichts ändert sich
    expect(breiteNachTaste(640, 'ArrowRight', 640)).toBe(640);
    expect(breiteNachTaste(632, 'ArrowRight', 640)).toBe(640); // 648 → 640 (geklemmt)
  });

  test('soll Pos1 auf die Mindest- und Ende auf die Höchstbreite setzen', () => {
    expect(breiteNachTaste(360, 'Home', 640)).toBe(240);
    expect(breiteNachTaste(360, 'End', 640)).toBe(640);
    expect(breiteNachTaste(360, 'End', 374)).toBe(374); // im schmalen Fenster die tatsächliche Höchstbreite
  });

  test('soll eine unbekannte Taste die Breite nicht ändern lassen', () => {
    expect(breiteNachTaste(360, 'ArrowUp', 640)).toBe(360);
    expect(breiteNachTaste(360, 'ArrowDown', 640)).toBe(360);
    expect(breiteNachTaste(360, 'a', 640)).toBe(360);
    expect(breiteNachTaste(360, 'Enter', 640)).toBe(360);
  });
});
