'use strict';
// Bausteintests (ohne Browser) der Lücken-Rechnung (R00026, B2505): Lücken vor dem ersten, zwischen zwei und nach dem letzten
// Abschnitt — Zahl der verborgenen Zeilen und Nummernspanne alt/neu; Schrittweite 20.
const { test, expect } = require('@playwright/test');
const { patchZeilen } = require('../../../src/GitReviewA/web/diff-werte.js');
const { luecken, rest, naechsterSchritt, SCHRITT } = require('../../../src/GitReviewA/web/luecken-werte.js');

const kopf = text => ({ art: 'kopf', alt: null, neu: null, text });
const kontext = (text, nummer) => ({ art: 'kontext', alt: nummer, neu: nummer, text });

/** Der Patch von `weit.txt` aus Repo W (R00026): zwei Abschnitte, dazwischen 23 verborgene Zeilen, die Datei hat 60 Zeilen. */
const WEIT_PATCH = [
  '@@ -2,7 +2,7 @@',
  ' z02', ' z03', ' z04', '-z05', '+Z05', ' z06', ' z07', ' z08',
  '@@ -32,7 +32,7 @@',
  ' z32', ' z33', ' z34', '-z35', '+Z35', ' z36', ' z37', ' z38',
].join('\n');

test.describe('Lücken rechnen', () => {
  test('soll vor dem ersten, zwischen zwei und nach dem letzten Abschnitt die Zahl und die Nummernspanne nennen', () => {
    const zeilen = patchZeilen(WEIT_PATCH);

    const gefunden = luecken(zeilen, 60);

    expect(zeilen).toHaveLength(18);
    expect(gefunden).toEqual([
      { stelle: 0, altVon: 1, altBis: 1, neuVon: 1, neuBis: 1, zahl: 1 },
      { stelle: 9, altVon: 9, altBis: 31, neuVon: 9, neuBis: 31, zahl: 23 },
      { stelle: 18, altVon: 39, altBis: 60, neuVon: 39, neuBis: 60, zahl: 22 },
    ]);
  });

  test('soll die letzte Lücke erst mit der Gesamtzeilenzahl nennen und ohne sie weglassen', () => {
    const zeilen = patchZeilen(WEIT_PATCH);

    expect(luecken(zeilen, null).map(luecke => luecke.zahl)).toEqual([1, 23]);
    expect(luecken(zeilen).map(luecke => luecke.zahl)).toEqual([1, 23]);
  });

  test('soll einen Abschnitt ab Zeile 1 ohne Lücke davor lassen', () => {
    const zeilen = [kopf('@@ -1,3 +1,3 @@'), kontext('a', 1), kontext('b', 2), kontext('c', 3)];

    expect(luecken(zeilen, 3)).toEqual([]);
    expect(luecken(zeilen, 10)).toEqual([{ stelle: 4, altVon: 4, altBis: 10, neuVon: 4, neuBis: 10, zahl: 7 }]);
  });

  test('soll in der Ansicht „ganze Datei“ (ohne Abschnittskopf) keine Lücke finden', () => {
    expect(luecken([kontext('a', 1), kontext('b', 2)], 2)).toEqual([]);
  });

  test('soll den Rest nach dem letzten Abschnitt aus der Gesamtzeilenzahl rechnen und am Dateiende nichts ankündigen', () => {
    const zeilen = [kopf('@@ -4,2 +4,3 @@'), kontext('a', 4), kontext('b', 5)];

    expect(luecken(zeilen, 6)).toEqual([{ stelle: 0, altVon: 1, altBis: 3, neuVon: 1, neuBis: 3, zahl: 3 }]);
    expect(luecken(zeilen, 9)).toEqual([
      { stelle: 0, altVon: 1, altBis: 3, neuVon: 1, neuBis: 3, zahl: 3 },
      { stelle: 3, altVon: 6, altBis: 8, neuVon: 7, neuBis: 9, zahl: 3 },
    ]);
  });
});

test.describe('Aufklappzustand', () => {
  const dreiundzwanzig = { zahl: 23 };

  test('soll schrittweise 20 weitere Zeilen aufdecken und höchstens die ganze Lücke', () => {
    expect(SCHRITT).toBe(20);
    expect(naechsterSchritt(dreiundzwanzig, 0)).toBe(20);
    expect(naechsterSchritt(dreiundzwanzig, 20)).toBe(23);
    expect(naechsterSchritt(dreiundzwanzig, 23)).toBe(23);
  });

  test('soll die noch verborgenen Zeilen nennen', () => {
    expect(rest(dreiundzwanzig, 0)).toBe(23);
    expect(rest(dreiundzwanzig, 20)).toBe(3);
    expect(rest(dreiundzwanzig, 23)).toBe(0);
  });
});
