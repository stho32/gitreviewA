'use strict';
// Spezifikation R00027 „Im Diff suchen“ — Programm (ohne Playwright-Treiber im Browser): kein zusätzlicher git-Aufruf,
// der Suchbegriff nie im Wortlaut im Protokoll. Die Suche läuft ganz im Browser über die schon gezeigten Zeilen.
const { test, expect } = require('../dsl/gitreviewa.js');
const beobachtung = require('../treiber/beobachtung.js');
const { SUCHE_TXT } = require('../dsl/suche.js');

test.describe('Im Diff suchen (R00027) — Programm', () => {
  test('soll beim Suchen keinen git-Aufruf machen und den Begriff nicht im Wortlaut protokollieren', async ({ gr, page }) => {
    const repo = gr.repoMitDateien({ 'suche.txt': SUCHE_TXT });
    const zaehler = beobachtung.gitZaehlerAnlegen(gr.eigenerOrdner());
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash], { pfadVorne: zaehler.ordner });
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await gr.dateiWaehlen(page, 'suche.txt');
    await expect(page.locator('#diff .df-sc tr[data-art]')).toHaveCount(8);

    const vorher = zaehler.aufrufe().length;
    await gr.sucheSuchen(page, 'zwei');
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 4');
    expect(zaehler.aufrufe().length, 'kein zusätzlicher git-Aufruf beim Suchen').toBe(vorher);

    await gr.beendenAnfordern(lauf);
    await gr.aufEndeWarten(lauf);

    expect(lauf.stderr).not.toContain('zwei');
    expect(lauf.stderr).not.toContain('Suche im Diff');
  });
});
