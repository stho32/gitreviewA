'use strict';
// R00050, Kriterium 11 (zweiter Satz) — zwei Tabs, nacheinander: der erste Tab beendet oder bricht ab, der Prozess endet;
// bestätigt der zweite Tab danach, erreicht seine Anforderung keinen Server mehr. Dann zeigt er den geltenden Endzustand
// („Der Lauf ist bereits zu Ende. …“) und keine Fehlermeldung. Deterministisch: erst ist der Prozess zu Ende, dann wird
// bestätigt — kein Rennen über Zeit. Der gleichzeitige Fall steht als Integration in
// `tests/GitReviewA.Tests/Beenden/BeendenGegenAbbruchTests.cs`, die 409-Anzeige in `beenden-knoepfe.spec.js`.
const { test, expect } = require('../dsl/gitreviewa.js');

const KOPFAKTIONEN = '.gr-kopfaktionen > button';
const BEREITS_ZU_ENDE = 'Der Lauf ist bereits zu Ende. Das Ergebnis steht im Terminal bzw. im anderen Fenster. Dieses Fenster kann geschlossen werden.';

async function textDerSeite(page) {
  const text = await page.locator('main').innerText();
  return text.replace(/\s+/g, ' ').trim();
}

test.describe('R00050 Kriterium 11: der zweite Tab nach dem Ende des Laufs', () => {
  test('Tab 1 beendet, danach bestätigt Tab 2 „Abbrechen“: der zweite Tab zeigt den Endzustand, keine Fehlermeldung', async ({ gr, context, page }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1, repo.hashes.z2, repo.hashes.z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    const zweiterTab = await context.newPage();
    await zweiterTab.goto(lauf.adresse);
    await gr.abbrechenDialogOeffnen(zweiterTab);
    await gr.beendenDialogOeffnen(page);

    await gr.beendenDialogBestaetigen(page, 'Beenden (Enter)');

    await expect(gr.beendetMeldung(page)).toBeVisible();
    expect(await gr.aufEndeWarten(lauf, 10000)).toBe(0);

    await gr.beendenDialogBestaetigen(zweiterTab, 'Abbrechen');

    await expect(zweiterTab.getByText('Der Lauf ist bereits zu Ende.', { exact: true })).toBeVisible();
    expect(await textDerSeite(zweiterTab)).toContain(BEREITS_ZU_ENDE);
    await expect(zweiterTab.getByText(/ist gescheitert/)).toHaveCount(0);
    await expect(zweiterTab.locator(KOPFAKTIONEN)).toHaveCount(0);
  });

  test('Tab 1 bricht ab, danach bestätigt Tab 2 „Beenden“: derselbe Endzustand an derselben Stelle', async ({ gr, context, page }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1, repo.hashes.z2, repo.hashes.z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    const zweiterTab = await context.newPage();
    await zweiterTab.goto(lauf.adresse);
    await gr.beendenDialogOeffnen(zweiterTab);
    await gr.abbrechenDialogOeffnen(page);

    await gr.beendenDialogBestaetigen(page, 'Abbrechen');

    await expect(page.getByText('Review abgebrochen', { exact: true })).toBeVisible();
    expect(await gr.aufEndeWarten(lauf, 10000)).toBe(130);

    await gr.beendenDialogBestaetigen(zweiterTab, 'Beenden (Enter)');

    await expect(zweiterTab.getByText('Der Lauf ist bereits zu Ende.', { exact: true })).toBeVisible();
    expect(await textDerSeite(zweiterTab)).toContain(BEREITS_ZU_ENDE);
    await expect(zweiterTab.getByText(/ist gescheitert/)).toHaveCount(0);
    await expect(zweiterTab.locator(KOPFAKTIONEN)).toHaveCount(0);
  });
});
