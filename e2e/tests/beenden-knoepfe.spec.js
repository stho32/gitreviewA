'use strict';
// Knöpfe, Kürzel und Endzustände (R00050, B4604): die Kopfaktionen in Reihenfolge, „Review beendet“ und „Review
// abgebrochen“ ersetzen die Bedienung, der 409-Zustand bestimmt den angezeigten Endzustand, Fehler bleiben im Dialog.
const { test, expect } = require('../dsl/gitreviewa.js');

const KOPFAKTIONEN = '.gr-kopfaktionen > button';

test.describe('Knöpfe und Endzustände (B4604)', () => {
  test('Kriterium 15 (Grundform): Kopf zeigt „Ergebnis kopieren“, „Abbrechen“, „Beenden“ in dieser Reihenfolge; „Beenden“ ist hervorgehoben', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf);

    await expect(page.locator(KOPFAKTIONEN)).toHaveCount(3);
    expect(await page.locator(KOPFAKTIONEN).evaluateAll(knoepfe => knoepfe.map(knopf => knopf.id))).toEqual(['ergebnis-kopieren', 'abbrechen', 'beenden']);
    for (const name of ['Ergebnis kopieren', 'Abbrechen', 'Beenden']) {
      await expect(page.locator('.gr-kopfaktionen').getByRole('button', { name, exact: true })).toHaveCount(1);
    }
    const hintergruende = await page.locator(KOPFAKTIONEN).evaluateAll(knoepfe => knoepfe.map(knopf => getComputedStyle(knopf).backgroundColor));
    expect(hintergruende[2], 'Beenden ist die Hauptaktion').not.toBe(hintergruende[1]);
    expect(hintergruende[0]).toBe(hintergruende[1]);
  });

  test('Kriterium 2: Enter im Dialog beendet mit Exit 0, stdout trägt das Ergebnis, die Seite zeigt „Review beendet“', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a]);
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'datei.txt', zeile: 1, text: 'eine Anmerkung' });
    await gr.beendenDialogOeffnen(page);

    await page.keyboard.press('Enter');

    await expect(gr.beendetMeldung(page)).toBeVisible();
    await expect(page.getByText('Das Ergebnis steht in der Konsole. Dieses Fenster kann geschlossen werden.')).toBeVisible();
    await expect(page.locator(KOPFAKTIONEN)).toHaveCount(0);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toContain('Anmerkungen: 1\n');
  });

  test('Kriterium 9: „Abbrechen“ bestätigt — Exit 130, stdout 0 Bytes, genau eine Abbruchzeile, Seite „Review abgebrochen“ ohne Knöpfe', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]]);
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.abbrechenDialogOeffnen(page);

    await gr.beendenDialogBestaetigen(page, 'Abbrechen');

    await expect(page.getByText('Review abgebrochen', { exact: true })).toBeVisible();
    await expect(page.getByText('Es gibt kein Ergebnis. Dieses Fenster kann geschlossen werden.')).toBeVisible();
    await expect(page.locator(KOPFAKTIONEN)).toHaveCount(0);
    expect(await gr.aufEndeWarten(lauf)).toBe(130);
    expect(gr.ergebnis(lauf)).toBe('');
    const abbruchzeilen = lauf.stderr.split('\n').filter(zeile => zeile.includes('Review abgebrochen'));
    expect(abbruchzeilen).toHaveLength(1);
    expect(abbruchzeilen[0]).toMatch(/ WARNUNG \[Abbruch\] Review abgebrochen$/);
  });

  test('Kriterium 11 (Oberfläche): 409 „beendet“ beim Abbrechen zeigt den tatsächlich geltenden Endzustand „Review beendet“', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]]);
    await gr.oberflaecheOeffnen(page, lauf);
    await page.route('**/api/abbrechen', route => route.fulfill({ status: 409, contentType: 'application/json', body: '{"zustand":"beendet"}' }));

    await gr.abbrechenDialogOeffnen(page);
    await gr.beendenDialogBestaetigen(page, 'Abbrechen');

    await expect(gr.beendetMeldung(page)).toBeVisible();
    await expect(page.getByText('Das Ergebnis steht in der Konsole. Dieses Fenster kann geschlossen werden.')).toBeVisible();
    await expect(page.locator(KOPFAKTIONEN)).toHaveCount(0);
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });

  test('Kriterium 11 (Oberfläche): 409 „abgebrochen“ beim Beenden zeigt „Review abgebrochen“', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]]);
    await gr.oberflaecheOeffnen(page, lauf);
    await page.route('**/api/beenden', route => route.fulfill({ status: 409, contentType: 'application/json', body: '{"zustand":"abgebrochen"}' }));

    await gr.beendenDialogOeffnen(page);
    await gr.beendenDialogBestaetigen(page, 'Beenden (Enter)');

    await expect(page.getByText('Review abgebrochen', { exact: true })).toBeVisible();
    await expect(page.getByText('Es gibt kein Ergebnis. Dieses Fenster kann geschlossen werden.')).toBeVisible();
    await expect(page.locator(KOPFAKTIONEN)).toHaveCount(0);
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });

  test('Kriterium 13: scheitert der Abbruch mit 500, bleibt die Oberfläche in Betrieb und der Dialog meldet „Abbrechen ist gescheitert: Antwort 500“', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]]);
    await gr.oberflaecheOeffnen(page, lauf);
    await page.route('**/api/abbrechen', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"meldung":"kaputt"}' }));

    await gr.abbrechenDialogOeffnen(page);
    await gr.beendenDialogBestaetigen(page, 'Abbrechen');

    await expect(gr.beendenDialogFehler(page)).toHaveText('Abbrechen ist gescheitert: Antwort 500');
    await expect(gr.beendenDialogKnopf(page, 'Abbrechen')).toBeEnabled();
    await expect(gr.beendenDialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(gr.beendenKnopf(page)).toBeVisible();
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });

  test('Kriterium 13: scheitert `GET /api/anmerkungen`, nennt der Dialog „Anmerkungen konnten nicht bestimmt werden“, Enter beendet trotzdem', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]]);
    await gr.oberflaecheOeffnen(page, lauf);
    await page.route('**/api/anmerkungen', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"meldung":"kaputt"}' }));

    await gr.beendenDialogOeffnen(page);
    await expect(gr.beendenDialogZeilen(page).first()).toHaveText('Anmerkungen konnten nicht bestimmt werden');

    await page.keyboard.press('Enter');
    await expect(gr.beendetMeldung(page)).toBeVisible();
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
  });

  test('Kriterium 16: `q` öffnet den Dialog „Beenden“ und beendet nichts; im Feld und bei offenem Dialog tut `q` nichts; der Auslöser trägt den Hinweis', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]]);
    await gr.oberflaecheOeffnen(page, lauf);

    await expect(page.locator('#beenden')).toHaveAttribute('aria-keyshortcuts', 'q');
    await page.keyboard.press('q');
    await expect(gr.beendenDialog(page)).toBeVisible();
    await expect(gr.beendenDialogTitel(page)).toHaveText('Review beenden und Ergebnis senden?');
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(gr.ergebnis(lauf)).toBe('');

    await page.keyboard.press('q');
    await expect(gr.beendenDialog(page)).toBeVisible();
    await page.keyboard.press('Escape');

    await page.keyboard.press('f');
    await page.locator('#dateiliste-suche').fill('q');
    await page.keyboard.press('q');
    await expect(gr.beendenDialog(page)).toBeHidden();
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });
});