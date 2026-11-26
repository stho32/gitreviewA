'use strict';
// Integrationstests der Absicht der KI über dem Diff (R00038, B3705): der Block ist in **jedem** Zustand mit gewählter
// Datei das erste Kind des Rollbereichs — über Diff-Zeilen, über den Abschnitten ohne Kette, über dem Bild und unter
// einer Meldung (Binär, „Keine Zeilenänderungen“, zugeklappt, Lesefehler). Ebene: Oberfläche gegen das echte Programm
// im Wegwerf-Repo; die Bild- und Fehlerzustände kommen als Fake (der echte Endpunkt ist in R00024/R00004 geprüft).
const { test, expect } = require('../dsl/absicht.js');

const PNG_1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test.describe('Absicht der KI in jedem Zustand mit gewählter Datei', () => {
  test('Meldung „Keine Zeilenänderungen“: der Block steht darunter im Rollbereich', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo A' });
    await absicht.diffAntwortErsetzen({ pfad: 'src/b.txt', patch: '' });

    await absicht.dateiAnsehen('src/b.txt');

    await absicht.diffMeldet('src/b.txt', 'Keine Zeilenänderungen');
    await absicht.blockZeigt(['q', 'p']);
    await absicht.blockIstErstesKind();
    await absicht.blockStehtUeberDemInhalt();
  });

  test('Binärdatei: der Block steht unter der Meldung im Rollbereich', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo A' });

    await absicht.dateiAnsehen('logo.bin');

    await absicht.diffMeldet('logo.bin', 'Binärdatei — enthält Null-Bytes');
    await absicht.blockZeigt(['q']);
    await absicht.blockIstErstesKind();
    await absicht.blockStehtUeberDemInhalt();
  });

  test('zu großer Diff (zugeklappt): der Block steht unter dem Zuklapphinweis', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Große Diffs' });

    await absicht.dateiAnsehen('riesig.txt');

    await absicht.diffMeldet('riesig.txt', 'Sehr lang: 30.000 Zeilen — zugeklappt');
    await absicht.blockZeigt(['w']);
    await absicht.blockIstErstesKind();
    await absicht.blockStehtUeberDemInhalt();
  });

  test('Lesefehler: der Block steht unter der Fehlermeldung', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo A', commits: ['q'], modus: 'einzeln' });
    await absicht.dateilisteWarten();
    absicht.commitObjektEntfernen('q');

    await absicht.dateiAnsehen('src/b.txt');

    await absicht.diffMeldetFehler('src/b.txt', 'Diff konnte nicht gelesen werden');
    await absicht.blockZeigt(['q']);
    await absicht.blockIstErstesKind();
    await absicht.blockStehtUeberDemInhalt();
  });

  test('Bild: der Block steht über dem Bild', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo A', commits: ['q'], modus: 'einzeln' });
    await absicht.diffAntwortErsetzen({ pfad: 'logo.bin', art: 'binaer', dateiStatus: 'A', patch: '' });
    await absicht.bildAntwortErsetzen({ pfad: 'logo.bin', seite: 'nachher', base64: PNG_1 });

    await absicht.dateiAnsehen('logo.bin');

    await expect.poll(async () => (await absicht.bilderLesen()).length, 'Bilder im Rollbereich').toBe(1);
    await absicht.blockZeigt(['q']);
    await absicht.blockIstErstesKind();
    await absicht.blockStehtUeberDemInhalt();
  });

  test('Abschnitte ohne Kette: der Block steht über dem ersten Abschnitt', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo Z', commits: ['z1', 'z3'] });

    await absicht.dateiAnsehen('src/a.txt');

    await absicht.blockZeigt(['z1', 'z3']);
    await absicht.blockIstErstesKind();
    await absicht.blockStehtUeberDemInhalt();
  });

  test('ohne Wahl ist der Rollbereich verborgen — kein Block ohne Datei', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo A' });

    await absicht.keinBlock();
    expect(await absicht.rollbereichVerborgen(), 'Rollbereich ohne Wahl').toBe(true);
  });
});
