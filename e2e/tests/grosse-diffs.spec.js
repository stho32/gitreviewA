'use strict';
// Spezifikation R00017 „Große Diffs“, Browser-Eigenes: Zuklappen und „Trotzdem laden“, beide Ansichten, „zu groß“ in der Oberfläche,
// Blockgrenze an der Knotenzahl und Long Tasks beim Scrollen. Die Ausgabegrenze selbst prüfen die Integrationstests
// (tests/GitReviewA.Tests/Akzeptanz/GrosseDiffsTests.cs); hier geht es um das, was nur im Browser zu sehen ist.
const { test, expect } = require('../dsl/diff-lesen.js');
const { anzeigeSchrankeMs, einfrierSchrankeMs } = require('../dsl/schranken.js');

const NUR_AENDERUNGEN = 'nur Änderungen';
const GANZE_DATEI = 'ganze Datei';
const RIESIG_ZUGEKLAPPT = 'Sehr lang: 30.000 Zeilen — zugeklappt';

test.describe('Zuklappen und Trotzdem laden', () => {
  test('soll riesig.txt zugeklappt zeigen und erst auf „Trotzdem laden“ die Zeilen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Große Diffs', commits: ['w'] });

    await diff.dateiAnsehen('riesig.txt');
    await diff.zugeklappt('riesig.txt', RIESIG_ZUGEKLAPPT);
    await diff.trotzdemLaden();

    await diff.zeileZeigt(30000, 'zeile 30000');
  });

  test('soll gross.txt (genau 20 000 Diff-Zeilen) nicht zuklappen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Große Diffs', commits: ['w'] });

    await diff.dateiAnsehen('gross.txt');
    await diff.zeileZeigt(20000, 'zeile 20000');
  });

  test('soll den Zuklappzustand in beiden Ansichten zeigen und beim Umschalten neu bewerten', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Große Diffs', commits: ['w'] });

    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.dateiAnsehen('riesig.txt');
    await diff.zugeklappt('riesig.txt', RIESIG_ZUGEKLAPPT);

    await diff.ansichtWaehlen(NUR_AENDERUNGEN);
    await diff.zugeklappt('riesig.txt', RIESIG_ZUGEKLAPPT);
    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.zugeklappt('riesig.txt', RIESIG_ZUGEKLAPPT);
  });

  test('soll den Zuklappzustand an der Obergrenze spätestens 5 s nach dem Klick zeigen (Anzeige-Schranke)', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Große Diffs', commits: ['w'] });
    await diff.dateiAnsehen('riesig.txt');
    await diff.zugeklappt('riesig.txt', RIESIG_ZUGEKLAPPT);
    await diff.dateiAnsehen('winzig.txt');
    await diff.zeileZeigt(3, 'drei');

    const dauerMs = await diff.zugeklapptNachKlick('riesig.txt', 'riesig.txt', RIESIG_ZUGEKLAPPT, anzeigeSchrankeMs);
    test.info().annotations.push({ type: 'Messwert', description: `Zuklappzustand nach ${dauerMs} ms (Anzeige-Schranke ${anzeigeSchrankeMs} ms)` });

    const dauerGross = await diff.zeileRechtzeitigNachKlick('gross.txt', { kopf: '@@ -0,0 +1,20000 @@', plus: 'zeile 20000', neu: 20000 });
    test.info().annotations.push({ type: 'Messwert', description: `gross.txt nach ${dauerGross} ms (Anzeige-Schranke ${anzeigeSchrankeMs} ms)` });
  });
});

test.describe('Abschnitte ohne Kette (R00012)', () => {
  test('soll einen Abschnitt über der Zuklappgrenze zuklappen und erst auf „Trotzdem laden“ zeichnen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Große Diffs ohne Kette', commits: ['x1', 'x3'], modus: 'zusammen' });

    await diff.dateiAnsehen('riesig.txt');
    await diff.abschnittZugeklappt('x1', RIESIG_ZUGEKLAPPT);
    await diff.abschnittZeileZeigt('x3', 30000, 'zuletzt geändert');

    await diff.abschnittTrotzdemLaden('x1');
    await diff.abschnittZeileZeigt('x1', 30000, 'zeile 30000');
  });
});

test.describe('Ausgabegrenze in der Oberfläche', () => {
  test('soll „zu groß“ melden und Dateiliste und Commit-Leiste bedienbar lassen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Große Diffs', commits: ['w'] });
    const meldung = 'Diff zu groß — die Ausgabe von git überschreitet die Grenze von 1024 Byte';
    await diff.antwortZuGross('riesig.txt', meldung);

    await diff.dateiAnsehen('riesig.txt');
    await diff.diffMeldet('riesig.txt', meldung);

    await diff.dateiAnsehen('winzig.txt');
    await diff.zeileZeigt(3, 'drei');
  });
});

test.describe('Flüssiges Zeichnen (Blockgrenze)', () => {
  test('soll riesig.txt über „Trotzdem laden“ in Blöcken zu höchstens 5 000 Knoten (Elemente und Textknoten) zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Große Diffs', commits: ['w'] });

    await diff.dateiAnsehen('riesig.txt');
    await diff.zugeklappt('riesig.txt', RIESIG_ZUGEKLAPPT);
    await diff.trotzdemLaden();
    await diff.zeileZeigt(30000, 'zeile 30000');

    const knoten = await diff.blockKnoten();
    const meiste = Math.max(...knoten);
    test.info().annotations.push({ type: 'Messwert', description: `${knoten.length} Blöcke, höchstens ${meiste} Knoten je Block (Grenze 5000; Positivkontrolle der Mutanten ist der Bausteintest diff-werte.spec.js)` });
    expect(meiste, 'Knoten je Block').toBeLessThanOrEqual(5000);
    await diff.zeileZeigt(1, 'zeile 00001');
  });

  test(`soll beim Scrollen durch dicht.js keine Aufgabe des Hauptfadens über der Einfrier-Schranke auslösen`, async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Große Diffs', commits: ['w'] });

    await diff.dateiAnsehen('dicht.js');
    const zustand = await diff.warteAufFarbe();
    expect(zustand, 'Vorbedingung: dicht.js ist dicht gefärbt').toBe('ja');
    const aufgaben = await diff.langeAufgabenBeimScrollen(24);

    test.info().annotations.push({ type: 'Messwert', description: `Aufgaben beim Scrollen über der Einfrier-Schranke (${einfrierSchrankeMs} ms): ${JSON.stringify(aufgaben.filter(a => a.dauerMs > einfrierSchrankeMs))}` });
    expect(aufgaben.length, 'die Scrollprobe war nicht leer').toBeGreaterThan(0);
    expect(aufgaben.filter(a => a.dauerMs > einfrierSchrankeMs), `Aufgaben über der Einfrier-Schranke (${einfrierSchrankeMs} ms)`).toEqual([]);
  });
});
