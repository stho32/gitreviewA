'use strict';
// Spezifikation R00014 „Haken und Anmerkung bei nicht lesbarem Diff sperren“, Kriterium 8 (User Story Szenario 7): die Anzeige der Sperre im
// Browser (Browser-Eigenes: Darstellung, Fokus, Tastatur, Wechsel und Neuladen; kein Hot-Path-Fall). Dazu Kriterium 4 einmal am Programm als
// Prozess (stdout Byte für Byte, Exit-Code). Die Kriterien 1–7 prüft tests/GitReviewA.Tests/Akzeptanz/HakenSperreTests.cs gegen die Interactors.
const { test, expect } = require('../dsl/datei-abhaken.js');

const PAAR = 'f⟨0xFF⟩.txt';
const MIT_ZEILENUMBRUCH = 'z\n⟨0xFF⟩.txt';
const NICHT_EINDEUTIG = 'Diff nicht lesbar: Name nicht eindeutig';
const NICHT_UEBERGEBBAR = 'Diff nicht lesbar: Name nicht übergebbar';
const NAME_NICHT_LESBAR = 'Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)';

test.describe('Haken bei nicht lesbarem Diff gesperrt', () => {
  test.skip(process.platform !== 'linux', 'Namen aus ungültigem UTF-8 legt nur Linux an');

  test('soll die drei Kästchen mit Grund sperren, „(3 nicht lesbar)“ zählen und die Sperre über Wechsel und Neuladen halten (Kriterium 8)', async ({ abhaken }) => {
    await abhaken.starten({ vorbereitung: 'Repo N mit v', commits: ['n', 'v'] });
    await abhaken.dateienWarten(9);
    await abhaken.fortschritt('0 von 10 abgehakt (3 nicht lesbar)');
    await abhaken.istGesperrt(PAAR, 0, NICHT_EINDEUTIG);
    await abhaken.istGesperrt(PAAR, 1, NICHT_EINDEUTIG);
    await abhaken.istGesperrt(MIT_ZEILENUMBRUCH, 0, NICHT_UEBERGEBBAR);
    await abhaken.istBedienbar('g.txt');
    const hakenAnfragen = abhaken.hakenAnfragenMitschreiben();

    await abhaken.gesperrtesKaestchenBetaetigen(PAAR, 0);
    await abhaken.gesperrtesKaestchenBetaetigen(PAAR, 1);
    await abhaken.gesperrtesKaestchenBetaetigen(MIT_ZEILENUMBRUCH, 0);
    await abhaken.abhaken('g.txt');

    await abhaken.fortschritt('1 von 10 abgehakt (3 nicht lesbar)');
    await abhaken.istAbgehakt('g.txt');
    expect(hakenAnfragen(), 'nur das Kästchen von g.txt sendet').toBe(1);
    await abhaken.istGesperrt(PAAR, 0, NICHT_EINDEUTIG);
    await abhaken.istGesperrt(PAAR, 1, NICHT_EINDEUTIG);
    expect(await abhaken.serverseitigAbgehakt()).toEqual(['n:g.txt']);

    await abhaken.dateizeileAnsehen(PAAR, 1);
    await abhaken.diffNichtLesbar(NAME_NICHT_LESBAR);
    await abhaken.dateizeileAnsehen(MIT_ZEILENUMBRUCH);
    await abhaken.diffNichtLesbar(NAME_NICHT_LESBAR);

    await abhaken.commitAnsehen('v');
    await abhaken.dateienWarten(1);
    await abhaken.istBedienbar(PAAR);
    await abhaken.commitAnsehen('n');
    await abhaken.dateienWarten(9);
    await abhaken.istGesperrt(PAAR, 0, NICHT_EINDEUTIG);
    await abhaken.istGesperrt(MIT_ZEILENUMBRUCH, 0, NICHT_UEBERGEBBAR);

    await abhaken.neuLaden();
    await abhaken.dateienWarten(9);
    await abhaken.fortschritt('1 von 10 abgehakt (3 nicht lesbar)');
    await abhaken.istGesperrt(PAAR, 0, NICHT_EINDEUTIG);
    await abhaken.istGesperrt(PAAR, 1, NICHT_EINDEUTIG);
    await abhaken.istGesperrt(MIT_ZEILENUMBRUCH, 0, NICHT_UEBERGEBBAR);
    await abhaken.istAbgehakt('g.txt');
  });

  test('soll ohne gesperrte Stelle den Zähler ohne Zusatz zeigen (Kriterium 8, `gitreviewA $b`)', async ({ abhaken }) => {
    await abhaken.starten({ vorbereitung: 'Repo N mit v', commits: ['b'] });
    await abhaken.dateienWarten(5);

    await abhaken.fortschritt('0 von 5 abgehakt');
  });

  test('soll beim Beenden das Ergebnis aus der Anforderung Byte für Byte schreiben und gesperrte Haken mit 400 abweisen (Kriterium 4, Programm)', async ({ programm }) => {
    await programm.starten({ vorbereitung: 'Repo N mit v', commits: ['n', 'v'], ohneSeite: true });
    const gesperrt = await programm.ueberDieSchnittstelleAbhaken('n', PAAR);
    const nichtUebergebbar = await programm.ueberDieSchnittstelleAbhaken('n', MIT_ZEILENUMBRUCH, false);
    const lesbar = await programm.ueberDieSchnittstelleAbhaken('n', 'g.txt');

    await programm.beendenAnfordern();
    const exitCode = await programm.aufEnde();

    const n = programm.hash('n');
    const v = programm.hash('v');
    expect([gesperrt.status, gesperrt.meldung]).toEqual([400, NICHT_EINDEUTIG]);
    expect([nichtUebergebbar.status, nichtUebergebbar.meldung]).toEqual([400, NICHT_UEBERGEBBAR]);
    expect(lesbar.status).toBe(200);
    expect(exitCode).toBe(0);
    expect(programm.ergebnis()).toBe('# Ergebnis manueller Review\n\nKeine Anmerkungen.\n\n## Dateien\n\nAbgehakt: 1 von 10\n\n'
      + `- g.txt (Commit ${n})\n\nUngeprüft: 9 von 10\n\n`
      + `- a⟨0xFF⟩.sh (Commit ${n})\n- b⟨0xFF⟩.bin (Commit ${n})\n`
      + `- f⟨0xFF⟩.txt (Commit ${n}) — ${NICHT_EINDEUTIG}\n- f⟨0xFF⟩.txt (Commit ${n}) — ${NICHT_EINDEUTIG}\n`
      + `- in.txt (Commit ${n})\n- r⟨0xFF⟩.txt (Commit ${n})\n- t⟨0xFE⟩.txt (Commit ${n})\n`
      + `- z⟨U+000A⟩⟨0xFF⟩.txt (Commit ${n}) — ${NICHT_UEBERGEBBAR}\n- f⟨0xFF⟩.txt (Commit ${v})\n`);
    expect(programm.stderr()).not.toContain('f⟨0xFF⟩.txt abgehakt');
  });

  test('soll eine Anmerkung am gesperrten Namen mit Markenform mit 400 abweisen und die Kontrollpaare annehmen (Kriterium 6, Programm)', async ({ programm }) => {
    await programm.starten({ vorbereitung: 'Repo N mit v', commits: ['n', 'v'], ohneSeite: true });
    const gesperrt = await programm.ueberDieSchnittstelleAnnotieren('n', 'z⟨U+000A⟩⟨0xFF⟩.txt', 1, 'x');
    const kontrolleA = await programm.ueberDieSchnittstelleAnnotieren('n', 'a⟨0xFF⟩.sh', 1, 'x');
    const kontrolleF = await programm.ueberDieSchnittstelleAnnotieren('v', 'f⟨0xFF⟩.txt', 1, 'x');

    await programm.beendenAnfordern();
    const exitCode = await programm.aufEnde();

    expect([gesperrt.status, gesperrt.meldung]).toEqual([400, NICHT_UEBERGEBBAR]);
    expect([kontrolleA.status, kontrolleA.nummer]).toEqual([201, 1]);
    expect([kontrolleF.status, kontrolleF.nummer]).toEqual([201, 2]);
    expect(exitCode).toBe(0);
    const ueberschriften = programm.ergebnis().split('\n').filter(zeile => zeile.startsWith('## '));
    expect(ueberschriften).toEqual(['## 1. a⟨0xFF⟩.sh:1', '## 2. f⟨0xFF⟩.txt:1']);
    expect(programm.ergebnis()).not.toContain('## 1. z⟨U+000A⟩⟨0xFF⟩.txt');
  });
});
