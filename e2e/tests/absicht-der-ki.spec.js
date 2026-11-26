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
    const anfragen = [];
    page.on('request', anfrage => anfragen.push(new URL(anfrage.url()).pathname));
    const vorher = anfragen.length;

    await absicht.dateiAnsehen('src/a.txt');
    await absicht.blockZeigt(['z1', 'z2', 'z3']);

    expect(anfragen.slice(vorher).filter(pfad => pfad === '/api/commits' || pfad === '/api/zusammen')).toEqual([]);
  });
});
