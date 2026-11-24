'use strict';
const { test, expect } = require('../dsl/auswahl.js');

test.describe('Auswahl über stdin', () => {
  test('Szenario 5: soll die Ausgabe von git rev-list b..e wie den Bereich b..e zeigen', async ({ auswahl }) => {
    const { repo, b, c, d, e } = auswahl.verlaufAbisE();

    const lauf = await auswahl.ueberStdinReviewen(repo, auswahl.listeVonGit(repo, `${b}..${e}`));

    expect(await auswahl.gezeigteCommits(lauf)).toEqual([e, d, c]);
  });

  test('Szenario 5: soll die Reihenfolge der Eingabe behalten, Leerzeilen und Windows-Zeilenenden übergehen und Doppelte einmal zeigen', async ({ auswahl }) => {
    const { repo, a, c } = auswahl.verlaufAbisE();

    const lauf = await auswahl.ueberStdinReviewen(repo, [c, '', a, c], { zeilenende: '\r\n' });

    expect(await auswahl.gezeigteCommits(lauf)).toEqual([c, a]);
  });

  test('Szenario 7: soll eine ungültige Zeile mit ihrer Nummer melden, nicht mit ihrem Text', async ({ auswahl }) => {
    const { repo, a, c } = auswahl.verlaufAbisE();

    const abweisung = await auswahl.stdinOhneGitErwarten(repo, [a, 'zzzz', c]);

    expect(abweisung.exitCode).not.toBe(0);
    expect(abweisung.meldung).toContain('Zeile 2');
    expect(abweisung.meldung).not.toContain('zzzz');
    expect(abweisung.serverGestartet).toBe(false);
    expect(abweisung.gitGestartet).toBe(false);
  });

  for (const ersteZeile of ['--output=pwn', 'HEAD', 'a..b']) {
    test(`Szenario 7: soll die erste Zeile »${ersteZeile}« abweisen, ohne Server und ohne git`, async ({ auswahl }) => {
      const { repo, a } = auswahl.verlaufAbisE();

      const abweisung = await auswahl.stdinOhneGitErwarten(repo, [ersteZeile, a]);

      expect(abweisung.exitCode).not.toBe(0);
      expect(abweisung.meldung).toContain('Zeile 1');
      expect(abweisung.serverGestartet).toBe(false);
      expect(abweisung.gitGestartet).toBe(false);
      expect(auswahl.dateiPwnExistiert(repo)).toBe(false);
    });
  }

  const mitAnderemArgument = [
    ['einem Hash', ({ a }) => ['-', a]],
    ['einem Bereich', ({ a, b }) => [`${a}..${b}`, '-']],
    ['einem zweiten -', () => ['-', '-']],
  ];
  for (const [was, aufruf] of mitAnderemArgument) {
    test(`Szenario 7: soll - zusammen mit ${was} abweisen, ohne stdin zu lesen`, async ({ auswahl }) => {
      const verlauf = auswahl.verlaufAbisE();

      const ende = await auswahl.mitOffenerStillerEingabeAufrufen(verlauf.repo, aufruf(verlauf));

      expect(ende.exitCode).not.toBe(0);
      expect(ende.meldung).not.toBe('');
      expect(ende.serverGestartet).toBe(false);
      expect(ende.sekundenNachStart).toBeLessThan(2);
    });
  }

  test('Szenario 8: soll im Terminal nach höchstens 2 s enden und eine Pipe mit einem Hash je Zeile verlangen', async ({ auswahl }) => {
    const { repo } = auswahl.verlaufAbisE();

    const ende = await auswahl.imTerminalAufrufen(repo, ['-']);

    expect(ende.exitCode).not.toBe(0);
    expect(ende.meldung).toMatch(/ein Hash je Zeile|Pipe/);
    expect(ende.serverGestartet).toBe(false);
    expect(ende.sekundenNachStart).toBeLessThanOrEqual(2);
  });

  test('Szenario 8: soll bei offener, stiller Eingabe spätestens 15 s nach dem Start mit der Frist 10 s enden', async ({ auswahl }) => {
    test.setTimeout(30000);
    const { repo } = auswahl.verlaufAbisE();

    const ende = await auswahl.mitOffenerStillerEingabeAufrufen(repo, ['-']);

    expect(ende.exitCode).not.toBe(0);
    expect(ende.meldung).toContain('10 s');
    expect(ende.serverGestartet).toBe(false);
    expect(ende.sekundenNachStart).toBeLessThanOrEqual(15);
  });

  test('Szenario 8: soll ohne - bei offener, stiller Eingabe die Startzeile nach höchstens 2 s zeigen', async ({ auswahl }) => {
    const { repo, b, e } = auswahl.verlaufAbisE();

    const lauf = await auswahl.mitOffenerStillerEingabeReviewen(repo, [`${b}..${e}`]);

    expect(lauf.sekundenBisStartzeile).toBeLessThanOrEqual(2);
  });
});
