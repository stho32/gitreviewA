'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../dsl/gitreviewa.js');

test.describe('Eingabe an git', () => {
  for (const argument of ['--upload-pack=x', 'HEAD; touch pwn', 'zzzz', 'abc', 'a'.repeat(65), '-abcd']) {
    test(`Szenario 7: »${argument}« endet mit Fehler, ohne Server und ohne git`, async ({ gr }) => {
      test.fail(true, 'erwartet rot: R00001 im Bau');
      const repo = gr.repoMitCommits();
      const attrappe = gr.gitAttrappe();

      const lauf = gr.gitreviewAAufrufen(repo, [argument], { pfadVorne: attrappe.ordner });
      const exitCode = await gr.aufrufBeendet(lauf);

      expect(exitCode).not.toBe(0);
      expect(gr.stderrZeilen(lauf).length).toBeGreaterThan(0);
      expect(lauf.stderr).not.toContain('http://127.0.0.1');
      expect(fs.existsSync(path.join(repo.ordner, 'pwn'))).toBe(false);
      expect(attrappe.wurdeGestartet()).toBe(false);
      expect(lauf.stdout).toBe('');
    });
  }

  test('Szenario 7, Positivkontrolle: ein gültiger Hash erreicht die git-Attrappe', async ({ gr }) => {
    test.fail(true, 'erwartet rot: R00001 im Bau');
    const repo = gr.repoMitCommits();
    const attrappe = gr.gitAttrappe();

    const lauf = gr.gitreviewAAufrufen(repo, [repo.hashes[0]], { pfadVorne: attrappe.ordner });
    await gr.aufrufBeendet(lauf);

    expect(attrappe.wurdeGestartet()).toBe(true);
  });
});
