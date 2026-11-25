'use strict';
// Spezifikation R00030 „Tastaturbedienung“, Teil Browser: die Kürzel, die nur im Browser prüfbar sind (Tastendruck, Fokus,
// Fokusfalle, berechneter Stil, Live-Region). Der Katalog und die Kontextregeln rechnen in tests/bausteine/tasten-werte.spec.js;
// hier geht es um das, was die Seite daraus macht. Ein neuer Serverweg entsteht nicht — die Tastenschicht liest nur die Seite.
const { test, expect } = require('../dsl/tastatur.js');

test.describe('R00030 Abschnitte — n und p', () => {
  test('setzen den Fokus auf die erste Zeile des nächsten bzw. vorigen Abschnitts; an den Enden bleibt er stehen', async ({ tast }) => {
    await tast.starten({ vorbereitung: 'Repo W' });
    await tast.dateiAnsehen('weit.txt');

    const zeilen = await tast.diffZeilen();
    expect(zeilen.abschnitte, 'zwei Abschnitte im Diff').toBe(2);

    await tast.inDenDiffTabben();
    await tast.druecke('n');
    await tast.fokusAufDiffzeile(2);
    await tast.druecke('n');
    await tast.fokusAufDiffzeile(32);
    await tast.druecke('n');
    await tast.fokusAufDiffzeile(32);
    await tast.druecke('p');
    await tast.fokusAufDiffzeile(2);
    await tast.druecke('p');
    await tast.fokusAufDiffzeile(2);
  });
});