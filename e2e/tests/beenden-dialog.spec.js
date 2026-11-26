'use strict';
// Dialoge „Beenden“ und „Abbrechen“ (R00050, B4602): der modale Dialog mit Fokusfalle, Scrim, Enter und Esc; was nur im
// Browser prüfbar ist (Fokus, Tasten, Inert). Die Zahlen prüfen die Akzeptanztests in `beenden-dialog-story.spec.js`.
const { test, expect } = require('../dsl/gitreviewa.js');

test.describe('Dialog Beenden und Abbrechen (B4602)', () => {
  test('Kriterium 1: „Beenden“ öffnet den Dialog mit Titel, Zeilen, Knöpfen; der Prozess läuft und der Fokus steht im Dialog', async ({ gr, page }) => {
    const repo = gr.repoMitDateien({ 'README.md': 'Zeile 1\n', 'src/a.txt': 'a\nb\n', 'src/b.txt': 'x\n' });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf);

    await gr.beendenDialogOeffnen(page);

    await expect(gr.beendenDialogTitel(page)).toHaveText('Review beenden und Ergebnis senden?');
    await expect(gr.beendenDialogZeilen(page)).toHaveText([
      'Keine Anmerkungen: die KI erhält ‚Keine Anmerkungen.‘',
      '3 von 3 Dateien sind nicht abgehakt.',
    ]);
    await expect(gr.beendenDialogKnopf(page, 'Zurück (Esc)')).toBeVisible();
    await expect(gr.beendenDialogKnopf(page, 'Beenden (Enter)')).toBeFocused();
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(gr.ergebnis(lauf)).toBe('');
    await expect(page.locator('header.kz')).toHaveAttribute('inert', '');
    await expect(page.locator('main.gr-inhalt')).toHaveAttribute('inert', '');
  });

  test('Kriterium 2: Esc schließt den Dialog, der Fokus kehrt auf den Auslöser zurück, der Lauf geht weiter', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.beendenDialogOeffnen(page);

    await page.keyboard.press('Escape');

    await expect(gr.beendenDialog(page)).toBeHidden();
    await expect(gr.beendenKnopf(page)).toBeFocused();
    expect(gr.laeuftNoch(lauf)).toBe(true);
    await expect(page.locator('header.kz')).not.toHaveAttribute('inert', '');
  });

  test('Kriterium 2: „Zurück“ und ein Klick auf den Scrim schließen den Dialog ohne Wirkung', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf);

    await gr.beendenDialogOeffnen(page);
    await gr.beendenDialogKnopf(page, 'Zurück (Esc)').click();
    await expect(gr.beendenDialog(page)).toBeHidden();
    await expect(gr.beendenKnopf(page)).toBeFocused();

    await gr.beendenDialogOeffnen(page);
    await page.mouse.click(5, 5);
    await expect(gr.beendenDialog(page)).toBeHidden();
    await expect(gr.beendenKnopf(page)).toBeFocused();
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });

  test('Kriterium 8: „Abbrechen“ öffnet denselben Dialog mit „Zurück“ als Vorgabe; Enter schließt ohne Abbruch', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf);

    await gr.abbrechenDialogOeffnen(page);

    await expect(gr.beendenDialogTitel(page)).toHaveText('Review abbrechen?');
    await expect(gr.beendenDialogZeilen(page)).toHaveText(['Die KI erhält kein Ergebnis (stdout bleibt leer, Exit 130).']);
    await expect(gr.beendenDialogKnopf(page, 'Zurück (Esc)')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(gr.beendenDialog(page)).toBeHidden();
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(gr.ergebnis(lauf)).toBe('');
  });

  test('Kriterium 5 (Anschluss I0042): Tab läuft durch die Knöpfe und fragt die Elemente bei jedem Tab neu ab', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.beendenDialogOeffnen(page);

    await page.keyboard.press('Tab');
    await expect(gr.beendenDialogKnopf(page, 'Zurück (Esc)')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(gr.beendenDialogKnopf(page, 'Beenden (Enter)')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(gr.beendenDialogKnopf(page, 'Zurück (Esc)')).toBeFocused();
    await expect(page.locator('header.kz')).toHaveAttribute('inert', '');
  });

  test('Kriterium „Enter wirkt wie der Bestätigungsknopf, solange kein anderer Knopf fokussiert ist“', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf);
    let anforderungen = 0;
    await page.route('**/api/beenden', async route => {
      anforderungen += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"zustand":"beendet"}' });
    });
    await gr.beendenDialogOeffnen(page);

    page.on('pageerror', fehler => console.log('SEITENFEHLER', fehler.message));
    await page.locator('#beenden-dialog').focus();
    await expect(page.locator('#beenden-dialog')).toBeFocused();
    await page.keyboard.press('Enter');

    await expect.poll(() => anforderungen).toBe(1);
  });
});