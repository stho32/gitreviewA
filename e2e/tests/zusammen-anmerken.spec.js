'use strict';
// Spezifikation R00012 „Anmerken in ‚Zusammen‘“ (B1107): die Anmerkung gehört dem Commit, den die Schnittstelle zuordnet —
// mit lückenloser Kette dem jüngsten Commit der Auswahl, der die Datei ändert (Netto-Diff), ohne Kette dem Commit des Abschnitts.
// Geprüft über das laufende Programm (Oberfläche + Ergebnis auf stdout, Kriterien 13 und 14); die Rechnung der Anzeige
// (unter der Zeile oder im Hinweis) prüft tests/bausteine/anmerkungen-werte.spec.js.
const { test, expect } = require('../dsl/zeile-annotieren.js');

const UEBERSCHRIFT = '# Ergebnis manueller Review';

test.describe('Anmerken in „Zusammen“', () => {
  test('Netto (z1 z2 z3): src/a.txt:4 gehört z3, README.md:2 gehört z1 — Ergebnis auf stdout', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });

    await anm.dateiAnsehen('src/a.txt');
    await anm.annotieren('src/a.txt', 4, 'Prüfen');
    await anm.anmerkungenUnter('src/a.txt', { neu: 4 }, ['Prüfen']);

    await anm.dateiAnsehen('README.md');
    await anm.annotieren('README.md', 2, 'Name');

    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis).toContain(`${UEBERSCHRIFT}\n\nAnmerkungen: 2\n`);
    expect(ergebnis).toContain(`## 1. src/a.txt:4\n\nCommit: ${anm.hash('z3')}\n`);
    expect(ergebnis).toContain('> Prüfen\n');
    expect(ergebnis).toContain(`## 2. README.md:2\n\nCommit: ${anm.hash('z1')}\n`);
    expect(ergebnis).toContain('> Name\n');
  });

  test('ohne Kette (z1 z3): die Anmerkung im Abschnitt von z1 gehört z1, die im Abschnitt von z3 gehört z3', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', commits: ['z1', 'z3'], modus: 'zusammen' });

    await anm.dateiAnsehen('src/a.txt');
    await anm.annotierenImAbschnitt('z1', 'src/a.txt', 1, 'im z1');
    await anm.anmerkungenUnterImAbschnitt('z1', 'src/a.txt', { neu: 1 }, ['im z1']);
    await anm.annotierenImAbschnitt('z3', 'src/a.txt', 4, 'im z3');
    await anm.anmerkungenUnterImAbschnitt('z3', 'src/a.txt', { neu: 4 }, ['im z3']);

    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis).toContain(`## 1. src/a.txt:1\n\nCommit: ${anm.hash('z1')}\n`);
    expect(ergebnis).toContain('> im z1\n');
    expect(ergebnis).toContain(`## 2. src/a.txt:4\n\nCommit: ${anm.hash('z3')}\n`);
    expect(ergebnis).toContain('> im z3\n');
  });
});
