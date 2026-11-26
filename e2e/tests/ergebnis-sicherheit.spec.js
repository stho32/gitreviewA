'use strict';
// Spezifikation R00037 „Ergebnis-Spalte live“ (I0038, B3606), Sicherheit (Kriterium 9): der fremde Text steht als Text in der
// Spalte (kein Element, kein Dialog), die Namen tragen die Marken des Formatierers, und die „Ungeprüft“-Zeilen nennen den Grund
// „Diff nicht lesbar“. Repo N plus v (R00014); Playwright (DOM-Sicherheit).
const path = require('path');
const { test, expect } = require('../dsl/gitreviewa.js');
const fremdeNamen = require('../treiber/fremde-namen-repo.js');

test.describe('Ergebnis-Spalte und fremder Text (Kriterium 9)', () => {
  test('HTML-Text bleibt Text, kein img-Element und kein Dialog; die Spalte gleicht dem Formatierer', async ({ gr, page }) => {
    const repo = fremdeNamen.repoNMitV(path.join(gr.eigenerOrdner(), 'repo'));
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.b, repo.hashes.n, repo.hashes.v]);
    const dialoge = [];
    page.on('dialog', dialog => {
      dialoge.push(dialog.message());
      dialog.dismiss();
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await gr.oberflaecheOeffnen(page, lauf, null);
    await expect(page.locator('#ergebnis-text')).toContainText('Keine Anmerkungen.');

    // Ein Haken auf eine lesbare Datei bringt den Abschnitt „Dateien“ mit den gesperrten Zeilen; die Anmerkung traegt HTML.
    await gr.hakenAnlegen(lauf, { commit: repo.hashes.n, datei: 'g.txt', abgehakt: true });
    await gr.anmerkungAnlegen(lauf, { commit: repo.hashes.n, datei: 'g.txt', zeile: 2, text: '<img src=x onerror=alert(1)>' });
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('anmerkung-geaendert')));

    await expect.poll(() => page.locator('#ergebnis-text').textContent(), 'HTML-Text woertlich').toContain('<img src=x onerror=alert(1)>');
    await expect(page.locator('#ergebnis img'), 'kein Element img').toHaveCount(0);
    expect(dialoge, 'kein Dialog').toEqual([]);

    const text = await page.locator('#ergebnis-text').textContent();
    expect(text, 'der Sperrgrund steht in der Spalte').toContain('Diff nicht lesbar');

    // „Eine Quelle“: derselbe Text wie der Formatierer (GET /api/ergebnis).
    const ueberDieSchnittstelle = await gr.ergebnisAbfragen(lauf);
    const erwartet = JSON.parse(ueberDieSchnittstelle.koerper).ergebnis;
    expect(text, 'die Spalte formatiert nichts selbst').toBe(erwartet);
  });
});
