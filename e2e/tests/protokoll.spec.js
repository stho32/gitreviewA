'use strict';
const { test, expect } = require('../dsl/gitreviewa.js');

const PROTOKOLLZEILE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2} (DEBUG|INFO|WARNUNG|FEHLER) \[[^\]]+\] .+$/;

test.describe('Logging nach Stufe', () => {
  test('Szenario 8, Standard: stderr hat genau die Startzeile mit Zeit, Stufe und Kontext', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]]);

    expect((await gr.commitsAbfragen(lauf)).status).toBe(200);
    await gr.laufAbbrechen(lauf);

    const zeilen = gr.stderrZeilen(lauf);
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0]).toMatch(PROTOKOLLZEILE);
    expect(zeilen[0]).toContain(lauf.adresse);
    expect(lauf.stdout).toBe('');
  });

  test('Szenario 8, --quiet: stderr bleibt leer', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const port = await gr.freierPort();
    const lauf = gr.gitreviewAAufrufen(repo, [repo.hashes[0], '--quiet', '--port', String(port)]);
    lauf.adresse = `http://127.0.0.1:${port}/`;

    await expect.poll(() => gr.commitsStatusOderNull(lauf)).toBe(200);
    await gr.laufAbbrechen(lauf);

    expect(lauf.stderr).toBe('');
    expect(lauf.stdout).toBe('');
  });

  test('Szenario 8, --verbose: Debug-Zeile je Anfrage', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]], { zusatz: ['--verbose'] });

    expect((await gr.commitsAbfragen(lauf)).status).toBe(200);
    await gr.laufAbbrechen(lauf);

    const debugZeilen = gr.stderrZeilen(lauf).filter(zeile => zeile.includes(' DEBUG ') && zeile.includes('GET /api/commits'));
    expect(debugZeilen).toHaveLength(1);
    expect(debugZeilen[0]).toMatch(PROTOKOLLZEILE);
    for (const zeile of gr.stderrZeilen(lauf)) {
      expect(zeile).toMatch(PROTOKOLLZEILE);
    }
    expect(lauf.stdout).toBe('');
  });
});
