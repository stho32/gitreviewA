'use strict';
// Bausteintests (ohne Browser) der reinen Modus-Rechnung (R00012): Zählzeile, Zusammenfassung der Commit-Zeile, Wahl beim Moduswechsel.
const { test, expect } = require('@playwright/test');
const {
  ZUSAMMEN, EINZELN, anzahlText, kopfZahlen, commitZeileText, kettenbeschriftung, wahlUebernehmen,
} = require('../../../src/GitReviewA/web/modus-werte.js');

test.describe('Baustein Modus-Werte', () => {
  test('soll die beiden Modi als „zusammen“ und „einzeln“ benennen', () => {
    expect(ZUSAMMEN).toBe('zusammen');
    expect(EINZELN).toBe('einzeln');
  });

  test('soll Anzahl mit Einzahl und Mehrzahl nennen', () => {
    expect(anzahlText(0, 'Commit', 'Commits')).toBe('0 Commits');
    expect(anzahlText(1, 'Commit', 'Commits')).toBe('1 Commit');
    expect(anzahlText(3, 'Datei', 'Dateien')).toBe('3 Dateien');
  });

  test('soll die Kopfzählung als „n Commits · m Dateien“ bilden (R00012, Kriterium 1)', () => {
    expect(kopfZahlen(3, 3)).toBe('3 Commits · 3 Dateien');
    expect(kopfZahlen(1, 1)).toBe('1 Commit · 1 Datei');
    expect(kopfZahlen(0, 0)).toBe('0 Commits · 0 Dateien');
  });

  test('soll die zugeklappte Commit-Zeile mit erster und letzter Kürzel bilden (R00012, Kriterium 2)', () => {
    expect(commitZeileText(3, 'abc1234', 'def5678', 'lückenlos · netto')).toBe('3 Commits · abc1234..def5678 · lückenlos · netto');
    expect(commitZeileText(1, 'abc1234', 'abc1234', 'lückenlos · netto')).toBe('1 Commit · abc1234 · lückenlos · netto');
    expect(commitZeileText(2, 'abc1234', 'def5678', 'keine lückenlose Kette · je Commit')).toBe('2 Commits · abc1234..def5678 · keine lückenlose Kette · je Commit');
  });

  test('soll die Kette nur nennen, wenn die Antwort auf /api/zusammen da ist (B1, Kriterien 2 und 4)', () => {
    const stand = { beschriftung: 'keine lückenlose Kette · je Commit' };

    expect(kettenbeschriftung(stand, false)).toBe('keine lückenlose Kette · je Commit');
    expect(kettenbeschriftung(null, false)).not.toContain('lückenlos');
    expect(kettenbeschriftung(null, false)).toContain('geprüft');
    expect(kettenbeschriftung(null, true)).not.toContain('lückenlos');
    expect(kettenbeschriftung(null, true)).toBe('Kette nicht lesbar');
  });

  test('soll die Wahl beim Moduswechsel übernehmen, wenn sie in der neuen Sicht vorkommt (R00012, Kriterium 5)', () => {
    const sicht = [{ pfad: 'README.md' }, { pfad: 'src/a.txt' }];

    expect(wahlUebernehmen({ pfad: 'src/a.txt' }, sicht)).toBe(sicht[1]);
  });

  test('soll sonst die erste Datei der neuen Sicht wählen und ohne Datei keine Wahl treffen', () => {
    const sicht = [{ pfad: 'README.md' }, { pfad: 'src/a.txt' }];

    expect(wahlUebernehmen({ pfad: 'src/b.txt' }, sicht)).toBe(sicht[0]);
    expect(wahlUebernehmen(null, sicht)).toBe(sicht[0]);
    expect(wahlUebernehmen({ pfad: 'src/b.txt' }, [])).toBeNull();
  });

  test('soll die Wahl über den Anzeigenamen vergleichen — dieselbe Regel für Wahl und Liste (A2, J10)', () => {
    const sicht = [{ pfad: 'z.txt' }, { pfad: 'a⟨U+202E⟩b.txt' }];
    const marke = pfad => pfad.replace(/\u202E/g, '⟨U+202E⟩');

    expect(wahlUebernehmen({ pfad: 'a\u202Eb.txt' }, sicht, marke)).toBe(sicht[1]);
    expect(wahlUebernehmen({ pfad: 'a\u202Eb.txt' }, sicht), 'ohne Anzeigename zählt der rohe Pfad').toBe(sicht[0]);
  });
});
