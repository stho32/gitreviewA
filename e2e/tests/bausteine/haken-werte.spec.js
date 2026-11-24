'use strict';
// Bausteintests (ohne Browser) der reinen Funktionen des Abhakens: Fortschrittstext, Balkenanteil, Schlüssel der Stelle, nächster Zielzustand.
const { test, expect } = require('@playwright/test');
const { fortschrittText, balkenAnteil, stellenSchluessel, naechsterZielzustand } = require('../../../src/GitReviewA/web/haken-werte.js');

const HASH_P = '13ba46c707f0744779fe7c52c3e935814b908017';
const HASH_Q = 'dd13577c75a05e64a0aa01cb6e9053d7548c83d0';

test.describe('Baustein Haken-Werte', () => {
  test('soll den Fortschritt als „n von m abgehakt“ ohne Tausendertrenner nennen und bei m = 0 „Keine Dateien zum Abhaken“', () => {
    expect(fortschrittText(0, 8)).toBe('0 von 8 abgehakt');
    expect(fortschrittText(1, 8)).toBe('1 von 8 abgehakt');
    expect(fortschrittText(8, 8)).toBe('8 von 8 abgehakt');
    expect(fortschrittText(1000, 2000)).toBe('1000 von 2000 abgehakt');
    expect(fortschrittText(0, 0)).toBe('Keine Dateien zum Abhaken');
  });

  test('soll den Balken als Anteil n / m rechnen und bei m = 0 leer lassen', () => {
    expect(balkenAnteil(0, 8)).toBe(0);
    expect(balkenAnteil(1, 8)).toBe(0.125);
    expect(balkenAnteil(8, 8)).toBe(1);
    expect(balkenAnteil(1, 2000)).toBe(0.0005);
    expect(balkenAnteil(0, 0)).toBe(0);
  });

  test('soll dieselbe Datei in zwei Commits als zwei Stellen unterscheiden und Pfade mit Leerzeichen nicht verwechseln', () => {
    expect(stellenSchluessel(HASH_P, 'src/b.txt')).not.toBe(stellenSchluessel(HASH_Q, 'src/b.txt'));
    expect(stellenSchluessel(HASH_P, 'a b')).not.toBe(stellenSchluessel(HASH_P, 'a'));
    expect(stellenSchluessel(HASH_P, 'src/b.txt')).toBe(stellenSchluessel(HASH_P, 'src/b.txt'));
  });

  test('soll den nächsten Zielzustand aus dem letzten Wunsch rechnen, sonst aus dem bestätigten Zustand', () => {
    expect(naechsterZielzustand(false, undefined)).toBe(true);
    expect(naechsterZielzustand(true, undefined)).toBe(false);
    expect(naechsterZielzustand(false, true)).toBe(false);
    expect(naechsterZielzustand(true, false)).toBe(true);
  });
});
