'use strict';
// Bausteintests (ohne Browser) der Bereichs-Rechnung (R00031): welche Zeilen ein Bereich umfasst (B3001) und welche Zeilen
// eine Markierung tragen. Die Zeilen sind die gezeichneten Diff-Zeilen in Reihenfolge; `abschnitt` ist der Schlüssel des
// Abschnitts (Hunk und Commit) — die Oberfläche vergibt ihn, die Rechnung vergleicht ihn nur.
const { test, expect } = require('@playwright/test');
const { bereichsziel, bereichsstand, bereicheDerAnmerkungen, ABSCHNITTSGRUND, ENTFERNT_HINWEIS } = require('../../../src/GitReviewA/web/bereich-werte.js');
const { ENTFERNT_HINWEIS: HINWEIS_AUS_ANMERKUNGEN } = require('../../../src/GitReviewA/web/anmerkungen-werte.js');

/** Eine Zeile ohne Nummer neu (`−`), ein Abschnittskopf und die Hinweiszeile tragen kein `neu`. Der Commit gehört zur Zeile
    („Zusammen“ ohne Kette zeigt dieselbe Datei in mehreren Abschnitten). */
const zeile = (art, neu, abschnitt = 1, commit = 'c1') => ({ art, alt: null, neu, commit, abschnitt });
const kontext = (neu, abschnitt = 1, commit = 'c1') => zeile('kontext', neu, abschnitt, commit);
const plus = (neu, abschnitt = 1, commit = 'c1') => zeile('plus', neu, abschnitt, commit);
const minus = (abschnitt = 1) => zeile('minus', null, abschnitt);
const kopf = (abschnitt = 1) => ({ art: 'kopf', alt: null, neu: null, abschnitt });
const hinweiszeile = (abschnitt = 1) => ({ art: 'hinweis', alt: null, neu: null, abschnitt });

/** Die gezeichneten Zeilen von `lang.txt` in `r2`: zwei Abschnitte, dazwischen die Lücke 9–21. */
const ZWEI_ABSCHNITTE = [
  kopf(1), kontext(2), kontext(3), kontext(4), minus(1), plus(5), kontext(6), kontext(7), kontext(8),
  kopf(2), kontext(22, 2), kontext(23, 2), kontext(24, 2), minus(2), plus(25, 2), kontext(26, 2), kontext(27, 2), kontext(28, 2),
];

test.describe('Baustein Bereichsziel', () => {
  test('soll einen Klick ohne Anker als einzeilige Stelle nehmen', () => {
    expect(bereichsziel(ZWEI_ABSCHNITTE, null, 2, false)).toEqual({ art: 'zeile', neu: 3, commit: 'c1' });
  });

  test('soll zwei Enden desselben Abschnitts als Bereich von kleinster bis größter Nummer neu nehmen (3 und 7)', () => {
    expect(bereichsziel(ZWEI_ABSCHNITTE, 2, 7, false)).toEqual({ art: 'bereich', von: 3, bis: 7, commit: 'c1' });
  });

  test('soll beim Ziehen rückwärts dieselben Enden nehmen (Ziel 3, Anker 7)', () => {
    expect(bereichsziel(ZWEI_ABSCHNITTE, 7, 2, false)).toEqual({ art: 'bereich', von: 3, bis: 7, commit: 'c1' });
  });

  test('soll Anker und Ziel auf derselben Zeile als einzeilige Stelle nehmen (kein Bereich)', () => {
    expect(bereichsziel(ZWEI_ABSCHNITTE, 2, 2, false)).toEqual({ art: 'zeile', neu: 3, commit: 'c1' });
  });

  test('soll eine entfernte Zeile als Anker nicht öffnen, sondern den Hinweis nennen', () => {
    expect(bereichsziel(ZWEI_ABSCHNITTE, null, 4, false)).toEqual({ art: 'entfernt', hinweis: ENTFERNT_HINWEIS });
  });

  test('soll einen Abschnittskopf und die Hinweiszeile als Anker nicht öffnen', () => {
    expect(bereichsziel(ZWEI_ABSCHNITTE, null, 0, false)).toEqual({ art: 'keines', grund: '' });
    const mitHinweiszeile = [kopf(1), kontext(1), hinweiszeile(1)];
    expect(bereichsziel(mitHinweiszeile, null, 2, false)).toEqual({ art: 'keines', grund: '' });
  });

  test('soll bei ausgewähltem Text nichts öffnen (Text bleibt kopierbar)', () => {
    expect(bereichsziel(ZWEI_ABSCHNITTE, null, 2, true)).toEqual({ art: 'keines', grund: '' });
    expect(bereichsziel(ZWEI_ABSCHNITTE, 2, 7, true)).toEqual({ art: 'keines', grund: '' });
  });

  test('soll über eine Abschnittsgrenze keinen Bereich bilden (Anker 5, Ziel 25)', () => {
    expect(bereichsziel(ZWEI_ABSCHNITTE, 5, 14, false)).toEqual({ art: 'keines', grund: ABSCHNITTSGRUND });
  });

  test('soll eine zugeklappte Lücke nie überschreiten (Anker 7, Ziel 22 ohne Aufklappen)', () => {
    expect(bereichsziel(ZWEI_ABSCHNITTE, 7, 10, false)).toEqual({ art: 'keines', grund: ABSCHNITTSGRUND });
  });

  test('soll die aufgeklappten Zeilen einer Lücke als Grenzen nehmen (Anker 7, Ziel 20)', () => {
    const mitAufgeklappterLuecke = [
      kopf(1), kontext(2), kontext(3), kontext(4), minus(1), plus(5), kontext(6), kontext(7), kontext(8),
      kontext(9), kontext(10), kontext(11), kontext(12), kontext(13), kontext(14), kontext(15), kontext(16),
      kontext(17), kontext(18), kontext(19), kontext(20),
      kopf(2), kontext(22),
    ];
    expect(bereichsziel(mitAufgeklappterLuecke, 7, 20, false)).toEqual({ art: 'bereich', von: 7, bis: 20, commit: 'c1' });
  });

  test('soll den Commit des Ankers mitgeben, auch wenn dieselben Nummern im Abschnitt eines anderen Commits stehen (z1 z3)', () => {
    const gleicheNummern = [
      kopf(1), kontext(2, 1, 'z1'), kontext(3, 1, 'z1'),
      kopf(2), kontext(2, 2, 'z3'), kontext(3, 2, 'z3'),
    ];

    expect(bereichsziel(gleicheNummern, 4, 5, false), 'Bereich im Abschnitt von z3').toEqual({ art: 'bereich', von: 2, bis: 3, commit: 'z3' });
    expect(bereichsziel(gleicheNummern, 5, 4, false), 'rückwärts im Abschnitt von z3').toEqual({ art: 'bereich', von: 2, bis: 3, commit: 'z3' });
    expect(bereichsziel(gleicheNummern, null, 4, false), 'eine Zeile im Abschnitt von z3').toEqual({ art: 'zeile', neu: 2, commit: 'z3' });
    expect(bereichsziel(gleicheNummern, 1, 2, false), 'Gegenprobe im Abschnitt von z1').toEqual({ art: 'bereich', von: 2, bis: 3, commit: 'z1' });
  });

  test('soll zwei Enden in Abschnitten verschiedener Commits keinen Bereich bilden lassen', () => {
    const zweiCommits = [kopf(1), kontext(5, 1), kontext(6, 1), kopf(2), kontext(25, 2), kontext(26, 2)];
    expect(bereichsziel(zweiCommits, 1, 4, false)).toEqual({ art: 'keines', grund: ABSCHNITTSGRUND });
  });

  test('soll den Hinweis der entfernten Zeile mit dem Text der Zeilenanmerkung teilen (eine Quelle)', () => {
    expect(ENTFERNT_HINWEIS).toBe(HINWEIS_AUS_ANMERKUNGEN);
  });
});

test.describe('Baustein Bereichsstand', () => {
  test('soll jeder Zeile die Bereiche geben, die sie umfassen (3–7 und 5–10 überlappend)', () => {
    const zeilen = [kontext(2), kontext(3), kontext(4), kontext(5), kontext(6), kontext(7), kontext(8)];
    const stand = bereichsstand(zeilen, [{ von: 3, bis: 7 }, { von: 5, bis: 10 }]);

    expect(stand.get(2)).toBeUndefined();
    expect(stand.get(3)).toEqual([{ von: 3, bis: 7 }]);
    expect(stand.get(5)).toEqual([{ von: 3, bis: 7 }, { von: 5, bis: 10 }]);
    expect(stand.get(7)).toEqual([{ von: 3, bis: 7 }, { von: 5, bis: 10 }]);
    expect(stand.get(8)).toEqual([{ von: 5, bis: 10 }]);
  });

  test('soll eine Zeile ohne Nummer neu nicht markieren (entfernte Zeile im Bereich)', () => {
    const zeilen = [kontext(3), minus(), kontext(5)];
    const stand = bereichsstand(zeilen, [{ von: 3, bis: 5 }]);

    expect(stand.has(3)).toBe(true);
    expect(stand.has(5)).toBe(true);
    expect(stand.size).toBe(2);
  });

  test('soll außerhalb der gezeigten Zeilen nichts markieren (Bereich 9–21 nicht in der Ansicht)', () => {
    const zeilen = [kontext(2), kontext(3), kontext(4)];
    expect(bereichsstand(zeilen, [{ von: 9, bis: 21 }]).size).toBe(0);
  });
});

test.describe('Baustein Bereiche der Anmerkungen', () => {
  test('soll nur Bereiche der Datei nehmen, keine Zeilen- und Dateianmerkungen und keine anderen Stellen', () => {
    const anmerkungen = [
      { nummer: 1, commit: 'c1', datei: 'lang.txt', von: 3, bis: 7 },
      { nummer: 2, commit: 'c1', datei: 'lang.txt', zeile: 20 },
      { nummer: 3, commit: 'c1', datei: 'lang.txt' },
      { nummer: 4, commit: 'c2', datei: 'lang.txt', von: 5, bis: 10 },
      { nummer: 5, commit: 'c1', datei: 'weit.txt', von: 1, bis: 2 },
    ];

    expect(bereicheDerAnmerkungen(anmerkungen, 'lang.txt')).toEqual([{ von: 3, bis: 7 }, { von: 5, bis: 10 }]);
  });
});
