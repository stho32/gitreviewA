'use strict';
// Spezifikation R00012/R00014 „Sperre und Stapel vergleichen denselben Namen“ (Nacharbeit Karte 27, Befund M2): zwei Dateien mit
// gleichem Anzeigenamen — `a⟨U+202E⟩.txt` wörtlich und `a` + U+202E + `.txt` — sind zwei Dateien. Der Stapel darf nie beide als
// „gesehen“ setzen; die Anzeige sperrt beide Kästchen mit demselben Sperrgrund wie in „Einzeln“ (Browser-Eigenes: Darstellung).
// Die API (POST) und der Stapel gegen echtes git prüfen StapelNamenskollisionTests.cs und HakenEndpunktTests.cs.
const { test, expect } = require('../dsl/datei-abhaken.js');

const ANZEIGENAME = 'a⟨U+202E⟩.txt';
const NICHT_EINDEUTIG = 'Diff nicht lesbar: Name nicht eindeutig';

test.describe('Zwei Dateien mit demselben Anzeigenamen', () => {
  test.skip(process.platform !== 'linux', 'Namen mit dem echten U+202E legt nur bash unter Linux an');

  test('soll beide Kästchen mit Sperrgrund sperren, nichts senden und keine Stelle setzen (M2)', async ({ abhaken }) => {
    await abhaken.starten({ vorbereitung: 'Namenskollision', commits: ['c1'], modus: 'zusammen' });
    await abhaken.dateienWarten(2);

    await abhaken.fortschritt('0 von 2 Dateien abgehakt (2 nicht lesbar)');
    await abhaken.istGesperrt(ANZEIGENAME, 0, NICHT_EINDEUTIG);
    await abhaken.istGesperrt(ANZEIGENAME, 1, NICHT_EINDEUTIG);

    const hakenAnfragen = abhaken.hakenAnfragenMitschreiben();
    await abhaken.gesperrtesKaestchenBetaetigen(ANZEIGENAME, 0);
    await abhaken.gesperrtesKaestchenBetaetigen(ANZEIGENAME, 1);

    expect(hakenAnfragen(), 'ein gesperrtes Kästchen sendet nichts').toBe(0);
    await abhaken.fortschritt('0 von 2 Dateien abgehakt (2 nicht lesbar)');
    expect(await abhaken.serverseitigAbgehakt(), 'keine der beiden Stellen ist gesetzt').toEqual([]);
  });
});