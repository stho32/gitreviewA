'use strict';
const { test, expect } = require('../dsl/gitreviewa.js');

const UEBERSCHRIFT = '# Ergebnis manueller Review';

/** Das Beispiel der Anforderung R00020 (Kriterium 2) für Repo K, UTF-8 mit LF. */
function beispiel(k1, k2) {
  return [
    UEBERSCHRIFT, '', 'Anmerkungen: 1', '',
    '## 1. a.txt:2', '', `Commit: ${k2}`, '', '> Warum groß?', '',
    '## Dateien', '', 'Abgehakt: 1 von 3', '', `- README.md (Commit ${k1})`, '',
    'Ungeprüft: 2 von 3', '', `- a.txt (Commit ${k1})`, `- a.txt (Commit ${k2})`,
  ].join('\n') + '\n';
}

function gleichInBytes(links, rechts) {
  return Buffer.from(links, 'utf8').equals(Buffer.from(rechts, 'utf8'));
}

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
    // R00050: der Kopf trägt drei Aktionen in dieser Reihenfolge; „Beenden“ trägt den Hinweis `q` als `<kbd>` im Namen.
    expect(await page.locator('.gr-kopfaktionen button').evaluateAll(knoepfe => knoepfe.map(knopf => knopf.id))).toEqual(['ergebnis-kopieren', 'abbrechen', 'beenden']);

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

  test('US-6: der Knopf legt das Ergebnis in die Zwischenablage, meldet „Ergebnis kopiert“, der Lauf läuft weiter, stdout nach dem Beenden ist Byte für Byte die Kopie', async ({ gr, page }) => {
    const repo = gr.repoK();
    const lauf = await gr.gitreviewAStarten(repo, [repo.k1, repo.k2]);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.anmerkungAnlegen(lauf, { commit: repo.k2, datei: 'a.txt', zeile: 2, text: 'Warum groß?' });
    const haken = await gr.hakenAnlegen(lauf, { commit: repo.k1, datei: 'README.md', abgehakt: true });
    expect([haken.status, haken.abgehakt]).toEqual([200, 1]);

    await gr.ergebnisKopierenBetaetigen(page);

    await expect(gr.kopierenStatus(page)).toHaveText('Ergebnis kopiert');
    const zwischenablage = await page.evaluate(() => navigator.clipboard.readText());
    expect(gleichInBytes(zwischenablage, beispiel(repo.k1, repo.k2))).toBe(true);
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(gr.ergebnis(lauf)).toBe('');

    await gr.commitWaehlen(page, repo.k1.slice(0, 7));
    await gr.aufDateizeilenWarten(page, 2);

    await gr.beendenBetaetigen(page);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gleichInBytes(gr.ergebnis(lauf), zwischenablage)).toBe(true);
    await expect(gr.ergebnisKopierenKnopf(page)).toHaveCount(0);
  });

  test('US-7: ohne Clipboard-API und bei Verweigerung eine klare Meldung, kein Ergebnis in der Seite oder auf stdout; ohne Sperre kopiert der Knopf', async ({ gr, page }) => {
    const repo = gr.repoK();
    const lauf = await gr.gitreviewAStarten(repo, [repo.k1, repo.k2]);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await gr.anmerkungAnlegen(lauf, { commit: repo.k2, datei: 'a.txt', zeile: 1, text: 'Kopierprobe' });
    const ergebnisUeberDieSchnittstelle = await gr.ergebnisAbfragen(lauf);
    expect(ergebnisUeberDieSchnittstelle.koerper).toContain('Kopierprobe');

    const ohneApi = await page.context().newPage();
    await ohneApi.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => undefined, configurable: true });
    });
    await ohneApi.goto(lauf.adresse);
    await gr.ergebnisKopierenBetaetigen(ohneApi);
    await expect(gr.kopierenStatus(ohneApi)).toHaveText('Kopieren nicht möglich: Zwischenablage nicht verfügbar');
    // R00037 loest die alte Zusage „die Seite zeigt den Ergebnisinhalt nirgends“ ab: die Ergebnis-Spalte zeigt ihn jetzt.
    await expect(ohneApi.locator('#ergebnis-text')).toContainText('Kopierprobe');
    expect(gr.ergebnis(lauf)).toBe('');
    expect(gr.laeuftNoch(lauf)).toBe(true);
    await ohneApi.close();

    const verweigert = await page.context().newPage();
    await verweigert.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'clipboard', {
        get: () => ({ writeText: () => Promise.reject(new DOMException('blocked', 'NotAllowedError')) }),
        configurable: true,
      });
    });
    await verweigert.goto(lauf.adresse);
    await gr.ergebnisKopierenBetaetigen(verweigert);
    await expect(gr.kopierenStatus(verweigert)).toHaveText('Kopieren nicht möglich: Zwischenablage verweigert');
    await expect(verweigert.locator('#ergebnis-text')).toContainText('Kopierprobe');
    expect(gr.ergebnis(lauf)).toBe('');
    expect(gr.laeuftNoch(lauf)).toBe(true);
    await verweigert.close();

    const ohneSperre = await page.context().newPage();
    await ohneSperre.goto(lauf.adresse);
    await gr.ergebnisKopierenBetaetigen(ohneSperre);
    await expect(gr.kopierenStatus(ohneSperre)).toHaveText('Ergebnis kopiert');
    await ohneSperre.close();
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