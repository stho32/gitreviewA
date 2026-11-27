'use strict';
// Nacharbeit B1 (Karte #64, R00054, Lehre #17): Ausblenden-Muster und Dateiansicht holen ihre Zeichenliste aus
// `dateiliste-werte.js` (die eine Liste). Diese Probe fährt beide Wege im echten Browser und prüft, dass die geteilte
// Liste dort ankommt und die Konsole ohne `pageerror` bleibt — ein beim Laden gebundenes oder fehlendes Modul würde
// hier als `pageerror` (TypeError auf `undefined`) sichtbar, während ein Node-Test mit `require` grün bliebe.
const { test, expect } = require('../dsl/gitreviewa.js');
const dTreiber = require('../treiber/dateiansicht-d.js');

const seitenfehler = [];
test.beforeEach(({ page }) => {
  seitenfehler.length = 0;
  page.on('pageerror', fehler => seitenfehler.push(fehler.message));
});
test.afterEach(() => {
  expect(seitenfehler, 'Seitenfehler der Konsole').toEqual([]);
});

test.describe('Eine Zeichenliste im Browser (R00054, B1)', () => {
  test('Musterfeld: unsichtbare Zeichen im Muster melden die geteilte Liste, die Konsole bleibt still', async ({ gr, page }) => {
    const repo = gr.repoMitDateien({ 'README.md': 'a\n', 'app.lock': 'b\n' });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufDateizeilenWarten(page, 2);

    // Ein Formatzeichen (Cf), ein Steuerzeichen (Cc) und ein Variationsselektor (Mn) — alle aus der einen Klasse.
    await gr.musterEingeben(page, 'a\u202Eb');
    await expect(gr.ausblendenFehler(page)).toHaveText('Ein Muster darf keine unsichtbaren Zeichen enthalten.');
    await gr.musterEingeben(page, 'a\u0007b');
    await expect(gr.ausblendenFehler(page)).toHaveText('Ein Muster darf keine unsichtbaren Zeichen enthalten.');
    await gr.musterEingeben(page, '*\u2764\uFE0F*');
    await expect(gr.ausblendenFehler(page)).toHaveText('Ein Muster darf keine unsichtbaren Zeichen enthalten.');

    // Ein gültiges Muster wirkt unverändert.
    await gr.musterEingeben(page, '*.lock');
    await expect(gr.ausblendenZaehler(page)).toHaveText('1 ausgeblendet, davon 1 Muster');
  });

  test('Dateiansicht: die geteilte Liste ist geladen, Marken erscheinen, die Konsole bleibt still', async ({ page }) => {
    const d = dTreiber.ordnerDAnlegen();
    const lauf = await dTreiber.starten(d, 'trojan.sql');
    try {
      await dTreiber.oeffnen(page, lauf);
      await expect(page.locator('#da-inhalt .da-text').first()).toContainText('⟨U+202E⟩');
      const roh = await page.locator('#da-inhalt').evaluate(element => element.textContent.includes('\u202e'));
      expect(roh).toBe(false);
    } finally {
      await dTreiber.beenden(lauf);
      dTreiber.entfernen(d);
    }
  });
});
