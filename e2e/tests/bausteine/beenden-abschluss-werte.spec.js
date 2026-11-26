'use strict';
// Bausteintest (ohne Browser) der Abschnitte im Beenden-Dialog (R00041, B4003): „Nicht angesehen (n)“ aus den Einträgen
// (B4002, Grenze 20 mit „… und k weitere“), der Leerfall „Alle Dateien angesehen“, der uneindeutige Fall
// „Nicht angesehene Dateien konnten nicht bestimmt werden“ und der Abschnitt „Ergebnis für die KI“.
const { test, expect } = require('@playwright/test');
const { abschlussAbschnitte } = require('../../../src/GitReviewA/web/beenden-werte.js');

function eintrag(pfad, zusatz = {}) {
  return { pfad, schluessel: pfad, commit: null, ausgeblendet: false, ...zusatz };
}

test.describe('Baustein Beenden-Werte — Abschnitte des Abschlussschritts (B4003)', () => {
  test('Kriterium 1: nennt den Abschnitt mit der Zahl, den Einträgen und dem Ergebnistext', () => {
    const abschnitte = abschlussAbschnitte(true, [eintrag('README.md'), eintrag('src/b.txt', { ausgeblendet: true })], '# Ergebnis\n');

    expect(abschnitte[0]).toEqual({
      art: 'nicht-angesehen',
      titel: 'Nicht angesehen (2)',
      eintraege: [eintrag('README.md'), eintrag('src/b.txt', { ausgeblendet: true })],
      weitere: 0,
    });
    expect(abschnitte[1]).toEqual({ art: 'ergebnis', titel: 'Ergebnis für die KI', text: '# Ergebnis\n' });
  });

  test('Leerfall: bei 0 Einträgen steht „Alle Dateien angesehen“', () => {
    const abschnitte = abschlussAbschnitte(true, [], 'x');

    expect(abschnitte[0]).toEqual({ art: 'nicht-angesehen', titel: 'Nicht angesehen (0)', text: 'Alle Dateien angesehen', eintraege: [], weitere: 0 });
  });

  test('Kriterium 8: ist der Stand nicht bestimmbar, steht die ehrliche Meldung statt „alle angesehen“', () => {
    const abschnitte = abschlussAbschnitte(false, [], 'x');

    expect(abschnitte[0]).toEqual({
      art: 'nicht-angesehen',
      titel: 'Nicht angesehen',
      text: 'Nicht angesehene Dateien konnten nicht bestimmt werden',
      eintraege: [],
      weitere: 0,
    });
  });

  test('Kriterium 6: 2 000 Einträge ergeben 20 Zeilen und „… und 1 980 weitere“', () => {
    const eintraege = Array.from({ length: 2000 }, (_, nummer) => eintrag(`datei-${nummer}.txt`));

    const abschnitt = abschlussAbschnitte(true, eintraege, 'x')[0];

    expect(abschnitt.titel).toBe('Nicht angesehen (2000)');
    expect(abschnitt.eintraege).toHaveLength(20);
    expect(abschnitt.weitere).toBe(1980);
  });

  test('soll bei fehlendem Ergebnistext den eigenen Fehlertext zeigen', () => {
    const abschnitte = abschlussAbschnitte(true, [], null);

    expect(abschnitte[1]).toEqual({ art: 'ergebnis', titel: 'Ergebnis für die KI', text: 'Ergebnis konnte nicht geladen werden' });
  });
});
