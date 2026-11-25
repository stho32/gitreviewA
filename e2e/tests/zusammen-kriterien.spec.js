'use strict';
// Spezifikation R00012 „Oberfläche Liste–Detail“: die Kriterien 2, 4 und 5 im Browser (Oberfläche; Browser-Eigenes: Reihenfolge,
// Höhe, Auf- und Zuklappen, Moduswechsel an derselben Datei). Die Rechnungen prüfen bausteine/modus-werte.spec.js.
const { test, expect } = require('../dsl/zeile-annotieren.js');

const ZUGEKLAPPT_LAENGE_MS = 48;

test.describe('R00012 Kriterien 2, 4 und 5', () => {
  test('Kriterium 2: die zugeklappte Commit-Zeile steht über der Dateiliste, eine Zeile hoch, und klappt die Commits auf', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', modus: null });
    const kurz = name => anm.hash(name).slice(0, 7);
    const text = `3 Commits · ${kurz('z1')}..${kurz('z3')} · lückenlos · netto`;

    await anm.kopfZahlen('3 Commits · 3 Dateien');
    await anm.commitZeileText(text);
    const zugeklappt = await anm.commitZeileUeberDerListe();
    expect(zugeklappt, 'eine Zeile hoch').toBeLessThanOrEqual(ZUGEKLAPPT_LAENGE_MS);

    await anm.commitZeileAufklappen();
    const aufgeklappt = await anm.commitZeileUeberDerListe();
    expect(aufgeklappt, 'aufgeklappt ist die Zeile höher (Positivkontrolle der Messung)').toBeGreaterThan(zugeklappt);
    expect(await anm.commitZeilen()).toEqual([
      { kurzHash: kurz('z1'), betreff: 'Start' },
      { kurzHash: kurz('z2'), betreff: 'a ändern, b neu' },
      { kurzHash: kurz('z3'), betreff: 'a und b ändern' },
    ]);

    await anm.commitZeileZuklappen();
    await anm.commitZeileText(text);
    await anm.kopfZahlen('3 Commits · 3 Dateien');
  });

  test('Kriterium 2: die Message eines Commits lässt sich in „Zusammen“ aus- und einklappen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo mit Rumpf', modus: null });

    await anm.commitZeileAufklappen();
    await anm.messageVerborgen('q');
    await anm.messageUmschalten('q');
    await anm.messageZeigt('q', 'Zeile eins\nZeile zwei');
    await anm.messageUmschalten('q');
    await anm.messageVerborgen('q');
  });

  test('Kriterium 4: ohne Kette sagt die Commit-Zeile „keine lückenlose Kette · je Commit“, der Diff steht in Abschnitten je Commit', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', commits: ['z1', 'z3'], modus: null });
    const kurz = name => anm.hash(name).slice(0, 7);

    await anm.commitZeileText(`2 Commits · ${kurz('z1')}..${kurz('z3')} · keine lückenlose Kette · je Commit`);
    await anm.dateiAnsehen('src/a.txt');
    await anm.diffHerkunft('je Commit, nicht netto — Es fehlen Commits der Auswahl');
    await anm.abschnittskopfZeigt('z1', `Commit ${kurz('z1')} · Start`, '\u202E');
    await anm.abschnittZeileZeigt('z1', 1, 'eins');
    await anm.abschnittZeileZeigt('z1', 3, 'drei');
    await anm.abschnittZeileZeigt('z3', 4, 'vier');

    await anm.modusWaehlen('einzeln');
    await anm.modusWaehlen('zusammen');
    await anm.dateiAnsehen('src/a.txt');
    await anm.abschnittZeileZeigt('z1', 1, 'eins');
  });

  test('Kriterium 5: die gewählte Datei bleibt beim Moduswechsel, sonst die erste; zurück zeigt wieder den Netto-Diff', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', modus: null });

    await anm.dateiAnsehen('src/a.txt');
    await anm.diffZeigt({
      pfad: 'src/a.txt',
      zeilen: [{ kopf: '@@ -0,0 +1,4 @@' }, { plus: 'eins', neu: 1 }, { plus: 'ZWEI', neu: 2 }, { plus: 'drei', neu: 3 }, { plus: 'vier', neu: 4 }],
    });

    await anm.modusWaehlen('einzeln');
    await anm.diffZeigt({ pfad: 'src/a.txt', zeilen: [{ kopf: '@@ -0,0 +1,3 @@' }, { plus: 'eins', neu: 1 }, { plus: 'zwei', neu: 2 }, { plus: 'drei', neu: 3 }] });

    await anm.modusWaehlen('zusammen');
    await anm.diffZeigt({
      pfad: 'src/a.txt',
      zeilen: [{ kopf: '@@ -0,0 +1,4 @@' }, { plus: 'eins', neu: 1 }, { plus: 'ZWEI', neu: 2 }, { plus: 'drei', neu: 3 }, { plus: 'vier', neu: 4 }],
    });

    await anm.dateiAnsehen('src/b.txt');
    await anm.modusWaehlen('einzeln');
    await anm.dateiGewaehlt('README.md');
  });
});