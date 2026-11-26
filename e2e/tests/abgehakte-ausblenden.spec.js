'use strict';
// Spezifikation R00029 „Abgehakte Dateien ausblenden“ — Oberfläche gegen die echte Anwendung. Ausblenden liegt nicht auf dem Hot Path
// (AI-Team/factory.md); die reinen Regeln prüfen die Bausteintests (abgehakte-werte.spec.js), Browser-Eigenes (Schalter, Fokus,
// Neuladen, Zeit) läuft in Playwright, die Aufrufzählung als Prozessprobe.
const { test, expect } = require('../dsl/abgehakte-ausblenden.js');
const { anzeigeSchrankeMs } = require('../dsl/schranken.js');

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

  test('soll in „Einzeln“ je Stelle ausblenden und über die Wechsel an bleiben (Szenario 3)', async ({ abgehakte }) => {
    await abgehakte.starten({ vorbereitung: 'Z', modus: 'einzeln' });
    await abgehakte.commitAnsehen('z2');
    await expect.poll(async () => sortiert(await abgehakte.dateinamen())).toEqual(['src/a.txt', 'src/b.txt']);

    await abgehakte.abhaken('src/a.txt');
    await abgehakte.schalterBetatigen();
    await abgehakte.schalterIst(true);

    await expect.poll(async () => await abgehakte.dateinamen()).toEqual(['src/b.txt']);
    await abgehakte.commitAnsehen('z1');
    await expect.poll(async () => sortiert(await abgehakte.dateinamen())).toEqual(['README.md', 'src/a.txt']);
    await abgehakte.schalterIst(true);
    await abgehakte.commitAnsehen('z3');
    await expect.poll(async () => sortiert(await abgehakte.dateinamen())).toEqual(['src/a.txt', 'src/b.txt']);
    await abgehakte.fortschritt('1 von 6 Stellen abgehakt');
  });

  test('soll eine teilweise abgehakte Datei sichtbar lassen und erst ganz abgehakt ausblenden (Szenario 4)', async ({ abgehakte }) => {
    await abgehakte.starten({ vorbereitung: 'Z', modus: 'einzeln' });
    await abgehakte.commitAnsehen('z2');
    await expect.poll(async () => (await abgehakte.dateinamen()).includes('src/b.txt')).toBe(true);
    await abgehakte.abhaken('src/b.txt');

    await abgehakte.modusWaehlen('zusammen');
    await abgehakte.aufZeilen(3);
    await abgehakte.schalterBetatigen();
    await abgehakte.schalterIst(true);

    await expect.poll(async () => (await abgehakte.dateinamen()).includes('src/b.txt')).toBe(true);
    await abgehakte.zaehler('');

    await abgehakte.abhaken('src/b.txt');

    await expect.poll(async () => (await abgehakte.dateinamen()).includes('src/b.txt')).toBe(false);
    await abgehakte.zaehler('1 ausgeblendet, davon 1 abgehakt');
  });

  test('soll im Baum Ordner ohne sichtbare Datei weglassen (Szenario 5)', async ({ abgehakte }) => {
    await abgehakte.starten({ vorbereitung: 'Q', modus: 'zusammen' });
    await abgehakte.aufZeilen(7);
    await abgehakte.darstellungWaehlen('baum');
    await abgehakte.abhaken('out.log');
    await abgehakte.schalterBetatigen();
    await abgehakte.schalterIst(true);

    await expect.poll(async () => await abgehakte.ordnernamen()).toEqual(['src', 'generated', 'docs']);
    await expect.poll(async () => sortiert(await abgehakte.dateinamen())).toEqual(['README.md', 'README.md', 'a.txt', 'api.cs', 'app.lock', 'b.txt']);

    await abgehakte.abhaken('api.cs');

    await expect.poll(async () => await abgehakte.ordnernamen()).toEqual(['src', 'docs']);
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

  test('soll gesperrte Stellen nie ausblenden (Szenario 7)', async ({ abgehakte }) => {
    await abgehakte.starten({ vorbereitung: 'N mit v', modus: 'einzeln' });
    await expect.poll(async () => (await abgehakte.dateinamen()).length).toBeGreaterThan(0);
    const vorher = (await abgehakte.dateinamen()).length;
    await abgehakte.schalterBetatigen();
    await abgehakte.schalterIst(true);

    await abgehakte.zaehler('');
    await expect.poll(async () => (await abgehakte.dateinamen()).length).toBe(vorher);
    await expect.poll(async () => (await abgehakte.dateinamen()).includes('f⟨0xFF⟩.txt')).toBe(true);
    await abgehakte.fortschritt('0 von 10 Stellen abgehakt (3 nicht lesbar)');
  });

  test('soll die Sicht m und das Ergebnis nicht ändern (Szenario 8)', async ({ abgehakteProgramm }) => {
    await abgehakteProgramm.starten({ vorbereitung: 'Q', zusatz: ['--ignore', '*.lock'] });
    await abgehakteProgramm.ueberDieSchnittstelleAbhaken('i1', 'build/out.log');

    await abgehakteProgramm.beendenAnfordern();
    const exitCode = await abgehakteProgramm.aufEnde();

    const out = abgehakteProgramm.stdout();
    expect(exitCode).toBe(0);
    expect(out).toContain('Abgehakt: 1 von 7');
    expect(out).toContain('Ungeprüft: 6 von 7');
    expect(out).toContain(`- build/out.log (Commit ${abgehakteProgramm.hash('i1')})`);
    expect(out).toContain(`- app.lock (Commit ${abgehakteProgramm.hash('i1')})`);
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

  test('soll per Tab erreichbar, mit der Leertaste bedienbar sein und die Zahl ansagen (Szenario 11, Browser-Eigenes)', async ({ abgehakte, page }) => {
    await abgehakte.starten({ vorbereitung: 'Z', modus: 'zusammen' });
    await abgehakte.aufZeilen(3);
    await abgehakte.abhaken('README.md');
    await abgehakte.fortschritt('1 von 3 Dateien abgehakt');

    const schalter = page.locator('#dateiliste #ausblenden');
    await page.locator('body').focus();
    let erreicht = false;
    for (let schritt = 0; schritt < 60 && !erreicht; schritt += 1) {
      await page.keyboard.press('Tab');
      erreicht = await schalter.evaluate(element => element === document.activeElement);
    }
    expect(erreicht, 'Schalter mit Tab erreicht').toBe(true);
    await expect(schalter).toHaveAccessibleName(/^Abgehakte ausblenden/);

    await page.keyboard.press('Space');

    await abgehakte.schalterIst(true);
    const zaehler = page.locator('#kopf-fortschritt .ausblenden-zaehler');
    await expect(zaehler).toHaveRole('status');
    await expect(zaehler).toHaveText('1 ausgeblendet, davon 1 abgehakt');
  });

  test('soll die Sicht ohne zusätzlichen git-Aufruf wechseln (Szenario 11, Prozessprobe)', async ({ abgehakte }) => {
    await abgehakte.starten({ vorbereitung: 'Z', modus: 'zusammen', zaehlen: true });
    await abgehakte.aufZeilen(3);
    await abgehakte.abhaken('README.md');
    await abgehakte.fortschritt('1 von 3 Dateien abgehakt');

    const vorher = abgehakte.gitAufrufe().length;
    await abgehakte.schalterBetatigen();
    await abgehakte.schalterBetatigen();
    await abgehakte.schalterBetatigen();
    await expect.poll(async () => await abgehakte.dateinamen()).toEqual(['src/a.txt', 'src/b.txt']);
    const nachher = abgehakte.gitAufrufe().length;

    expect(nachher).toBe(vorher);
  });

  test('soll 2 000 Dateien spätestens 5 s nach der Betätigung ausblenden (Nicht-funktionale Anforderung)', async ({ abgehakte, page }) => {
    await abgehakte.starten({ vorbereitung: 'gross', modus: 'zusammen' });
    await abgehakte.aufZeilen(2000);
    await abgehakte.abhaken('viele/datei-0001.txt');
    await abgehakte.fortschritt('1 von 2000 Dateien abgehakt');

    const betaeatigtUmMs = Date.now();
    await abgehakte.schalterBetatigen();
    await page.waitForFunction(() => document.querySelectorAll('#datei-zeilen .datei-zeile').length === 1999, null, { polling: 'raf' });
    const dauerMs = Date.now() - betaeatigtUmMs;

    test.info().annotations.push({ type: 'Messwert', description: `2000 Dateien ausgeblendet nach ${dauerMs} ms (Anzeige-Schranke ${anzeigeSchrankeMs} ms)` });
    console.log(`Messwert: 2000 Dateien nach ${dauerMs} ms ausgeblendet (Anzeige-Schranke ${anzeigeSchrankeMs} ms)`);
    expect(dauerMs).toBeLessThanOrEqual(anzeigeSchrankeMs);
    await abgehakte.zaehler('1 ausgeblendet, davon 1 abgehakt');
  });
});
