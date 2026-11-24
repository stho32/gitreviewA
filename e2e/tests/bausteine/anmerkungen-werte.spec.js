'use strict';
// Bausteintests (ohne Browser) der Anmerkungs-Rechnung: welche Diff-Zeile annotierbar ist und welche Anmerkungen eine Ansicht zeigt (R00010)
// und wie der Stand nach einer geänderten Anmerkung aussieht (R00018).
const { test, expect } = require('@playwright/test');
const { zeilenziel, anmerkungsstand, hinweisAusserhalb, mitGeaendertemText, ENTFERNT_HINWEIS } = require('../../../src/GitReviewA/web/anmerkungen-werte.js');

const Q = 'q'.repeat(40);
const P = 'p'.repeat(40);
const anmerkung = (nummer, zeile, text, { commit = Q, datei = 'lang.txt' } = {}) => ({ nummer, commit, datei, zeile, text });
/** „nur Änderungen“ von lang.txt in q zeigt die Nummern neu 1–6 und 15–19. */
const NUR_AENDERUNGEN_LANG = new Set([1, 2, 3, 4, 5, 6, 15, 16, 17, 18, 19]);
const GANZE_DATEI_LANG = new Set(Array.from({ length: 19 }, (_, index) => index + 1));

test.describe('Baustein Zeilenziel', () => {
  test('soll eine hinzugefügte Zeile mit ihrer Nummer neu annotieren (+ZWEI → 2)', () => {
    expect(zeilenziel({ art: 'plus', alt: null, neu: 2 }, false)).toEqual({ art: 'annotierbar', neu: 2 });
  });

  test('soll eine unveränderte Zeile mit der Nummer neu annotieren, nicht mit der Nummer alt (z19 → 18, eins → 1)', () => {
    expect(zeilenziel({ art: 'kontext', alt: 19, neu: 18 }, false)).toEqual({ art: 'annotierbar', neu: 18 });
    expect(zeilenziel({ art: 'kontext', alt: 1, neu: 1 }, false)).toEqual({ art: 'annotierbar', neu: 1 });
  });

  test('soll eine entfernte Zeile nicht annotieren und den Hinweis nennen (−zwei, −z18)', () => {
    const erwartet = { art: 'entfernt', hinweis: 'Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei' };

    expect(zeilenziel({ art: 'minus', alt: 2, neu: null }, false)).toEqual(erwartet);
    expect(zeilenziel({ art: 'minus', alt: 18, neu: null }, false)).toEqual(erwartet);
    expect(ENTFERNT_HINWEIS).toBe(erwartet.hinweis);
  });

  test('soll für Abschnittskopf und Hinweis ohne Zeilenende nichts tun', () => {
    expect(zeilenziel({ art: 'kopf', alt: null, neu: null }, false)).toEqual({ art: 'keines' });
    expect(zeilenziel({ art: 'hinweis', alt: null, neu: null }, false)).toEqual({ art: 'keines' });
  });

  test('soll bei ausgewähltem Text nichts öffnen, auch nicht den Hinweis', () => {
    expect(zeilenziel({ art: 'kontext', alt: 19, neu: 18 }, true)).toEqual({ art: 'keines' });
    expect(zeilenziel({ art: 'plus', alt: null, neu: 2 }, true)).toEqual({ art: 'keines' });
    expect(zeilenziel({ art: 'minus', alt: 2, neu: null }, true)).toEqual({ art: 'keines' });
  });
});

test.describe('Baustein Anmerkungsstand', () => {
  test('soll die Anmerkung an Nummer neu 18 unter z19 zeigen und nichts ausserhalb melden', () => {
    const stand = anmerkungsstand([anmerkung(1, 18, 'Klammer fehlt')], Q, 'lang.txt', NUR_AENDERUNGEN_LANG);

    expect([...stand.jeZeile.entries()]).toEqual([[18, [anmerkung(1, 18, 'Klammer fehlt')]]]);
    expect(stand.ausserhalb).toEqual({ anzahl: 0, zeilen: [] });
  });

  test('soll Anmerkungen anderer Commits und anderer Dateien mit derselben Nummer nicht zeigen', () => {
    const anmerkungen = [
      anmerkung(1, 18, 'in p', { commit: P }),
      anmerkung(2, 18, 'in b', { datei: 'src/b.txt' }),
      anmerkung(3, 18, 'in LANG.txt', { datei: 'LANG.txt' }),
    ];

    const stand = anmerkungsstand(anmerkungen, Q, 'lang.txt', NUR_AENDERUNGEN_LANG);

    expect(stand.jeZeile.size).toBe(0);
    expect(stand.ausserhalb).toEqual({ anzahl: 0, zeilen: [] });
  });

  test('soll zwei Anmerkungen an einer Zeile in Anlegereihenfolge halten', () => {
    const anmerkungen = [anmerkung(1, 18, 'Klammer fehlt'), anmerkung(2, 3, 'groß'), anmerkung(3, 18, 'Zweite')];

    const stand = anmerkungsstand(anmerkungen, Q, 'lang.txt', NUR_AENDERUNGEN_LANG);

    expect(stand.jeZeile.get(18).map(eintrag => eintrag.text)).toEqual(['Klammer fehlt', 'Zweite']);
    expect(stand.jeZeile.get(3).map(eintrag => eintrag.text)).toEqual(['groß']);
  });

  test('soll Zeile 10 in „nur Änderungen“ als außerhalb melden und in „ganze Datei“ unter z10 zeigen', () => {
    const anmerkungen = [anmerkung(1, 10, 'außerhalb')];

    const nurAenderungen = anmerkungsstand(anmerkungen, Q, 'lang.txt', NUR_AENDERUNGEN_LANG);
    const ganz = anmerkungsstand(anmerkungen, Q, 'lang.txt', GANZE_DATEI_LANG);

    expect(nurAenderungen.jeZeile.size).toBe(0);
    expect(nurAenderungen.ausserhalb).toEqual({ anzahl: 1, zeilen: [10] });
    expect([...ganz.jeZeile.keys()]).toEqual([10]);
    expect(ganz.ausserhalb).toEqual({ anzahl: 0, zeilen: [] });
  });

  test('soll außerhalb gezeigte Zeilen aufsteigend und je Zeile einmal nennen, gezählt je Anmerkung', () => {
    const anmerkungen = [anmerkung(1, 12, 'a'), anmerkung(2, 10, 'b'), anmerkung(3, 12, 'c'), anmerkung(4, 18, 'd')];

    const stand = anmerkungsstand(anmerkungen, Q, 'lang.txt', NUR_AENDERUNGEN_LANG);

    expect(stand.ausserhalb).toEqual({ anzahl: 3, zeilen: [10, 12] });
  });

  test('soll Anmerkungen an der ganzen Datei (ohne Zeile) weder an einer Zeile noch außerhalb führen', () => {
    const stand = anmerkungsstand([anmerkung(1, null, 'ganze Datei')], Q, 'lang.txt', NUR_AENDERUNGEN_LANG);

    expect(stand.jeZeile.size).toBe(0);
    expect(stand.ausserhalb).toEqual({ anzahl: 0, zeilen: [] });
  });
});

test.describe('Baustein Hinweis außerhalb', () => {
  test('soll eine Anmerkung an einer Zeile in der Einzahl nennen', () => {
    expect(hinweisAusserhalb({ anzahl: 1, zeilen: [10] })).toBe('1 Anmerkung an einer Zeile, die diese Ansicht nicht zeigt: Zeile 10');
  });

  test('soll mehrere Anmerkungen an mehreren Zeilen in der Mehrzahl nennen', () => {
    expect(hinweisAusserhalb({ anzahl: 2, zeilen: [10, 12] })).toBe('2 Anmerkungen an Zeilen, die diese Ansicht nicht zeigen: Zeile 10, Zeile 12');
  });

  test('soll zwei Anmerkungen an einer Zeile als zwei Anmerkungen an einer Zeile nennen', () => {
    expect(hinweisAusserhalb({ anzahl: 2, zeilen: [10] })).toBe('2 Anmerkungen an einer Zeile, die diese Ansicht nicht zeigt: Zeile 10');
  });

  test('soll ohne Anmerkung außerhalb leer sein', () => {
    expect(hinweisAusserhalb({ anzahl: 0, zeilen: [] })).toBe('');
  });
});

test.describe('Baustein Mit geändertem Text', () => {
  test('soll nur den Text der Anmerkung mit dieser Nummer ersetzen und Nummer, Stelle und Reihenfolge lassen (Nummer in der Mitte)', () => {
    const anmerkungen = [anmerkung(1, 18, 'erster'), anmerkung(2, 2, 'zweiter', { datei: 'src/b.txt' }), anmerkung(3, 4, 'dritter')];

    const geaendert = mitGeaendertemText(anmerkungen, 2, 'zweiter, berichtigt');

    expect(geaendert).toEqual([anmerkung(1, 18, 'erster'), anmerkung(2, 2, 'zweiter, berichtigt', { datei: 'src/b.txt' }), anmerkung(3, 4, 'dritter')]);
    expect(geaendert).toHaveLength(3);
    expect(anmerkungen[1].text).toBe('zweiter');
  });

  test('soll eine unbekannte Nummer ohne Wirkung lassen und dieselbe Reihenfolge und Länge liefern', () => {
    const anmerkungen = [anmerkung(1, 18, 'erster'), anmerkung(2, 2, 'zweiter')];

    const geaendert = mitGeaendertemText(anmerkungen, 7, 'nirgends');

    expect(geaendert).toEqual(anmerkungen);
    expect(geaendert).toHaveLength(2);
  });

  test('soll eine Dateianmerkung ohne Zeile ändern und ihre Stelle ohne Zeile lassen', () => {
    const anmerkungen = [anmerkung(1, null, 'Abschnitt Installation veraltet', { datei: 'README.md' })];

    const geaendert = mitGeaendertemText(anmerkungen, 1, 'Abschnitt Installation fehlt');

    expect(geaendert).toEqual([anmerkung(1, null, 'Abschnitt Installation fehlt', { datei: 'README.md' })]);
    expect(geaendert[0].zeile).toBeNull();
  });
});
