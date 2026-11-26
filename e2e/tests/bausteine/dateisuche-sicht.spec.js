'use strict';
// Bausteintests (ohne Browser) des reinen Bausteins „Suche als dritter Grund der Sicht“ (R00049, B4503): die Sicht aus
// R00029 bekommt den Grund „Suche“; jeder Eintrag wird einmal gezählt, beim ersten Grund der Reihe Muster, Suche, abgehakt.
// Der Wortlaut des Zählers ist abgehakt, Muster, Suche; die Fälle ohne Suche bleiben wie in R00029.
const { test, expect } = require('@playwright/test');
const { sicht, zaehlertext, meldung } = require('../../../src/GitReviewA/web/abgehakte-werte.js');

/** Ein Sichteintrag der gezeigten Liste: in „Zusammen“ eine Datei, in „Einzeln“ eine Stelle. */
const eintrag = (pfad, abgehakt = false, gesperrt = false) => ({ pfad, abgehakt, gesperrt });

/** Die acht Pfade von Repo P aus R00049. */
const REPO_P = [
  'README.md', 'db/001_anlegen.sql', 'db/002_aendern.sql', 'docs/api.md',
  'src/app.js', 'src/data/app.sql', 'src/util.js', 'tests/app.test.js',
];

const sucheTreffer = pfade => new Set(pfade);

test.describe('Baustein Abgehakte-Werte: Suche als dritter Grund', () => {
  test('soll eine nicht passende Datei ausblenden und als Suche zählen (Kriterium 4)', () => {
    const eingabe = REPO_P.map(pfad => eintrag(pfad, pfad === 'README.md'));
    const treffer = sucheTreffer(['README.md', 'docs/api.md']);

    const ergebnis = sicht(eingabe, ['db/**'], true, treffer);

    expect(ergebnis.sichtbare.map(e => e.pfad)).toEqual(['docs/api.md']);
    expect(ergebnis.ausgeblendetMuster).toBe(2);
    expect(ergebnis.ausgeblendetSuche).toBe(4);
    expect(ergebnis.ausgeblendetAbgehakt).toBe(1);
    expect(zaehlertext(ergebnis)).toBe('7 ausgeblendet, davon 1 abgehakt, 2 Muster, 4 Suche');
  });

  test('soll eine Datei, die Muster und Suche trifft, einmal als Muster zählen (Reihenfolge der Gründe)', () => {
    const eingabe = [eintrag('db/001.sql'), eintrag('src/app.js')];

    const ergebnis = sicht(eingabe, ['db/**'], false, sucheTreffer(['db/001.sql']));

    expect(ergebnis.ausgeblendetMuster).toBe(1);
    expect(ergebnis.ausgeblendetSuche).toBe(1);
    expect(ergebnis.ausgeblendetAbgehakt).toBe(0);
    expect(ergebnis.sichtbare).toEqual([]);
  });

  test('soll eine Datei, die Suche und Haken trifft, einmal als Suche zählen', () => {
    const eingabe = [eintrag('README.md', true), eintrag('src/app.js')];

    const ergebnis = sicht(eingabe, [], true, sucheTreffer(['src/app.js']));

    expect(ergebnis.sichtbare.map(e => e.pfad)).toEqual(['src/app.js']);
    expect(ergebnis.ausgeblendetSuche).toBe(1);
    expect(ergebnis.ausgeblendetAbgehakt).toBe(0);
    expect(zaehlertext(ergebnis)).toBe('1 ausgeblendet, davon 1 Suche');
  });

  test('soll eine abgehakte Datei, die zur Suche passt, als abgehakt zählen', () => {
    const eingabe = [eintrag('README.md', true), eintrag('src/app.js')];

    const ergebnis = sicht(eingabe, [], true, sucheTreffer(['README.md', 'src/app.js']));

    expect(ergebnis.sichtbare.map(e => e.pfad)).toEqual(['src/app.js']);
    expect(ergebnis.ausgeblendetAbgehakt).toBe(1);
    expect(ergebnis.ausgeblendetSuche).toBe(0);
    expect(zaehlertext(ergebnis)).toBe('1 ausgeblendet, davon 1 abgehakt');
  });

  test('soll eine gesperrte Datei nicht als abgehakt zählen, wenn nur der Haken sie träfe', () => {
    const eingabe = [eintrag('README.md', true, true)];

    const ergebnis = sicht(eingabe, [], true, sucheTreffer(['README.md']));

    expect(ergebnis.sichtbare.map(e => e.pfad)).toEqual(['README.md']);
    expect(ergebnis.ausgeblendetAbgehakt).toBe(0);
    expect(zaehlertext(ergebnis)).toBe('');
  });

  test('soll ohne Suche unverändert rechnen (R00029)', () => {
    const eingabe = [eintrag('a', true), eintrag('b'), eintrag('c', true)];

    const ergebnis = sicht(eingabe, [], true, null);

    expect(ergebnis.sichtbare.map(e => e.pfad)).toEqual(['b']);
    expect(ergebnis.ausgeblendetSuche).toBe(0);
    expect(zaehlertext(ergebnis)).toBe('2 ausgeblendet, davon 2 abgehakt');
  });

  test('soll den Leerfall der Suche von „Alle Dateien ausgeblendet“ unterscheiden', () => {
    const nichtsPasst = sicht(REPO_P.map(pfad => eintrag(pfad)), [], false, sucheTreffer([]));
    const auchMuster = sicht(REPO_P.map(pfad => eintrag(pfad)), ['**'], false, sucheTreffer([]));

    expect(meldung(nichtsPasst.sichtbare.length, REPO_P.length, nichtsPasst)).toBe('Keine Datei passt zur Suche');
    expect(meldung(auchMuster.sichtbare.length, REPO_P.length, auchMuster)).toBe('Alle Dateien ausgeblendet');
  });

  test('soll ohne Suche und ohne Auswahl unverändert melden (R00029)', () => {
    expect(meldung(0, 3)).toBe('Alle Dateien ausgeblendet');
    expect(meldung(2, 3)).toBe('');
    expect(meldung(0, 0)).toBe('');
    expect(meldung(1, 0)).toBe('');
  });
});
