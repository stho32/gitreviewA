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
    await abgehakte.zaehler('1 ausgeblendet, davon 1 abgehakt');

    await abgehakte.schalterBetatigen();

    await abgehakte.schalterIst(false);
    await expect.poll(async () => sortiert(await abgehakte.dateinamen())).toEqual(['README.md', 'src/a.txt', 'src/b.txt']);
    await abgehakte.zaehler('');
  });

  test('soll zwei Ausblendgründe nebeneinander nennen (Szenario 6)', async ({ abgehakte }) => {
    await abgehakte.starten({ vorbereitung: 'Q', modus: 'zusammen', zusatz: ['--ignore', '*.lock'] });
    await abgehakte.aufZeilen(6);
    await abgehakte.abhaken('build/out.log');
    await abgehakte.fortschritt('1 von 7 Dateien abgehakt');
    await abgehakte.schalterBetatigen();

    await abgehakte.zaehler('2 ausgeblendet, davon 1 abgehakt, 1 Muster');
    await expect.poll(async () => sortiert(await abgehakte.dateinamen())).toEqual(['README.md', 'docs/README.md', 'src/a.txt', 'src/b.txt', 'src/generated/api.cs']);
  });

  test('soll die gewählte Datei ausblenden, ohne Wahl und Diff zu verlieren (Szenario 10)', async ({ abgehakte }) => {
    await abgehakte.starten({ vorbereitung: 'Z', modus: 'zusammen' });
    await abgehakte.aufZeilen(3);
    await abgehakte.dateiAnsehen('README.md');
    await abgehakte.gewaehlteDateien(['README.md']);
    await abgehakte.schalterBetatigen();
    await abgehakte.schalterIst(true);

    await abgehakte.abhaken('README.md');

    await expect.poll(async () => (await abgehakte.dateinamen()).includes('README.md')).toBe(false);
    await abgehakte.hinweis('Die gewählte Datei ist ausgeblendet');
    expect(await abgehakte.diffPfad()).toBe('README.md');

    await abgehakte.schalterBetatigen();

    await abgehakte.hinweis('');
    await expect.poll(async () => (await abgehakte.dateinamen()).includes('README.md')).toBe(true);
    await abgehakte.gewaehlteDateien(['README.md']);
  });

  test('soll den Schalter über Moduswechsel halten und nach dem Neuladen aus stehen (Szenario 9)', async ({ abgehakte }) => {
    await abgehakte.starten({ vorbereitung: 'Z', modus: 'zusammen' });
    await abgehakte.aufZeilen(3);
    await abgehakte.schalterBetatigen();
    await abgehakte.schalterIst(true);

    await abgehakte.modusWaehlen('einzeln');
    await abgehakte.schalterIst(true);
    await abgehakte.modusWaehlen('zusammen');
    await abgehakte.schalterIst(true);

    await abgehakte.neuLaden();

    await abgehakte.schalterIst(false);
  });
});
