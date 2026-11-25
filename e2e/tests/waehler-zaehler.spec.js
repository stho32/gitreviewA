'use strict';
// Spezifikation R00012 „Oberfläche Liste–Detail“: der Zähler je Commit im Menü des Commit-Wählers (Kriterien 6 und 8).
// Nacharbeit zum Befund des Entwicklertests (#27, US-4/Kriterium 8): die Zahlen kamen aus einer einmal gelesenen Kopie des Stands und
// wurden nach einem Haken nicht neu gezeichnet — erst ein Neuladen zeigte sie. Browser-Eigenes: das Menü ist ein natives `<select>`,
// seine Einträge sind nur im DOM prüfbar (die Rechnung selbst prüft bausteine/haken-werte.spec.js).
const { test } = require('../dsl/zeile-annotieren.js');

test.describe('R00012 Commit-Wähler: Zähler je Commit', () => {
  test('Kriterium 8: das Menü nennt nach jedem Haken den bestätigten Stand („1 von 2, 2 von 2, 1 von 2“), ohne Neuladen', async ({ anm }) => {
    await anm.starten({ vorbereitung: 'Repo Z', modus: null });
    const kurz = name => anm.hash(name).slice(0, 7);
    const menue = zahlen => [
      `1/3 · ${kurz('z1')} · Start · ${zahlen[0]}`,
      `2/3 · ${kurz('z2')} · a ändern, b neu · ${zahlen[1]}`,
      `3/3 · ${kurz('z3')} · a und b ändern · ${zahlen[2]}`,
    ];

    // Ohne Haken: das Menü zählt je Commit (Positivkontrolle der Zählung selbst).
    await anm.modusWaehlen('einzeln');
    await anm.waehlerMenue(menue(['0 von 2', '0 von 2', '0 von 2']));

    // „Zusammen“: src/a.txt abhaken setzt alle drei Stellen der Datei.
    await anm.modusWaehlen('zusammen');
    await anm.abhaken('src/a.txt');
    await anm.fortschritt('1 von 3 Dateien abgehakt');

    // Der Wechsel nach „Einzeln“ zeigt die drei Stellen von src/a.txt als abgehakt.
    await anm.modusWaehlen('einzeln');
    await anm.fortschritt('3 von 6 Stellen abgehakt');
    await anm.waehlerMenue(menue(['1 von 2', '1 von 2', '1 von 2']));

    // src/b.txt bei z2 abhaken — das Menü folgt dem bestätigten Stand.
    await anm.commitAnsehen('z2');
    await anm.abhaken('src/b.txt');
    await anm.fortschritt('4 von 6 Stellen abgehakt');
    await anm.waehlerMenue(menue(['1 von 2', '2 von 2', '1 von 2']));

    // Haken wieder entfernen — die Zahlen sinken ebenso.
    await anm.abhaken('src/b.txt');
    await anm.fortschritt('3 von 6 Stellen abgehakt');
    await anm.waehlerMenue(menue(['1 von 2', '1 von 2', '1 von 2']));

    await anm.modusWaehlen('zusammen');
    await anm.abhaken('src/a.txt');
    await anm.fortschritt('0 von 3 Dateien abgehakt');
    await anm.modusWaehlen('einzeln');
    await anm.waehlerMenue(menue(['0 von 2', '0 von 2', '0 von 2']));

    // Eine Stelle haken und neu laden: dieselben Zahlen kommen aus dem Stand (Positivkontrolle des Neuladens).
    await anm.commitAnsehen('z2');
    await anm.abhaken('src/b.txt');
    await anm.waehlerMenue(menue(['0 von 2', '1 von 2', '0 von 2']));
    await anm.neuLaden();
    await anm.modusWaehlen('einzeln');
    await anm.waehlerMenue(menue(['0 von 2', '1 von 2', '0 von 2']));
  });
});
