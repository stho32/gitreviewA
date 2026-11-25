'use strict';
// Bausteintests (ohne Browser) der reinen Rechnung der Navigation (R00028, B2701 und B2702): die Einträge der gezeigten Liste mit
// Zustand bilden und darin die nächste ungeprüfte Stelle finden — vorwärts, gesperrte übersprungen, mit Umlauf. Kein `git`, kein
// Server, kein Nachladen: nur die schon geladene Liste und der Stand.
const { test, expect } = require('@playwright/test');
const { naechster, eintraege, meldung, ausgeblendeteOffene, KEINE } = require('../../../src/GitReviewA/web/naechste-werte.js');

const abgehakt = (pfad, commit) => ({ art: commit ? 'stelle' : 'datei', commit, pfad, zustand: 'abgehakt' });
const ungeprueft = (pfad, commit) => ({ art: commit ? 'stelle' : 'datei', commit, pfad, zustand: 'ungeprueft' });
const gesperrt = (pfad, commit) => ({ art: commit ? 'stelle' : 'datei', commit, pfad, zustand: 'gesperrt' });

test.describe('Baustein Nächste-Werte — die nächste ungeprüfte finden (B2701)', () => {
  test('soll ohne Einträge keine Stelle nennen', () => {
    expect(naechster([], null)).toBe(KEINE);
  });

  test('soll ohne aktuelle Stelle die erste ungeprüfte nehmen und abgehakte und gesperrte überspringen', () => {
    const liste = [abgehakt('a.txt'), gesperrt('b.txt'), ungeprueft('c.txt'), ungeprueft('d.txt')];

    expect(naechster(liste, null)).toBe(2);
    expect(naechster(liste, undefined)).toBe(2);
  });

  test('soll ab der aktuellen Stelle vorwärts gehen und nicht auf ihr selbst landen', () => {
    const liste = [ungeprueft('a.txt'), ungeprueft('b.txt'), ungeprueft('c.txt')];

    expect(naechster(liste, { pfad: 'a.txt' })).toBe(1);
    expect(naechster(liste, { pfad: 'b.txt' })).toBe(2);
  });

  test('soll am Ende zur ersten ungeprüften umlaufen (Umlauf)', () => {
    const liste = [ungeprueft('a.txt'), ungeprueft('b.txt'), ungeprueft('c.txt')];

    expect(naechster(liste, { pfad: 'c.txt' })).toBe(0);
  });

  test('soll über abgehakte und gesperrte Einträge hinweg umlaufen', () => {
    const liste = [abgehakt('a.txt'), gesperrt('b.txt'), ungeprueft('c.txt'), abgehakt('d.txt')];

    expect(naechster(liste, { pfad: 'd.txt' })).toBe(2);
  });

  test('soll nur die eigenen Stellen des Eintrags vergleichen (Einzeln: Commit und Datei)', () => {
    const liste = [ungeprueft('a.txt', 'z1'), ungeprueft('a.txt', 'z2'), ungeprueft('b.txt', 'z2')];

    expect(naechster(liste, { commit: 'z1', pfad: 'a.txt' })).toBe(1);
    expect(naechster(liste, { commit: 'z2', pfad: 'a.txt' })).toBe(2);
  });

  test('soll ohne passenden Eintrag zur aktuellen Stelle von vorn beginnen', () => {
    const liste = [abgehakt('a.txt'), ungeprueft('b.txt')];

    expect(naechster(liste, { pfad: 'weg.txt' })).toBe(1);
  });

  test('soll bei nur abgehakten und gesperrten Einträgen keine Stelle nennen', () => {
    const liste = [abgehakt('a.txt'), gesperrt('b.txt')];

    expect(naechster(liste, null)).toBe(KEINE);
    expect(naechster(liste, { pfad: 'a.txt' })).toBe(KEINE);
  });

  test('soll eine einzelne ungeprüfte Stelle auch von sich aus wiederfinden (Umlauf über einen Eintrag)', () => {
    const liste = [abgehakt('a.txt'), ungeprueft('b.txt')];

    expect(naechster(liste, { pfad: 'b.txt' })).toBe(1);
  });
});

/** Der Stand, wie ihn die Oberfläche führt: je Stelle (Commit und Datei) abgehakt und gesperrt. */
function standAus(abgehakteStellen = [], gesperrteStellen = []) {
  const schluessel = (commit, pfad) => `${commit} ${pfad}`;
  const abgehakt = new Set(abgehakteStellen);
  const gesperrt = new Set(gesperrteStellen);
  return {
    istAbgehakt: (commit, pfad) => abgehakt.has(schluessel(commit, pfad)),
    istGesperrt: (commit, pfad) => gesperrt.has(schluessel(commit, pfad)),
  };
}

/** Eine Datei der Netto-Liste („Zusammen“) mit ihren Stellen: je Stelle Commit und Datei. */
const datei = (pfad, stellen) => ({ pfad, stellen: stellen.map(([commit, stelle]) => ({ commit, pfad: stelle })) });

const pfade = liste => liste.map(eintrag => eintrag.pfad);
const zustaende = liste => liste.map(eintrag => eintrag.zustand);

test.describe('Baustein Nächste-Werte — Einträge der gezeigten Sicht mit Zustand (B2702)', () => {
  test('soll in „Zusammen“ je Datei einen Eintrag in der Reihenfolge der Liste bilden', () => {
    const liste = [datei('README.md', [['z1', 'README.md']]), datei('src/a.txt', [['z1', 'src/a.txt'], ['z2', 'src/a.txt']])];

    const gebildet = eintraege('zusammen', liste, standAus());

    expect(gebildet).toEqual([
      { art: 'datei', pfad: 'README.md', zustand: 'ungeprueft' },
      { art: 'datei', pfad: 'src/a.txt', zustand: 'ungeprueft' },
    ]);
  });

  test('soll in „Zusammen“ eine Datei erst abgehakt nennen, wenn alle ihre Stellen abgehakt sind', () => {
    const liste = [datei('a.txt', [['z1', 'a.txt'], ['z2', 'a.txt']]), datei('b.txt', [['z2', 'b.txt']])];

    expect(zustaende(eintraege('zusammen', liste, standAus(['z1 a.txt'])))).toEqual(['ungeprueft', 'ungeprueft']);
    expect(zustaende(eintraege('zusammen', liste, standAus(['z1 a.txt', 'z2 a.txt', 'z2 b.txt'])))).toEqual(['abgehakt', 'abgehakt']);
  });

  test('soll in „Zusammen“ eine Datei als gesperrt führen, deren offene Stellen alle gesperrt sind', () => {
    const liste = [datei('f.txt', [['n', 'f.txt'], ['n', 'f.txt']]), datei('g.txt', [['n', 'g.txt']])];

    expect(zustaende(eintraege('zusammen', liste, standAus([], ['n f.txt'])))).toEqual(['gesperrt', 'ungeprueft']);
  });

  test('soll in „Zusammen“ eine Datei mit gemischten Stellen erreichen, solange eine lesbare offen ist (Kriterium 7)', () => {
    const liste = [datei('paar.txt', [['n', 'paar.txt'], ['v', 'paar.txt']])];

    expect(zustaende(eintraege('zusammen', liste, standAus([], ['n paar.txt'])))).toEqual(['ungeprueft']);
  });

  test('soll in „Zusammen“ eine Datei als gesperrt führen, wenn neben der abgehakten Stelle nur noch eine gesperrte offen ist', () => {
    const liste = [datei('paar.txt', [['n', 'paar.txt'], ['v', 'paar.txt']])];

    expect(zustaende(eintraege('zusammen', liste, standAus(['v paar.txt'], ['n paar.txt'])))).toEqual(['gesperrt']);
  });

  test('soll in „Zusammen“ eine Datei mit Sperrgrund als gesperrt führen, auch wenn keine ihrer Stellen einzeln gesperrt ist', () => {
    const liste = [{ pfad: 'f.txt', sperrgrund: 'Diff nicht lesbar: Name nicht eindeutig', stellen: [{ commit: 'n', pfad: 'f.txt' }] }];

    expect(zustaende(eintraege('zusammen', liste, standAus()))).toEqual(['gesperrt']);
  });

  test('soll in „Einzeln“ je Stelle (Commit und Datei) einen Eintrag bilden', () => {
    const stellen = [{ commit: 'z1', datei: 'README.md' }, { commit: 'z1', datei: 'src/a.txt' }];

    expect(eintraege('einzeln', stellen, standAus([], ['z1 src/a.txt']))).toEqual([
      { art: 'stelle', commit: 'z1', pfad: 'README.md', zustand: 'ungeprueft' },
      { art: 'stelle', commit: 'z1', pfad: 'src/a.txt', zustand: 'gesperrt' },
    ]);
  });

  test('soll in „Einzeln“ die eigenen Stellen führen (alle Commits der Auswahl, je Stelle ihr Commit)', () => {
    const stellen = [{ commit: 'z1', datei: 'src/a.txt' }, { commit: 'z2', datei: 'src/a.txt' }];
    const stand = standAus(['z2 src/a.txt']);

    expect(zustaende(eintraege('einzeln', stellen, stand))).toEqual(['ungeprueft', 'abgehakt']);
  });

  test('soll in „Einzeln“ über Commits hinweg suchen — nicht nur in der gezeigten Dateiliste (Kriterium 4)', () => {
    const stellen = [
      { commit: 'z1', datei: 'README.md' }, { commit: 'z1', datei: 'src/a.txt' },
      { commit: 'z2', datei: 'src/a.txt' }, { commit: 'z2', datei: 'src/b.txt' },
    ];
    const gebildet = eintraege('einzeln', stellen, standAus());

    expect(naechster(gebildet, { commit: 'z1', pfad: 'src/a.txt' })).toBe(2);
  });

  test('soll nur die Einträge der gezeigten Liste führen — ausgeblendete Dateien sind keine Einträge', () => {
    const gezeigt = [datei('bleibt.txt', [['z1', 'bleibt.txt']])];

    expect(eintraege('zusammen', gezeigt, standAus())).toHaveLength(1);
  });

  test('soll in „Zusammen“ und „Einzeln“ denselben Stand auswerten — ein Haken, zwei Sichten (Kriterium 8)', () => {
    const stand = standAus(['z1 src/a.txt']);
    const zusammen = eintraege('zusammen', [datei('src/a.txt', [['z1', 'src/a.txt']])], stand);
    const einzeln = eintraege('einzeln', [{ commit: 'z1', datei: 'src/a.txt' }], stand);

    expect(zustaende(zusammen)).toEqual(['abgehakt']);
    expect(zustaende(einzeln)).toEqual(['abgehakt']);
  });

  test('soll die nächste ungeprüfte aus den Einträgen der Sicht finden', () => {
    const liste = [datei('a.txt', [['z1', 'a.txt']]), datei('b.txt', [['z1', 'b.txt']]), datei('c.txt', [['z1', 'c.txt']])];
    const gebildet = eintraege('zusammen', liste, standAus(['z1 a.txt'], ['z1 c.txt']));

    expect(pfade(gebildet)).toEqual(['a.txt', 'b.txt', 'c.txt']);
    expect(naechster(gebildet, null)).toBe(1);
    expect(naechster(gebildet, { pfad: 'b.txt' })).toBe(1);
  });
});

test.describe('Baustein Nächste-Werte — die ausgeblendeten offenen Dateien (Szenario 6)', () => {
  test('soll in „Zusammen“ je verdeckter Datei zählen und abgehakte auslassen', () => {
    const verdeckt = [datei('a.lock', [['i1', 'a.lock']]), datei('b.lock', [['i1', 'b.lock']])];

    expect(ausgeblendeteOffene('zusammen', verdeckt, standAus())).toBe(2);
    expect(ausgeblendeteOffene('zusammen', verdeckt, standAus(['i1 b.lock']))).toBe(1);
  });

  test('soll in „Einzeln“ je verdeckter Datei einmal zählen, auch wenn mehrere Stellen offen sind', () => {
    const verdeckt = [{ commit: 'z1', datei: 'v.lock' }, { commit: 'z2', datei: 'v.lock' }, { commit: 'z2', datei: 'w.lock' }];

    expect(ausgeblendeteOffene('einzeln', verdeckt, standAus())).toBe(2);
  });

  test('soll in „Einzeln“ eine vollständig abgehakte verdeckte Datei nicht zählen', () => {
    const verdeckt = [{ commit: 'z1', datei: 'v.lock' }, { commit: 'z2', datei: 'v.lock' }];

    expect(ausgeblendeteOffene('einzeln', verdeckt, standAus(['z1 v.lock', 'z2 v.lock']))).toBe(0);
    expect(ausgeblendeteOffene('einzeln', verdeckt, standAus(['z1 v.lock']))).toBe(1);
  });
});

test.describe('Baustein Nächste-Werte — die Meldung am Ende', () => {
  test('soll „Alles abgehakt“ sagen, wenn nichts gesperrt und nichts ausgeblendet ist', () => {
    expect(meldung({ nichtLesbar: 0, ausgeblendet: 0 })).toBe('Alles abgehakt');
  });

  test('soll die Zahl der nicht lesbaren Stellen wörtlich aus R00014 nennen', () => {
    expect(meldung({ nichtLesbar: 3, ausgeblendet: 0 })).toBe('Alles Lesbare abgehakt, 3 nicht lesbar');
  });

  test('soll die Zahl der ausgeblendeten nennen, wenn nur die Sichtbarkeit fehlt (R00025, Szenario 6)', () => {
    expect(meldung({ nichtLesbar: 0, ausgeblendet: 1 })).toBe('Alles Sichtbare abgehakt, 1 ausgeblendet');
  });

  test('soll beides nennen — die nicht lesbaren zuerst', () => {
    expect(meldung({ nichtLesbar: 2, ausgeblendet: 1 })).toBe('Alles Lesbare abgehakt, 2 nicht lesbar, 1 ausgeblendet');
  });
});
