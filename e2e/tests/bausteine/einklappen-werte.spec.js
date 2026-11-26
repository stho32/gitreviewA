'use strict';
// Bausteintests ohne Browser des Einklappzustands (R00035, B3401): die reine Rechnung des einen Zustands — Start ausgeklappt,
// Umschalten in beide Richtungen, `aria-expanded` und der Name je Zustand, die Pfeilrichtung. Nur Rechnung: kein DOM, kein
// Server, kein `git`.
const { test, expect } = require('@playwright/test');
const {
  START, start, umschalten, erweitert, name, pfeil, passtZweiSpaltig,
} = require('../../../src/GitReviewA/web/einklappen-werte.js');

test.describe('Baustein Einklappen-Werte — der eine Zustand (R00035)', () => {
  test('soll ausgeklappt starten (nichts wird gespeichert)', () => {
    expect(START).toBe(false);
    expect(start()).toBe(false);
  });

  test('soll den Zustand in beide Richtungen umschalten', () => {
    expect(umschalten(false)).toBe(true);
    expect(umschalten(true)).toBe(false);
    expect(umschalten(umschalten(false))).toBe(false);
  });

  test('soll aria-expanded aus dem Zustand ableiten', () => {
    expect(erweitert(false)).toBe('true');
    expect(erweitert(true)).toBe('false');
  });

  test('soll den Namen je Zustand nennen; er beginnt mit dem sichtbaren Text', () => {
    expect(name('Seitenleiste', false)).toBe('Seitenleiste einklappen');
    expect(name('Seitenleiste', true)).toBe('Seitenleiste ausklappen');
    expect(name('Ergebnis-Spalte', true)).toBe('Ergebnis-Spalte ausklappen');
  });

  test('soll die Pfeilrichtung mit dem Zustand drehen', () => {
    expect(pfeil(false)).toBe('«');
    expect(pfeil(true)).toBe('»');
  });

  test('soll den zweispaltigen Aufbau aus derselben Grenze wie der Trenner lesen (590 px)', () => {
    expect(passtZweiSpaltig(1280)).toBe(true);
    expect(passtZweiSpaltig(590)).toBe(true);
    expect(passtZweiSpaltig(589)).toBe(false);
  });
});