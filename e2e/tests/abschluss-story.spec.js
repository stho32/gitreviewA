'use strict';
// Der Abschlussschritt gegen Repo N plus `v` und den Commit mit 2 000 Dateien (R00041, B4005): gesperrte Stellen stehen
// nicht unter „Nicht angesehen“ (sie stehen schon als ungeprüft mit Grund im Ergebnistext), eine per Muster ausgeblendete
// Datei trägt den Vermerk und wird beim Betätigen gezeigt; bei 2 000 Dateien zeigt der Abschnitt 20 Einträge und den Rest,
// der Dialog bleibt im Fenster und steht binnen der groben Abschluss-Schranke von 15 s (Kriterien 5 und 6).
const { test, expect } = require('../dsl/gitreviewa.js');
const { anzeigeSchrankeMs, abschlussDialogSchrankeMs, erwarteBinnenAbschlussSchranke } = require('../dsl/schranken.js');

/** Die Zeilen des Ergebnistextes zu gesperrten Stellen (R00014: `- <Pfad> (Commit <Hash>) — <Sperrgrund>`). */
function gesperrtePfade(ergebnis) {
  return ergebnis
    .split('\n')
    .filter(zeile => zeile.includes(' — Diff nicht lesbar:'))
    .map(zeile => zeile.replace(/^- /, '').replace(/ \(Commit [^)]+\) — .*$/, ''));
}

test.describe('Abschlussschritt — gesperrt, ausgeblendet, Lastprofil (B4005)', () => {
  test('Kriterium 5: gesperrte Stellen fehlen unter „Nicht angesehen“ und stehen mit Grund im Ergebnistext', async ({ gr, page }) => {
    const repo = gr.repoNMitV();
    const { n, v } = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [n, v]);
    await gr.hakenAnlegen(lauf, { commit: n, datei: 'g.txt', abgehakt: true });
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.beendenDialogOeffnen(page);

    await expect(gr.beendenDialogZeilen(page).nth(1)).toHaveText('8 von 9 Dateien sind nicht abgehakt (3 nicht lesbar).');
    await expect(gr.beendenAbschnittTitel(page, 'nicht-angesehen')).toHaveText('Nicht angesehen (6)');

    const gesperrt = gesperrtePfade(await gr.beendenErgebnisText(page).innerText());
    expect(gesperrt, 'drei gesperrte Stellen im Ergebnistext (R00014)').toHaveLength(3);
    const eintraege = await gr.beendenEintraege(page).allInnerTexts();
    for (const pfad of gesperrt) {
      expect(eintraege, `gesperrte Stelle ${pfad} steht nicht unter „Nicht angesehen“`).not.toContain(pfad);
    }
    expect(eintraege).toHaveLength(6);
    expect(eintraege).toContain('in.txt');
  });

  test('Kriterium 5: eine per Muster ausgeblendete, nie geöffnete Datei trägt den Vermerk und wird gezeigt', async ({ gr, page }) => {
    const repo = gr.repoNMitV();
    const { n, v } = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [n, v]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await gr.musterEingeben(page, 'in.txt');
    await expect(gr.dateizeilen(page)).toHaveCount(8);
    await gr.beendenDialogOeffnen(page);

    const versteckt = gr.beendenEintraege(page).filter({ hasText: 'in.txt' });
    await expect(versteckt).toHaveText('in.txt ausgeblendet');

    await versteckt.click();

    await expect(gr.beendenDialog(page)).toBeHidden();
    await expect(gr.ausblendenMuster(page)).toHaveCount(0);
    await expect(gr.dateizeilen(page)).toHaveCount(9);
    await gr.pruefeGewaehlteDateien(page, ['in.txt']);
    await expect(page.locator('#diff .diff-pfad')).toHaveText('in.txt');
    expect(gr.laeuftNoch(lauf)).toBe(true);
  });

  test('Kriterium 6: bei 2 000 Dateien 20 Einträge, der Rest als Zahl, Dialog im Fenster und binnen der Schranke', async ({ gr, page }) => {
    const repo = gr.repoMitGrossemCommit(1999);
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.u]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufDateizeilenWarten(page, 2000);
    await gr.fensterSetzen(page, 1280, 800);

    const startUmMs = Date.now();
    await gr.beendenDialogOeffnen(page);
    const dauerMs = Date.now() - startUmMs;

    erwarteBinnenAbschlussSchranke(dauerMs, 'Abschlussdialog mit 2 000 nicht angesehenen Dateien');
    await expect(gr.beendenAbschnittTitel(page, 'nicht-angesehen')).toHaveText('Nicht angesehen (2000)');
    await expect(gr.beendenEintraege(page)).toHaveCount(20);
    await expect(gr.beendenAbschnittMehr(page)).toHaveText('… und 1980 weitere');

    const rahmen = await gr.beendenDialog(page).boundingBox();
    expect(rahmen.y, 'Dialog beginnt im Fenster').toBeGreaterThanOrEqual(0);
    expect(rahmen.y + rahmen.height, 'Dialog endet im Fenster (800 px)').toBeLessThanOrEqual(800);
    await expect(gr.beendenDialogKnopf(page, 'Beenden (Enter)')).toBeVisible();
    expect(anzeigeSchrankeMs).toBe(5000);
    expect(abschlussDialogSchrankeMs).toBe(15000);
  });
});
