'use strict';
// Der Abschlussschritt vor „Beenden“ (R00041, B4004): der Weg von einem Eintrag zur Datei — Dialog zu, Datei gewählt und
// gezeigt, Lauf weiter; die Einträge sind per Tab erreichbar (Browser-Eigenes: Fokusfalle aus I0028). Die Zahlen prüfen die
// Bausteintests (`abschluss-werte`, `beenden-abschluss-werte`), die Abschnitte gegen Fakes prüft `abschluss-story.spec.js`.
const { test, expect, kurz } = require('../dsl/gitreviewa.js');

test.describe('Abschlussschritt — Weg zur Datei (B4004)', () => {
  test('Kriterium 1/2: ein Eintrag schließt den Dialog, wählt die Datei und zeigt ihren Diff; der Lauf läuft weiter', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const { z1, z2, z3 } = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [z1, z2, z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await gr.angesehenMelden(page, () => gr.dateiMitPfadWaehlen(page, 'src/a.txt'));

    await gr.beendenDialogOeffnen(page);
    await expect(gr.beendenAbschnittTitel(page, 'nicht-angesehen')).toHaveText('Nicht angesehen (2)');
    await expect(gr.beendenEintraege(page)).toHaveText(['README.md', 'src/b.txt']);

    await gr.beendenEintraege(page).filter({ hasText: 'src/b.txt' }).click();

    await expect(gr.beendenDialog(page)).toBeHidden();
    await gr.pruefeGewaehlteDateien(page, ['src/b.txt']);
    await expect(page.locator('#diff .diff-pfad')).toHaveText('src/b.txt');
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(gr.ergebnis(lauf)).toBe('');

    await gr.beendenDialogOeffnen(page);

    await expect(gr.beendenAbschnittTitel(page, 'nicht-angesehen')).toHaveText('Nicht angesehen (1)');
    await expect(gr.beendenEintraege(page)).toHaveText(['README.md']);
  });

  test('Anschluss I0042: die Einträge des Abschlussschritts sind per Tab erreichbar, der Fokus bleibt im Dialog', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1, repo.hashes.z2, repo.hashes.z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.beendenDialogOeffnen(page);

    await page.keyboard.press('Tab');

    await expect(gr.beendenEintraege(page).first()).toBeFocused();
    const anzahl = await gr.beendenEintraege(page).count();
    for (let schritt = 0; schritt < anzahl + 3; schritt += 1) {
      await page.keyboard.press('Tab');
    }
    const fokusImDialog = await page.evaluate(() => document.getElementById('beenden-dialog').contains(document.activeElement));
    expect(fokusImDialog, 'Der Fokus bleibt bei jedem Tab im Dialog').toBe(true);
  });

  test('Kriterium 5: eine per Muster ausgeblendete Datei trägt den Vermerk und wird beim Betätigen gezeigt', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1, repo.hashes.z2, repo.hashes.z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await gr.musterEingeben(page, 'src/*');

    await expect(gr.dateizeilen(page)).toHaveCount(1);
    await gr.beendenDialogOeffnen(page);

    await expect(gr.beendenAbschnittTitel(page, 'nicht-angesehen')).toHaveText('Nicht angesehen (3)');
    await expect(gr.beendenEintraege(page).nth(1)).toHaveText('src/a.txt ausgeblendet');

    await gr.beendenEintraege(page).nth(1).click();

    await expect(gr.beendenDialog(page)).toBeHidden();
    await expect(gr.dateizeilen(page)).toHaveCount(3);
    await gr.pruefeGewaehlteDateien(page, ['src/a.txt']);
    await expect(page.locator('#diff .diff-pfad')).toHaveText('src/a.txt');
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });

  test('Kriterium 2 (Einzeln): ein Eintrag aus einem anderen Commit wechselt den Commit und zeigt die Stelle', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const { z1, z2, z3 } = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [z1, z2, z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await gr.commitWaehlen(page, kurz(z3));
    await gr.angesehenMelden(page, () => gr.dateiMitPfadWaehlen(page, 'src/a.txt'));

    await gr.beendenDialogOeffnen(page);

    const eintraege = gr.beendenEintraege(page);
    await expect(eintraege).toHaveCount(5);
    await eintraege.filter({ hasText: 'README.md' }).first().click();

    await expect(gr.beendenDialog(page)).toBeHidden();
    await gr.pruefeGewaehlterCommit(page, kurz(z1));
    await gr.pruefeGewaehlteDateien(page, ['README.md']);
    await expect(page.locator('#diff .diff-pfad')).toHaveText('README.md');
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });
});
