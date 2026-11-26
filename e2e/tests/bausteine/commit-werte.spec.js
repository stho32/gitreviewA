'use strict';
// Bausteintests (ohne Browser) der reinen Anzeigefunktionen der Commit-Leiste.
const { test, expect } = require('@playwright/test');
const { datumText, zeilenwerte, betreffVon } = require('../../../src/GitReviewA/web/commit-werte.js');

test.describe('Baustein Commit-Werte', () => {
  test('soll das Datum als TT.MM.JJJJ HH:MM in der Ortszeit zeigen', () => {
    const ortszeitVorher = process.env.TZ;
    try {
      process.env.TZ = 'Europe/Berlin';
      expect(datumText('2026-03-05T18:30:00+01:00')).toBe('05.03.2026 18:30');
      process.env.TZ = 'UTC';
      expect(datumText('2026-03-05T18:30:00+01:00')).toBe('05.03.2026 17:30');
      process.env.TZ = 'America/New_York';
      expect(datumText('2026-01-01T03:05:00+01:00')).toBe('31.12.2025 21:05');
    } finally {
      process.env.TZ = ortszeitVorher;
    }
  });

  test('soll einen Zeitpunkt, der keiner ist, unverändert zeigen', () => {
    expect(datumText('kein Datum')).toBe('kein Datum');
  });

  test('soll ein leeres Datum als „Datum nicht lesbar“ zeigen (R00048 Kriterium 11, L2)', () => {
    expect(datumText('')).toBe('Datum nicht lesbar');

    const werte = zeilenwerte({ kurzHash: 'a1b2c3d', autor: 'NUL Name', datum: '', betreff: 'NUL im Autorkopf', rumpf: '' });

    expect(werte.datum).toBe('Datum nicht lesbar');
    expect(werte.datumHinweis).toBe('');
    expect(werte.autor).toBe('NUL Name');
    expect(werte.betreff).toBe('NUL im Autorkopf');
  });

  test('soll je Commit Kurz-Hash, Betreff, Autor, Datum mit Hinweis und Rumpf liefern', () => {
    const werte = zeilenwerte({ hash: 'c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6', kurzHash: 'c3d4e5f', autor: 'Bernd', datum: 'kein Datum', betreff: 'B', rumpf: 'R' });

    expect(werte).toEqual({ kurz: 'c3d4e5f', betreff: 'B', autor: 'Bernd', datum: 'kein Datum', datumHinweis: 'kein Datum', rumpf: 'R', hatRumpf: true });
    expect(zeilenwerte({ kurzHash: 'a', autor: '', datum: '', betreff: '', rumpf: '' }).hatRumpf).toBe(false);
  });

  test('soll Steuerzeichen der Schreibrichtung aus fremdem Text entfernen', () => {
    const werte = zeilenwerte({ kurzHash: 'a', autor: 'A\u202Eb\u200F', datum: '', betreff: '\u2066x\u2069\u061C', rumpf: 'r\u202D\u200E' });

    expect([werte.autor, werte.betreff, werte.rumpf]).toEqual(['Ab', 'x', 'r']);
  });

  test('soll den Betreff eines Commits so liefern, wie die Zeile ihn zeigt (M1: nie roh)', () => {
    const commits = [{ hash: 'abc1234', kurzHash: 'abc1234', autor: '', datum: '', betreff: 'Start \u202Eoberflaeche\u2066', rumpf: '' }];

    expect(betreffVon(commits, 'abc1234')).toBe('Start oberflaeche');
    expect(betreffVon(commits, 'fedcba9')).toBe('');
  });

  test('Kriterium 7: Betreff, Autor und Rumpf werden auf 20 000 Zeichen gekürzt', () => {
    const werte = zeilenwerte({
      kurzHash: 'a',
      betreff: 'B'.repeat(25000),
      autor: 'A'.repeat(25000),
      rumpf: 'r'.repeat(25000),
      datum: '2026-01-01T00:00:00Z',
    });

    expect(werte.betreff).toBe(`${'B'.repeat(20000)}… (5000 Zeichen nicht gezeigt)`);
    expect(werte.autor).toBe(`${'A'.repeat(20000)}… (5000 Zeichen nicht gezeigt)`);
    expect(werte.rumpf).toBe(`${'r'.repeat(20000)}… (5000 Zeichen nicht gezeigt)`);
  });

  test('Kriterium 5: erst kürzen, dann Richtungszeichen entfernen — die Zahl n zählt das Zeichen mit', () => {
    const werte = zeilenwerte({
      kurzHash: 'a',
      betreff: 'B',
      autor: 'A',
      rumpf: `${'a'.repeat(19999)}\u202E${'b'.repeat(10)}`,
      datum: '2026-01-01T00:00:00Z',
    });

    expect(werte.rumpf).toBe(`${'a'.repeat(19999)}… (10 Zeichen nicht gezeigt)`);
    expect(werte.rumpf).not.toContain('\u202E');
  });

  test('soll einen Rumpf aus nur Richtungszeichen als leer erkennen', () => {
    expect(zeilenwerte({ kurzHash: 'a', betreff: 'B', autor: 'A', rumpf: '\u202E\u202D', datum: '2026-01-01T00:00:00Z' }).hatRumpf).toBe(false);
  });

  test('Kriterium 7: betreffVon kürzt den Betreff und entfernt Richtungszeichen', () => {
    const commits = [{ hash: 'a', kurzHash: 'a', betreff: `${'B'.repeat(19999)}\u202E${'b'.repeat(10)}`, rumpf: 'r' }];

    expect(betreffVon(commits, 'a')).toBe(`${'B'.repeat(19999)}… (10 Zeichen nicht gezeigt)`);
  });
});
