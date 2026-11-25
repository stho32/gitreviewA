'use strict';
// Bausteintests (ohne Browser) der Werte des Umschalters „Umbruch“ (R00032): Start „an“, Umkehrung und die Umbruch-Regel.
const { test, expect } = require('@playwright/test');
const { AN, AUS, startstellung, umschalten, umbrochen } = require('../../../src/GitReviewA/web/umbruch-werte.js');

test.describe('Baustein Umbruch-Werte', () => {
  test('soll die beiden Stellungen als „an“ und „aus“ benennen', () => {
    expect(AN).toBe('an');
    expect(AUS).toBe('aus');
  });

  test('soll beim Laden „an“ starten — lange Zeilen sind umbrochen (R00032, löst den Start „aus“ ab)', () => {
    expect(startstellung()).toBe(AN);
    expect(umbrochen(startstellung()), 'der Start heißt umbrochen').toBe(true);
  });

  test('soll die Stellung umkehren — „an“ ↔ „aus“ (der Umschalter bleibt bedienbar)', () => {
    expect(umschalten(AN)).toBe(AUS);
    expect(umschalten(AUS)).toBe(AN);
    expect(umschalten(umschalten(AN)), 'zweimal umschalten führt zurück').toBe(AN);
  });

  test('soll nur „an“ als umbrochen lesen', () => {
    expect(umbrochen(AN)).toBe(true);
    expect(umbrochen(AUS)).toBe(false);
  });
});
