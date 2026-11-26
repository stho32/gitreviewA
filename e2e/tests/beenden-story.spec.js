'use strict';
// Abnahme R00050 „Beenden und Abbrechen im Kopf“ (B4606): die Akzeptanzkriterien über den Weg, den der Mensch geht.
// Repo Z (z1 z2 z3), Repo N plus v (gesperrte Stellen), Commit g (2 000 Dateien); Fenster 1280 × 800 und 812 × 600.
// Die Kriterien 2, 8, 9, 11 (je Richtung), 13 und 16 prüfen `beenden-dialog.spec.js` und `beenden-knoepfe.spec.js`;
// die Endpunkte prüft `tests/GitReviewA.Tests/Beenden/AbbrechenEndpunktTests.cs`.
const { test, expect } = require('../dsl/abbrechen.js');

const KOPFAKTIONEN = '.gr-kopfaktionen > button';

test.describe('R00050 Beenden und Abbrechen im Kopf', () => {
  test('Kriterien 1 und 3: Dialog „Beenden“ nennt Anmerkungen und ungeprüfte Dateien an den Grenzen 0/1/n', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1, repo.hashes.z2, repo.hashes.z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufDateizeilenWarten(page, 3);

    // Ohne Anmerkung und ohne Haken.
    await gr.beendenDialogOeffnen(page);
    await expect(gr.beendenDialogZeilen(page)).toHaveText([
      'Keine Anmerkungen: die KI erhält ‚Keine Anmerkungen.‘',
      '3 von 3 Dateien sind nicht abgehakt.',
    ]);
    await page.keyboard.press('Escape');

    // Genau eine Anmerkung.
    expect((await gr.anmerkungAnlegen(lauf, { commit: repo.hashes.z2, datei: 'src/a.txt', zeile: 2, text: 'Warum ZWEI?' })).status).toBe(201);
    await gr.beendenDialogOeffnen(page);
    await expect(gr.beendenDialogZeilen(page)).toHaveText([
      '1 Anmerkung in 1 Datei geht auf stdout an die aufrufende KI.',
      '3 von 3 Dateien sind nicht abgehakt.',
    ]);
    await page.keyboard.press('Escape');

    // Zwei Anmerkungen in zwei Dateien, eine Datei abgehakt.
    expect((await gr.anmerkungAnlegen(lauf, { commit: repo.hashes.z3, datei: 'README.md', text: 'Veraltet' })).status).toBe(201);
    expect((await gr.hakenAnlegen(lauf, { datei: 'README.md', abgehakt: true })).status).toBe(200);
    await gr.beendenDialogOeffnen(page);
    await expect(gr.beendenDialogZeilen(page)).toHaveText([
      '2 Anmerkungen in 2 Dateien gehen auf stdout an die aufrufende KI.',
      '2 von 3 Dateien sind nicht abgehakt.',
    ]);
    await page.keyboard.press('Escape');

    // Alle Dateien abgehakt.
    expect((await gr.hakenAnlegen(lauf, { datei: 'src/a.txt', abgehakt: true })).status).toBe(200);
    expect((await gr.hakenAnlegen(lauf, { datei: 'src/b.txt', abgehakt: true })).status).toBe(200);
    await gr.beendenDialogOeffnen(page);
    await expect(gr.beendenDialogZeilen(page)).toHaveText([
      '2 Anmerkungen in 2 Dateien gehen auf stdout an die aufrufende KI.',
      'Alle 3 Dateien sind abgehakt.',
    ]);
  });

  // Kriterium 4 nennt wörtlich „9 von 10 Dateien“ — das ist R00014s Stellen-Rechnung (9 + 1 = 10 Stellen). Der
  // product-owner hat für den Dialog „Dateien über die ganze Auswahl, dieselbe Rechnung wie der Zähler in Zusammen“
  // entschieden; die Netto-Liste führt für `n v` neun Dateien (die Umbenennung ist eine, das gesperrte Paar zwei).
  // Die Probe hält beide Rechnungen gegeneinander: der Dialog nennt dieselbe Zahl wie der Zähler im Kopf.
  test('Kriterium 4: Repo N plus v zählt gesperrte Dateien als ungeprüft — der Dialog nennt dieselbe Zahl wie der Zähler in „Zusammen“', async ({ gr, page }) => {
    test.skip(process.platform !== 'linux', 'Namen aus ungültigem UTF-8 legt nur Linux an');
    const repo = gr.repoNMitV();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.n, repo.hashes.v]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    expect((await gr.hakenAnlegen(lauf, { datei: 'g.txt', abgehakt: true })).status).toBe(200);
    await page.reload();
    await gr.aufDateizeilenWarten(page, 9);

    await expect(gr.fortschrittZaehler(page)).toHaveText('1 von 9 Dateien abgehakt (3 nicht lesbar)');
    await gr.beendenDialogOeffnen(page);
    await expect(gr.beendenDialogZeilen(page)).toHaveText([
      'Keine Anmerkungen: die KI erhält ‚Keine Anmerkungen.‘',
      '8 von 9 Dateien sind nicht abgehakt (3 nicht lesbar).',
    ]);
  });

  test('Kriterium 5: die Sicht ändert die Zahl nie — Einzeln, Dateisuche, Muster und „Abgehakte ausblenden“ zeigen dieselbe Rechnung', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1, repo.hashes.z2, repo.hashes.z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufDateizeilenWarten(page, 3);
    expect((await gr.hakenAnlegen(lauf, { datei: 'src/a.txt', abgehakt: true })).status).toBe(200);

    const erwarteteZeile = '2 von 3 Dateien sind nicht abgehakt.';
    const oeffnenUndPruefen = async () => {
      await gr.beendenDialogOeffnen(page);
      await expect(gr.beendenDialogZeilen(page).nth(1)).toHaveText(erwarteteZeile);
      await page.keyboard.press('Escape');
    };

    await oeffnenUndPruefen();
    await gr.modusWaehlen(page, 'einzeln');
    await oeffnenUndPruefen();
    await page.locator('#dateiliste-suche').fill('a');
    await page.locator('#dateiliste-suche').press('Enter');
    await oeffnenUndPruefen();
    await page.locator('#dateiliste-suche').fill('');
    await gr.musterEingeben(page, 'README.md');
    await oeffnenUndPruefen();
    await gr.musterEntfernen(page, 'README.md');
    await gr.abgehakteSchalterBetatigen(page);
    await oeffnenUndPruefen();
  });

  test('Kriterium 6: zwei verschiedene Rohbyte-Namen zählen als zwei Dateien', async ({ gr, page }) => {
    test.skip(process.platform !== 'linux', 'Namen aus ungültigem UTF-8 legt nur Linux an');
    const repo = gr.repoNMitV();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.n, repo.hashes.v]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    expect((await gr.anmerkungAnlegen(lauf, { commit: repo.hashes.n, datei: 'a⟨0xFF⟩.sh', text: 'eins' })).status).toBe(201);
    expect((await gr.anmerkungAnlegen(lauf, { commit: repo.hashes.n, datei: 't⟨0xFE⟩.txt', text: 'zwei' })).status).toBe(201);

    await gr.beendenDialogOeffnen(page);
    await expect(gr.beendenDialogZeilen(page).first()).toHaveText('2 Anmerkungen in 2 Dateien gehen auf stdout an die aufrufende KI.');
  });

  test('Kriterium 7: 2 000 Dateien und 1 000 Haken — der Dialog steht binnen 5 s, nennt die Zahl und passt in beide Fenster', async ({ gr, page }) => {
    test.setTimeout(180000);
    const repo = gr.repoMitGrossemCommit(1999);
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.u]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufDateizeilenWarten(page, 2000);
    for (let nummer = 1; nummer <= 500; nummer += 1) {
      expect((await gr.anmerkungAnlegen(lauf, { commit: repo.u, datei: 'README.md', zeile: nummer, text: `Anmerkung ${nummer}` })).status).toBe(201);
    }
    const abgehakt = ['README.md'];
    for (let nummer = 1; nummer <= 999; nummer += 1) {
      abgehakt.push(`viele/datei-${String(nummer).padStart(4, '0')}.txt`);
    }
    for (const datei of abgehakt) {
      expect((await gr.hakenAnlegen(lauf, { datei, abgehakt: true })).status, datei).toBe(200);
    }

    for (const [breite, hoehe] of [[1280, 800], [812, 600]]) {
      await gr.fensterSetzen(page, breite, hoehe);
      const start = Date.now();
      await gr.beendenDialogOeffnen(page);
      const dauerMs = Date.now() - start;
      expect(dauerMs, `Dialog nach ${dauerMs} ms`).toBeLessThanOrEqual(5000);
      await expect(gr.beendenDialogZeilen(page).nth(1)).toHaveText('1000 von 2000 Dateien sind nicht abgehakt.');
      const rahmen = await gr.beendenDialog(page).boundingBox();
      expect(rahmen.height, `Dialoghöhe ${rahmen.height} bei ${hoehe}`).toBeLessThanOrEqual(hoehe);
      const rollt = await page.locator('#beenden-dialog .beenden-hinweise').evaluate(element => getComputedStyle(element).overflowY);
      expect(rollt).toBe('auto');
      await page.keyboard.press('Escape');
    }
  });

  test('Kriterium 12: fremder Origin, GET und falscher Inhaltstyp werden abgewiesen, ein erlaubter Aufruf bricht ab', async ({ gr, abbruch }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]]);

    const abgewiesen = [
      await gr.abbrechenAnfordern(lauf, { origin: 'http://evil.example' }),
      await gr.abbrechenAnfordern(lauf, { methode: 'GET' }),
      await gr.abbrechenAnfordern(lauf, { inhaltstyp: 'text/plain' }),
      await gr.abbrechenAnfordern(lauf, { inhaltstyp: null }),
    ];

    expect(abgewiesen.map(antwort => antwort.status)).toEqual([403, 405, 415, 415]);
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(gr.ergebnis(lauf)).toBe('');
    expect((await gr.abbrechenAnfordern(lauf)).status).toBe(200);
    await abbruch.sollOhneErgebnisAbgebrochenSein(lauf);
  });

  test('Kriterium 11: zwei Tabs — beide zeigen denselben geltenden Endzustand, der Prozess endet dazu passend', async ({ gr, context, page }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1, repo.hashes.z2, repo.hashes.z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    const zweiterTab = await context.newPage();
    await zweiterTab.goto(lauf.adresse);
    await gr.abbrechenDialogOeffnen(page);
    await expect(gr.beendenDialog(zweiterTab)).toBeHidden();
    await zweiterTab.locator('#beenden').click();
    await expect(gr.beendenDialog(zweiterTab)).toBeVisible();

    await Promise.all([
      gr.beendenDialogBestaetigen(page, 'Abbrechen'),
      gr.beendenDialogBestaetigen(zweiterTab, 'Beenden (Enter)'),
    ]);

    const exitCode = await gr.aufEndeWarten(lauf, 10000);
    const zustand = exitCode === 0 ? 'Review beendet' : 'Review abgebrochen';
    expect([0, 130], `Exit-Code ${exitCode}`).toContain(exitCode);
    await expect(page.getByText(zustand, { exact: true })).toBeVisible();
    await expect(zweiterTab.getByText(zustand, { exact: true })).toBeVisible();
  });

  test('Kriterium 14: Neuladen schließt den Dialog ohne „Seite verlassen?“; die Anmerkung bleibt und Beenden liefert sie', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1, repo.hashes.z2, repo.hashes.z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    expect((await gr.anmerkungAnlegen(lauf, { commit: repo.hashes.z2, datei: 'src/a.txt', zeile: 2, text: 'bleibt' })).status).toBe(201);
    const keineDialoge = gr.dialogeZaehlen(page);
    await gr.beendenDialogOeffnen(page);

    await page.reload();

    await expect(gr.beendenDialog(page)).toBeHidden();
    await keineDialoge();
    await gr.beendenBetaetigen(page);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toContain('> bleibt\n');
  });

  test('Kriterium 15: der Kopf bleibt eine Zeile, die drei Aktionen sind ganz sichtbar, der Zähler trägt seinen vollen Text im Namen', async ({ gr, page }) => {
    const repo = gr.repoMitVielenCommits(60);
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufDateizeilenWarten(page, 1);

    const hoehen = [];
    for (const [breite, hoehe] of [[1280, 800], [812, 600]]) {
      await gr.fensterSetzen(page, breite, hoehe);
      hoehen.push((await page.locator('header.kz').boundingBox()).height);
      await expect(page.locator(KOPFAKTIONEN)).toHaveCount(3);
      for (const id of ['ergebnis-kopieren', 'abbrechen', 'beenden']) {
        const rahmen = await page.locator(`#${id}`).boundingBox();
        expect(rahmen.x + rahmen.width, `${id} ganz sichtbar bei ${breite}px`).toBeLessThanOrEqual(breite + 1);
      }
      const zahlen = page.locator('#kopf-zahlen');
      await expect(zahlen).toHaveAttribute('title', await zahlen.textContent());
    }
    expect(hoehen[0]).toBe(hoehen[1]);
  });
});