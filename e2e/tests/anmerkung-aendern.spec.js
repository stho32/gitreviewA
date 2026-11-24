'use strict';
// Spezifikation R00018 „Anmerkung ändern“, Teil Browser: der Bedienweg am Anmerkungskopf und Browser-Eigenes — Darstellung, Tastatur und
// Fokus, Fehlerpfade per `route`, verzögerte Antwort, DOM-Sicherheit. Was geändert, abgelehnt, gelistet und ausgegeben wird, prüfen
// tests/GitReviewA.Tests/Akzeptanz/AnmerkungAendernTests.cs und der Endpunkt; das Ergebnis auf stdout am Programm
// tests/anmerkung-aendern-programm.spec.js. Das Ändern liegt nicht auf dem Hot Path (AI-Team/factory.md).
const { test, expect } = require('../dsl/zeile-annotieren.js');

const Z19 = { neu: 18 };
const ALTER_TEXT = 'Klammer fehlt';
const NEUER_TEXT = 'Klammer und Typprüfung fehlt';
const KONNTE_NICHT = 'Anmerkung konnte nicht geändert werden';

test.describe('Anmerkung ändern', () => {
  test('Ändern am Anmerkungskopf: Feld mit dem alten Text und Fokus, Strg+Enter speichert, neuer Text unter z19, Fokus zurück auf den Kopf', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);
    await anm.kopfNenntNummer(1);

    await anm.aendern(1);
    await anm.feldEnthaelt('lang.txt', 18, ALTER_TEXT);
    await anm.feldOffenMitFokus('lang.txt', 18);
    await anm.aendern(1);
    await anm.anzahlAenderungsfelder(1);
    await anm.feldOffenMitFokus('lang.txt', 18);
    await anm.anmerkungszeileEnthaelt(1, ALTER_TEXT);

    await anm.textSchreiben('lang.txt', 18, NEUER_TEXT);
    await anm.taste('Control+Enter');
    await anm.feldZu('lang.txt', 18);

    await anm.anmerkungenUnter('lang.txt', Z19, [NEUER_TEXT]);
    await anm.anzahlAnmerkungszeilen(1);
    await anm.anmerkungszeilenSindKeineDiffzeilen();
    await anm.fokusAufKopf(1);
    await anm.kopfNenntNummer(1);
    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis).toBe(['# Ergebnis manueller Review', '', 'Anmerkungen: 1', '', '## 1. lang.txt:18', '', `Commit: ${anm.hash('q')}`, '', `> ${NEUER_TEXT}`, ''].join('\n'));
  });

  test('Abbrechen und Esc lassen den alten Text; verzögerte Antwort: Speichern gesperrt, genau eine Anfrage, Text nach Dateiwechsel unter z19', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);

    await anm.aendern(1);
    await anm.textSchreiben('lang.txt', 18, 'verworfen');
    await anm.abbrechen('lang.txt', 18);
    await anm.feldZu('lang.txt', 18);
    await anm.fokusAufKopf(1);
    await anm.anmerkungenUnter('lang.txt', Z19, [ALTER_TEXT]);
    await anm.aendern(1);
    await anm.taste('Escape');
    await anm.feldZu('lang.txt', 18);
    await anm.fokusAufKopf(1);
    await anm.anmerkungenUnter('lang.txt', Z19, [ALTER_TEXT]);

    await anm.aendern(1);
    await anm.textSchreiben('lang.txt', 18, NEUER_TEXT);
    const verzoegert = await anm.aendernVerzoegern();
    await anm.zweimalSpeichern('lang.txt', 18);
    await anm.speichernIstGesperrt('lang.txt', 18);
    await anm.dateiAnsehen('src/b.txt');
    await anm.dateiAnsehen('lang.txt');
    await verzoegert.eingetroffen();

    await anm.anmerkungenUnter('lang.txt', Z19, [NEUER_TEXT]);
    await anm.anzahlAnmerkungszeilen(1);
    expect(verzoegert.anzahl(), 'Anfragen des Browsers').toBe(1);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain(`> ${NEUER_TEXT}\n`);
    expect(ergebnis).toContain('Anmerkungen: 1\n');
  });

  test('Fehler beim Speichern: Meldung des Servers im Feld, Feld offen, Text bleibt, unter der Zeile weiter der alte Text', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);
    const eingabe = `Klammer ${String.fromCharCode(0x1B)}[2J fehlt`;
    const faelle = [
      { antwort: { status: 400, meldung: 'Text enthält Steuer- oder Richtungszeichen' }, erwartet: 'Text enthält Steuer- oder Richtungszeichen' },
      { antwort: { status: 404, meldung: 'Anmerkung 7 gibt es nicht' }, erwartet: 'Anmerkung 7 gibt es nicht' },
      { antwort: { status: 500, meldung: 'intern' }, erwartet: KONNTE_NICHT },
      { antwort: 'netz', erwartet: KONNTE_NICHT },
    ];

    await anm.aendern(1);
    await anm.textSchreiben('lang.txt', 18, eingabe);
    for (const fall of faelle) {
      await anm.serverAntwortetBeimAendern(fall.antwort);
      await anm.speichern('lang.txt', 18);
      await anm.feldMeldet('lang.txt', 18, fall.erwartet, eingabe);
      await anm.anmerkungszeileEnthaelt(1, ALTER_TEXT);
    }

    await anm.anzahlAenderungsfelder(1);
    await anm.anmerkungenUnter('lang.txt', Z19, [ALTER_TEXT]);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain(`> ${ALTER_TEXT}\n`);
  });

  test('fremder Text im geänderten Text bleibt Text: spitze Klammern sichtbar, kein img, kein Dialog, stdout zitiert unverändert', async ({ anm }) => {
    const fremderText = '<img src=x onerror=alert(1)>';
    await anm.starten({ seiteOeffnen: false });
    await anm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'erster');
    await anm.ueberDieSchnittstelleAendern(1, fremderText);
    await anm.seiteOeffnen();
    await anm.dateiAnsehen('lang.txt');

    await anm.anmerkungenUnter('lang.txt', Z19, [fremderText]);
    expect(await anm.sichtbarerAnmerkungstext()).toBe(fremderText);
    await anm.neuLaden();
    await anm.dateiAnsehen('lang.txt');
    await anm.anmerkungenUnter('lang.txt', Z19, [fremderText]);
    await anm.fremderTextBleibtText();
    const { ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(ergebnis).toContain(`> ${fremderText}\n`);
  });

  test('Ändern wirkt nur auf die Anmerkung ihrer Nummer: zwei an derselben Stelle, die zweite geändert, die erste bleibt', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, 'erste Fassung');
    await anm.annotieren('lang.txt', 18, 'zweite Fassung');

    await anm.aendern(2);
    await anm.textSchreiben('lang.txt', 18, 'zweite Fassung, berichtigt');
    await anm.speichern('lang.txt', 18);
    await anm.feldZu('lang.txt', 18);

    await anm.anmerkungenUnter('lang.txt', Z19, ['erste Fassung', 'zweite Fassung, berichtigt']);
    await anm.kopfNenntNummer(1);
    await anm.kopfNenntNummer(2);
    await anm.anzahlAnmerkungszeilen(2);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('Anmerkungen: 2\n');
    expect(ergebnis).toContain('> erste Fassung\n');
    expect(ergebnis).toContain('> zweite Fassung, berichtigt\n');
  });

  test('Pfeil auf/ab im Änderungsfeld und auf seinen Knöpfen: Fokus und Caret bleiben; das Anlegefeld unverändert', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);
    await anm.aendern(1);

    await anm.textSchreiben('lang.txt', 18, 'erste\nzweite');
    const amEnde = await anm.caretPosition('lang.txt', 18);
    await anm.taste('ArrowUp');
    await anm.feldOffenMitFokus('lang.txt', 18);
    expect(await anm.caretPosition('lang.txt', 18), 'Pfeil auf bewegt den Caret in die erste Zeile').toBeLessThan(amEnde);
    await anm.taste('ArrowDown');
    await anm.feldOffenMitFokus('lang.txt', 18);
    expect(await anm.caretPosition('lang.txt', 18), 'Pfeil ab setzt den Caret zurück').toBe(amEnde);
    await anm.feldEnthaelt('lang.txt', 18, 'erste\nzweite');

    for (const knopf of ['Speichern', 'Abbrechen']) {
      await anm.fokusAufKnopf('lang.txt', 18, knopf);
      await anm.taste('ArrowDown');
      await anm.knopfHatFokus('lang.txt', 18, knopf);
      await anm.taste('ArrowUp');
      await anm.knopfHatFokus('lang.txt', 18, knopf);
    }
    await anm.anzahlAenderungsfelder(1);

    // Kontrollpaar: das Anlegefeld hält Fokus und Caret bereits.
    await anm.zeileAnklicken({ neu: 19 });
    await anm.textSchreiben('lang.txt', 19, 'eins\nzwei');
    const anlegeEnde = await anm.caretPosition('lang.txt', 19);
    await anm.taste('ArrowUp');
    await anm.feldOffenMitFokus('lang.txt', 19);
    expect(await anm.caretPosition('lang.txt', 19)).toBeLessThan(anlegeEnde);
  });

  test('Zwei offene Änderungsfelder: eines speichern lässt das andere samt Eingabe stehen', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, 'erste Fassung');
    await anm.annotieren('lang.txt', 18, 'zweite Fassung');

    await anm.aendern(1);
    await anm.aendern(2);
    await anm.anzahlAenderungsfelder(2);
    await anm.aenderungsfeldTextSchreiben(1, 'getippt-eins');
    await anm.aenderungsfeldTextSchreiben(2, 'getippt-zwei');

    await anm.aenderungsfeldSpeichern(2);
    await anm.anzahlAenderungsfelder(1);
    await anm.aenderungsfeldEnthaelt(1, 'getippt-eins');
    await anm.anmerkungszeileEnthaelt(2, 'getippt-zwei');
    await anm.anmerkungenUnter('lang.txt', Z19, ['erste Fassung', 'getippt-zwei']);
  });

  test('Offenes Änderungsfeld übersteht Dateiwechsel und zurück samt Eingabe (wie das Anlegefeld)', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);
    await anm.aendern(1);
    await anm.aenderungsfeldTextSchreiben(1, 'noch nicht gespeichert');

    await anm.dateiAnsehen('src/b.txt');
    await anm.anzahlAenderungsfelder(0);
    await anm.dateiAnsehen('lang.txt');
    await anm.anzahlAenderungsfelder(1);
    await anm.aenderungsfeldEnthaelt(1, 'noch nicht gespeichert');

    await anm.aenderungsfeldSpeichern(1);
    await anm.anzahlAenderungsfelder(0);
    await anm.anmerkungenUnter('lang.txt', Z19, ['noch nicht gespeichert']);
  });

  test('Offenes Änderungsfeld bleibt, während eine neue Notiz gespeichert wird', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);
    await anm.aendern(1);
    await anm.aenderungsfeldTextSchreiben(1, 'bleibt stehen');

    await anm.annotieren('lang.txt', 19, 'eine neue Notiz');

    await anm.anzahlAenderungsfelder(1);
    await anm.aenderungsfeldEnthaelt(1, 'bleibt stehen');
    await anm.anmerkungenUnter('lang.txt', { neu: 19 }, ['eine neue Notiz']);
  });
});