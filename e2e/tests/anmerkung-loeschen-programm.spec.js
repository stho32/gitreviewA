'use strict';
// Spezifikation R00019 „Anmerkung löschen“ am Programm als Prozess (ohne Browser): Ergebnis Byte für Byte auf stdout, die verbliebenen
// Anmerkungen lückenlos nach Position, die gelöschte Nummer wird nie wiederverwendet, Protokoll ohne Text. Die Kriterien selbst prüfen
// tests/GitReviewA.Tests/Akzeptanz/AnmerkungLoeschenTests.cs gegen den Interactor und tests/Anmerkungen/AnmerkungLoeschenEndpunktTests.cs
// den Endpunkt; Bedienung und DOM tests/anmerkung-loeschen.spec.js.
const { test, expect } = require('../dsl/zeile-annotieren.js');

const UEBERSCHRIFT = '# Ergebnis manueller Review';
const KEINE = `${UEBERSCHRIFT}\n\nKeine Anmerkungen.\n`;

test.describe('Anmerkung löschen — Programm', () => {
  test('soll nach dem Löschen der letzten Anmerkung genau das leere Ergebnis ausgeben und mit 0 enden (Kriterien 1 und 11)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'Klammer fehlt');

    const geloescht = await programm.ueberDieSchnittstelleLoeschen(1);
    expect(programm.stdoutBisher()).toBe('');
    await programm.beendenAnfordern();
    const exitCode = await programm.aufEnde();

    expect(geloescht).toEqual({ status: 200, nummer: 1 });
    expect(exitCode).toBe(0);
    expect(programm.ergebnis()).toBe(KEINE);
  });

  test('soll die verbliebene Anmerkung auf Position 1 rücken und ihre Stelle behalten (Kriterium 2)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'erster');
    await programm.ueberDieSchnittstelleAnlegen('q', 'src/b.txt', 2, 'zweiter');

    await programm.ueberDieSchnittstelleLoeschen(1);
    await programm.beendenAnfordern();
    await programm.aufEnde();

    expect(programm.ergebnis()).toBe([UEBERSCHRIFT, '', 'Anmerkungen: 1', '',
      '## 1. src/b.txt:2', '', `Commit: ${programm.hash('q')}`, '', '> zweiter', ''].join('\n'));
  });

  test('soll eine Dateianmerkung ohne Zeile verschwinden lassen und die Zeilenanmerkung als Position 1 nennen (Kriterium 3)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'README.md', undefined, 'Abschnitt Installation veraltet');
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'Klammer fehlt');

    await programm.ueberDieSchnittstelleLoeschen(1);
    await programm.beendenAnfordern();
    await programm.aufEnde();

    expect(programm.ergebnis()).toBe(`${UEBERSCHRIFT}\n\nAnmerkungen: 1\n\n## 1. lang.txt:18\n\nCommit: ${programm.hash('q')}\n\n> Klammer fehlt\n`);
  });

  test('soll die Nummer nicht wiederverwenden: drei angelegt, die zweite gelöscht, die vierte bekommt 4, das Ergebnis nummeriert 1 bis 3 (Kriterium 4)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 1, 'eins');
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 2, 'zwei');
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 3, 'drei');

    await programm.ueberDieSchnittstelleLoeschen(2);
    const vierte = await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 4, 'vier');
    await programm.beendenAnfordern();
    await programm.aufEnde();

    expect(vierte.nummer).toBe(4);
    const ueberschriften = programm.ergebnis().split('\n').filter(zeile => zeile.startsWith('## '));
    expect(ueberschriften).toEqual(['## 1. lang.txt:1', '## 2. lang.txt:3', '## 3. lang.txt:4']);
    expect(programm.ergebnis()).toContain('Anmerkungen: 3\n');
    expect(programm.ergebnis()).not.toContain('zwei');
  });

  test('soll eine unbekannte Nummer mit 404 ablehnen und den Lauf unverändert lassen (Kriterium 5)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'Klammer fehlt');

    const abgelehnt = await require('../treiber/http.js').senden(programm.lauf().adresse, '/api/anmerkungen/7/loeschen', {
      methode: 'POST', kopf: { 'Content-Type': 'application/json' }, koerper: '{}',
    });
    await programm.beendenAnfordern();
    const exitCode = await programm.aufEnde();

    expect(abgelehnt.status).toBe(404);
    expect(exitCode).toBe(0);
    expect(programm.ergebnis()).toContain('> Klammer fehlt\n');
  });

  test('soll die Nummer protokollieren, nie den Text (Logging)', async ({ programm }) => {
    await programm.starten({ verbose: true, seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'GEHEIMWORT');

    await programm.ueberDieSchnittstelleLoeschen(1);
    const stdoutVorDemBeenden = programm.stdoutBisher();
    await programm.beendenAnfordern();
    const exitCode = await programm.aufEnde();

    expect(stdoutVorDemBeenden).toBe('');
    expect(programm.ergebnis()).toBe(KEINE);
    expect(exitCode).toBe(0);
    await expect.poll(() => programm.stderrBisher()).toContain('Nummer 1 gelöscht');
    expect(programm.stderrBisher()).not.toContain('GEHEIMWORT');
  });
});
