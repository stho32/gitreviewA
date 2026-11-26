'use strict';
// Spezifikation R00037 „Ergebnis-Spalte live“ (I0038, B3606), Leistungsprobe am Lastprofil (Kriterium 5): der Commit `g`
// (2 000 Dateien) mit 1 000 ueber die Schnittstelle abgehakten Stellen und 500 Anmerkungen zu je 200 Zeichen; eine weitere
// Anmerkung steht <= 1 s nach der Antwort des Speicherns in der Spalte (Messwert <= 0,7 s, ereignisgenau).
const { test, expect } = require('../dsl/gitreviewa.js');

test.describe('Ergebnis-Spalte Lastprofil (Kriterium 5)', () => {
  test('1000 Haken und 500 Anmerkungen, eine weitere steht <= 1 s nach dem Speichern in der Spalte', async ({ gr, page }) => {
    test.setTimeout(300000);
    const repo = gr.repoMitGrossemCommit(2000);
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.u]);

    for (let nummer = 1; nummer <= 1000; nummer += 1) {
      const pfad = `viele/datei-${String(nummer).padStart(4, '0')}.txt`;
      const antwort = await gr.hakenAnlegen(lauf, { commit: repo.u, datei: pfad, abgehakt: true });
      expect(antwort.status, `Haken ${nummer}`).toBe(200);
    }
    for (let nummer = 1; nummer <= 500; nummer += 1) {
      const text = `Anmerkung ${nummer} `.padEnd(200, 'x');
      const antwort = await gr.anmerkungAnlegen(lauf, { commit: repo.u, datei: 'viele/datei-0001.txt', zeile: 1, text });
      expect(antwort.status, `Anmerkung ${nummer}`).toBe(201);
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await gr.oberflaecheOeffnen(page, lauf, null);
    await expect.poll(() => page.locator('#ergebnis-text').textContent(), { timeout: 60000 }).toContain('Anmerkungen: 500');

    const startMs = Date.now();
    const antwort = await gr.anmerkungAnlegen(lauf, { commit: repo.u, datei: 'viele/datei-0001.txt', zeile: 1, text: 'die letzte Anmerkung' });
    expect(antwort.status).toBe(201);
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('anmerkung-geaendert')));
    await expect.poll(() => page.locator('#ergebnis-text').textContent(), { timeout: 10000 }).toContain('> die letzte Anmerkung');
    const dauerMs = Date.now() - startMs;

    test.info().annotations.push({ type: 'Messwert', description: `Letzte Anmerkung in der Spalte nach ${dauerMs} ms (Grenze 1000, Ziel 700)` });
    console.log(`Messwert Kriterium 5: ${dauerMs} ms`);
    expect(dauerMs, 'Spalte <= 1 s nach dem Speichern').toBeLessThanOrEqual(1000);
  });
});
