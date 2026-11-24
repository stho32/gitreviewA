'use strict';
const { test, expect } = require('../dsl/gitreviewa.js');

test.describe('Aufruf und Server', () => {
  test('Szenario 1: Start mit zwei Commits — Startzeile, Zustand 200, stdout leer, läuft nach 5 s', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a, , c] = repo.hashes;

    const lauf = await gr.gitreviewAStarten(repo, [c, a]);

    expect(lauf.adresse).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    expect((await gr.zustandAbfragen(lauf)).status).toBe(200);
    await gr.bisSekundenNachStart(lauf, 5);
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(lauf.stdout).toBe('');
  });

  test('Szenario 4: zwei Läufe ohne --port — verschiedene Ports, nur 127.0.0.1, fremder Host abgewiesen', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;

    const [erster, zweiter] = await Promise.all([gr.gitreviewAStarten(repo, [a]), gr.gitreviewAStarten(repo, [a])]);

    expect(gr.portVon(erster)).not.toBe(gr.portVon(zweiter));
    for (const lauf of [erster, zweiter]) {
      const adressen = gr.lauschendeAdressen(lauf);
      expect(adressen).toEqual([`127.0.0.1:${gr.portVon(lauf)}`]);
      expect((await gr.zustandAbfragen(lauf, 'fremd.example')).status).toBeGreaterThanOrEqual(400);
      expect((await gr.zustandAbfragen(lauf, 'fremd.example')).status).toBeLessThan(500);
      expect((await gr.zustandAbfragen(lauf, `127.0.0.1:${gr.portVon(lauf)}`)).status).toBe(200);
    }
  });
});
