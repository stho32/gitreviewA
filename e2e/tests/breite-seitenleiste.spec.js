'use strict';
// Spezifikation R00034 „Breite der Seitenleiste ziehen“ (I0035, B3302): der Zustand der Breite — Start 360 px, er bleibt über
// Datei-, Commit-, Modus-, Ansichts- und Anordnungswechsel (auch ohne gewählte Datei) und fällt beim Neuladen auf 360 px zurück
// (nur RAM, nichts gespeichert). Browser-Eigenes (Darstellung); Vorbereitung Repo S (`s1`/`s2`), Fenster 1280 × 800.
const { test } = require('../dsl/breite.js');

test.describe('Zustand der Breite (B3302)', () => {
  test('startet bei 360 px, bleibt über alle Wechsel und fällt beim Neuladen auf 360 px zurück (nur RAM)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S zwei Commits' });

    await breite.breiteIst(360); // Startbreite, noch ohne gewählte Datei
    await breite.trennerVorhanden(1);
    await breite.trennerAnDerGrenze();

    await breite.setzeBreite(500);
    await breite.breiteIst(500);

    await breite.dateiAnsehen('lang.txt');
    await breite.breiteIst(500);

    await breite.modus('einzeln');
    await breite.breiteIst(500);
    await breite.druecke(']'); // Commit wechseln
    await breite.breiteIst(500);
    await breite.modus('zusammen');
    await breite.breiteIst(500);

    await breite.ansicht('ganz');
    await breite.breiteIst(500);
    await breite.ansicht('aenderungen');
    await breite.breiteIst(500);

    await breite.anordnung('nebeneinander');
    await breite.breiteIst(500);
    await breite.anordnung('untereinander');
    await breite.breiteIst(500);

    await breite.neuLaden();
    await breite.breiteIst(360); // nach dem Neuladen wieder die Startbreite
  });
});
