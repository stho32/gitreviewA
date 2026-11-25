'use strict';
// Bausteintests (ohne Browser) der Lücken-Rechnung (R00026, B2505): Lücken vor dem ersten, zwischen zwei und nach dem letzten
// Abschnitt — Zahl der verborgenen Zeilen und Nummernspanne alt/neu; Schrittweite 20.
const { test, expect } = require('@playwright/test');
const { patchZeilen } = require('../../../src/GitReviewA/web/diff-werte.js');
const { luecken, rest, naechsterSchritt, aufgedeckt, gesamtzeilen, SCHRITT } = require('../../../src/GitReviewA/web/luecken-werte.js');
const { ganzeDateiZeilen } = require('../../../src/GitReviewA/web/diff-werte.js');

const kopf = text => ({ art: 'kopf', alt: null, neu: null, text });
const kontext = (text, nummer) => ({ art: 'kontext', alt: nummer, neu: nummer, text });

/** Der Patch von `weit.txt` aus Repo W (R00026): zwei Abschnitte, dazwischen 23 verborgene Zeilen, die Datei hat 60 Zeilen. */
const WEIT_PATCH = [
  '@@ -2,7 +2,7 @@',
  ' z02', ' z03', ' z04', '-z05', '+Z05', ' z06', ' z07', ' z08',
  '@@ -32,7 +32,7 @@',
  ' z32', ' z33', ' z34', '-z35', '+Z35', ' z36', ' z37', ' z38',
].join('\n');

/** Der ganze-Datei-Patch von `weit.txt` (R00026): 60 Zeilen, geändert in Zeile 5 und 35 — dieselbe Datei wie `WEIT_PATCH`. */
const GANZE_DATEI_PATCH = [
  '@@ -1,60 +1,60 @@',
  ...Array.from({ length: 60 }, (_, stelle) => stelle + 1).flatMap(nummer => {
    if (nummer === 5) {
      return ['-z05', '+Z05'];
    }
    if (nummer === 35) {
      return ['-z35', '+Z35'];
    }
    if (nummer === 20) {
      return [' <b>z20</b>'];
    }
    if (nummer === 21) {
      return [' a\u202Eb'];
    }
    return [` z${String(nummer).padStart(2, '0')}`];
  }),
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

  test('soll die aufgedeckten Zeilen aus den Zeilen der ganzen Datei holen — Nummer neu n trägt Zeile n', () => {
    const ganzeZeilen = ganzeDateiZeilen(GANZE_DATEI_PATCH);
    const gefunden = luecken(patchZeilen(WEIT_PATCH), gesamtzeilen(ganzeZeilen));

    expect(gesamtzeilen(ganzeZeilen)).toBe(60);
    const erste = gefunden[0];
    const zweite = gefunden[1];
    expect(gefunden.map(luecke => luecke.zahl)).toEqual([1, 23, 22]);
    expect(aufgedeckt(erste, 1, ganzeZeilen)).toEqual([kontext('z01', 1)]);
    expect(aufgedeckt(erste, 0, ganzeZeilen)).toEqual([]);

    const nachEinemKlick = aufgedeckt(zweite, naechsterSchritt(zweite, 0), ganzeZeilen);
    expect(nachEinemKlick).toHaveLength(20);
    expect(nachEinemKlick[0]).toEqual(kontext('z09', 9));
    expect(nachEinemKlick[19]).toEqual(kontext('z28', 28));
    expect(rest(zweite, nachEinemKlick.length)).toBe(3);

    const nachZweiKlicks = aufgedeckt(zweite, naechsterSchritt(zweite, 20), ganzeZeilen);
    expect(nachZweiKlicks.slice(-2)).toEqual([kontext('z30', 30), kontext('z31', 31)]);
    expect(rest(zweite, nachZweiKlicks.length)).toBe(0);

    const letzte = gefunden[2];
    expect(aufgedeckt(letzte, naechsterSchritt(letzte, 0), ganzeZeilen).slice(-2)).toEqual([kontext('z57', 57), kontext('z58', 58)]);
    expect(aufgedeckt(letzte, letzte.zahl, ganzeZeilen).slice(-2)).toEqual([kontext('z59', 59), kontext('z60', 60)]);
  });

  test('soll die fremden Zeilen der Lücke unverändert als Text weitergeben', () => {
    const ganzeZeilen = ganzeDateiZeilen(GANZE_DATEI_PATCH);
    const zweite = luecken(patchZeilen(WEIT_PATCH), gesamtzeilen(ganzeZeilen))[1];

    const aufgedeckteZeilen = aufgedeckt(zweite, zweite.zahl, ganzeZeilen);
    const zeile20 = aufgedeckteZeilen.find(zeile => zeile.neu === 20);
    const zeile21 = aufgedeckteZeilen.find(zeile => zeile.neu === 21);

    expect(zeile20.text).toBe('<b>z20</b>');
    expect(zeile21.text).toBe('a\u202Eb');
    expect(aufgedeckteZeilen.every(zeile => zeile.art === 'kontext')).toBe(true);
  });

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
