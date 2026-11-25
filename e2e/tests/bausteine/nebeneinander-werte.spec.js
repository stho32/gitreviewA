'use strict';
// Bausteintests (ohne Browser) der Gegenüberstellung (R00023, B2201): Zeilen `{art, alt, neu, text}` → Tabelle,
// in der ein Lauf entfernter Zeilen dem direkt folgenden Lauf hinzugefügter zeilenweise gegenübersteht (i-te gegen i-te, Überhang gegen leer).
const { test, expect } = require('@playwright/test');
const { gegenueberstellen } = require('../../../src/GitReviewA/web/nebeneinander-werte.js');

const kopf = text => ({ art: 'kopf', alt: null, neu: null, text });
const kontext = (text, alt, neu) => ({ art: 'kontext', alt, neu, text });
const plus = (text, neu) => ({ art: 'plus', alt: null, neu, text });
const minus = (text, alt) => ({ art: 'minus', alt, neu: null, text });
const hinweis = text => ({ art: 'hinweis', alt: null, neu: null, text });

const tabKopf = index => ({ art: 'kopf', links: index, rechts: index });
const tabZeile = (links, rechts) => ({ art: 'zeile', links, rechts });
const tabHinweisLinks = index => ({ art: 'hinweis', links: index, rechts: null });
const tabHinweisRechts = index => ({ art: 'hinweis', links: null, rechts: index });

test.describe('Baustein Gegenüberstellung', () => {
  test('soll einen Lauf entfernter gegen den folgenden Lauf hinzugefügter Zeilen paaren und den Überhang rechts leer lassen (Kriterium 1)', () => {
    const zeilen = [
      kopf('@@ -1,6 +1,7 @@'),
      kontext('eins', 1, 1),
      minus('zwei', 2),
      minus('drei', 3),
      plus('X', 2),
      plus('Y', 3),
      plus('Z', 4),
      kontext('vier', 4, 4),
      kontext('fünf', 5, 5),
      kontext('sechs', 6, 6),
    ];

    expect(gegenueberstellen(zeilen)).toEqual([
      tabKopf(0),
      tabZeile(1, 1),
      tabZeile(2, 4),
      tabZeile(3, 5),
      tabZeile(null, 6),
      tabZeile(7, 7),
      tabZeile(8, 8),
      tabZeile(9, 9),
    ]);
  });

  test('soll einen Lauf entfernter Zeilen ohne folgenden hinzugefügten Lauf links stehen lassen, rechts leer (Kriterium 2)', () => {
    const zeilen = [
      kopf('@@ -1,6 +1,5 @@'),
      kontext('X', 1, 1),
      kontext('Y', 2, 2),
      kontext('Z', 3, 3),
      minus('vier', 4),
      kontext('fünf', 5, 4),
      kontext('sechs', 6, 5),
    ];

    expect(gegenueberstellen(zeilen)).toEqual([
      tabKopf(0),
      tabZeile(1, 1),
      tabZeile(2, 2),
      tabZeile(3, 3),
      tabZeile(4, null),
      tabZeile(5, 5),
      tabZeile(6, 6),
    ]);
  });

  test('soll einen Lauf hinzugefügter Zeilen ohne vorangehenden entfernten Lauf rechts stehen lassen, links leer (Kriterium 3)', () => {
    const zeilen = [kopf('@@ -0,0 +1,2 @@'), plus('drei', 1), plus('vier', 2)];

    expect(gegenueberstellen(zeilen)).toEqual([
      tabKopf(0),
      tabZeile(null, 1),
      tabZeile(null, 2),
    ]);
  });

  test('soll eine reine Löschung links stehen lassen und die Hinweiszeile als eigene Tabellenzeile führen (Kriterium 3)', () => {
    const geloescht = [kopf('@@ -1,4 +0,0 @@'), minus('a1', 1), minus('a2', 2), minus('a3', 3), minus('a4', 4)];
    const ende = [kopf('@@ -1 +1 @@'), minus('a', 1), hinweis('\\ No newline at end of file'), plus('a', 1)];

    expect(gegenueberstellen(geloescht)).toEqual([
      tabKopf(0),
      tabZeile(1, null),
      tabZeile(2, null),
      tabZeile(3, null),
      tabZeile(4, null),
    ]);
    // Die Hinweiszeile steht in der Spalte ihrer Seite: `−a` links, der Hinweis links, `+a` rechts (R00023, Kriterium 3).
    expect(gegenueberstellen(ende)).toEqual([
      tabKopf(0),
      tabZeile(1, null),
      tabHinweisLinks(2),
      tabZeile(null, 3),
    ]);
  });

  test('soll eine Hinweiszeile nach einer hinzugefügten Zeile in die rechte Spalte stellen', () => {
    const zeilen = [kopf('@@ -1 +1 @@'), minus('a', 1), plus('a', 1), hinweis('\\ No newline at end of file')];

    expect(gegenueberstellen(zeilen)).toEqual([
      tabKopf(0),
      tabZeile(1, 2),
      tabHinweisRechts(3),
    ]);
  });

  test('soll einen Hunk-Kopf über beide Spalten stellen und die Abschnittsgrenze die Läufe trennen lassen (Abschnittsgrenze, Kopf trennt)', () => {
    const zeilen = [
      kopf('@@ -1 +1 @@'),
      minus('a', 1),
      plus('A', 1),
      kopf('@@ -9 +9 @@ x'),
      kontext('x', 9, 9),
      minus('y', 10),
      plus('Y', 10),
    ];

    expect(gegenueberstellen(zeilen)).toEqual([
      tabKopf(0),
      tabZeile(1, 2),
      tabKopf(3),
      tabZeile(4, 4),
      tabZeile(5, 6),
    ]);
  });

  test('soll einen Kopf zwischen einem entfernten und einem hinzugefügten Lauf die Paarung trennen lassen', () => {
    const zeilen = [minus('a', 1), kopf('@@ -2 +2 @@'), plus('A', 2)];

    expect(gegenueberstellen(zeilen)).toEqual([
      tabZeile(0, null),
      tabKopf(1),
      tabZeile(null, 2),
    ]);
  });

  test('soll eine leere Liste leer lassen und die Eingabe nicht verändern', () => {
    const zeilen = [kopf('@@ -1 +1 @@'), kontext('x', 1, 1), minus('a', 2), plus('b', 2)];
    const kopie = JSON.parse(JSON.stringify(zeilen));

    expect(gegenueberstellen([])).toEqual([]);
    gegenueberstellen(zeilen);
    expect(zeilen).toEqual(kopie);
  });
});
