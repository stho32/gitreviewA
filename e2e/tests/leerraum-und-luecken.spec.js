'use strict';
// Spezifikation R00026 „Leerraum ausblenden und Lücken aufklappen“, Teil Oberfläche: der Umschalter „Leerraum“ im Diff-Bereich (B2503)
// und das Laden bei seinem Wechsel (B2504). Was gelesen wird (Zeilen, Nummern, Orakel) prüfen die Akzeptanztests unter
// tests/GitReviewA.Tests/Akzeptanz/ und die Bausteine in e2e/tests/bausteine/.
const { test } = require('../dsl/diff-lesen.js');

const kontext = (text, nummer) => ({ kontext: text, alt: nummer, neu: nummer });
const VON_SRC_B = {
  pfad: 'src/b.txt',
  zeilen: [{ kopf: '@@ -1,2 +1,3 @@' }, kontext('eins', 1), { minus: 'zwei', alt: 2 }, { plus: 'ZWEI', neu: 2 }, { plus: 'drei', neu: 3 }],
};
const ERSATZ_PATCH = '@@ -1,1 +1,1 @@\n-alt\n+IGNORIERT\n';

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

test.describe('Laden bei Leerraum-Wechsel', () => {
  test('soll dieselbe Datei mit dem anderen Vergleich laden — „ignorieren“ mit Parameter, „beachten“ ohne', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');
    await diff.anfragenBeobachten();

    await diff.leerraumUmschalten();

    await diff.diffZeigt(VON_SRC_B);
    await diff.dateiGewaehlt('src/b.txt');
    await diff.anfragenEnthalten({ pfad: 'src/b.txt', leerraum: 'ignorieren' });

    await diff.leerraumUmschalten();

    await diff.anfragenEnthalten({ pfad: 'src/b.txt', leerraum: null });
    await diff.dateiGewaehlt('src/b.txt');
  });

  test('soll die späte Antwort der früheren Stellung verwerfen', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');
    const ersatz = await diff.antwortErsetzen({ pfad: 'src/b.txt', leerraum: 'ignorieren', patch: ERSATZ_PATCH, verzoegerungMs: 1500 });

    await diff.leerraumUmschalten();
    await diff.leerraumUmschalten();
    await diff.diffZeigt(VON_SRC_B);
    await ersatz.eingetroffen();

    await diff.diffZeigt(VON_SRC_B);
  });

  test('soll einen Fehler beim Wechsel melden und den Umschalter bedienbar lassen', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');
    const fehler = await diff.antwortErsetzen({ pfad: 'src/b.txt', leerraum: 'ignorieren', status: 500 });

    await diff.leerraumUmschalten();

    await diff.diffMeldetFehler('src/b.txt', 'Diff konnte nicht gelesen werden');
    await fehler.eingetroffen();
    await diff.diffMeldetFehler('src/b.txt', 'Diff konnte nicht gelesen werden');

    await diff.leerraumUmschalten();

    await diff.diffZeigt(VON_SRC_B);
  });
});
