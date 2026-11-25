'use strict';
// Spezifikation R00022 „Datei annotieren“, Teil Anzeige (B2102): die Dateianmerkungen der gezeigten Stelle stehen über den Diff-Zeilen,
// je mit Anmerkungskopf und Text als Text, in beiden Ansichten und beiden Modi. Was angelegt, abgelehnt und ausgegeben wird, prüft
// tests/GitReviewA.Tests/Akzeptanz/DateiAnnotierenTests.cs; die Rechnung tests/bausteine/anmerkungen-werte.spec.js.
const { test, expect } = require('../dsl/zeile-annotieren.js');

test.describe('Datei annotieren — Anzeige über den Diff-Zeilen', () => {
  test('eine Dateianmerkung in „Zusammen“ steht über den Zeilen, in beiden Ansichten', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen', seiteOeffnen: false });
    await anm.dateianmerkungUeberDieSchnittstelleAnlegen('q', 'lang.txt', 'Abschnitt fehlt');
    await anm.seiteOeffnen();
    await anm.dateiAnsehen('lang.txt');

    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);
    await anm.dateianmerkungUeberDenZeilen();
    await anm.anzahlAnmerkungszeilen(1);
    await anm.ansichtWaehlen('ganze Datei');
    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);
    await anm.ansichtWaehlen('nur Änderungen');
    await anm.dateianmerkungenOben([{ text: 'Abschnitt fehlt', stelle: 'lang.txt (ganze Datei)' }]);

    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toContain('## 1. lang.txt (ganze Datei)\n');
  });

  test('zwei Dateianmerkungen in Anlegereihenfolge über den Zeilen, die Zeilenanmerkung unter z19 (Kriterium 2)', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen', seiteOeffnen: false });
    await anm.dateianmerkungUeberDieSchnittstelleAnlegen('q', 'lang.txt', 'erste');
    await anm.dateianmerkungUeberDieSchnittstelleAnlegen('q', 'lang.txt', 'zweite');
    await anm.ueberDieSchnittstelleAnlegen('q', 'lang.txt', 18, 'Zeile');
    await anm.seiteOeffnen();
    await anm.dateiAnsehen('lang.txt');

    await anm.dateianmerkungenOben([
      { text: 'erste', stelle: 'lang.txt (ganze Datei)' },
      { text: 'zweite', stelle: 'lang.txt (ganze Datei)' },
    ]);
    await anm.anmerkungenUnter('lang.txt', { neu: 18 }, ['Zeile']);

    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    const ueberschriften = ergebnis.split('\n').filter(zeile => zeile.startsWith('## '));
    expect(ueberschriften).toEqual(['## 1. lang.txt (ganze Datei)', '## 2. lang.txt (ganze Datei)', '## 3. lang.txt:18']);
  });

  test('keine Dateianmerkung — die Anzeige bleibt leer, das Ergebnis wie R00002', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });
    await anm.dateiAnsehen('lang.txt');

    await anm.keineDateianmerkung();

    const { ergebnis } = await anm.beendenUndErgebnisLesen();
    expect(ergebnis).toBe('# Ergebnis manueller Review\n\nKeine Anmerkungen.\n');
  });
});
