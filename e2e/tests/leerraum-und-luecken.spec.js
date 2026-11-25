'use strict';
// Spezifikation R00026 „Leerraum ausblenden und Lücken aufklappen“, Teil Oberfläche: der Umschalter „Leerraum“ im Diff-Bereich (B2503).
// Was gelesen wird (Zeilen, Nummern, Orakel) prüfen tests/GitReviewA.Tests/Akzeptanz/ und die Bausteine in e2e/tests/bausteine/.
const { test } = require('../dsl/diff-lesen.js');

test.describe('Umschalter Leerraum', () => {
  test('soll mit „beachten“ starten, per Tastatur umschaltbar sein und die Stellung über Datei- und Commit-Wechsel behalten', async ({ diff }) => {
    await diff.starten();
    await diff.leerraumIst('beachten');

    await diff.leerraumPerTastaturUmschalten();

    await diff.leerraumIst('ignorieren');
    await diff.dateiAnsehen('src/b.txt');
    await diff.leerraumIst('ignorieren');
    await diff.commitAnsehen('p');
    await diff.leerraumIst('ignorieren');

    await diff.leerraumUmschalten();

    await diff.leerraumIst('beachten');
  });

  test('soll die Stellung auch ohne gewählte Datei treffen und nichts laden', async ({ diff }) => {
    await diff.starten();
    await diff.fordertZurWahlAuf();

    await diff.leerraumUmschalten();

    await diff.leerraumIst('ignorieren');
    await diff.fordertZurWahlAuf();
  });
});
