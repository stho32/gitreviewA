'use strict';
// Bausteintests (ohne Browser) der reinen Rechnung der Navigation (R00028, B2701): die nächste ungeprüfte Stelle ab der aktuellen
// Wahl, vorwärts, gesperrte übersprungen, mit Umlauf. Kein `git`, kein Server — nur die schon geladene Liste und der Stand.
const { test, expect } = require('@playwright/test');
const { naechster, KEINE } = require('../../../src/GitReviewA/web/naechste-werte.js');

const abgehakt = (pfad, commit) => ({ art: commit ? 'stelle' : 'datei', commit, pfad, zustand: 'abgehakt' });
const ungeprueft = (pfad, commit) => ({ art: commit ? 'stelle' : 'datei', commit, pfad, zustand: 'ungeprueft' });
const gesperrt = (pfad, commit) => ({ art: commit ? 'stelle' : 'datei', commit, pfad, zustand: 'gesperrt' });

test.describe('Baustein Nächste-Werte — die nächste ungeprüfte finden (B2701)', () => {
  test('soll ohne Einträge keine Stelle nennen', () => {
    expect(naechster([], null)).toBe(KEINE);
  });

  test('soll ohne aktuelle Stelle die erste ungeprüfte nehmen und abgehakte und gesperrte überspringen', () => {
    const eintraege = [abgehakt('a.txt'), gesperrt('b.txt'), ungeprueft('c.txt'), ungeprueft('d.txt')];

    expect(naechster(eintraege, null)).toBe(2);
    expect(naechster(eintraege, undefined)).toBe(2);
  });

  test('soll ab der aktuellen Stelle vorwärts gehen und nicht auf ihr selbst landen', () => {
    const eintraege = [ungeprueft('a.txt'), ungeprueft('b.txt'), ungeprueft('c.txt')];

    expect(naechster(eintraege, { pfad: 'a.txt' })).toBe(1);
    expect(naechster(eintraege, { pfad: 'b.txt' })).toBe(2);
  });

  test('soll am Ende zur ersten ungeprüften umlaufen (Umlauf)', () => {
    const eintraege = [ungeprueft('a.txt'), ungeprueft('b.txt'), ungeprueft('c.txt')];

    expect(naechster(eintraege, { pfad: 'c.txt' })).toBe(0);
  });

  test('soll über abgehakte und gesperrte Einträge hinweg umlaufen', () => {
    const eintraege = [abgehakt('a.txt'), gesperrt('b.txt'), ungeprueft('c.txt'), abgehakt('d.txt')];

    expect(naechster(eintraege, { pfad: 'd.txt' })).toBe(2);
  });

  test('soll nur die eigenen Stellen des Eintrags vergleichen (Einzeln: Commit und Datei)', () => {
    const eintraege = [ungeprueft('a.txt', 'z1'), ungeprueft('a.txt', 'z2'), ungeprueft('b.txt', 'z2')];

    expect(naechster(eintraege, { commit: 'z1', pfad: 'a.txt' })).toBe(1);
    expect(naechster(eintraege, { commit: 'z2', pfad: 'a.txt' })).toBe(2);
  });

  test('soll ohne passenden Eintrag zur aktuellen Stelle von vorn beginnen', () => {
    const eintraege = [abgehakt('a.txt'), ungeprueft('b.txt')];

    expect(naechster(eintraege, { pfad: 'weg.txt' })).toBe(1);
  });

  test('soll bei nur abgehakten und gesperrten Einträgen keine Stelle nennen', () => {
    expect(naechster([abgehakt('a.txt'), gesperrt('b.txt')], null)).toBe(KEINE);
    expect(naechster([abgehakt('a.txt'), gesperrt('b.txt')], { pfad: 'a.txt' })).toBe(KEINE);
  });

  test('soll eine einzelne ungeprüfte Stelle auch von sich aus wiederfinden (Umlauf über einen Eintrag)', () => {
    const eintraege = [abgehakt('a.txt'), ungeprueft('b.txt')];

    expect(naechster(eintraege, { pfad: 'b.txt' })).toBe(1);
  });
});
