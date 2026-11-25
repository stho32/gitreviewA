'use strict';
// Spezifikation R00033 „Seitenleiste bleibt stehen“ (I0034): der feste Rahmen, die zwei getrennten Rollbereiche, die Wahl in
// den Blick, alle Anzeigeverfahren und das schmale Fenster. Dieser Slice ist ausschließlich Browser-Eigenes (Layout, Scrollen,
// Fokus) — es gibt keinen Serverweg; die Kriterien laufen deshalb als Playwright-Akzeptanztests. Vorbereitung: Repo S
// (`s1` 200 Zeilen und 60 Dateien), Repo L (`l2`, Lücken im Diff), Repo Z (`z1 z3`, keine lückenlose Kette), Fenster 1280 × 800.
const { test, expect } = require('../dsl/seitenleiste.js');

const ERSTE_ZEILE = '#datei-zeilen .datei-zeile:first-child';

test.describe('Zwei getrennte Rollbereiche', () => {
  test('die Seite selbst scrollt nicht, Dateiliste und Diff-Bereich haben je eine eigene Bildlaufleiste', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S' });
    await seit.dateiAnsehen('lang.txt');

    await seit.keinSeitenbildlauf();
    await seit.listeIstRollbereich();
    await seit.diffIstRollbereich();
  });

  test('Scrollen im Diff lässt Kopf, Commit-Zeile, Werkzeugzeilen und Dateiliste stehen; die Liste bewegt den Diff nicht', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S' });
    await seit.dateiAnsehen('lang.txt');

    const vorher = await seit.standbild();
    await seit.listeGanzOben();
    const listeVorher = (await seit.listeStand()).scrollTop;
    const diffVorher = (await seit.diffStand()).scrollTop;

    await seit.diffGanzUnten();

    await seit.versatzGeaendert(diffVorher, (await seit.diffStand()).scrollTop, 'Diff-Bereich');
    await seit.unveraendert(await seit.stehendeTeile(vorher), await seit.stehendeTeile(await seit.standbild()), 'Kopf, Commit-Zeile, Werkzeugzeilen und Dateiliste');
    await seit.versatzGleich(listeVorher, (await seit.listeStand()).scrollTop, 'Dateiliste');

    const diffNachDiff = (await seit.diffStand()).scrollTop;
    await seit.listeGanzUnten();

    await seit.versatzGeaendert(listeVorher, (await seit.listeStand()).scrollTop, 'Dateiliste');
    await seit.versatzGleich(diffNachDiff, (await seit.diffStand()).scrollTop, 'Diff-Bereich');
    await seit.keinSeitenbildlauf();
  });

  test('bei Fensterhöhe 600 bleiben beide Rollbereiche intakt und der Kopf samt Werkzeugzeilen sichtbar', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S', fenster: { width: 1280, height: 600 } });
    await seit.dateiAnsehen('lang.txt');

    await seit.keinSeitenbildlauf();
    await seit.listeIstRollbereich();
    await seit.diffIstRollbereich();

    const kopf = await seit.lage('header.kz');
    const werkzeuge = await seit.lage('#dateiliste .dateien-kopf');
    expect(kopf.y, 'Kopf am oberen Rand').toBe(0);
    expect(kopf.unten, 'Kopf sichtbar').toBeLessThanOrEqual(600);
    expect(werkzeuge.y, 'Werkzeugzeile der Dateiliste unter dem Kopf').toBeGreaterThanOrEqual(kopf.unten - 1);
    expect(werkzeuge.unten, 'Werkzeugzeile der Dateiliste sichtbar').toBeLessThanOrEqual(600);
  });
});
