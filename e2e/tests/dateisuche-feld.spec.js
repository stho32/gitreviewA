'use strict';
// Spezifikation R00049 „Dateiliste durchsuchen“, Teil Suchfeld und Meldung (B4504, Kriterien 2 und die
// Benutzerfreundlichkeit des Feldes): das Feld „Dateien suchen“ mit Platzhalter, die Liste folgt jeder Eingabe ohne
// Bestätigung, ein ungültiger Text meldet am Feld und lässt die Liste des letzten gültigen Textes stehen, ein gültiger
// nimmt die Meldung weg. Ebene: Oberfläche gegen das laufende Programm (Repo P); das Feld selbst ist Browser-Eigenes
// (Beschriftung, Tab).
const { test, expect } = require('../dsl/dateisuche.js');
const suchSeite = require('../treiber/dateisuche-oberflaeche.js');

const SQL_DATEIEN = ['db/001_anlegen.sql', 'db/002_aendern.sql', 'src/data/app.sql'];
const ZU_LANG = 'Ein Muster darf höchstens 200 Zeichen haben.';
const UNSICHTBAR = 'Ein Muster darf keine Steuer- oder Richtungszeichen enthalten.';

test.describe('Suchfeld und Meldung (B4504)', () => {
  test('soll einen ungültigen Text am Feld melden und die Liste des letzten gültigen Textes lassen (Kriterium 2)', async ({ dateisuche }) => {
    await dateisuche.starten();
    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(3);
    await dateisuche.sucheMeldung('');

    await dateisuche.suchen('a'.repeat(201));
    await dateisuche.sucheMeldung(ZU_LANG);
    expect(await dateisuche.dateinamen()).toEqual(SQL_DATEIEN);

    await dateisuche.suchen('ab\u202E.sql');
    await dateisuche.sucheMeldung(UNSICHTBAR);
    expect(await dateisuche.dateinamen()).toEqual(SQL_DATEIEN);

    await dateisuche.feldLeeren();
    await dateisuche.aufZeilen(8);
    await dateisuche.sucheMeldung('');
  });

  test('soll den Text aus genau 200 Zeichen anwenden (Kriterium 2)', async ({ dateisuche }) => {
    await dateisuche.starten();

    await dateisuche.suchen('a'.repeat(200));

    await dateisuche.sucheMeldung('');
    await dateisuche.leerfall('Keine Datei passt zur Suche');
  });

  test('soll die Liste ohne Bestätigung jeder Eingabe folgen', async ({ dateisuche }) => {
    await dateisuche.starten();

    await dateisuche.suchen('app');
    await dateisuche.aufZeilen(3);

    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(3);
    expect(await dateisuche.dateinamen()).toEqual(SQL_DATEIEN);
  });

  test('soll das Feld sichtbar beschriften, mit Platzhalter und per Tab erreichbar sein (NFA Benutzerfreundlichkeit)', async ({ dateisuche, page }) => {
    await dateisuche.starten();

    await dateisuche.feldbeschriftung();
    await expect(suchSeite.feld(page)).toBeVisible();
    await suchSeite.tabBisFeld(page);
  });

  test('soll die Marke unsichtbarer Zeichen tippbar finden (Kriterium 2, nur im Fake)', async ({ dateisuche }) => {
    await dateisuche.starten({ vorbereitung: 'P mit Fremdtext', zeilen: 10 });

    await dateisuche.suchen('\u27E8U+202E\u27E9');
    await dateisuche.aufZeilen(1);

    expect(await dateisuche.dateinamen()).toEqual(['ab\u27E8U+202E\u27E9.sql']);
  });
});
