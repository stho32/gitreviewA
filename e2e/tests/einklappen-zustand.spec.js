'use strict';
// Spezifikation R00035 „Seitenleiste ein- und ausklappen“ (I0036, B3401): der Zustand des Einklappens ist ein Zustand der Seite
// (nur RAM, Start ausgeklappt); er bleibt beim Wechsel von Datei, Commit, Modus, Ansicht und Anordnung, und nach dem Neuladen ist
// die Seitenleiste wieder ausgeklappt. Browser-Eigenes (der Zustand am Knopf, `aria-expanded`); Vorbereitung Repo S (200 Zeilen,
// 60 Dateien, zwei Commits), Fenster 1280 × 800.
const { test } = require('../dsl/einklappen.js');

test.describe('Einklappzustand (B3401)', () => {
  test('der Knopf schaltet den Zustand um, er bleibt über alle Wechsel, und das Neuladen stellt den Standard her (Szenario 5)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S zwei Commits', modus: 'einzeln' });
    await einklappen.ausgeklappt();

    await einklappen.knopfBetatigen();
    await einklappen.eingeklappt();

    // Datei wechseln: `j` wählt über denselben Weg wie die Maus (auch wenn die Liste eingeklappt ist).
    await einklappen.druecke('j');
    await einklappen.eingeklappt();

    // Ansicht und Anordnung wechseln (beides Bedienelemente im Diff-Kopf, weiterhin bedienbar).
    await einklappen.ansicht('ganz');
    await einklappen.anordnung('nebeneinander');
    await einklappen.eingeklappt();

    // Modus wechseln und zurück.
    await einklappen.modus('zusammen');
    await einklappen.eingeklappt();
    await einklappen.modus('einzeln');
    await einklappen.eingeklappt();

    // Commit wechseln.
    await einklappen.druecke(']');
    await einklappen.eingeklappt();

    // Neuladen: der Standard der Seite gilt wieder (nichts wird gespeichert).
    await einklappen.neuLaden();
    await einklappen.ausgeklappt();

    // Ausklappen über denselben Knopf.
    await einklappen.knopfBetatigen();
    await einklappen.eingeklappt();
    await einklappen.knopfBetatigen();
    await einklappen.ausgeklappt();
  });
});