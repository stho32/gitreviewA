'use strict';
// Bausteintest (ohne Browser) des Meldens „angesehen“ (R00041, B4001): aus der gezeigten Stelle und dem Stand des Hakens die
// zu meldenden Stellen — „Einzeln“ die eine Stelle, „Zusammen“ alle Stellen der Datei; gesperrte Stellen (R00014) fallen
// heraus, weil ihr Diff nicht lesbar ist.
const { test, expect } = require('@playwright/test');
const { gezeigteStellen } = require('../../../src/GitReviewA/web/angesehen-werte.js');

const sichtbarerName = pfad => pfad;

function standStelle(commit, datei, sperrgrund = '') {
  return { commit, datei, abgehakt: false, sperrgrund };
}

test.describe('Baustein Angesehen-Werte — gezeigte Stellen (B4001)', () => {
  test('soll in „Einzeln“ die gezeigte Stelle melden', () => {
    const stellen = gezeigteStellen({ modus: 'einzeln', commit: 'a', pfad: 'src/a.txt' }, [standStelle('a', 'src/a.txt'), standStelle('a', 'src/b.txt')], sichtbarerName);

    expect(stellen).toEqual([{ commit: 'a', datei: 'src/a.txt' }]);
  });

  test('soll in „Zusammen“ alle Stellen der Datei über die Commits melden', () => {
    const stand = [standStelle('a', 'src/a.txt'), standStelle('b', 'src/a.txt'), standStelle('b', 'src/b.txt')];

    const stellen = gezeigteStellen({ modus: 'zusammen', commit: 'b', pfad: 'src/a.txt' }, stand, sichtbarerName);

    expect(stellen).toEqual([{ commit: 'a', datei: 'src/a.txt' }, { commit: 'b', datei: 'src/a.txt' }]);
  });

  test('soll in „Zusammen“ eine gesperrte Stelle nicht melden', () => {
    const stand = [standStelle('a', 'src/a.txt'), standStelle('b', 'src/a.txt', 'Diff nicht lesbar: Name nicht eindeutig')];

    const stellen = gezeigteStellen({ modus: 'zusammen', commit: 'b', pfad: 'src/a.txt' }, stand, sichtbarerName);

    expect(stellen).toEqual([{ commit: 'a', datei: 'src/a.txt' }]);
  });

  test('soll in „Einzeln“ eine gesperrte Stelle nicht melden', () => {
    const stellen = gezeigteStellen(
      { modus: 'einzeln', commit: 'a', pfad: 'f.txt' },
      [standStelle('a', 'f.txt', 'Diff nicht lesbar: Name nicht übergebbar')],
      sichtbarerName,
    );

    expect(stellen).toEqual([]);
  });

  test('soll Fallback und Leerfall liefern: unbekannte Datei über den gezeigten Commit, ohne Stelle nichts', () => {
    const unbekannt = gezeigteStellen({ modus: 'zusammen', commit: 'b', pfad: 'neu.txt' }, [standStelle('a', 'alt.txt')], sichtbarerName);
    const ohneStelle = gezeigteStellen({ modus: 'einzeln', commit: '', pfad: 'src/a.txt' }, [], sichtbarerName);

    expect(unbekannt).toEqual([{ commit: 'b', datei: 'neu.txt' }]);
    expect(ohneStelle).toEqual([]);
  });

  test('soll den Anzeigenamen zum Schlüssel machen: Marken auf beiden Seiten treffen dieselbe Stelle', () => {
    const markiert = pfad => pfad.replace('\u202e', '⟨U+202E⟩');
    const stand = [standStelle('a', 'x\u202e.txt')];

    const stellen = gezeigteStellen({ modus: 'zusammen', commit: 'a', pfad: 'x\u202e.txt' }, stand, markiert);

    expect(stellen).toEqual([{ commit: 'a', datei: 'x\u202e.txt' }]);
  });
});
