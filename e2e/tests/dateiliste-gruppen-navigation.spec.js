'use strict';
// Spezifikation R00040 „Dateiliste nach Gruppen“: Navigation in der gezeigten, gruppierten Reihenfolge (Kriterium 6).
// `j`/`k` gehen die gezeigten Zeilen der Reihe nach (sie folgen der DOM-Reihenfolge der Gruppen) und laufen an den Enden um
// (PO Zeile 197); „Nächste ungeprüfte“ (`u`) liest dieselbe Reihenfolge aus `gruppen-werte.js` und läuft mit Umlauf. Ebene:
// Integration der Oberfläche gegen das laufende Programm; der Tastaturfall ist Browser-Eigenes (Playwright).
const { test } = require('../dsl/gruppen.js');

test.describe('Navigation in Gruppenreihenfolge', () => {
  test('Kriterium 6: j geht von der letzten Code-Datei zur ersten Test-Datei, danach folgt u der gezeigten Reihenfolge', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });
    await gruppen.dateiAnsehen('src/app.js');

    await gruppen.druecke('j');
    await gruppen.gewaehlt('tests/README.md');

    await gruppen.druecke('u');
    await gruppen.gewaehlt('tests/app.test.js');
  });

  test('Kriterium 6: von der letzten Doku-Datei läuft u mit Umlauf zur ersten ungeprüften Code-Datei', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });
    await gruppen.dateiAnsehen('docs/api.md');

    await gruppen.springen();

    await gruppen.gewaehlt('src/Contest.cs');
  });

  test('Kriterium 6: j bleibt am Ende einer Gruppe stehen, wenn es sie nicht verlassen muss (Gruppe für Gruppe)', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });
    await gruppen.dateiAnsehen('src/Contest.cs');

    await gruppen.druecke('j');
    await gruppen.gewaehlt('src/a.txt');

    await gruppen.druecke('j');
    await gruppen.gewaehlt('src/app.js');

    await gruppen.druecke('k');
    await gruppen.gewaehlt('src/a.txt');
  });

  test('Kriterium 6: j läuft an den Enden um — von der letzten Doku-Datei zur ersten Code-Datei und mit k zurück (PO Zeile 197)', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });
    await gruppen.dateiAnsehen('docs/api.md');

    await gruppen.druecke('j');
    await gruppen.gewaehlt('src/Contest.cs');
    await gruppen.fokusAufDateizeile('src/Contest.cs');

    await gruppen.druecke('k');
    await gruppen.gewaehlt('docs/api.md');
    await gruppen.fokusAufDateizeile('docs/api.md');

    // Zweiter Zyklus: derselbe Umlauf noch einmal, ohne Nachziehen von Wahl oder Fokus.
    await gruppen.druecke('j');
    await gruppen.gewaehlt('src/Contest.cs');
    await gruppen.fokusAufDateizeile('src/Contest.cs');

    await gruppen.druecke('k');
    await gruppen.gewaehlt('docs/api.md');
    await gruppen.fokusAufDateizeile('docs/api.md');
  });

  test('Kriterium 6: der Umlauf von j und k geht nur über die gezeigten Zeilen (ausgeblendete zählen nicht)', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });
    await gruppen.musterEingeben('docs/api.md');
    await gruppen.musterEingeben('src/Contest.cs');
    await gruppen.dateizeilenReihe(['src/a.txt', 'src/app.js', 'tests/README.md', 'tests/app.test.js', 'web/haken-werte.spec.js', 'README.md']);

    await gruppen.dateiAnsehen('src/a.txt');
    await gruppen.druecke('k');
    await gruppen.gewaehlt('README.md');

    await gruppen.druecke('j');
    await gruppen.gewaehlt('src/a.txt');
  });

  test('Kriterium 6: ohne Wahl beginnt „Nächste ungeprüfte“ bei der ersten Code-Datei', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });

    await gruppen.springen();

    await gruppen.gewaehlt('src/Contest.cs');
  });

  test('Kriterium 6: u überspringt Abgehakte in der gruppierten Reihenfolge (Code und Doku)', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });
    await gruppen.abhaken('src/Contest.cs');
    await gruppen.abhaken('docs/api.md');

    await gruppen.springen();
    await gruppen.gewaehlt('src/a.txt');

    // Von der letzten Code-Datei läuft u über die Tests zur ersten ungeprüften Doku-Datei.
    await gruppen.dateiAnsehen('src/app.js');
    await gruppen.springen();
    await gruppen.gewaehlt('tests/README.md');
  });
});
