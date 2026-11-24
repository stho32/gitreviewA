'use strict';
// Bausteintests (ohne Browser) der reinen Anzeigefunktionen der Commit-Leiste.
const { test, expect } = require('@playwright/test');
const { datumText, zeilenwerte } = require('../../../src/GitReviewA/web/commit-werte.js');

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

  test('soll je Commit Kurz-Hash, Betreff, Autor, Datum mit Hinweis und Rumpf liefern', () => {
    const werte = zeilenwerte({ hash: 'c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6', kurzHash: 'c3d4e5f', autor: 'Bernd', datum: 'kein Datum', betreff: 'B', rumpf: 'R' });

    expect(werte).toEqual({ kurz: 'c3d4e5f', betreff: 'B', autor: 'Bernd', datum: 'kein Datum', datumHinweis: 'kein Datum', rumpf: 'R', hatRumpf: true });
    expect(zeilenwerte({ kurzHash: 'a', autor: '', datum: '', betreff: '', rumpf: '' }).hatRumpf).toBe(false);
  });

  test('soll Steuerzeichen der Schreibrichtung aus fremdem Text entfernen', () => {
    const werte = zeilenwerte({ kurzHash: 'a', autor: 'A\u202Eb\u200F', datum: '', betreff: '\u2066x\u2069\u061C', rumpf: 'r\u202D\u200E' });

    expect([werte.autor, werte.betreff, werte.rumpf]).toEqual(['Ab', 'x', 'r']);
  });
});
