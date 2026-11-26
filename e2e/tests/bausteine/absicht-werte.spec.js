'use strict';
// Bausteintests (ohne Browser) der Absicht der KI über dem Diff (R00038): die Commits der gewählten Datei aus den Stellen
// des Servers bzw. dem gewählten Commit, in der Reihenfolge der Commit-Leiste und je einmal (B3701).
const { test, expect } = require('@playwright/test');
const { stellenDerDatei, commitsDerDatei } = require('../../../src/GitReviewA/web/absicht-werte.js');

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
});
