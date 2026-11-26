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

  test('Kriterium 9: eine Binärdatei zeigt unter der Meldung den Block mit m6', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo M' });

    await absicht.dateiAnsehen('bild.bin');

    await absicht.diffMeldet('bild.bin', 'Binärdatei — enthält Null-Bytes');
    await absicht.blockZeigt(['m6']);
    await absicht.blockIstErstesKind();
    await absicht.blockStehtUeberDemInhalt();
  });

  test('Kriterium 9: das Bild steht hinter dem Block', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo M' });
    await absicht.bildAntwortErsetzen({ pfad: 'x.txt', seite: 'nachher', base64: PNG_1 });
    const fake = await absicht.diffFakeStellen('x.txt');
    fake.setzen(200, { pfad: 'x.txt', status: 'M', alterPfad: null, netto: true, commits: [], art: 'binaer', grund: 'nullbytes', patch: null, abschnitte: [] });

    await absicht.dateiAnsehen('x.txt');

    await expect.poll(async () => (await absicht.zustand()).bilder, 'Bilder im Rollbereich').toBe(1);
    await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);
    expect(await absicht.mehrKnopfText()).toBe('1 weitere');
    await absicht.blockIstErstesKind();
    await absicht.blockStehtUeberDemInhalt();
  });

  test('Kriterium 9: der Fake tastet jeden Zustand mit gewählter Datei ab — überall dieselbe Liste', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo M' });
    const fake = await absicht.diffFakeStellen('x.txt');

    for (const zustand of zustaende(absicht.hash('m6'))) {
      fake.setzen(zustand.status, zustand.koerper);
      await absicht.dateiAnsehen('x.txt');

      await expect.poll(() => absicht.zustand(), `Zustand „${zustand.name}“`).toMatchObject(zustand.erwartet);
      await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);
      expect(await absicht.mehrKnopfText(), `Knopf im Zustand „${zustand.name}“`).toBe('1 weitere');
      await absicht.blockIstErstesKind();
    }
  });

  test('ohne Wahl ist der Rollbereich verborgen — kein Block ohne Datei', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo A' });

    await absicht.keinBlock();
    expect(await absicht.rollbereichVerborgen(), 'Rollbereich ohne Wahl').toBe(true);
  });
});

/** Der Patch eines gewöhnlichen Diffs und einer über der Zuklappgrenze (R00017: 20 000 Zeilen). */
const PATCH = '@@ -1,2 +1,3 @@\n m1-1\n m1-2\n+m2\n';
const ZU_GROSS_PATCH = `@@ -1,20001 +1,20001 @@\n${' kontext\n'.repeat(20001)}`;

/** Die Zustände mit gewählter Datei, die der Fake nacheinander liefert (R00038, Kriterium 9). */
function zustaende(hashM6) {
  const netto = koerper => ({ pfad: 'x.txt', status: 'M', alterPfad: null, netto: true, commits: [], grund: null, abschnitte: [], ...koerper });
  return [
    { name: 'Diff', status: 200, koerper: netto({ art: 'text', patch: PATCH }), erwartet: { meldung: '', zeilen: 4 } },
    {
      name: 'Abschnitte ohne Kette',
      status: 200,
      koerper: { pfad: 'x.txt', status: 'M', alterPfad: null, netto: false, commits: [], art: 'text', grund: null, patch: null, abschnitte: [{ commit: hashM6, pfad: 'x.txt', status: 'M', art: 'text', grund: null, patch: PATCH }] },
      erwartet: { meldung: '', abschnitte: 1 },
    },
    { name: 'Binär', status: 200, koerper: netto({ art: 'binaer', grund: 'nullbytes', patch: null }), erwartet: { meldung: 'Binärdatei — enthält Null-Bytes' } },
    { name: 'Keine Zeilenänderungen', status: 200, koerper: netto({ art: 'text', patch: '' }), erwartet: { meldung: 'Keine Zeilenänderungen' } },
    { name: 'zu groß (zugeklappt)', status: 200, koerper: netto({ art: 'text', patch: ZU_GROSS_PATCH }), erwartet: { meldung: 'Sehr lang: 20.001 Zeilen — zugeklappt' } },
    { name: 'Lesefehler', status: 500, koerper: null, erwartet: { meldung: 'Diff konnte nicht gelesen werden', meldungIstFehler: true } },
    { name: 'gesperrte Datei', status: 422, koerper: null, erwartet: { meldung: 'Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)', meldungIstFehler: true } },
  ];
}
