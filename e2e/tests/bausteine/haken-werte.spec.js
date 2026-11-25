'use strict';
// Bausteintests (ohne Browser) der reinen Funktionen des Abhakens: Fortschrittstext, Balkenanteil, Schlüssel der Stelle, nächster Zielzustand,
// Zustand je Datei und Zähler je Modus (R00012).
const { test, expect } = require('@playwright/test');
const {
  fortschrittText, balkenAnteil, stellenSchluessel, naechsterZielzustand, kaestchenBezeichnung,
  dateiZustand, dateiZaehler, fortschrittZusammen, fortschrittEinzeln, commitZaehler, zaehlerZusatz,
} = require('../../../src/GitReviewA/web/haken-werte.js');

const HASH_P = '13ba46c707f0744779fe7c52c3e935814b908017';
const HASH_Q = 'dd13577c75a05e64a0aa01cb6e9053d7548c83d0';
const HASH_R = '8f0c1d2e3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d';

function stelle(commit, pfad) {
  return { commit, pfad };
}

function standMit(...abgehakte) {
  return new Map(abgehakte.map(([commit, pfad]) => [stellenSchluessel(commit, pfad), true]));
}

/** Eine Stelle des Stands (`GET /api/haken`): der Pfad heißt dort `datei`, dazu der Sperrgrund. */
function standStelle(commit, datei, sperrgrund = '') {
  return { commit, datei, sperrgrund };
}

test.describe('Baustein Haken-Werte', () => {
  test('soll den Fortschritt als „n von m abgehakt“ ohne Tausendertrenner nennen und bei m = 0 „Keine Dateien zum Abhaken“', () => {
    expect(fortschrittText(0, 8)).toBe('0 von 8 abgehakt');
    expect(fortschrittText(1, 8)).toBe('1 von 8 abgehakt');
    expect(fortschrittText(8, 8)).toBe('8 von 8 abgehakt');
    expect(fortschrittText(1000, 2000)).toBe('1000 von 2000 abgehakt');
    expect(fortschrittText(0, 0)).toBe('Keine Dateien zum Abhaken');
  });

  test('soll mit Einheit „Dateien“ in „Zusammen“ und „Stellen“ in „Einzeln“ zählen (R00012)', () => {
    expect(fortschrittText(0, 3, 0, 'Dateien')).toBe('0 von 3 Dateien abgehakt');
    expect(fortschrittText(1, 3, 0, 'Dateien')).toBe('1 von 3 Dateien abgehakt');
    expect(fortschrittText(3, 6, 0, 'Stellen')).toBe('3 von 6 Stellen abgehakt');
    expect(fortschrittText(0, 0, 0, 'Dateien')).toBe('Keine Dateien zum Abhaken');
  });

  test('soll gesperrte Stellen nur bei k ≥ 1 als „ (k nicht lesbar)“ hinter den Zähler setzen (R00014)', () => {
    expect(fortschrittText(0, 10, 0)).toBe('0 von 10 abgehakt');
    expect(fortschrittText(1, 10, 1)).toBe('1 von 10 abgehakt (1 nicht lesbar)');
    expect(fortschrittText(0, 10, 3)).toBe('0 von 10 abgehakt (3 nicht lesbar)');
    expect(fortschrittText(7, 10, 3)).toBe('7 von 10 abgehakt (3 nicht lesbar)');
    expect(fortschrittText(0, 0, 0)).toBe('Keine Dateien zum Abhaken');
  });

  test('soll den Namen des Kästchens mit „Abgehakt: <Pfad>“ beginnen und bei einer Sperre den Grund anhängen (R00014)', () => {
    expect(kaestchenBezeichnung('g.txt', '')).toBe('Abgehakt: g.txt');
    expect(kaestchenBezeichnung('f⟨0xFF⟩.txt', 'Diff nicht lesbar: Name nicht eindeutig')).toBe('Abgehakt: f⟨0xFF⟩.txt — Diff nicht lesbar: Name nicht eindeutig');
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

  test('soll den Zustand einer Datei in „Zusammen“ als offen, teilweise oder abgehakt rechnen (R00012, Kriterium 9)', () => {
    const stellen = [stelle(HASH_P, 'src/a.txt'), stelle(HASH_Q, 'src/a.txt'), stelle(HASH_R, 'src/a.txt')];

    expect(dateiZustand(stellen, new Map())).toBe('offen');
    expect(dateiZustand(stellen, standMit([HASH_P, 'src/a.txt']))).toBe('teilweise');
    expect(dateiZustand(stellen, standMit([HASH_P, 'src/a.txt'], [HASH_Q, 'src/a.txt']))).toBe('teilweise');
    expect(dateiZustand(stellen, standMit([HASH_P, 'src/a.txt'], [HASH_Q, 'src/a.txt'], [HASH_R, 'src/a.txt']))).toBe('abgehakt');
  });

  test('soll den Zähler einer Datei aus ihren Stellen bilden', () => {
    const stellen = [stelle(HASH_P, 'src/a.txt'), stelle(HASH_Q, 'src/a.txt')];

    expect(dateiZaehler(stellen, new Map())).toEqual({ abgehakt: 0, gesamt: 2 });
    expect(dateiZaehler(stellen, standMit([HASH_P, 'src/a.txt']))).toEqual({ abgehakt: 1, gesamt: 2 });
  });

  test('soll in „Zusammen“ Dateien zählen und je Datei in beiden Modi abtasten (R00012, Kriterien 7–9)', () => {
    const dateien = [
      { stellen: [stelle(HASH_P, 'README.md')] },
      { stellen: [stelle(HASH_P, 'src/a.txt'), stelle(HASH_Q, 'src/a.txt'), stelle(HASH_R, 'src/a.txt')] },
      { stellen: [stelle(HASH_Q, 'src/b.txt'), stelle(HASH_R, 'src/b.txt')] },
    ];

    expect(fortschrittZusammen(dateien, new Map())).toEqual({ abgehakt: 0, gesamt: 3, nichtLesbar: 0 });
    expect(fortschrittZusammen(dateien, standMit([HASH_P, 'README.md']))).toEqual({ abgehakt: 1, gesamt: 3, nichtLesbar: 0 });
    const alleA = standMit([HASH_P, 'src/a.txt'], [HASH_Q, 'src/a.txt'], [HASH_R, 'src/a.txt']);
    expect(fortschrittZusammen(dateien, alleA)).toEqual({ abgehakt: 1, gesamt: 3, nichtLesbar: 0 });
    expect(fortschrittZusammen(dateien, new Map(), datei => datei.stellen.some(s => s.commit === HASH_Q))).toEqual({ abgehakt: 0, gesamt: 3, nichtLesbar: 2 });
  });

  test('soll in „Einzeln“ die Stellen des Stands zählen und gesperrte Stellen mitnennen (R00012, Kriterium 8)', () => {
    const stellen = [
      { commit: HASH_P, datei: 'README.md', sperrgrund: '' },
      { commit: HASH_P, datei: 'src/a.txt', sperrgrund: '' },
      { commit: HASH_Q, datei: 'src/a.txt', sperrgrund: '' },
      { commit: HASH_Q, datei: 'src/b.txt', sperrgrund: 'nicht eindeutig' },
      { commit: HASH_R, datei: 'src/a.txt', sperrgrund: '' },
      { commit: HASH_R, datei: 'src/b.txt', sperrgrund: '' },
    ];

    expect(fortschrittEinzeln(stellen, 0, 6)).toEqual({ abgehakt: 0, gesamt: 6, nichtLesbar: 1 });
    expect(fortschrittEinzeln(stellen, 3, 6)).toEqual({ abgehakt: 3, gesamt: 6, nichtLesbar: 1 });
  });

  test('soll die Stellen je Commit zählen — Grundlage für das Menü des Wählers (R00012, Kriterium 8)', () => {
    const stellen = [
      standStelle(HASH_P, 'README.md'), standStelle(HASH_P, 'src/a.txt'),
      standStelle(HASH_Q, 'src/a.txt'), standStelle(HASH_Q, 'src/b.txt'),
      standStelle(HASH_R, 'src/a.txt'), standStelle(HASH_R, 'src/b.txt'),
    ];

    expect(commitZaehler([], new Map()).size).toBe(0);
    expect([...commitZaehler(stellen, new Map()).entries()]).toEqual([
      [HASH_P, { abgehakt: 0, gesamt: 2 }],
      [HASH_Q, { abgehakt: 0, gesamt: 2 }],
      [HASH_R, { abgehakt: 0, gesamt: 2 }],
    ]);

    const alleA = standMit([HASH_P, 'src/a.txt'], [HASH_Q, 'src/a.txt'], [HASH_R, 'src/a.txt']);
    expect([...commitZaehler(stellen, alleA).values()]).toEqual([
      { abgehakt: 1, gesamt: 2 }, { abgehakt: 1, gesamt: 2 }, { abgehakt: 1, gesamt: 2 },
    ]);
    const mitB = new Map([...alleA, [stellenSchluessel(HASH_Q, 'src/b.txt'), true]]);
    expect([...commitZaehler(stellen, mitB).values()]).toEqual([
      { abgehakt: 1, gesamt: 2 }, { abgehakt: 2, gesamt: 2 }, { abgehakt: 1, gesamt: 2 },
    ]);
    const ohneA = new Map([[stellenSchluessel(HASH_Q, 'src/b.txt'), true]]);
    expect([...commitZaehler(stellen, ohneA).values()]).toEqual([
      { abgehakt: 0, gesamt: 2 }, { abgehakt: 1, gesamt: 2 }, { abgehakt: 0, gesamt: 2 },
    ]);
  });

  test('soll den Zusatz am Menüeintrag als „ · k von n“ schreiben und ohne Stelle leer lassen (R00012, Kriterium 8)', () => {
    expect(zaehlerZusatz({ abgehakt: 0, gesamt: 2 })).toBe(' · 0 von 2');
    expect(zaehlerZusatz({ abgehakt: 1, gesamt: 2 })).toBe(' · 1 von 2');
    expect(zaehlerZusatz(undefined)).toBe('');
  });
});
