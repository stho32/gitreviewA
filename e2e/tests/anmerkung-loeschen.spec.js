'use strict';
// Spezifikation R00019 „Anmerkung löschen“, Teil Browser: der Bedienweg am Anmerkungskopf und Browser-Eigenes — Darstellung, Tastatur,
// Neuladen, Fehlerpfade per `route`, verzögerte Antwort. Was gelöscht, abgelehnt, gelistet und ausgegeben wird, prüfen
// tests/GitReviewA.Tests/Akzeptanz/AnmerkungLoeschenTests.cs und der Endpunkt; das Ergebnis auf stdout am Programm
// tests/anmerkung-loeschen-programm.spec.js. Das Löschen liegt nicht auf dem Hot Path (AI-Team/factory.md).
const { test, expect } = require('../dsl/zeile-annotieren.js');

const Z19 = { neu: 18 };
const ALTER_TEXT = 'Klammer fehlt';
const KONNTE_NICHT = 'Anmerkung konnte nicht gelöscht werden';

test.describe('Anmerkung löschen', () => {
  test('Löschen per Tastatur am Anmerkungskopf: Zeile weg, unter z19 nichts, übrige unberührt, nach Neuladen nicht wieder', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);
    await anm.annotieren('lang.txt', 19, 'bleibt');
    await anm.kopfNenntNummer(1);

    await anm.loeschenPerTastatur(1);

    await anm.keineAnmerkungszeile(1);
    await anm.keineAnmerkungUnter(Z19);
    await anm.anmerkungenUnter('lang.txt', { neu: 19 }, ['bleibt']);
    await anm.anzahlAnmerkungszeilen(1);
    await anm.neuLaden();
    await anm.dateiAnsehen('lang.txt');
    await anm.keineAnmerkungszeile(1);
    await anm.anmerkungenUnter('lang.txt', { neu: 19 }, ['bleibt']);
    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis).toBe(['# Ergebnis manueller Review', '', 'Anmerkungen: 1', '', '## 1. lang.txt:19', '', `Commit: ${anm.hash('q')}`, '', '> bleibt', ''].join('\n'));
  });

  test('Löschen wirkt nur auf die Anmerkung ihrer Nummer: zwei an derselben Stelle, die zweite gelöscht, die erste bleibt', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, 'erste Fassung');
    await anm.annotieren('lang.txt', 18, 'zweite Fassung');

    await anm.loeschen(2);

    await anm.keineAnmerkungszeile(2);
    await anm.anmerkungenUnter('lang.txt', Z19, ['erste Fassung']);
    await anm.anzahlAnmerkungszeilen(1);
    await anm.kopfNenntNummer(1);
  });

  test('Ein offenes Änderungsfeld der gelöschten Anmerkung fällt weg, ein anderes bleibt samt Eingabe', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, 'erste');
    await anm.annotieren('lang.txt', 19, 'zweite');
    await anm.aendern(1);
    await anm.aendern(2);
    await anm.aenderungsfeldTextSchreiben(2, 'getippt-zwei');
    await anm.anzahlAenderungsfelder(2);

    await anm.loeschen(1);

    await anm.keineAnmerkungszeile(1);
    await anm.anzahlAenderungsfelder(1);
    await anm.aenderungsfeldEnthaelt(2, 'getippt-zwei');
    await anm.anmerkungenUnter('lang.txt', { neu: 19 }, ['zweite']);
  });

  test('Fehler beim Löschen: Meldung des Servers am Anmerkungskopf, die Anmerkung bleibt sichtbar und im Ergebnis', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);
    const faelle = [
      { antwort: { status: 404, meldung: 'Anmerkung 7 gibt es nicht' }, erwartet: 'Anmerkung 7 gibt es nicht' },
      { antwort: { status: 500, meldung: 'intern' }, erwartet: KONNTE_NICHT },
      { antwort: 'netz', erwartet: KONNTE_NICHT },
    ];

    for (const fall of faelle) {
      await anm.serverAntwortetBeimLoeschen(fall.antwort);
      await anm.loeschen(1);
      await anm.kopfMeldet(1, fall.erwartet);
      await anm.anmerkungszeileEnthaelt(1, ALTER_TEXT);
    }

    await anm.anmerkungenUnter('lang.txt', Z19, [ALTER_TEXT]);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain(`> ${ALTER_TEXT}\n`);
  });

  test('Verzögerte Antwort: Löschen gesperrt, genau eine Anfrage, nach Dateiwechsel und zurück ist die Anmerkung gelöscht', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);
    const verzoegert = await anm.loeschenVerzoegern();

    await anm.zweimalLoeschen(1);
    await anm.loeschenIstGesperrt(1);
    await anm.dateiAnsehen('src/b.txt');
    await anm.dateiAnsehen('lang.txt');
    await verzoegert.eingetroffen();

    await anm.keineAnmerkungszeile(1);
    expect(verzoegert.anzahl(), 'Anfragen des Browsers').toBe(1);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toBe(['# Ergebnis manueller Review', '', 'Keine Anmerkungen.', ''].join('\n'));
  });

  test('Während der Löschung weg und zurück: „Löschen“ ist auch an der neu gezeichneten Anmerkungszeile gesperrt, ein zweiter Klick sendet nicht erneut', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);
    const verzoegert = await anm.loeschenVerzoegern();

    await anm.loeschen(1);
    await anm.dateiAnsehen('src/b.txt');
    await anm.dateiAnsehen('lang.txt');
    await anm.loeschenIstGesperrt(1);
    await anm.loeschenErneut(1);
    await verzoegert.eingetroffen();

    await anm.keineAnmerkungszeile(1);
    await anm.keineAnmerkungUnter(Z19);
    expect(verzoegert.anzahl(), 'Lösch-Anfragen des Browsers').toBe(1);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toBe(['# Ergebnis manueller Review', '', 'Keine Anmerkungen.', ''].join('\n'));
  });

  test('Fällt die verzögerte Löschung nach dem Neuzeichnen aus, gibt genau eine Anfrage die Meldung aus und „Löschen“ ist wieder frei', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, ALTER_TEXT);
    const verzoegert = await anm.serverAntwortetVerzoegertBeimLoeschen({ status: 500, meldung: 'intern' });

    await anm.loeschen(1);
    await anm.dateiAnsehen('src/b.txt');
    await anm.dateiAnsehen('lang.txt');
    await anm.loeschenIstGesperrt(1);
    await anm.loeschenErneut(1);
    await verzoegert.eingetroffen();

    await anm.kopfMeldet(1, KONNTE_NICHT);
    await anm.anmerkungszeileEnthaelt(1, ALTER_TEXT);
    await anm.loeschenIstFrei(1);
    expect(verzoegert.anzahl(), 'Lösch-Anfragen des Browsers').toBe(1);
  });

  test('Zwei Löschungen gleichzeitig: je Anmerkung genau eine Anfrage, die Sperre gilt nur für ihre Anmerkung', async ({ anm }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, 'erste');
    await anm.annotieren('lang.txt', 18, 'zweite');
    const verzoegert = await anm.loeschenVerzoegern();

    await anm.loeschen(1);
    await anm.loeschen(2);
    await anm.loeschenIstGesperrt(1);
    await anm.loeschenIstGesperrt(2);
    await anm.loeschenErneut(1);
    await anm.loeschenErneut(2);
    await verzoegert.eingetroffen();

    await anm.keineAnmerkungszeile(1);
    await anm.keineAnmerkungszeile(2);
    expect(verzoegert.anzahl(), 'Lösch-Anfragen des Browsers').toBe(2);
    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toBe(['# Ergebnis manueller Review', '', 'Keine Anmerkungen.', ''].join('\n'));
  });
});
