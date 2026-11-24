'use strict';
const { test, expect } = require('../dsl/gitreviewa.js');

test.describe('Browser', () => {
  test('Szenario 5: der Browserbefehl wird genau einmal mit der Adresse als einzigem Argument aufgerufen', async ({ gr }) => {
    test.fail(true, 'erwartet rot: R00001 im Bau');
    const repo = gr.repoMitCommits();
    const browser = gr.aufzeichnenderBrowser();

    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]], { mitBrowser: true, browserBefehl: browser.befehl });

    await expect.poll(() => browser.aufrufe().length).toBe(1);
    expect((await gr.zustandAbfragen(lauf)).status).toBe(200);
    expect(browser.aufrufe()).toEqual([`1 ${lauf.adresse}`]);
  });

  test('Szenario 6: Browser lässt sich nicht öffnen — Warnung, Startzeile, Server antwortet, Lauf geht weiter', async ({ gr }) => {
    test.fail(true, 'erwartet rot: R00001 im Bau');
    const repo = gr.repoMitCommits();

    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]], { mitBrowser: true, browserBefehl: '/gibt/es/nicht/browser' });

    expect((await gr.zustandAbfragen(lauf)).status).toBe(200);
    await expect.poll(() => gr.stderrZeilen(lauf).filter(zeile => zeile.includes('WARNUNG')).length).toBe(1);
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(lauf.stdout).toBe('');
  });
});
