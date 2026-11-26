'use strict';
// Bausteintests (ohne Browser) des reinen Bausteins „Dateiliste durchsuchen“ (R00049, B4501): Prüfung des Suchtextes,
// der Abgleich des Anzeigenamens (Teilzeichenkette oder Muster) und die Angabe „ohne Rücksicht auf Groß/Klein“ am
// vorhandenen `passt` aus R00025. R00025 selbst bleibt unverändert — die Gegenprobe steht am Ende.
const { test, expect } = require('@playwright/test');
const { passt } = require('../../../src/GitReviewA/web/ausblenden-werte.js');
const {
  suchtextFehler, trifft, aufwand, suchlauf, BUDGET,
} = require('../../../src/GitReviewA/web/dateisuche-werte.js');

/** Die acht Pfade von Repo P aus R00049 (Code 5, Tests 1, Doku 2). */
const REPO_P = [
  'README.md', 'db/001_anlegen.sql', 'db/002_aendern.sql', 'docs/api.md',
  'src/app.js', 'src/data/app.sql', 'src/util.js', 'tests/app.test.js',
];

/** Die Pfade von Repo P, die `text` trifft. */
function treffer(text) {
  return REPO_P.filter(pfad => trifft(text, pfad));
}

test.describe('Baustein Dateisuche-Werte: Prüfung des Suchtextes', () => {
  test('soll leer und Leerraum als keine Suche durchlassen', () => {
    expect(suchtextFehler('')).toBeNull();
    expect(suchtextFehler('   ')).toBeNull();
    expect(suchtextFehler('\t')).toBeNull();
  });

  test('soll 1 bis 200 Zeichen durchlassen und 201 ablehnen', () => {
    expect(suchtextFehler('a')).toBeNull();
    expect(suchtextFehler('a'.repeat(200))).toBeNull();
    expect(suchtextFehler('a'.repeat(201))).toBe('Ein Muster darf höchstens 200 Zeichen haben.');
  });

  test('soll Steuer- und Richtungszeichen ablehnen (dieselbe Prüfung wie das Musterfeld)', () => {
    expect(suchtextFehler('a\nb')).toBe('Ein Muster darf keine Steuer- oder Richtungszeichen enthalten.');
    expect(suchtextFehler('ab\u202E.sql')).toBe('Ein Muster darf keine Steuer- oder Richtungszeichen enthalten.');
  });

  test('soll führenden und folgenden Leerraum als Teil des Textes tragen', () => {
    expect(suchtextFehler(' a ')).toBeNull();
    expect(trifft(' app', 'src/app.js')).toBe(false);
    expect(trifft('app ', 'src/app.js')).toBe(false);
    expect(trifft('app', 'src/app.js')).toBe(true);
  });
});

test.describe('Baustein Dateisuche-Werte: Teilzeichenkette und Muster (Kriterium 1)', () => {
  test('soll ein Wort als Teilzeichenkette des Anzeigenamens finden', () => {
    expect(treffer('app')).toEqual(['src/app.js', 'src/data/app.sql', 'tests/app.test.js']);
  });

  test('soll Groß und klein nicht unterscheiden', () => {
    expect(treffer('APP')).toEqual(['src/app.js', 'src/data/app.sql', 'tests/app.test.js']);
    expect(treffer('readme')).toEqual(['README.md']);
    expect(treffer('README')).toEqual(['README.md']);
  });

  test('soll ein Muster auf den Dateinamen jeder Ebene anwenden, auch ohne Rücksicht auf Groß/Klein', () => {
    expect(treffer('*.sql')).toEqual(['db/001_anlegen.sql', 'db/002_aendern.sql', 'src/data/app.sql']);
    expect(treffer('*.SQL')).toEqual(['db/001_anlegen.sql', 'db/002_aendern.sql', 'src/data/app.sql']);
  });

  test('soll ein Muster mit Schrägstrich gegen den ganzen Pfad halten, ein Stern bleibt im Segment', () => {
    expect(treffer('db/*')).toEqual(['db/001_anlegen.sql', 'db/002_aendern.sql']);
    expect(treffer('src/*')).toEqual(['src/app.js', 'src/util.js']);
    expect(treffer('src/*')).not.toContain('src/data/app.sql');
  });

  test('soll ? und Zeichenklasse im Muster lesen, [A-Z] wie [a-z]', () => {
    expect(treffer('src/?pp.js')).toEqual(['src/app.js']);
    expect(treffer('src/[A-Z]pp.js')).toEqual(['src/app.js']);
  });

  test('soll ein Muster ohne Treffer als gültig ohne Treffer behandeln', () => {
    expect(treffer('*.zzz')).toEqual([]);
    expect(treffer('zzz')).toEqual([]);
  });

  test('soll die Marke unsichtbarer Zeichen tippbar finden (Kriterium 2)', () => {
    expect(trifft('\u27E8U+202E\u27E9', 'ab\u27E8U+202E\u27E9.sql')).toBe(true);
    expect(trifft('ab', 'ab\u27E8U+202E\u27E9.sql')).toBe(true);
  });

  test('soll ein Rohbyte als Marke finden', () => {
    expect(trifft('\u27E80xFF\u27E9', 'f\u27E80xFF\u27E9.txt')).toBe(true);
  });

  test('soll ein wörtliches [ als Muster lesen und [[] als wörtliche Klammer', () => {
    expect(treffer('[')).toEqual([]);
    expect(trifft('[[]', '[')).toBe(true);
    expect(trifft('[[]', 'ordner/[')).toBe(true);
    expect(trifft('[[]', 'ab.txt')).toBe(false);
  });
});

test.describe('Baustein Dateisuche-Werte: die Angabe am vorhandenen passt (Gegenprobe zu R00025)', () => {
  test('soll ohne die Angabe unverändert Groß und Klein unterscheiden', () => {
    expect(passt('*.SQL', 'app.sql')).toBe(false);
    expect(passt('*.SQL', 'app.SQL')).toBe(true);
    expect(passt('README.md', 'readme.md')).toBe(false);
  });

  test('soll mit der Angabe „ohne Groß/Klein“ beide Schreibweisen treffen, [A-Z] wie [a-z]', () => {
    const angabe = { ohneGrossKlein: true };
    expect(passt('*.SQL', 'app.sql', angabe)).toBe(true);
    expect(passt('README.md', 'readme.md', angabe)).toBe(true);
    expect(passt('src/[A-Z]pp.js', 'src/app.js', angabe)).toBe(true);
    expect(passt('src/*', 'src/data/app.sql', angabe)).toBe(false);
    expect(passt('*.txt', 'app.sql', angabe)).toBe(false);
  });
});

/** Ein Eintrag des Suchlaufs: der Anzeigename des Pfades (die Marken setzt der Aufrufer). */
const eintrag = anzeigename => ({ anzeigename });

/** `anzahl` Einträge mit Anzeigenamen von genau `laenge` Zeichen. */
function eintraege(anzahl, laenge = 20) {
  return Array.from({ length: anzahl }, () => eintrag(`${'p'.repeat(laenge - 4)}.txt`));
}

test.describe('Baustein Dateisuche-Werte: Aufwand und Buchung (Kriterium 11)', () => {
  test('soll je Pfad buchen: bei einer Teilzeichenkette die Pfadlänge + 1, beim Muster Teile × (Länge + 1)', () => {
    expect(aufwand('app', 20)).toBe(21);
    expect(aufwand('*.sql', 20)).toBe(105);
    expect(aufwand('*a'.repeat(3), 0)).toBe(6);
  });

  test('soll vor jedem Abgleich buchen und nur Gebuchtes arbeiten (1, 10, 30 und 2 000 Pfade)', () => {
    for (const anzahl of [1, 10, 30, 2000]) {
      const lauf = suchlauf('*.txt', eintraege(anzahl), BUDGET);

      expect(lauf.abgebrochen, `${anzahl} Pfade`).toBe(false);
      expect(lauf.treffer.length, `${anzahl} Pfade`).toBe(anzahl);
      expect(lauf.arbeit, `${anzahl} Pfade: Arbeit ≤ Buchung`).toBeLessThanOrEqual(lauf.gebucht);
      expect(lauf.gebucht, `${anzahl} Pfade: Buchung ≤ Budget`).toBeLessThanOrEqual(BUDGET);
      expect(lauf.gebucht, `${anzahl} Pfade`).toBe(anzahl * 5 * 21);
    }
  });

  test('soll einen Pfad bis 4 096 Zeichen tragen', () => {
    const langer = `tief/${'a'.repeat(4087)}.sql`;
    expect(langer.length).toBe(4096);

    const lauf = suchlauf('*.sql', [eintrag(langer)], BUDGET);

    expect(lauf.treffer).toHaveLength(1);
    expect(lauf.gebucht).toBe(5 * 4097);
  });

  test('soll über dem Budget abbrechen, ohne mehr zu buchen als erlaubt', () => {
    const muster = '*a'.repeat(100);
    const viele = eintraege(2000, 100);
    const jeEintrag = aufwand(muster, 100);
    const zuKlein = jeEintrag * 24;

    const lauf = suchlauf(muster, viele, zuKlein);

    expect(lauf.abgebrochen).toBe(true);
    expect(lauf.gebucht).toBeLessThanOrEqual(zuKlein);
    expect(lauf.arbeit).toBe(lauf.gebucht);
    expect(lauf.treffer).toEqual([]);
    // Der nächste Eintrag hätte das Budget gerissen: er wurde nicht mehr verglichen.
    expect(lauf.gebucht + jeEintrag).toBeGreaterThan(zuKlein);
  });

  test('soll bei leerem Text nichts buchen (keine Suche)', () => {
    const lauf = suchlauf('', eintraege(5), BUDGET);

    expect(lauf.abgebrochen).toBe(false);
    expect(lauf.gebucht).toBe(0);
    expect(lauf.arbeit).toBe(0);
  });
});
