'use strict';
// Spezifikation R00028 „Nächste ungeprüfte Datei“: der Sprung in der Oberfläche — in „Zusammen“ je Datei, in „Einzeln“ je Stelle
// (Commit und Datei) über Commits hinweg, ab der aktuellen Wahl, abgehakte und gesperrte Stellen übersprungen, mit Umlauf.
// Ebene: Integration der Oberfläche gegen das laufende Programm (die Rechnung selbst prüfen die Bausteintests
// e2e/tests/bausteine/naechste-werte.spec.js); kein Hot-Path-Fall.
const { test, expect } = require('../dsl/naechste.js');

test.describe('Sprung in „Zusammen“ (je Datei)', () => {
  test('soll von vorn durch die Liste springen und am Ende umlaufen (Szenario 1)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    const ohneSprung = await naechste.gewaehlteZeilen();
    expect(ohneSprung, 'ohne Sprung ist nichts gewählt').toEqual([]);

    await naechste.reihe(['README.md', 'src/a.txt', 'src/b.txt', 'README.md']);
  });

  test('soll ab der aktuellen Datei die nächste nehmen, nicht sie selbst (Szenario 2)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.dateiWaehlen('src/a.txt');

    await naechste.springen();

    await naechste.stelle('src/b.txt');
  });

  test('soll eine abgehakte Datei überspringen (Szenario 3)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await naechste.dateienWarten(3);
    await naechste.abhaken('README.md');
    await naechste.fortschritt('1 von 3 Dateien abgehakt');

    await naechste.reihe(['src/a.txt', 'src/b.txt', 'src/a.txt']);
  });

  test('soll die gefundene Zeile in den sichtbaren Bereich holen (Szenario 7, Scroll)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'viele Dateien', modus: 'zusammen' });
    await naechste.dateienWarten(61);

    // 30 Zeilen abwärts: die gefundene Zeile liegt unterhalb des sichtbaren Bereichs, wenn der Knopf sichtbar ist.
    for (let schritt = 0; schritt < 30; schritt += 1) {
      await naechste.springen();
    }

    await naechste.stelle('viele/datei-0029.txt');
    await naechste.zeileImBlick('viele/datei-0029.txt');
  });
});

test.describe('Sprung in „Einzeln“ (je Stelle, über Commits)', () => {
  test('soll durch die Stellen aller Commits springen und der Commit-Wähler wechselt mit (Szenario 4)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'einzeln' });
    await naechste.dateienWarten(2);

    await naechste.reihe([['README.md', 'z1'], ['src/a.txt', 'z1']]);

    // Der Commit wechselt mit dem Sprung: der Diff gehört zu z2 (dort steht in src/a.txt „ZWEI“).
    await naechste.springen();
    await naechste.stelle('src/a.txt', 'z2');
    await naechste.diffEnthaelt('ZWEI');

    await naechste.reihe([['src/b.txt', 'z2'], ['src/a.txt', 'z3'], ['src/b.txt', 'z3'], ['README.md', 'z1']]);
  });

  test('soll eine abgehakte Stelle überspringen (Szenario 5)', async ({ naechste }) => {
    await naechste.starten({ vorbereitung: 'Repo Z', modus: 'einzeln' });
    await naechste.dateienWarten(2);
    await naechste.abhaken('README.md');
    await naechste.fortschritt('1 von 6 Stellen abgehakt');

    await naechste.reihe([['src/a.txt', 'z1']]);
  });
});
