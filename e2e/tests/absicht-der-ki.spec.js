'use strict';
// Integrationstests der Absicht der KI über dem Diff (R00038, B3702): der Block steht im Rollbereich über dem Inhalt des
// Diffs, je Commit Kurz-Hash und Betreff; die Commits sind die Stellen des Netto-Eintrags bzw. der gewählte Commit.
// Ebene: Oberfläche gegen das echte Programm im Wegwerf-Repo (Repo Z der User Story).
const { test, expect } = require('../dsl/absicht.js');

test.describe('Absicht der KI: Commits der Datei', () => {
  test('Kriterium 1: „Zusammen“ nennt für src/a.txt z1, z2, z3 und für README.md nur z1', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo Z' });

    await absicht.dateiAnsehen('src/a.txt');

    await absicht.blockZeigt(['z1', 'z2', 'z3']);
    await absicht.blockIstErstesKind();
    await absicht.blockStehtUeberDerErstenZeile();

    await absicht.dateiAnsehen('README.md');

    await absicht.blockZeigt(['z1']);
  });

  test('Kriterium 1: die Betreffzeilen sind die der Commit-Leiste', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo Z' });

    await absicht.dateiAnsehen('src/a.txt');

    await absicht.blockZeigtMitBetreff([
      { kurz: absicht.kurz('z1'), betreff: 'Start' },
      { kurz: absicht.kurz('z2'), betreff: 'a ändern, b neu' },
      { kurz: absicht.kurz('z3'), betreff: 'a und b ändern' },
    ]);
  });

  test('ohne gewählte Datei steht kein Block im Rollbereich', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo Z' });

    await absicht.keinBlock();

    await absicht.dateiAnsehen('README.md');
    await absicht.blockZeigt(['z1']);
  });

  test('die Commit-Angaben kommen aus der Liste der Leiste — die Seite holt sie nicht neu', async ({ absicht, page }) => {
    await absicht.starten({ vorbereitung: 'Repo Z' });
    const anfragen = absicht.anfragenSammeln();
    const vorher = anfragen.length;

    await absicht.dateiAnsehen('src/a.txt');
    await absicht.blockZeigt(['z1', 'z2', 'z3']);

    expect(anfragen.slice(vorher).filter(pfad => pfad === '/api/commits' || pfad === '/api/zusammen')).toEqual([]);
  });
});

test.describe('Absicht der KI: Anschluss an Wahl und Ansichten', () => {
  test('Kriterium 2: „Einzeln“ zeigt nur den gewählten Commit und bestimmt ihn beim Commit-Wechsel neu', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo Z', modus: 'einzeln' });
    await absicht.commitAnsehen('z2');

    await absicht.dateiAnsehen('src/a.txt');

    await absicht.blockZeigt(['z2']);

    await absicht.commitAnsehen('z3');

    await absicht.keinBlock();
    await absicht.dateiAnsehen('src/a.txt');

    await absicht.blockZeigt(['z3']);
  });

  test('Kriterium 3: ohne lückenlose Kette stehen z1 und z3 über dem ersten Abschnitt, der Kopf sagt den Grund', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo Z', commits: ['z1', 'z3'] });

    await absicht.dateiAnsehen('src/a.txt');

    await absicht.blockZeigt(['z1', 'z3']);
    await absicht.blockStehtUeberDerErstenZeile();
    await absicht.herkunft('je Commit, nicht netto — Es fehlen Commits der Auswahl');
  });

  test('Kriterium 6: Ansicht, Anordnung, Umbruch, Leerraum und Suche lassen den Block und die offene Nachricht stehen', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Rumpf' });
    await absicht.dateiAnsehen('a.txt');
    await absicht.blockZeigt(['p', 'q']);
    await absicht.nachrichtAufklappen('q');
    await absicht.nachrichtIst('q', true);
    const anfragen = absicht.anfragenSammeln();
    const vorher = anfragen.length;

    await absicht.ansichtWaehlen('ganze Datei');
    await absicht.blockZeigt(['p', 'q']);
    await absicht.nachrichtIst('q', true);

    await absicht.anordnungWaehlen('nebeneinander');
    await absicht.blockZeigt(['p', 'q']);
    await absicht.nachrichtIst('q', true);

    await absicht.umbruchUmschalten();
    await absicht.blockZeigt(['p', 'q']);
    await absicht.nachrichtIst('q', true);

    await absicht.leerraumUmschalten();
    await absicht.blockZeigt(['p', 'q']);
    await absicht.nachrichtIst('q', true);

    await absicht.suchen('zwei');
    await absicht.blockZeigt(['p', 'q']);
    await absicht.nachrichtIst('q', true);
    await absicht.blockIstErstesKind();

    expect(anfragen.slice(vorher).filter(pfad => pfad === '/api/commits' || pfad === '/api/zusammen'), 'der Block löst keine Anfrage aus').toEqual([]);
  });

  test('Kriterium 6: ein Moduswechsel bestimmt den Block neu — die offene Nachricht ist danach zu', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Rumpf' });
    await absicht.dateiAnsehen('a.txt');
    await absicht.blockZeigt(['p', 'q']);
    await absicht.nachrichtAufklappen('q');
    await absicht.nachrichtIst('q', true);

    await absicht.modusWaehlen('einzeln');

    await absicht.blockZeigt(['p']);
    expect(await absicht.rumpfStehtImDom('q'), 'Rumpf von q im DOM').toBe(0);

    await absicht.modusWaehlen('zusammen');

    await absicht.blockZeigt(['p', 'q']);
    await absicht.nachrichtIst('q', false);
  });
});
