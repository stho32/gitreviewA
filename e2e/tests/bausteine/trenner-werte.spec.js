'use strict';
// Bausteintests (ohne Browser) der Breitenregel des Trennzugs und der Ergebnis-Spalte (R00034/R00037, B3301/B3605): die festen
// Werte der Entscheidung des PO, die Höchstbreite aus der Fensterbreite mit und ohne ausgeklappte Ergebnis-Spalte, die
// Schwellen 1012/811/566, das Klemmen an beiden Grenzen, die Taste je Richtung und Pos1/Ende und der ungültige Zug. Lehre
// „Wert aus einer Einstellung als Spanne prüfen“: die Mutanten „nur Obergrenze“, „nur Untergrenze“ und „fest/ignoriert“ stehen
// als eigene Zeilen.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const {
  kleinsteBreite, hoechsteBreite, klemme, breiteNachZug, breiteNachTaste, passtZweiSpaltig, mindestFensterBreite,
  ergebnisBreite, ergebnisStartetAusgeklappt, ergebnisAusklappbar, ergebnisVorhanden,
  KLEINSTE, GROESSTE, START, DIFF_MINDEST, TRENNER, SCHRITT,
  ERGEBNIS, ERGEBNIS_MINDEST, ERGEBNIS_START, ERGEBNIS_AUSKLAPPBAR, ERGEBNIS_STREIFEN,
} = require('../../../src/GitReviewA/web/trenner-werte.js');

test.describe('Baustein Trenner-Werte — feste Werte (R00034/R00037)', () => {
  test('soll die Grenzen und den Start aus der Entscheidung des PO tragen', () => {
    expect(KLEINSTE).toBe(240);
    expect(GROESSTE).toBe(640);
    expect(START).toBe(360);
    expect(DIFF_MINDEST).toBe(320);
    expect(TRENNER).toBe(6);
    expect(SCHRITT).toBe(16);
    expect(kleinsteBreite()).toBe(240);
  });

  test('soll die Werte der Ergebnis-Spalte aus der Entscheidung des PO tragen', () => {
    expect(ERGEBNIS).toBe(320);
    expect(ERGEBNIS_MINDEST).toBe(240);
    expect(ERGEBNIS_START).toBe(1012);
    expect(ERGEBNIS_AUSKLAPPBAR).toBe(812);
    expect(ERGEBNIS_STREIFEN).toBe(24);
  });
});

test.describe('Baustein Trenner-Werte — Höchstbreite aus der Fensterbreite (R00034/R00037)', () => {
  test('soll mit eingeklappter Ergebnis-Spalte min(640, Fenster − 320 − 6 − 24) rechnen', () => {
    expect(hoechsteBreite(1280, 0)).toBe(640); // 1280 − 350 = 930, geklemmt auf 640
    expect(hoechsteBreite(966, 0)).toBe(616); // 966 − 350
    expect(hoechsteBreite(700, 0)).toBe(350);
    expect(hoechsteBreite(566, 0)).toBe(240); // 566 − 350 = 216, unter der Mindestbreite → 240
    expect(hoechsteBreite(400, 0)).toBe(240);
  });

  test('soll mit ausgeklappter Ergebnis-Spalte die Spalte und den zweiten Trenner einrechnen', () => {
    expect(hoechsteBreite(1280, 320)).toBe(628); // 1280 − 320 − 6 − 326
    expect(hoechsteBreite(1012, 320)).toBe(360); // genau die Startbreite
    expect(hoechsteBreite(900, 320)).toBe(248);
    expect(hoechsteBreite(812, 240)).toBe(240); // kleinste Spalte, Diff genau 320
  });

  test('soll den zweispaltigen Aufbau an 566 px festmachen (Fallback darunter, R00033)', () => {
    expect(passtZweiSpaltig(1280)).toBe(true);
    expect(passtZweiSpaltig(566)).toBe(true);
    expect(passtZweiSpaltig(565)).toBe(false);
    expect(passtZweiSpaltig(560)).toBe(false);
  });

  test('soll die Breite der Ergebnis-Spalte zwischen 240 und 320 px rechnen', () => {
    expect(ergebnisBreite(812)).toBe(240);
    expect(ergebnisBreite(813)).toBe(241);
    expect(ergebnisBreite(891)).toBe(319);
    expect(ergebnisBreite(892)).toBe(320);
    expect(ergebnisBreite(1012)).toBe(320);
    expect(ergebnisBreite(1280)).toBe(320);
  });

  test('soll Start, Ausklappen und Vorhandensein der Spalte an den Schwellen festmachen', () => {
    expect(ergebnisStartetAusgeklappt(1012)).toBe(true);
    expect(ergebnisStartetAusgeklappt(1011)).toBe(false);
    expect(ergebnisAusklappbar(812)).toBe(true);
    expect(ergebnisAusklappbar(811)).toBe(false);
    expect(ergebnisVorhanden(566)).toBe(true);
    expect(ergebnisVorhanden(565)).toBe(false);
  });
});

test.describe('Baustein Trenner-Werte — eine Quelle für die 566-Grenze (R00034)', () => {
  test('soll die Mindestfensterbreite als Summe der Mindestbreiten rechnen und mit der CSS-Mediengrenze übereinstimmen', () => {
    expect(mindestFensterBreite()).toBe(566);
    expect(mindestFensterBreite()).toBe(KLEINSTE + DIFF_MINDEST + TRENNER);

    const css = fs.readFileSync(path.join(__dirname, '../../../src/GitReviewA/web/gitreviewa.css'), 'utf8');
    const stelle = css.indexOf('--gr-leiste-breite');
    const davor = css.slice(0, stelle);
    const treffer = [...davor.matchAll(/@media\s*\(min-width:(\d+)px\)/g)].pop();
    expect(treffer, 'Mediengrenze vor der Rahmen-Regel gefunden').toBeTruthy();
    expect(Number(treffer[1]), 'CSS-Mediengrenze stimmt mit mindestFensterBreite() überein').toBe(mindestFensterBreite());
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

  test('soll bei einer Höchstbreite unter der Mindestbreite die Mindestbreite halten', () => {
    expect(klemme(360, 240, 216)).toBe(240);
    expect(klemme(0, 240, 216)).toBe(240);
  });
});

test.describe('Baustein Trenner-Werte — Zug (R00034)', () => {
  test('soll die Breite aus der Zeigerposition und dem linken Rahmen rechnen', () => {
    expect(breiteNachZug(460, 0, 640, 360)).toBe(460);
    expect(breiteNachZug(700 + 350, 700, 350, 360)).toBe(350); // Rahmen bei 700, Höchstbreite 350
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
    expect(breiteNachTaste(360, 'End', 350)).toBe(350); // im schmalen Fenster die tatsächliche Höchstbreite
  });

  test('soll eine unbekannte Taste die Breite nicht ändern lassen', () => {
    expect(breiteNachTaste(360, 'ArrowUp', 640)).toBe(360);
    expect(breiteNachTaste(360, 'ArrowDown', 640)).toBe(360);
    expect(breiteNachTaste(360, 'a', 640)).toBe(360);
    expect(breiteNachTaste(360, 'Enter', 640)).toBe(360);
  });
});
