'use strict';
// Spezifikation R00012 „Oberfläche Liste–Detail, Zusammen als Standard“ (B1108): der Hot Path als E2E — Aufruf, Start in „Zusammen“,
// Datei wählen, Netto-Diff, Zeile annotieren, Beenden. Kriterien 1, 3 und 13 (Kriterium 13 prüft auch zusammen-anmerken.spec.js).
// Die Rechnung der Netto-Liste (Kriterium 4: Ausgabe je Commit) prüft I0010; hier geht es um das, was die Oberfläche daraus macht.
const { test, expect } = require('../dsl/zeile-annotieren.js');

/** Die Netto-Liste von Repo Z in der gezeigten Reihenfolge (R00040: Code vor Doku). */
const NETTO_LISTE = {
  summe: '3 Dateien · +8 −0',
  eintraege: [
    { name: 'src/a.txt', zahlen: '+4 −0' },
    { name: 'src/b.txt', zahlen: '+2 −0' },
    { name: 'README.md', zahlen: '+2 −0' },
  ],
};

test('Hot Path: Start in „Zusammen“ (Netto-Liste, noch kein Diff), Netto-Diff von src/a.txt, Zeile annotieren, Beenden', async ({ anm, page }) => {
  const diffAnfragen = [];
  page.on('request', anfrage => {
    if (/\/api\/.*\/diff$/.test(new URL(anfrage.url()).pathname)) {
      diffAnfragen.push(anfrage.url());
    }
  });

  await anm.starten({ vorbereitung: 'Repo Z', modus: null });

  // Kriterium 1: Standard „Zusammen“, Netto-Liste der ganzen Auswahl, kein Diff angefragt.
  await anm.kopfZahlen('3 Commits · 3 Dateien');
  await anm.fortschritt('0 von 3 Dateien abgehakt');
  await anm.dateilisteZeigt(NETTO_LISTE);
  await anm.diffAufforderung();
  expect(diffAnfragen, 'vor der Dateiwahl kein Diff').toEqual([]);

  // Kriterium 3: Netto-Diff über alle drei Commits, +4 −0, „netto aus …“.
  const kurz = name => anm.hash(name).slice(0, 7);
  await anm.dateiAnsehen('src/a.txt');
  await anm.diffZeigt({
    pfad: 'src/a.txt',
    zeilen: [
      { kopf: '@@ -0,0 +1,4 @@' },
      { plus: 'eins', neu: 1 },
      { plus: 'ZWEI', neu: 2 },
      { plus: 'drei', neu: 3 },
      { plus: 'vier', neu: 4 },
    ],
  });
  await anm.diffHerkunft(`netto aus ${kurz('z1')}, ${kurz('z2')}, ${kurz('z3')}`);

  // Kriterium 13: Anmerken in „Zusammen“; die Anmerkung gehört z3 (jüngster Commit, der src/a.txt ändert).
  await anm.annotieren('src/a.txt', 4, 'Prüfen');
  await anm.anmerkungenUnter('src/a.txt', { neu: 4 }, ['Prüfen']);
  const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();
  expect(exitCode).toBe(0);
  expect(ergebnis).toContain(`## 1. src/a.txt:4\n\nCommit: ${anm.hash('z3')}\n`);
});
