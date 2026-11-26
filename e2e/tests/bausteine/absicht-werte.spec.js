'use strict';
// Bausteintests (ohne Browser) der Absicht der KI über dem Diff (R00038): die Commits der gewählten Datei aus den Stellen
// des Servers bzw. dem gewählten Commit, in der Reihenfolge der Commit-Leiste und je einmal (B3701); dazu die sichtbaren
// Zeilen, die Längengrenze je Nachricht und die Marken der einen Zeichenklasse (B3702).
const { test, expect } = require('@playwright/test');
const {
  stellenDerDatei, commitsDerDatei, sichtbare, nachrichtText, markiert, SICHTBARE_COMMITS, NACHRICHT_GRENZE,
} = require('../../../src/GitReviewA/web/absicht-werte.js');

const HASH_Z1 = '13ba46c707f0744779fe7c52c3e935814b908017';
const HASH_Z2 = 'dd13577c75a05e64a0aa01cb6e9053d7548c83d0';
const HASH_Z3 = '8f0c1d2e3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d';

/** Die Commit-Liste der Leiste (`GET /api/commits`), in Auswahlreihenfolge. */
const COMMITS = [
  { hash: HASH_Z1, kurzHash: '13ba46c', betreff: 'Start', rumpf: '' },
  { hash: HASH_Z2, kurzHash: 'dd13577', betreff: 'a ändern, b neu', rumpf: '' },
  { hash: HASH_Z3, kurzHash: '8f0c1d2', betreff: 'a und b ändern', rumpf: 'Grund' },
];

/** Die Netto-Liste der Auswahl (`GET /api/zusammen`), wie sie der Server liefert. */
const DATEIEN = [
  { pfad: 'README.md', stellen: [{ commit: HASH_Z1, pfad: 'README.md' }] },
  { pfad: 'src/a.txt', stellen: [{ commit: HASH_Z1, pfad: 'src/a.txt' }, { commit: HASH_Z2, pfad: 'src/a.txt' }, { commit: HASH_Z3, pfad: 'src/a.txt' }] },
];

test.describe('Baustein Absicht-Werte', () => {
  test('soll die Stellen der gewählten Datei aus der Netto-Liste nehmen und ohne Eintrag leer lassen', () => {
    expect(stellenDerDatei(DATEIEN, 'src/a.txt')).toEqual(DATEIEN[1].stellen);
    expect(stellenDerDatei(DATEIEN, 'README.md')).toEqual(DATEIEN[0].stellen);
    expect(stellenDerDatei(DATEIEN, 'gibt-es-nicht.txt')).toEqual([]);
    expect(stellenDerDatei([], 'src/a.txt')).toEqual([]);
  });

  test('soll in „Zusammen“ die Commits der Stellen in der Reihenfolge der Leiste nennen, jeden einmal', () => {
    const wahl = { modus: 'zusammen', pfad: 'src/a.txt', commit: HASH_Z3 };

    expect(commitsDerDatei('zusammen', wahl, stellenDerDatei(DATEIEN, 'src/a.txt'), COMMITS).map(commit => commit.kurzHash))
      .toEqual(['13ba46c', 'dd13577', '8f0c1d2']);
    expect(commitsDerDatei('zusammen', wahl, stellenDerDatei(DATEIEN, 'README.md'), COMMITS).map(commit => commit.kurzHash))
      .toEqual(['13ba46c']);
  });

  test('soll die Reihenfolge der Leiste führen, auch wenn die Stellen anders stehen, und eine doppelte Stelle einmal nennen', () => {
    const wahl = { modus: 'zusammen', pfad: 'src/a.txt', commit: HASH_Z3 };
    const stellen = [{ commit: HASH_Z3, pfad: 'src/a.txt' }, { commit: HASH_Z1, pfad: 'src/a.txt' }, { commit: HASH_Z1, pfad: 'src/a.txt' }];

    expect(commitsDerDatei('zusammen', wahl, stellen, COMMITS).map(commit => commit.kurzHash)).toEqual(['13ba46c', '8f0c1d2']);
  });

  test('soll in „Einzeln“ nur den gewählten Commit nennen und die Stellen nicht beachten', () => {
    expect(commitsDerDatei('einzeln', { modus: 'einzeln', pfad: 'src/a.txt', commit: HASH_Z2 }, [], COMMITS).map(commit => commit.kurzHash))
      .toEqual(['dd13577']);
    expect(commitsDerDatei('einzeln', { modus: 'einzeln', pfad: 'src/a.txt', commit: HASH_Z1 }, stellenDerDatei(DATEIEN, 'src/a.txt'), COMMITS).map(commit => commit.kurzHash))
      .toEqual(['13ba46c']);
  });

  test('soll ohne Commits, ohne Stellen und ohne Commit der Leiste eine leere Liste liefern', () => {
    expect(commitsDerDatei('zusammen', { modus: 'zusammen', pfad: 'src/a.txt', commit: HASH_Z3 }, [], COMMITS)).toEqual([]);
    expect(commitsDerDatei('zusammen', { modus: 'zusammen', pfad: 'src/a.txt', commit: HASH_Z3 }, stellenDerDatei(DATEIEN, 'src/a.txt'), [])).toEqual([]);
    expect(commitsDerDatei('einzeln', { modus: 'einzeln', pfad: 'src/a.txt', commit: 'nicht-in-der-leiste' }, [], COMMITS)).toEqual([]);
  });

  test('Kriterium 7: eine Umbenennung nennt beide Commits, weil die Stellen des Servers verkettet sind', () => {
    // `n1` legt `alt.txt` an, `n2` benennt sie in `neu.txt` um und ändert sie: die Netto-Liste führt die Datei unter
    // `neu.txt` mit beiden Stellen — die Verkettung prüft I0010, hier wird nur gerechnet.
    const dateien = [{ pfad: 'neu.txt', stellen: [{ commit: HASH_Z1, pfad: 'alt.txt' }, { commit: HASH_Z2, pfad: 'neu.txt' }] }];
    const commits = [
      { hash: HASH_Z1, kurzHash: '13ba46c', betreff: 'Anlegen', rumpf: '' },
      { hash: HASH_Z2, kurzHash: 'dd13577', betreff: 'Umbenannt und geändert', rumpf: '' },
      { hash: HASH_Z3, kurzHash: '8f0c1d2', betreff: 'Unbeteiligt', rumpf: '' },
    ];

    expect(commitsDerDatei('zusammen', { modus: 'zusammen', pfad: 'neu.txt', commit: HASH_Z2 }, stellenDerDatei(dateien, 'neu.txt'), commits).map(commit => commit.kurzHash))
      .toEqual(['13ba46c', 'dd13577']);
  });

  test('soll einen Namen mit Rohbyte-Marke über seinen Anzeigenamen finden', () => {
    const dateien = [{ pfad: 'f⟨0xFF⟩.txt', stellen: [{ commit: HASH_Z1, pfad: 'f\u00ff.txt' }] }];

    expect(stellenDerDatei(dateien, 'f⟨0xFF⟩.txt')).toEqual([{ commit: HASH_Z1, pfad: 'f\u00ff.txt' }]);
    expect(commitsDerDatei('zusammen', { modus: 'zusammen', pfad: 'f⟨0xFF⟩.txt', commit: HASH_Z1 }, stellenDerDatei(dateien, 'f⟨0xFF⟩.txt'), COMMITS).map(commit => commit.kurzHash))
      .toEqual(['13ba46c']);
  });
});

test.describe('Baustein Absicht-Werte — sichtbare Commits', () => {  /** `anzahl` Commits mit laufender Nummer als Kurz-Hash. */
  function commits(anzahl) {
    return Array.from({ length: anzahl }, (_, index) => ({ hash: `h${index}`, kurzHash: `k${index}`, betreff: `Betreff ${index}`, rumpf: '' }));
  }

  test('soll bis fünf Commits ganz zeigen und ohne Rest keinen Knopf „weitere“ anbieten', () => {
    expect(sichtbare(commits(0))).toEqual({ sichtbar: [], weitere: [] });
    expect(sichtbare(commits(1)).sichtbar.map(commit => commit.kurzHash)).toEqual(['k0']);
    expect(sichtbare(commits(1)).weitere).toEqual([]);
    expect(sichtbare(commits(5)).sichtbar).toHaveLength(5);
    expect(sichtbare(commits(5)).weitere).toEqual([]);
  });

  test('soll ab sechs Commits die ersten fünf zeigen und den Rest als „weitere“', () => {
    const sechs = sichtbare(commits(6));
    expect(sechs.sichtbar.map(commit => commit.kurzHash)).toEqual(['k0', 'k1', 'k2', 'k3', 'k4']);
    expect(sechs.weitere.map(commit => commit.kurzHash)).toEqual(['k5']);

    const tausend = sichtbare(commits(1000));
    expect(tausend.sichtbar).toHaveLength(SICHTBARE_COMMITS);
    expect(tausend.weitere).toHaveLength(995);
  });
});

test.describe('Baustein Absicht-Werte — Länge je Nachricht', () => {
  test('soll eine Nachricht bis zur Grenze unverändert lassen und darüber sichtbar kürzen', () => {
    const genau = 'x'.repeat(NACHRICHT_GRENZE);
    expect(nachrichtText(genau)).toBe(genau);
    expect(nachrichtText('xxxxx', 5)).toBe('xxxxx');
    expect(nachrichtText('abcdef', 6)).toBe('abcdef');

    const einsZuViel = 'x'.repeat(NACHRICHT_GRENZE + 1);
    expect(nachrichtText(einsZuViel)).toBe(`${genau}… (1 Zeichen nicht gezeigt)`);
    expect(nachrichtText('abcdef', 4)).toBe('abcd… (2 Zeichen nicht gezeigt)');
  });

  test('soll Zeichen statt Codeeinheiten zählen, damit ein Zeichenpaar nie zerschnitten wird', () => {
    // „😀“ ist ein Zeichen aus zwei Codeeinheiten; die Grenze von 3 Zeichen lässt es ganz stehen.
    expect(nachrichtText('ab😀cd', 3)).toBe('ab😀… (2 Zeichen nicht gezeigt)');
    expect(nachrichtText('ab😀', 3)).toBe('ab😀');
  });

  test('soll vor den Marken kürzen, damit nie eine Marke angeschnitten wird', () => {
    // Das 20 000. Zeichen ist ein richtungsänderndes Zeichen: es steht ganz in der Marke, das nächste ist nicht gezeigt.
    const mitMarke = `${'x'.repeat(NACHRICHT_GRENZE - 1)}\u202Ez`;
    const gekuerzt = nachrichtText(mitMarke);
    expect(gekuerzt).toBe(`${'x'.repeat(NACHRICHT_GRENZE - 1)}\u202E… (1 Zeichen nicht gezeigt)`);
    expect(markiert(gekuerzt)).toBe(`${'x'.repeat(NACHRICHT_GRENZE - 1)}⟨U+202E⟩… (1 Zeichen nicht gezeigt)`);

    // Kein Ausschnitt endet je in einer halben Marke.
    const ohneHalb = markiert(nachrichtText(`${'a\u202E'.repeat(15000)}`));
    expect(ohneHalb.match(/⟨/g)).toHaveLength(ohneHalb.match(/⟩/g).length);
  });
});

test.describe('Baustein Absicht-Werte — Marken der einen Zeichenklasse', () => {
  test('soll richtungsändernde und unsichtbare Zeichen als Marke zeigen und Tab und Sichtbares lassen', () => {
    expect(markiert('a\u202Eb\u200Bc\u{E0041}d')).toBe('a⟨U+202E⟩b⟨U+200B⟩c⟨U+E0041⟩d');
    expect(markiert('a\tb')).toBe('a\tb');
    expect(markiert('normaler Text')).toBe('normaler Text');
  });

  test('soll je Zeile markieren und den Zeilenumbruch als Umbruch lassen', () => {
    expect(markiert('erste\nzweite \u202Ezeile')).toBe('erste\nzweite ⟨U+202E⟩zeile');
    expect(markiert('a\nb\n')).toBe('a\nb\n');
  });

  test('soll Rohbyte-Marken des Servers unverändert durchlassen', () => {
    expect(markiert('f⟨0xFF⟩.txt')).toBe('f⟨0xFF⟩.txt');
  });
});
