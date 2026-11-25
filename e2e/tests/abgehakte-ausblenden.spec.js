'use strict';
// Spezifikation R00029 „Abgehakte Dateien ausblenden“ — Oberfläche gegen die echte Anwendung. Ausblenden liegt nicht auf dem Hot Path
// (AI-Team/factory.md); die reinen Regeln prüfen die Bausteintests, Browser-Eigenes (Schalter, Fokus, Neuladen, Zeit) läuft in Playwright.
const { test, expect } = require('../dsl/abgehakte-ausblenden.js');

const sortiert = namen => [...namen].sort();

test.describe('Abgehakte ausblenden (R00029)', () => {
  test('soll in „Zusammen“ abgehakte Dateien ausblenden und beim Ausschalten zurückbringen (Szenario 1/2)', async ({ abgehakte }) => {
    await abgehakte.starten({ vorbereitung: 'Z', modus: 'zusammen' });
    await abgehakte.aufZeilen(3);
    await abgehakte.abhaken('README.md');
    await abgehakte.fortschritt('1 von 3 Dateien abgehakt');
    await abgehakte.schalterIst(false);
    expect(sortiert(await abgehakte.dateinamen())).toEqual(['README.md', 'src/a.txt', 'src/b.txt']);

    await abgehakte.schalterBetatigen();

    await abgehakte.schalterIst(true);
    await expect.poll(async () => sortiert(await abgehakte.dateinamen())).toEqual(['src/a.txt', 'src/b.txt']);

    await abgehakte.schalterBetatigen();

    await abgehakte.schalterIst(false);
    await expect.poll(async () => sortiert(await abgehakte.dateinamen())).toEqual(['README.md', 'src/a.txt', 'src/b.txt']);
  });
});
