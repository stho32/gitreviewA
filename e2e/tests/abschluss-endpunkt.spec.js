'use strict';
// Der Abschlussschritt gegen das echte Programm (R00041, B4001/B4005): der Diff-Bereich meldet die gezeigten Stellen, der
// Stand liegt im Server-RAM und überlebt das Neuladen, der neue Endpunkt trägt den Anfrageschutz, ein Fehler beim Melden
// ändert die Anzeige nicht, und stdout bleibt Byte für Byte das Ergebnis (Kriterien 1, 4, 7, 8, 9).
const { test, expect } = require('../dsl/gitreviewa.js');
const { anzeigeSchrankeMs } = require('../dsl/schranken.js');

const LEERES_ERGEBNIS = '# Ergebnis manueller Review\n\nKeine Anmerkungen.\n';

test.describe('Abschlussschritt — Melden und Endpunkt (B4001/B4005)', () => {
  test('Kriterium 1: das Zeigen eines Diffs meldet die Stelle, „Zusammen“ alle Stellen der Datei', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const { z1, z2, z3 } = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [z1, z2, z3]);
    const gemeldet = [];
    page.on('request', anfrage => {
      if (anfrage.url().endsWith('/api/angesehen') && anfrage.method() === 'POST') {
        gemeldet.push(JSON.parse(anfrage.postData()));
      }
    });

    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.dateiMitPfadWaehlen(page, 'src/a.txt');
    await expect(page.locator('#diff .diff-pfad')).toHaveText('src/a.txt');
    await expect.poll(() => gemeldet.length).toBeGreaterThan(0);

    // In „Zusammen“ zeigt der Diff die Datei über alle Commits: gemeldet werden alle ihre Stellen (R00041).
    const gemeldeteStellen = gemeldet.at(-1).stellen;
    expect(new Set(gemeldeteStellen.map(stelle => stelle.commit))).toEqual(new Set([z1, z2, z3]));
    expect(gemeldeteStellen.every(stelle => stelle.datei === 'src/a.txt')).toBe(true);
    const stand = await gr.angesehenAbfragen(lauf);
    expect(JSON.parse(stand.koerper).anzahl).toBe(3);
  });

  test('Kriterium 4: nach dem Neuladen gilt die geöffnete Datei weiter als angesehen (Stand im Server)', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const { z1, z2, z3 } = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [z1, z2, z3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.angesehenMelden(page, () => gr.dateiMitPfadWaehlen(page, 'src/a.txt'));

    await page.reload();

    await gr.beendenDialogOeffnen(page);

    await expect(gr.beendenAbschnittTitel(page, 'nicht-angesehen')).toHaveText('Nicht angesehen (2)');
    await expect(gr.beendenEintraege(page)).toHaveText(['README.md', 'src/b.txt']);
  });

  test('Kriterium 7: der Endpunkt trägt den Anfrageschutz, ein GET setzt nichts, stderr nennt nur die Anzahl', async ({ gr }) => {
    const repo = gr.repoZ();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.z1], { zusatz: ['--verbose'] });
    const stelle = { commit: repo.hashes.z1, datei: 'README.md' };

    const fremdeHerkunft = await gr.angesehenAnfordern(lauf, [stelle], { origin: 'http://evil.example' });
    const falscheMethode = await gr.angesehenAnfordern(lauf, [stelle], { methode: 'PUT' });
    const falscherTyp = await gr.angesehenAnfordern(lauf, [stelle], { inhaltstyp: 'text/plain' });
    const ohneTyp = await gr.angesehenAnfordern(lauf, [stelle], { inhaltstyp: null });
    const zuViele = await gr.angesehenAnfordern(lauf, vieleStellen(repo.hashes.z1, 201));
    const unbekannt = await gr.angesehenAnfordern(lauf, [{ commit: repo.hashes.z1, datei: 'gibt-es-nicht.txt' }]);
    const alsGet = await gr.angesehenAbfragen(lauf);
    const standNachAllen = await gr.angesehenAbfragen(lauf);

    expect([
      fremdeHerkunft.status, falscheMethode.status, falscherTyp.status, ohneTyp.status, zuViele.status, unbekannt.status,
    ]).toEqual([403, 405, 415, 415, 400, 400]);
    expect(alsGet.status).toBe(200);
    expect(JSON.parse(standNachAllen.koerper)).toEqual({ stellen: [], anzahl: 0 });

    const erlaubt = await gr.angesehenAnfordern(lauf, [stelle]);
    const stand = await gr.angesehenAbfragen(lauf);
    expect(erlaubt.status).toBe(200);
    expect(JSON.parse(stand.koerper)).toEqual({ stellen: [{ commit: repo.hashes.z1, datei: 'README.md' }], anzahl: 1 });

    const protokoll = gr.stderrZeilen(lauf).filter(zeile => zeile.includes('[Angesehen]'));
    expect(protokoll.some(zeile => zeile.includes('1 Stellen angesehen'))).toBe(true);
    expect(protokoll.join('\n')).not.toContain('README.md');
    expect(gr.stderrZeilen(lauf).join('\n')).not.toContain('gibt-es-nicht.txt');
  });

  test('Kriterium 8: scheitert das Melden und der Stand, zeigt der Diff keinen Fehler; Enter beendet mit Exit 0', async ({ gr, page }) => {
    const repo = gr.repoZ();
    const { z1, z2, z3 } = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [z1, z2, z3]);
    await page.route('**/api/angesehen', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"meldung":"kaputt"}' }));
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await gr.dateiMitPfadWaehlen(page, 'src/a.txt');
    await expect(page.locator('#diff .diff-pfad')).toHaveText('src/a.txt');
    await expect(page.locator('#diff .diff-meldung')).toHaveText('');

    await gr.beendenDialogOeffnen(page);

    await expect(gr.beendenAbschnitt(page, 'nicht-angesehen').locator('.beenden-abschnitt-text'))
      .toHaveText('Nicht angesehene Dateien konnten nicht bestimmt werden');
    await page.keyboard.press('Enter');

    await expect(gr.beendetMeldung(page)).toBeVisible();
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toBe(LEERES_ERGEBNIS);
  });

  test('Kriterium 9: stdout ist Byte für Byte das Ergebnis ohne diesen Schritt — der Dialog zeigt denselben Text', async ({ gr, page }) => {
    const repo = gr.repoK();
    const lauf = await gr.gitreviewAStarten(repo, [repo.k1, repo.k2]);
    await gr.anmerkungAnlegen(lauf, { commit: repo.k1, datei: 'README.md', text: 'Bitte prüfen' });
    await gr.hakenAnlegen(lauf, { commit: repo.k1, datei: 'README.md', abgehakt: true });
    const erwartetNachHaken = JSON.parse((await gr.ergebnisAbfragen(lauf)).koerper).ergebnis;
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await gr.beendenDialogOeffnen(page);
    await expect(gr.beendenErgebnisText(page)).toHaveText(erwartetNachHaken);
    await expect(gr.beendenAbschnittTitel(page, 'nicht-angesehen')).toHaveText('Nicht angesehen (2)');
    await gr.beendenDialogBestaetigen(page, 'Beenden (Enter)');

    expect(await gr.aufEndeWarten(lauf, anzeigeSchrankeMs)).toBe(0);
    expect(gr.ergebnis(lauf)).toBe(erwartetNachHaken);
    expect(erwartetNachHaken).toContain('Anmerkungen: 1');
  });
});

function vieleStellen(commit, anzahl) {
  const stellen = [];
  for (let nummer = 0; nummer < anzahl; nummer += 1) {
    stellen.push({ commit, datei: `datei-${nummer}.txt` });
  }
  return stellen;
}
