'use strict';
// Spezifikation R00012 „Oberfläche Liste–Detail“: die zugeklappte Commit-Zeile nennt die Kette nur, wenn sie sie kennt
// (Kriterien 2 und 4; Browser-Eigenes: verzögerte und gescheiterte Antwort auf `GET /api/zusammen`).
// Die Rechnung der Beschriftung prüft bausteine/modus-werte.spec.js.
const { test } = require('../dsl/zeile-annotieren.js');

test.describe('Commit-Zeile und die Kette', () => {
  test('soll vor der Antwort auf /api/zusammen nicht „lückenlos · netto“ behaupten und danach die Kette nennen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', modus: null, seiteOeffnen: false });
    await anm.zusammenVerzoegern(2500);
    await anm.seiteOeffnen();

    // Positivkontrolle: die Commit-Leiste steht, also könnte die Zeile auch etwas Falsches sagen.
    await anm.commitZeileEnthaelt(anm.hash('z1').slice(0, 7));
    await anm.commitZeileEnthaeltNicht('lückenlos');
    test.info().annotations.push({ type: 'Messwert', description: 'vor der Antwort nennt die Zeile den Hinweis statt der Kette' });

    await anm.commitZeileEnthaelt('lückenlos · netto');
    await anm.commitZeileText(`3 Commits · ${anm.hash('z1').slice(0, 7)}..${anm.hash('z3').slice(0, 7)} · lückenlos · netto`);
  });

  test('soll bei 500 auf /api/zusammen die Kette als nicht lesbar nennen und nie „lückenlos“ behaupten', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', modus: null, seiteOeffnen: false });
    await anm.zusammenScheitert(500);
    await anm.seiteOeffnen();

    await anm.commitZeileEnthaelt(anm.hash('z1').slice(0, 7));
    await anm.commitZeileEnthaeltNicht('lückenlos');
    await anm.commitZeileEnthaelt('Kette nicht lesbar');
    await anm.diffAufforderung();
  });
});