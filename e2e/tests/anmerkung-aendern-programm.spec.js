'use strict';
// Spezifikation R00018 „Anmerkung ändern“ am Programm als Prozess (ohne Browser): Ergebnis Byte für Byte auf stdout, Nummer und Stelle
// bleiben, eine Änderung verbraucht keine Nummer, mehrzeiliges Zitat, Protokoll ohne Text. Die Kriterien selbst prüfen
// tests/GitReviewA.Tests/Akzeptanz/AnmerkungAendernTests.cs gegen den Interactor und tests/Anmerkungen/AnmerkungAendernEndpunktTests.cs
// den Endpunkt; Bedienung und DOM tests/anmerkung-aendern.spec.js.
const { test, expect } = require('../dsl/zeile-annotieren.js');

const UEBERSCHRIFT = '# Ergebnis manueller Review';

test.describe('Anmerkung ändern — Programm', () => {
  test('soll nach dem Ändern genau eine Anmerkung mit neuem Text an lang.txt:18 ausgeben und mit 0 enden (Kriterium 1)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'Klammer fehlt');

    const geaendert = await programm.ueberDieSchnittstelleAendern(1, 'Klammer und Typprüfung fehlt');
    expect(programm.stdoutBisher()).toBe('');
    await programm.beendenAnfordern();
    const exitCode = await programm.aufEnde();

    expect(geaendert).toEqual({ status: 200, nummer: 1, text: 'Klammer und Typprüfung fehlt' });
    expect(exitCode).toBe(0);
    expect(programm.ergebnis()).toBe(`${UEBERSCHRIFT}\n\nAnmerkungen: 1\n\n## 1. lang.txt:18\n\nCommit: ${programm.hash('q')}\n\n> Klammer und Typprüfung fehlt\n`);
  });

  test('soll Stelle, Position und Nummer lassen: zwei Anmerkungen, die erste geändert, das Ergebnis nennt 1 vor 2 (Kriterium 2)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'erster');
    await programm.ueberDieSchnittstelleAnlegen('q', 'src/b.txt', 2, 'zweiter');

    await programm.ueberDieSchnittstelleAendern(1, 'erster, berichtigt');
    await programm.beendenAnfordern();
    await programm.aufEnde();

    const q = programm.hash('q');
    expect(programm.ergebnis()).toBe([UEBERSCHRIFT, '', 'Anmerkungen: 2', '',
      '## 1. lang.txt:18', '', `Commit: ${q}`, '', '> erster, berichtigt', '',
      '## 2. src/b.txt:2', '', `Commit: ${q}`, '', '> zweiter', ''].join('\n'));
  });

  test('soll eine Dateianmerkung ohne Zeile als „README.md (ganze Datei)“ mit neuem Text ausgeben (Kriterium 3)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'README.md', undefined, 'Abschnitt Installation veraltet');

    await programm.ueberDieSchnittstelleAendern(1, 'Abschnitt Installation fehlt');
    await programm.beendenAnfordern();
    await programm.aufEnde();

    expect(programm.ergebnis()).toBe(`${UEBERSCHRIFT}\n\nAnmerkungen: 1\n\n## 1. README.md (ganze Datei)\n\nCommit: ${programm.hash('q')}\n\n> Abschnitt Installation fehlt\n`);
  });

  test('soll keine Nummer verbrauchen: drei angelegt, die zweite geändert, die vierte bekommt 4, das Ergebnis nennt 1 bis 4 (Kriterium 4)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 1, 'eins');
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 2, 'zwei');
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 3, 'drei');

    await programm.ueberDieSchnittstelleAendern(2, 'zwei, berichtigt');
    const vierte = await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 4, 'vier');
    await programm.beendenAnfordern();
    await programm.aufEnde();

    expect(vierte.nummer).toBe(4);
    const ueberschriften = programm.ergebnis().split('\n').filter(zeile => zeile.startsWith('## '));
    expect(ueberschriften).toEqual(['## 1. lang.txt:1', '## 2. lang.txt:2', '## 3. lang.txt:3', '## 4. lang.txt:4']);
    expect(programm.ergebnis()).toContain('> zwei, berichtigt\n');
    expect(programm.ergebnis()).toContain('Anmerkungen: 4\n');
  });

  test('soll einen mehrzeiligen Text mit Leerzeile als Zitat ausgeben, jede Zeile mit „>“ (Kriterium 7)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'alt');

    await programm.ueberDieSchnittstelleAendern(1, 'Prüfen\tmit Tab\r\n\r\ngrößer ≥ 3');
    await programm.beendenAnfordern();
    await programm.aufEnde();

    expect(programm.ergebnis()).toBe(`${UEBERSCHRIFT}\n\nAnmerkungen: 1\n\n## 1. lang.txt:18\n\nCommit: ${programm.hash('q')}\n\n> Prüfen\tmit Tab\n>\n> größer ≥ 3\n`);
  });

  test('soll fremden Text unverändert als Zitat ausgeben (Kriterium 13)', async ({ programm }) => {
    await programm.starten({ seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'erster');

    await programm.ueberDieSchnittstelleAendern(1, '<img src=x onerror=alert(1)>');
    await programm.beendenAnfordern();
    await programm.aufEnde();

    expect(programm.ergebnis()).toBe(`${UEBERSCHRIFT}\n\nAnmerkungen: 1\n\n## 1. lang.txt:18\n\nCommit: ${programm.hash('q')}\n\n> <img src=x onerror=alert(1)>\n`);
  });

  test('soll eine abgelehnte Änderung nichts ändern lassen und mit --verbose Nummer und Textlänge nennen, nie den Text (Logging)', async ({ programm }) => {
    await programm.starten({ verbose: true, seiteOeffnen: false });
    await programm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'alt');

    const abgelehnt = await require('../treiber/http.js').senden(programm.lauf().adresse, '/api/anmerkungen/1', {
      methode: 'POST', kopf: { 'Content-Type': 'application/json' }, koerper: JSON.stringify({ text: `GEHEIMWORT ${String.fromCharCode(0x1B)}` }),
    });
    const geaendert = await programm.ueberDieSchnittstelleAendern(1, 'GEHEIMWORT neu');
    const stdoutVorDemBeenden = programm.stdoutBisher();
    await programm.beendenAnfordern();
    const exitCode = await programm.aufEnde();

    expect(abgelehnt.status).toBe(400);
    expect(geaendert.text).toBe('GEHEIMWORT neu');
    expect(stdoutVorDemBeenden).toBe('');
    expect(programm.ergebnis()).toBe(`${UEBERSCHRIFT}\n\nAnmerkungen: 1\n\n## 1. lang.txt:18\n\nCommit: ${programm.hash('q')}\n\n> GEHEIMWORT neu\n`);
    expect(exitCode).toBe(0);
    await expect.poll(() => programm.stderrBisher()).toContain('Nummer 1 geändert (Textlänge 14, art=ohne)');
    expect(programm.stderrBisher()).toContain('abgelehnt: Text enthält Steuer- oder Richtungszeichen');
    expect(programm.stderrBisher()).not.toContain('GEHEIMWORT');
  });
});