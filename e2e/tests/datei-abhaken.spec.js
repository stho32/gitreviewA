'use strict';
// Spezifikation R00011 „Datei abhaken“ im Browser — nur Browser-Eigenes (Darstellung, Tastatur, Fokus, Wechsel und Neuladen, Fremdtext als Text,
// Fehlerpfade per `route`, Zeiten im Browser). Datei abhaken liegt nicht auf dem Hot Path; die Kriterien selbst prüft
// tests/GitReviewA.Tests/Akzeptanz/DateiAbhakenTests.cs gegen den Interactor.
const { test, NAME_MIT_HTML } = require('../dsl/datei-abhaken.js');

const PQR = ['p', 'q', 'r'];

test.describe('Datei abhaken', () => {
  test('soll zu Beginn „0 von 8 abgehakt“ mit leerem Balken zeigen und keine Datei abgehakt (Kriterium 1)', async ({ abhaken }) => {
    await abhaken.starten({ commits: PQR });
    await abhaken.dateienWarten(4);

    await abhaken.fortschritt('0 von 8 abgehakt');
    await abhaken.balkenanteil(0);
    for (const name of ['README.md', 'alt.txt', 'src/a.txt', 'src/b.txt']) {
      await abhaken.istAbgehakt(name, false);
    }
  });

  test('soll bei nur dem leeren Commit „Keine Dateien zum Abhaken“ zeigen (Kriterium 1)', async ({ abhaken }) => {
    await abhaken.starten({ commits: ['r'] });

    await abhaken.fortschritt('Keine Dateien zum Abhaken');
  });

  test('soll nur mit der Tastatur abhaken, den Fokus halten, keine Datei wählen und den Haken über Wechsel und Neuladen behalten (Kriterien 4 und 10)', async ({ abhaken }) => {
    await abhaken.starten({ commits: PQR });
    await abhaken.dateienWarten(4);
    await abhaken.fortschritt('0 von 8 abgehakt');
    await abhaken.dateiwahlenMitschreiben();

    await abhaken.perTastaturAbhaken('README.md');

    await abhaken.fortschritt('1 von 8 abgehakt');
    await abhaken.balkenanteil(0.125);
    await abhaken.istAbgehakt('README.md');
    await abhaken.kaestchenHeisst('README.md', 'Abgehakt: README.md');
    await abhaken.fokusAufKaestchen('README.md');
    await abhaken.kaestchenflaecheReicht('README.md');
    await abhaken.keineDateiwahlSeitdem();
    await abhaken.keineDateiGewaehlt();

    await abhaken.commitAnsehen('q');
    await abhaken.dateienWarten(4);
    await abhaken.fortschritt('1 von 8 abgehakt');
    await abhaken.istAbgehakt('src/b.txt', false);
    await abhaken.dateiAnsehen('src/b.txt');
    await abhaken.fortschritt('1 von 8 abgehakt');
    await abhaken.commitAnsehen('p');
    await abhaken.dateienWarten(4);
    await abhaken.istAbgehakt('README.md');
    await abhaken.neuLaden();
    await abhaken.dateienWarten(4);
    await abhaken.fortschritt('1 von 8 abgehakt');
    await abhaken.istAbgehakt('README.md');
  });

  test('soll mit der Maus abhaken, ohne die gewählte Datei zu ändern, und den Haken in q unabhängig von p halten (Kriterium 2 im Browser)', async ({ abhaken }) => {
    await abhaken.starten({ commits: PQR });
    await abhaken.commitAnsehen('q');
    await abhaken.dateienWarten(4);
    await abhaken.dateiAnsehen('alt.txt');
    await abhaken.dateiwahlenMitschreiben();

    await abhaken.abhaken('src/b.txt');

    await abhaken.fortschritt('1 von 8 abgehakt');
    await abhaken.istAbgehakt('src/b.txt');
    await abhaken.gewaehlteDateien(['alt.txt']);
    await abhaken.keineDateiwahlSeitdem();
    await abhaken.commitAnsehen('p');
    await abhaken.dateienWarten(4);
    await abhaken.istAbgehakt('src/b.txt', false);
    await abhaken.commitAnsehen('q');
    await abhaken.dateienWarten(4);
    await abhaken.abhaken('src/b.txt');
    await abhaken.fortschritt('0 von 8 abgehakt');
    await abhaken.istAbgehakt('src/b.txt', false);
  });

  test('soll einen Namen mit HTML als Text zeigen und im Namen des Kästchens nennen, ohne Dialog (Kriterium 11)', async ({ abhaken }) => {
    await abhaken.starten({ vorbereitung: 'x', commits: ['x'] });
    await abhaken.dateienWarten(1);

    await abhaken.abhaken(NAME_MIT_HTML);

    await abhaken.fortschritt('1 von 1 abgehakt');
    await abhaken.kaestchenHeisst(NAME_MIT_HTML, `Abgehakt: ${NAME_MIT_HTML}`);
    await abhaken.fremderTextBleibtText();
  });

  for (const fall of [{ art: 'mit 500', status: 500 }, { art: 'ohne Antwort', abbrechen: true }]) {
    test(`soll das Kästchen zurücksetzen und „Haken konnte nicht gespeichert werden“ zeigen, wenn das Setzen ${fall.art} scheitert (Kriterium 12)`, async ({ abhaken }) => {
      await abhaken.starten({ commits: PQR });
      await abhaken.dateienWarten(4);
      await abhaken.fortschritt('0 von 8 abgehakt');
      await abhaken.hakenSetzenScheitert(fall);

      await abhaken.abhaken('README.md');

      await abhaken.hakenMeldung('Haken konnte nicht gespeichert werden');
      await abhaken.istAbgehakt('README.md', false);
      await abhaken.fortschritt('0 von 8 abgehakt');
    });
  }

  for (const fall of [{ klicks: 2, erwartet: [], zaehler: '0 von 8 abgehakt' }, { klicks: 3, erwartet: ['p:README.md'], zaehler: '1 von 8 abgehakt' }]) {
    test(`soll bei ${fall.klicks} Klicks während einer um 1,5 s verzögerten Antwort und einem Wechsel genau den zuletzt gewünschten Zustand speichern (Kriterium 12)`, async ({ abhaken }) => {
      await abhaken.starten({ commits: PQR });
      await abhaken.dateienWarten(4);
      await abhaken.fortschritt('0 von 8 abgehakt');
      const gesendet = await abhaken.hakenSetzenVerzoegern(1500);

      for (let klick = 0; klick < fall.klicks; klick += 1) {
        await abhaken.abhaken('README.md');
      }
      await abhaken.commitAnsehen('q');
      await abhaken.dateienWarten(4);

      await abhaken.fortschritt(fall.zaehler);
      await test.expect.poll(() => abhaken.serverseitigAbgehakt(), { timeout: 8000 }).toEqual(fall.erwartet);
      test.expect(gesendet.length, 'höchstens eine Anfrage je Antwort unterwegs').toBeLessThanOrEqual(2);
      await abhaken.commitAnsehen('p');
      await abhaken.dateienWarten(4);
      await abhaken.istAbgehakt('README.md', fall.erwartet.length === 1);
    });
  }

  test('soll ohne lesbaren Stand „Fortschritt konnte nicht gelesen werden“ zeigen, die Kästchen sperren und Leiste, Liste und Diff bedienbar lassen (Kriterium 13)', async ({ abhaken }) => {
    await abhaken.starten({ commits: PQR });
    await abhaken.standLesenScheitert();
    await abhaken.neuLaden();
    await abhaken.dateienWarten(4);

    await abhaken.hakenMeldung('Fortschritt konnte nicht gelesen werden');
    await abhaken.kaestchenGesperrt();
    await abhaken.dateiAnsehen('alt.txt');
    await abhaken.gewaehlteDateien(['alt.txt']);
    await abhaken.commitAnsehen('q');
    await abhaken.dateienWarten(4);
    await abhaken.kaestchenGesperrt();
    await abhaken.beendenBetaetigen();
    await abhaken.aufEnde();
    test.expect(abhaken.ergebnis()).toBe('# Ergebnis manueller Review\n\nKeine Anmerkungen.\n');
  });

  test('soll bei 2 000 Dateien „0 von 2000 abgehakt“ binnen 2 s nach dem Start, die Liste binnen 1 s und den neuen Zähler binnen 1 s nach dem Klick zeigen (Kriterium 15)', async ({ abhaken }) => {
    await abhaken.starten({ vorbereitung: 'g', commits: ['g'] });

    const bisZaehler = await abhaken.zeitSeitStartBisFortschritt('0 von 2000 abgehakt');
    const bisListe = await abhaken.dateienRechtzeitigNachKlick('g', 2000);
    const bisNeuerZaehler = await abhaken.zeitVomKlickBisFortschritt('viele/datei-1000.txt', '1 von 2000 abgehakt');

    test.info().annotations.push({ type: 'Messwerte', description: `Start bis Zähler ${bisZaehler} ms, Klick bis 2000 Zeilen ${bisListe} ms, Klick bis Zähler ${bisNeuerZaehler} ms` });
    console.log(`Messwerte 2000 Dateien: Start bis Zähler ${bisZaehler} ms, Klick bis Liste ${bisListe} ms, Klick bis Zähler ${bisNeuerZaehler} ms`);
    test.expect(bisZaehler).toBeLessThanOrEqual(2000);
    test.expect(bisListe).toBeLessThanOrEqual(1000);
    test.expect(bisNeuerZaehler).toBeLessThanOrEqual(1000);
  });
});
