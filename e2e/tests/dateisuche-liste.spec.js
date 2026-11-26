'use strict';
// Spezifikation R00049 „Dateiliste durchsuchen“, Teil Liste, Zähler und Zusammenspiel (B4505, Kriterien 3, 4, 5 und 7):
// die Suche ist eine Sicht — nur passende Dateien stehen da, Haken und Fortschritt rechnen über die ganze Auswahl, der
// Zähler nennt die Suche als dritten Grund, Gruppen folgen der gezeigten Liste, der Leerfall hat seinen eigenen Text.
// Ebene: Oberfläche gegen das laufende Programm (Repo P); die Sicht selbst prüfen die Bausteintests dateisuche-sicht.spec.js.
const { test, expect } = require('../dsl/dateisuche.js');
const gruppenSeite = require('../treiber/gruppen-oberflaeche.js');

const SQL_DATEIEN = ['db/001_anlegen.sql', 'db/002_aendern.sql', 'src/data/app.sql'];

test.describe('Liste, Zähler und Zusammenspiel (B4505)', () => {
  test('soll in beiden Darstellungen nur die passenden Dateien zeigen (Kriterium 3)', async ({ dateisuche }) => {
    await dateisuche.starten();

    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(3);
    expect(await dateisuche.dateinamen()).toEqual(SQL_DATEIEN);
    await dateisuche.zaehler('5 ausgeblendet, davon 5 Suche');
    await dateisuche.fortschritt('0 von 8 Dateien abgehakt');

    await dateisuche.darstellung('baum');
    await dateisuche.aufZeilen(3);
    expect(await dateisuche.listenEintraege()).toEqual(['ordner:db', '001_anlegen.sql', '002_aendern.sql', 'ordner:src', 'ordner:data', 'app.sql']);
    expect(await dateisuche.ordnernamen()).not.toContain('docs');
    expect(await dateisuche.ordnernamen()).not.toContain('tests');

    await dateisuche.feldLeeren();
    await dateisuche.aufZeilen(8);
    await dateisuche.zaehler('');
  });

  test('soll in „Einzeln“ je Stelle zählen (Kriterium 3)', async ({ dateisuche }) => {
    await dateisuche.starten({ modus: 'einzeln' });
    await dateisuche.commitAnsehen('p2');
    await dateisuche.aufZeilen(2);

    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(1);
    expect(await dateisuche.dateinamen()).toEqual(['db/002_aendern.sql']);
    await dateisuche.zaehler('1 ausgeblendet, davon 1 Suche');
    await dateisuche.commitZaehler('0 von 2');

    await dateisuche.feldLeeren();
    await dateisuche.aufZeilen(2);
    await dateisuche.zaehler('');
  });

  test('soll Muster, Suche und Haken in einem Zähler nennen, ohne den Fortschritt zu ändern (Kriterium 4)', async ({ dateisuche }) => {
    await dateisuche.starten({ zusatz: ['--ignore', 'db/**'], zeilen: 6 });

    await dateisuche.abhaken('README.md');
    await dateisuche.schalterBetatigen();

    await dateisuche.suchen('*.md');
    await dateisuche.aufZeilen(1);

    expect(await dateisuche.dateinamen()).toEqual(['docs/api.md']);
    await dateisuche.zaehler('7 ausgeblendet, davon 1 abgehakt, 2 Muster, 4 Suche');
    await dateisuche.fortschritt('1 von 8 Dateien abgehakt');
  });

  test('soll die Gruppen der gezeigten Liste folgen, ihre Zähler aber über alle Dateien rechnen (Kriterium 5)', async ({ dateisuche, page }) => {
    await dateisuche.starten();

    await dateisuche.suchen('app');
    await dateisuche.aufZeilen(3);

    await gruppenSeite.pruefeGruppenKoepfe(page, [
      { name: 'Code', zaehler: '0 von 5 abgehakt' },
      { name: 'Tests', zaehler: '0 von 1 abgehakt' },
    ]);
    await gruppenSeite.pruefeKeineGruppeMitNamen(page, 'Doku');
    await gruppenSeite.pruefeDateizeilenReihe(page, ['src/app.js', 'src/data/app.sql', 'tests/app.test.js']);
    await dateisuche.fortschritt('0 von 8 Dateien abgehakt');

    await dateisuche.abhaken('src/app.js');

    await gruppenSeite.pruefeGruppenKoepfe(page, [
      { name: 'Code', zaehler: '1 von 5 abgehakt' },
      { name: 'Tests', zaehler: '0 von 1 abgehakt' },
    ]);
    await dateisuche.fortschritt('1 von 8 Dateien abgehakt');
  });

  test('soll den Leerfall der Suche zeigen und beim Leeren die ganze Liste zurückgeben (Kriterium 7)', async ({ dateisuche }) => {
    await dateisuche.starten();

    await dateisuche.suchen('zzz');

    await dateisuche.leerfall('Keine Datei passt zur Suche');
    await dateisuche.zaehler('8 ausgeblendet, davon 8 Suche');

    await dateisuche.feldLeeren();
    await dateisuche.aufZeilen(8);
    await dateisuche.zaehler('');
  });

  test('soll einen HTML-artigen Namen als Text finden und zeigen (Kriterium 7, nur im Fake)', async ({ dateisuche, page }) => {
    await dateisuche.starten({ vorbereitung: 'P mit Fremdtext', zeilen: 10 });

    await dateisuche.suchen('<b>');
    await dateisuche.aufZeilen(1);

    expect(await dateisuche.dateinamen()).toEqual(['fremd<b>.txt']);
    await expect(page.locator('#datei-zeilen b')).toHaveCount(0);
  });
});
