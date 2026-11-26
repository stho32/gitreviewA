'use strict';
// Bausteintests (ohne Browser) des reinen Bausteins „Abgehakte ausblenden“ (R00029, B2801): die Sicht aus Einträgen, Haken-Zustand,
// Mustern und Schalter, der Zählertext mit beiden Anteilen und die Meldung des Leerfalls. Das Abhaken je Modus rechnet `haken-werte`.
const { test, expect } = require('@playwright/test');
const { sicht, zaehlertext, meldung } = require('../../../src/GitReviewA/web/abgehakte-werte.js');
const { dateiZustand } = require('../../../src/GitReviewA/web/haken-werte.js');

/** Ein Sichteintrag der gezeigten Liste: in „Zusammen“ eine Datei, in „Einzeln“ eine Stelle. */
const eintrag = (pfad, abgehakt = false, gesperrt = false) => ({ pfad, abgehakt, gesperrt });

function namen(ergebnis) {
  return ergebnis.sichtbare.map(eintragEintrag => eintragEintrag.pfad);
}

test.describe('Baustein Abgehakte-Werte', () => {
  test('soll bei ausgeschaltetem Schalter nichts ausblenden und nichts zählen', () => {
    const ergebnis = sicht([eintrag('a', true), eintrag('b')], [], false);

    expect(namen(ergebnis)).toEqual(['a', 'b']);
    expect(ergebnis.ausgeblendetAbgehakt).toBe(0);
    expect(ergebnis.ausgeblendetMuster).toBe(0);
    expect(zaehlertext(ergebnis)).toBe('');
  });

  test('soll mit dem Schalter abgehakte Einträge ausblenden und zählen', () => {
    const ergebnis = sicht([eintrag('a', true), eintrag('b'), eintrag('c', true)], [], true);

    expect(namen(ergebnis)).toEqual(['b']);
    expect(ergebnis.ausgeblendetAbgehakt).toBe(2);
    expect(ergebnis.ausgeblendetMuster).toBe(0);
    expect(zaehlertext(ergebnis)).toBe('2 ausgeblendet, davon 2 abgehakt');
  });

  test('soll einen nicht abgehakten Eintrag (offen oder teilweise) sichtbar lassen', () => {
    const eingabe = [eintrag('a'), eintrag('b')];

    expect(namen(sicht(eingabe, [], true))).toEqual(['a', 'b']);
  });

  test('soll eine teilweise abgehakte Datei sichtbar lassen und erst ganz abgehakt ausblenden (R00012)', () => {
    const stellen = [{ commit: 'z1', pfad: 'src/b.txt' }, { commit: 'z3', pfad: 'src/b.txt' }];
    const nurEineStelle = new Map([['z1 src/b.txt', true]]);
    const alleStellen = new Map([['z1 src/b.txt', true], ['z3 src/b.txt', true]]);
    const eintragAusStand = stand => eintrag('src/b.txt', dateiZustand(stellen, stand) === 'abgehakt');

    expect(namen(sicht([eintragAusStand(nurEineStelle)], [], true))).toEqual(['src/b.txt']);
    expect(namen(sicht([eintragAusStand(alleStellen)], [], true))).toEqual([]);
  });

  test('soll eine gesperrte Stelle nie ausblenden, auch bei eingeschaltetem Schalter', () => {
    const ergebnis = sicht([eintrag('abgehakt.txt', true), eintrag('gesperrt.txt', false, true)], [], true);

    expect(namen(ergebnis)).toEqual(['gesperrt.txt']);
    expect(ergebnis.ausgeblendetAbgehakt).toBe(1);
  });

  test('soll per Muster ausblenden, unabhängig vom Schalter (R00025)', () => {
    const ergebnis = sicht([eintrag('app.lock'), eintrag('README.md')], ['*.lock'], false);

    expect(namen(ergebnis)).toEqual(['README.md']);
    expect(ergebnis.ausgeblendetMuster).toBe(1);
    expect(ergebnis.ausgeblendetAbgehakt).toBe(0);
  });

  test('soll zwei Gründe nebeneinander nennen und einen Eintrag mit beiden Gründen einmal zählen', () => {
    const ergebnis = sicht(
      [eintrag('app.lock'), eintrag('build/out.log', true), eintrag('app.lock', true), eintrag('src/a.txt')],
      ['*.lock'],
      true,
    );

    expect(namen(ergebnis)).toEqual(['src/a.txt']);
    expect(ergebnis.ausgeblendetMuster).toBe(2);
    expect(ergebnis.ausgeblendetAbgehakt).toBe(1);
    expect(zaehlertext(ergebnis)).toBe('3 ausgeblendet, davon 1 abgehakt, 2 Muster');
  });

  test('soll den Zählertext mit Anteil je Grund bilden und bei 0 nichts zeigen (R00025/R00029, Suche R00049)', () => {
    expect(zaehlertext({ ausgeblendetAbgehakt: 0, ausgeblendetMuster: 0, ausgeblendetSuche: 0 })).toBe('');
    expect(zaehlertext({ ausgeblendetAbgehakt: 1, ausgeblendetMuster: 0, ausgeblendetSuche: 0 })).toBe('1 ausgeblendet, davon 1 abgehakt');
    expect(zaehlertext({ ausgeblendetAbgehakt: 0, ausgeblendetMuster: 1, ausgeblendetSuche: 0 })).toBe('1 ausgeblendet, davon 1 Muster');
    expect(zaehlertext({ ausgeblendetAbgehakt: 1, ausgeblendetMuster: 1, ausgeblendetSuche: 0 })).toBe('2 ausgeblendet, davon 1 abgehakt, 1 Muster');
    expect(zaehlertext({ ausgeblendetAbgehakt: 1000, ausgeblendetMuster: 1000, ausgeblendetSuche: 0 })).toBe('2000 ausgeblendet, davon 1000 abgehakt, 1000 Muster');
    expect(zaehlertext({ ausgeblendetAbgehakt: 2000, ausgeblendetMuster: 0, ausgeblendetSuche: 0 })).toBe('2000 ausgeblendet, davon 2000 abgehakt');
    expect(zaehlertext({ ausgeblendetAbgehakt: 1, ausgeblendetMuster: 2, ausgeblendetSuche: 4 })).toBe('7 ausgeblendet, davon 1 abgehakt, 2 Muster, 4 Suche');
  });

  test('soll die Meldung des Leerfalls nennen und bei leerer Auswahl keine', () => {
    expect(meldung(0, 3)).toBe('Alle Dateien ausgeblendet');
    expect(meldung(2, 3)).toBe('');
    expect(meldung(0, 0)).toBe('');
  });

  test('soll eine leere Liste ohne Zähler und ohne Meldung tragen', () => {
    const ergebnis = sicht([], ['*.lock'], true);

    expect(ergebnis.sichtbare).toEqual([]);
    expect(zaehlertext(ergebnis)).toBe('');
    expect(meldung(ergebnis.sichtbare.length, 0)).toBe('');
  });
});
