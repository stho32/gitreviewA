'use strict';
// Spezifikation R00037 „Ergebnis-Spalte live“ (I0038, B3603/B3606): die Spalte zeigt denselben Text wie stdout (Kriterium 1),
// frischt nach jeder Aenderung auf (Kriterium 2), laeuft bei schneller Folge zweimal (Kriterium 3) und behaelt Bildlauf und
// Fehlerstand (Kriterium 4). Die Oberflaeche gegen Fake (Playwright `route`) und gegen das laufende Programm.
const { test, expect } = require('../dsl/zeile-annotieren.js');

function spaltenText(page) {
  return page.locator('#ergebnis-text').textContent();
}

test.describe('Ergebnis-Spalte live (B3603)', () => {
  test('zeigt anfangs den leeren Stand und nach Anlegen, Aendern, Loeschen und Haken den neuen Stand (Kriterium 2)', async ({ anm, page }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await expect.poll(() => spaltenText(page), 'leerer Stand').toContain('Keine Anmerkungen.');

    await anm.annotieren('lang.txt', 18, 'ZWEI gross?');
    await expect.poll(() => spaltenText(page)).toContain('## 1. lang.txt:18');
    await expect.poll(() => spaltenText(page)).toContain('> ZWEI gross?');

    await anm.aendern(1);
    await anm.aenderungsfeldTextSchreiben(1, 'geaendert');
    await anm.aenderungsfeldSpeichern(1);
    await expect.poll(() => spaltenText(page)).toContain('> geaendert');

    await anm.loeschen(1);
    await expect.poll(() => spaltenText(page)).toContain('Keine Anmerkungen.');

    await anm.abhaken('src/b.txt');
    await expect.poll(() => spaltenText(page)).toContain('## Dateien');
    await expect.poll(() => spaltenText(page)).toContain('Abgehakt: 1 von');
    await expect.poll(() => spaltenText(page)).toContain('src/b.txt');
  });

  test('der Text der Spalte ist unmittelbar vor dem Beenden Zeichen fuer Zeichen stdout (Kriterium 1)', async ({ anm, page }) => {
    await anm.starten();
    await anm.dateiAnsehen('lang.txt');
    await anm.annotieren('lang.txt', 18, 'Klammer fehlt');
    await expect.poll(() => spaltenText(page)).toContain('## 1. lang.txt:18');

    const spaltenStand = await spaltenText(page);
    const { exitCode, ergebnis } = await anm.beendenUndErgebnisLesen();

    expect(exitCode).toBe(0);
    expect(ergebnis, 'stdout ist der Spaltenstand').toBe(spaltenStand);
  });
});

test.describe('Ergebnis-Spalte gegen Fake (B3603, B3606)', () => {
  test('bei 300 ms Verzoegerung und zehn Aenderungen in 100 ms laufen hoechstens zwei Anfragen, keine gleichzeitig (Kriterium 3)', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    let anfragen = 0;
    let gleichzeitig = 0;
    let hoechsteGleichzeitigkeit = 0;
    await page.route('**/api/ergebnis', async route => {
      anfragen += 1;
      gleichzeitig += 1;
      hoechsteGleichzeitigkeit = Math.max(hoechsteGleichzeitigkeit, gleichzeitig);
      await new Promise(weiter => setTimeout(weiter, 300));
      gleichzeitig -= 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ergebnis: 'STAND' }) });
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await gr.oberflaecheOeffnen(page, lauf, null);
    await expect.poll(() => anfragen, 'die erste Anfrage laeuft').toBeGreaterThanOrEqual(1);

    await page.evaluate(() => {
      for (let nummer = 0; nummer < 10; nummer += 1) {
        document.dispatchEvent(new CustomEvent('haken-geaendert'));
      }
    });

    await expect.poll(() => anfragen, { timeout: 5000, message: 'die nachlaufende Anfrage' }).toBe(2);
    await page.waitForTimeout(500);
    expect(anfragen, 'zehn Aenderungen ergeben hoechstens zwei Anfragen').toBe(2);
    expect(hoechsteGleichzeitigkeit, 'keine zwei Anfragen gleichzeitig').toBe(1);
    await expect.poll(() => spaltenText(page)).toBe('STAND');
  });

  test('der Bildlauf bleibt beim Auffrischen; ein Fehler kennzeichnet den Stand als veraltet, die naechste Aenderung holt ihn (Kriterium 4)', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    let scheitern = false;
    await page.route('**/api/ergebnis', async route => {
      if (scheitern) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        return;
      }
      const zeilen = Array.from({ length: 400 }, (_, nummer) => `Zeile ${nummer}`).join('\n');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ergebnis: zeilen }) });
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await gr.oberflaecheOeffnen(page, lauf, null);
    await expect.poll(() => spaltenText(page)).toContain('Zeile 0');

    await page.evaluate(() => { document.getElementById('ergebnis').scrollTop = 300; });
    const versatzVorher = await page.evaluate(() => document.getElementById('ergebnis').scrollTop);
    expect(versatzVorher, 'die Spalte ist gescrollt').toBeGreaterThan(0);

    await page.evaluate(() => document.dispatchEvent(new CustomEvent('anmerkung-geaendert')));
    await expect.poll(() => page.evaluate(() => document.getElementById('ergebnis').scrollTop), 'Bildlauf bleibt').toBe(versatzVorher);

    scheitern = true;
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('anmerkung-geaendert')));
    await expect(page.locator('#ergebnis-fehler')).toBeVisible();
    await expect(page.locator('#ergebnis-veraltet')).toBeVisible();
    await expect.poll(() => spaltenText(page), 'der letzte Stand bleibt').toContain('Zeile 0');

    scheitern = false;
    await page.route('**/api/ergebnis', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ergebnis: 'NEUER STAND' }) });
    });
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('anmerkung-geaendert')));
    await expect.poll(() => spaltenText(page)).toBe('NEUER STAND');
    await expect(page.locator('#ergebnis-fehler')).toBeHidden();
    await expect(page.locator('#ergebnis-veraltet')).toBeHidden();
  });
});
