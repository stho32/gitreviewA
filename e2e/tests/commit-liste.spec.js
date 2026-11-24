'use strict';
const { test, expect, kurz } = require('../dsl/gitreviewa.js');

test.describe('Commit-Liste', () => {
  test('Szenario 2: die Oberfläche zeigt genau die übergebenen Commits in Aufrufreihenfolge', async ({ gr, page }) => {
    test.fail(true, 'erwartet rot: R00001 im Bau');
    const repo = gr.repoMitCommits();
    const [a, , c] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [c, a]);

    await gr.oberflaecheOeffnen(page, lauf);

    await expect(gr.commitZeilen(page)).toHaveCount(2);
    expect(await gr.commitZeilenLesen(page)).toEqual([
      { kurzHash: kurz(c), betreff: 'Dritter Commit' },
      { kurzHash: kurz(a), betreff: 'Erster Commit' },
    ]);
  });

  test('Szenario 3: Betreff mit HTML steht als Text, kein Skript läuft', async ({ gr, page }) => {
    test.fail(true, 'erwartet rot: R00001 im Bau');
    const repo = gr.repoMitCommits(['Erster Commit', '<script>alert(1)</script>', '<img src=x onerror=alert(2)>']);
    const [, d, e] = repo.hashes;
    let dialoge = 0;
    page.on('dialog', dialog => { dialoge += 1; dialog.dismiss(); });
    const lauf = await gr.gitreviewAStarten(repo, [d, e]);

    await gr.oberflaecheOeffnen(page, lauf);

    await expect(gr.commitZeilen(page)).toHaveCount(2);
    expect(await gr.commitZeilenLesen(page)).toEqual([
      { kurzHash: kurz(d), betreff: '<script>alert(1)</script>' },
      { kurzHash: kurz(e), betreff: '<img src=x onerror=alert(2)>' },
    ]);
    expect(dialoge).toBe(0);
    await page.evaluate(() => alert('Positivkontrolle'));
    expect(dialoge).toBe(1);
  });

  test('Szenario 9: 200 Commits sind spätestens 2 s nach dem Prozessstart sichtbar', async ({ gr, page }) => {
    test.fail(true, 'erwartet rot: R00001 im Bau');
    const betreffe = Array.from({ length: 200 }, (_, index) => `Commit Nummer ${index + 1}`);
    const repo = gr.repoMitCommits(betreffe);
    await page.goto('about:blank');

    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.aufZeilenWarten(page, 200);
    const dauerMs = Date.now() - lauf.gestartetUmMs;

    test.info().annotations.push({ type: 'Messwert', description: `200 Zeilen nach ${dauerMs} ms (Grenze 2000 ms)` });
    console.log(`Messwert Szenario 9: 200 Zeilen sichtbar nach ${dauerMs} ms`);
    expect(dauerMs).toBeLessThanOrEqual(2000);
    const zeilen = await gr.commitZeilenLesen(page);
    expect(zeilen[199]).toEqual({ kurzHash: repo.hashes[199].slice(0, 7), betreff: 'Commit Nummer 200' });
  });

  test('Szenario 10: GET / liefert die eingebettete Oberfläche', async ({ gr }) => {
    test.fail(true, 'erwartet rot: R00001 im Bau');
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]]);

    const antwort = await gr.startseiteAbfragen(lauf);

    expect(antwort.status).toBe(200);
    expect(antwort.koerper).toContain('id="commit-liste"');
  });
});
