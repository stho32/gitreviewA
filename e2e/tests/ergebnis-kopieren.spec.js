'use strict';
const { test, expect } = require('../dsl/gitreviewa.js');

test.describe('Befunde kopieren', () => {
  test('Knopf im Kopf: „Ergebnis kopieren“ vor „Beenden“, GET /api/ergebnis, während der Anfrage gesperrt, danach wieder frei', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf);
    const knopf = gr.ergebnisKopierenKnopf(page);
    const anfragen = [];
    page.on('request', anfrage => {
      if (anfrage.url().endsWith('/api/ergebnis')) {
        anfragen.push(anfrage.method());
      }
    });

    await expect(knopf).toBeVisible();
    await expect(knopf).toHaveAccessibleName('Ergebnis kopieren');
    await expect(page.locator('.gr-kopfaktionen button')).toHaveText(['Ergebnis kopieren', 'Beenden']);

    const freigeben = await gr.ergebnisAntwortZurueckhalten(page);
    await knopf.click();
    await expect(knopf).toBeDisabled();
    await expect.poll(() => anfragen.length, { message: 'eine Anfrage an /api/ergebnis' }).toBe(1);
    expect(anfragen).toEqual(['GET']);
    await freigeben();

    await expect(knopf).toBeEnabled();
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(gr.ergebnis(lauf)).toBe('');
  });

  test('Nach dem Beenden verschwindet der Kopierknopf mit der übrigen Bedienung', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf);

    await gr.beendenBetaetigen(page);

    await expect(gr.beendetMeldung(page)).toBeVisible();
    await expect(gr.ergebnisKopierenKnopf(page)).toHaveCount(0);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
  });
});