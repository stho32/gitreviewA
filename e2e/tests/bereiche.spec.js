'use strict';
const { test, expect } = require('../dsl/auswahl.js');

test.describe('Auswahl über Bereiche', () => {
  test('Szenario 1: soll für b..e die Commits e, d, c zeigen und für HEAD~2.. die Commits e, d', async ({ auswahl }) => {
    const { repo, b, c, d, e } = auswahl.verlaufAbisE();

    expect(await auswahl.gezeigteCommits(await auswahl.bereicheReviewen(repo, [`${b}..${e}`]))).toEqual([e, d, c]);
    expect(await auswahl.gezeigteCommits(await auswahl.bereicheReviewen(repo, ['HEAD~2..']))).toEqual([e, d]);
  });

  test('Szenario 2: soll bei Zweig und Merge dieselbe Liste zeigen wie git rev-list', async ({ auswahl }) => {
    const { repo, a, m } = auswahl.verlaufMitMerge();
    const bereich = `${a}..${m}`;

    const gezeigt = await auswahl.gezeigteCommits(await auswahl.bereicheReviewen(repo, [bereich]));

    expect(gezeigt).toHaveLength(4);
    expect(gezeigt).toEqual(auswahl.listeVonGit(repo, bereich));
  });

  test('Szenario 3: soll für main..feature und bei ausgechecktem main für ..feature die Commits f2, f1 zeigen', async ({ auswahl }) => {
    const { repo, f1, f2 } = auswahl.zweigNebenMain();

    expect(await auswahl.gezeigteCommits(await auswahl.bereicheReviewen(repo, ['main..feature']))).toEqual([f2, f1]);
    expect(await auswahl.gezeigteCommits(await auswahl.bereicheReviewen(repo, ['..feature']))).toEqual([f2, f1]);
  });

  test('Szenario 4: soll zwei Bereiche zu einer Auswahl vereinigen, neuester zuerst', async ({ auswahl }) => {
    const { repo, a, b, d, e } = auswahl.verlaufAbisE();

    const lauf = await auswahl.bereicheReviewen(repo, [`${a}..${b}`, `${d}..${e}`]);

    expect(await auswahl.gezeigteCommits(lauf)).toEqual([e, b]);
  });

  test('Szenario 4: soll bei gleichen Commit-Zeiten für a..b d..e und d..e a..b dieselbe Auswahl e, b zeigen', async ({ auswahl }) => {
    const { repo, a, b, d, e } = auswahl.verlaufAbisEZurSelbenZeit();

    const abZuerst = await auswahl.gezeigteCommits(await auswahl.bereicheReviewen(repo, [`${a}..${b}`, `${d}..${e}`]));
    const deZuerst = await auswahl.gezeigteCommits(await auswahl.bereicheReviewen(repo, [`${d}..${e}`, `${a}..${b}`]));

    expect(abZuerst).toEqual([e, b]);
    expect(deZuerst).toEqual([e, b]);
  });

  test('Szenario 4: soll bei Zweig, Merge und gleichen Commit-Zeiten zwei Bereiche wie git ordnen, Kind vor Eltern', async ({ auswahl }) => {
    const { repo, a, f1, f2, m } = auswahl.verlaufMitMergeZurSelbenZeit();

    const featureZuerst = await auswahl.gezeigteCommits(await auswahl.bereicheReviewen(repo, [`${a}..${f2}`, `${f2}..${m}`]));
    const mergeZuerst = await auswahl.gezeigteCommits(await auswahl.bereicheReviewen(repo, [`${f2}..${m}`, `${a}..${f2}`]));

    expect(featureZuerst).toEqual(auswahl.listeVonGitNeuesteZuerst(repo, `${a}..${m}`));
    expect(mergeZuerst).toEqual(featureZuerst);
    expect(featureZuerst.indexOf(m)).toBeLessThan(featureZuerst.indexOf(f2));
    expect(featureZuerst.indexOf(f2)).toBeLessThan(featureZuerst.indexOf(f1));
  });

  const unzulaessig = [
    ({ a, b }) => [`${a}...${b}`],
    () => ['--output=pwn..HEAD'],
    () => ['HEAD..--output=pwn'],
    () => ['HEAD@{1}..HEAD'],
    () => ['main^{/x}..HEAD'],
    () => ['HEAD:f..HEAD'],
    () => ['a..b..c'],
    () => ['..'],
    () => ['-x..HEAD'],
    () => ['HEAD; touch pwn..HEAD'],
    ({ a, b, c }) => [`${a}..${b}`, c],
  ];
  for (const [nummer, aufruf] of unzulaessig.entries()) {
    test(`Szenario 6.${nummer + 1}: soll einen unzulässigen Bereich abweisen, ohne Server, ohne git und ohne Datei pwn`, async ({ auswahl }) => {
      const verlauf = auswahl.verlaufAbisE();

      const abweisung = await auswahl.aufrufOhneGitErwarten(verlauf.repo, aufruf(verlauf));

      expect(abweisung.exitCode).not.toBe(0);
      expect(abweisung.meldung).not.toBe('');
      expect(abweisung.serverGestartet).toBe(false);
      expect(abweisung.gitGestartet).toBe(false);
      expect(auswahl.dateiPwnExistiert(verlauf.repo)).toBe(false);
    });
  }

  test('Szenario 6, Positivkontrolle: ein zulässiger Bereich erreicht git', async ({ auswahl }) => {
    const { repo, b, e } = auswahl.verlaufAbisE();

    const abweisung = await auswahl.aufrufOhneGitErwarten(repo, [`${b}..${e}`]);

    expect(abweisung.gitGestartet).toBe(true);
  });

  test('Szenario 9: soll bei fremder Signaturkonfiguration den Bereich zeigen, ohne das Programm des Repos zu starten', async ({ auswahl }) => {
    const verlauf = auswahl.verlaufMitSignaturMarker();

    const gezeigt = await auswahl.gezeigteCommits(await auswahl.bereicheReviewen(verlauf.repo, [`${verlauf.a}..HEAD`]));

    expect(gezeigt).toEqual([verlauf.signiert]);
    expect(verlauf.markerExistiert()).toBe(false);
    verlauf.signaturMitGitPruefen();
    expect(verlauf.markerExistiert()).toBe(true);
  });
});
