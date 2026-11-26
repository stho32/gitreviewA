'use strict';
// Der Abschlussschritt vor „Beenden“ (R00041, B4004): der Weg von einem Eintrag zur Datei — Dialog zu, Datei gewählt und
// gezeigt, Lauf weiter; die Einträge sind per Tab erreichbar (Browser-Eigenes: Fokusfalle aus I0028). Die Zahlen prüfen die
// Bausteintests (`abschluss-werte`, `beenden-abschluss-werte`), die Abschnitte gegen Fakes prüft `abschluss-story.spec.js`.
const path = require('path');
const { test, expect, kurz } = require('../dsl/gitreviewa.js');
const hakenSeite = require('../treiber/haken-oberflaeche.js');
const sucheSeite = require('../treiber/dateisuche-oberflaeche.js');
const fremdeNamen = require('../treiber/fremde-namen-repo.js');

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

  // PO 2026-11-26 (#50, Zeile 270): eine aktive Dateisuche (R00049) ist der dritte Grund derselben Sicht; der Eintrag trägt den
  // Vermerk „ausgeblendet“, der Klick führt trotzdem zur Datei, die Suche bleibt stehen und der Hinweis erklärt es.
  test('PO 270: eine durch die Dateisuche verdeckte Datei trägt den Vermerk; der Klick wählt sie, die Suche bleibt', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1, repo.hashes.z2, repo.hashes.z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufDateizeilenWarten(page, 3);

    await sucheSeite.sucheEingeben(page, 'src');
    await gr.aufDateizeilenWarten(page, 2);

    await gr.beendenDialogOeffnen(page);

    await expect(gr.beendenAbschnittTitel(page, 'nicht-angesehen')).toHaveText('Nicht angesehen (3)');
    await expect(gr.beendenEintraege(page).nth(0)).toHaveText('README.md ausgeblendet');
    await expect(gr.beendenEintraege(page).nth(1)).toHaveText('src/a.txt');

    await gr.beendenEintraege(page).nth(0).click();

    await expect(gr.beendenDialog(page)).toBeHidden();
    await expect(page.locator('#diff .diff-pfad')).toHaveText('README.md');
    await expect(sucheSeite.feld(page)).toHaveValue('src');
    await expect(gr.abgehakteHinweis(page)).toHaveText('Die gewählte Datei ist ausgeblendet');
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });

  // A2 aus dem Code-Review (#50): derselbe Vermerk bei verdeckender Sicht durch den Schalter „Abgehakte ausblenden“ (R00029).
  test('A2: eine durch „Abgehakte ausblenden“ verdeckte Datei trägt den Vermerk und wird beim Betätigen gezeigt', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1, repo.hashes.z2, repo.hashes.z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufDateizeilenWarten(page, 3);

    await hakenSeite.kaestchenMitPfadBetaetigen(page, 'README.md');
    await gr.abgehakteSchalterBetatigen(page);
    await gr.aufDateizeilenWarten(page, 2);

    await gr.beendenDialogOeffnen(page);

    await expect(gr.beendenAbschnittTitel(page, 'nicht-angesehen')).toHaveText('Nicht angesehen (3)');
    await expect(gr.beendenEintraege(page).nth(0)).toHaveText('README.md ausgeblendet');

    await gr.beendenEintraege(page).nth(0).click();

    await expect(gr.beendenDialog(page)).toBeHidden();
    await expect(gr.dateizeilen(page)).toHaveCount(3);
    await expect(gr.abgehakteSchalter(page)).not.toBeChecked();
    await gr.pruefeGewaehlteDateien(page, ['README.md']);
    await expect(gr.abgehakteHinweis(page)).toHaveText('');
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });

  // A3 aus dem Code-Review (#50, AI-Team/gelerntes #16/#17): fremde Namen erscheinen im Dialog als gerenderter Text mit Marken —
  // unsichtbare Zeichen und ungültige Bytes, und der Namensschlüssel des Eintrags trägt dieselben Marken.
  test('A3: Namen mit U+202E, U+200B und ungültigem Byte erscheinen im Dialog mit Marken', async ({ gr, page }) => {
    const repo = gr.gemerktesRepo(fremdeNamen.repoMitMarken(path.join(gr.eigenerOrdner(), 'repo-marken')));
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.m1, repo.hashes.m2]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufDateizeilenWarten(page, 3);

    await gr.beendenDialogOeffnen(page);

    await expect(gr.beendenEintraege(page)).toHaveText([
      'a⟨U+202E⟩.txt',
      'b⟨U+200B⟩.txt',
      'f⟨0xFF⟩.txt',
    ]);
    await expect(gr.beendenEintraege(page).nth(2)).toHaveAttribute('data-pfad', 'f⟨0xFF⟩.txt');
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });
});
