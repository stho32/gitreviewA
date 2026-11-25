'use strict';
// Spezifikation R00036 „Art der Anmerkung“, Teil Browser: die Gruppe „Art“ am Notizfeld (Kriterium 6 und die Bedienung aus Kriterium 7).
// Was angelegt, geändert und ausgegeben wird, prüfen tests/GitReviewA.Tests/Akzeptanz/ArtDerAnmerkungTests.cs und die Bausteine
// e2e/tests/bausteine/anmerkungen-werte.spec.js; das Ergebnis auf stdout prüft tests/art-der-anmerkung-programm.spec.js.
const { test, expect } = require('../dsl/zeile-annotieren.js');

const WAHLEN = ['ohne', 'Muss', 'Frage', 'Idee'];

test.describe('Art der Anmerkung am Notizfeld', () => {
  test('Zeile: Gruppe vor dem Textfeld, Start ohne, Speichern sendet die Art; Fehler und Neuzeichnen lassen Text und Art stehen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await anm.dateiAnsehen('src/a.txt');
    const name = anm.feldname('src/a.txt', 2);

    await anm.zeileAnklicken({ neu: 2 });
    await anm.artGruppeZeigt(name, WAHLEN);
    await anm.artIstGewaehlt('ohne');
    await anm.artWaehlen('Frage');
    await anm.textSchreiben('src/a.txt', 2, 'Warum groß?');
    await anm.neuzeichnen();
    await anm.artIstGewaehlt('Frage');
    await anm.feldEnthaelt('src/a.txt', 2, 'Warum groß?');

    await anm.serverAntwortetBeimAnlegen({ status: 400, meldung: 'Art unbekannt' });
    await anm.speichern('src/a.txt', 2);
    await anm.feldMeldet('src/a.txt', 2, 'Art unbekannt', 'Warum groß?');
    await anm.artIstGewaehlt('Frage');

    await anm.speichern('src/a.txt', 2);
    await anm.feldZu('src/a.txt', 2);

    const stand = await anm.anmerkungenAufDemServer();
    expect(stand.map(eintrag => [eintrag.nummer, eintrag.datei, eintrag.zeile, eintrag.text, eintrag.art])).toEqual(
      [[1, 'src/a.txt', 2, 'Warum groß?', 'frage']],
    );
  });

  test('Bereich und Datei tragen die Gruppe mit Start ohne, das Ändern-Feld die gespeicherte Art', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo R (Bereich)', modus: 'zusammen' });
    await anm.dateiAnsehen('lang.txt');

    await anm.bereichWaehlen(3, 7);
    await anm.artGruppeZeigt(anm.bereichFeldname('lang.txt', 3, 7), WAHLEN);
    await anm.artIstGewaehlt('ohne');
    await anm.artWaehlen('Muss');
    await anm.bereichFeldTextSchreiben('lang.txt', 3, 7, 'Schleife doppelt');
    await anm.bereichFeldSpeichern('lang.txt', 3, 7);
    await anm.bereichFeldZu('lang.txt', 3, 7);

    await anm.dateiAnmerken();
    await anm.artGruppeZeigt(anm.dateiFeldname('lang.txt'), WAHLEN);
    await anm.artIstGewaehlt('ohne');
    await anm.artWaehlen('Idee');
    await anm.dateiFeldTextSchreiben('lang.txt', 'Spalte prüfen');
    await anm.dateiFeldSpeichern('lang.txt');
    await anm.dateiFeldZu('lang.txt');

    await anm.aendern(1);
    await anm.artGruppeZeigt(anm.bereichFeldname('lang.txt', 3, 7), WAHLEN);
    await anm.artIstGewaehlt('Muss');
    await anm.artWaehlen('Frage');
    await anm.aenderungsfeldTextSchreiben(1, 'Schleife doppelt, bitte prüfen');
    await anm.aenderungsfeldSpeichernUndWarten(1);

    const stand = await anm.anmerkungenAufDemServer();
    expect(stand.map(eintrag => [eintrag.nummer, eintrag.von, eintrag.bis, eintrag.art])).toEqual([
      [1, 3, 7, 'frage'],
      [2, null, null, 'idee'],
    ]);
  });

  test('Kopf: die Art steht als Wort vor dem Text — in beiden Modi, Ansichten und Anordnungen; ohne Art nichts', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await anm.dateiAnsehen('src/a.txt');
    await anm.zeileAnklicken({ neu: 2 });
    await anm.artWaehlen('Muss');
    await anm.textSchreiben('src/a.txt', 2, 'ZWEI groß?');
    await anm.speichern('src/a.txt', 2);
    await anm.feldZu('src/a.txt', 2);
    await anm.zeileAnklicken({ neu: 3 });
    await anm.textSchreiben('src/a.txt', 3, 'ohne Art');
    await anm.speichern('src/a.txt', 3);
    await anm.feldZu('src/a.txt', 3);

    await anm.artAmKopf(1, 'Muss');
    await anm.keineArtAmKopf(2);
    await anm.ansichtWaehlen('ganze Datei');
    await anm.artAmKopf(1, 'Muss');
    await anm.anordnungWaehlen('nebeneinander');
    await anm.artAmKopf(1, 'Muss');
    await anm.modusWaehlen('einzeln');
    await anm.commitAnsehen('z3');
    await anm.dateiAnsehen('src/a.txt');
    await anm.artAmKopf(1, 'Muss');
    await anm.keineArtAmKopf(2);
  });

  test('Taste 2 bei gewählter Diff-Zeile öffnet das Feld mit Frage und dem Fokus im Textfeld; Ziffern im Text sind Text', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await anm.dateiAnsehen('src/a.txt');

    await anm.inDenDiffTabben();
    await anm.pfeilAbBis(2);
    await anm.taste('2');
    await anm.feldOffenMitFokus('src/a.txt', 2);
    await anm.artIstGewaehlt('Frage');
    await anm.textSchreiben('src/a.txt', 2, 'Warum 22?');
    await anm.feldEnthaelt('src/a.txt', 2, 'Warum 22?');
    await anm.speichern('src/a.txt', 2);
    await anm.feldZu('src/a.txt', 2);

    const stand = await anm.anmerkungenAufDemServer();
    expect(stand.map(eintrag => [eintrag.zeile, eintrag.text, eintrag.art])).toEqual([[2, 'Warum 22?', 'frage']]);
  });

  test('Gruppe ohne Maus: Umschalt+Tab ins Feld, Pfeiltasten wählen die Art', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await anm.dateiAnsehen('src/a.txt');

    await anm.zeileAnklicken({ neu: 2 });
    await anm.textSchreiben('src/a.txt', 2, 'per Tastatur');
    await anm.artMitTastaturWaehlen('Idee');
    await anm.artIstGewaehlt('Idee');
    await anm.speichern('src/a.txt', 2);
    await anm.feldZu('src/a.txt', 2);

    const stand = await anm.anmerkungenAufDemServer();
    expect(stand.map(eintrag => eintrag.art)).toEqual(['idee']);
  });
});
