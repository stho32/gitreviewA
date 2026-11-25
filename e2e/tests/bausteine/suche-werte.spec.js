'use strict';
// Bausteintests (ohne Browser) der reinen Suche: Suchbegriff prüfen (R00027, B2601).
const { test, expect } = require('@playwright/test');
const { pruefe, ZEICHEN_GRENZE } = require('../../../src/GitReviewA/web/suche-werte.js');

test.describe('Baustein Suche-Werte — Suchbegriff prüfen (R00027, B2601)', () => {
  test('soll einen nicht-leeren Begriff bis zur Längengrenze annehmen', () => {
    expect(ZEICHEN_GRENZE).toBe(200);
    expect(pruefe('zwei')).toEqual({ gueltig: true, grund: null, meldung: '' });
    expect(pruefe('a.c')).toEqual({ gueltig: true, grund: null, meldung: '' });
    expect(pruefe('.*')).toEqual({ gueltig: true, grund: null, meldung: '' });
    expect(pruefe('  a  ')).toEqual({ gueltig: true, grund: null, meldung: '' });
    expect(pruefe('a'.repeat(ZEICHEN_GRENZE)).gueltig).toBe(true);
  });

  test('soll einen leeren Begriff oder nur Leerraum ablehnen', () => {
    expect(pruefe('')).toEqual({ gueltig: false, grund: 'leer', meldung: 'Bitte einen Suchbegriff eingeben.' });
    expect(pruefe('   ')).toEqual({ gueltig: false, grund: 'leer', meldung: 'Bitte einen Suchbegriff eingeben.' });
    expect(pruefe('\t')).toEqual({ gueltig: false, grund: 'leer', meldung: 'Bitte einen Suchbegriff eingeben.' });
  });

  test('soll einen Begriff über 200 Zeichen ablehnen', () => {
    expect(pruefe('a'.repeat(ZEICHEN_GRENZE + 1))).toEqual({
      gueltig: false, grund: 'zuLang', meldung: 'Der Suchbegriff darf höchstens 200 Zeichen haben.',
    });
  });
});
