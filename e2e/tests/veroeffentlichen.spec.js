'use strict';
const { test, expect } = require('../dsl/veroeffentlichung.js');

const KLEINER_ALS_MB = 5;
const DREI_PLATTFORMEN = ['linux-x64', 'win-x64', 'osx-arm64'];

test.describe('Als eine Datei veröffentlichen', () => {
  test.describe.configure({ timeout: 240000 });

  test('Szenario 1: für linux-x64 soll genau eine ausführbare Datei unter 5 MB entstehen, ohne Symbol- und Begleitdateien', async ({ ver }) => {
    const ergebnis = await ver.fuerPlattformVeroeffentlichen('linux-x64');

    expect(ver.dateienImOrdner(ergebnis)).toEqual(['gitreviewA']);
    ver.sollAusfuehrbarSein(ergebnis, 'gitreviewA');
    ver.sollKleinerSeinAlsMegabyte(ergebnis, 'gitreviewA', KLEINER_ALS_MB);
  });

  for (const [plattform, dateiname] of [['win-x64', 'gitreviewA.exe'], ['osx-arm64', 'gitreviewA']]) {
    test(`Szenario 2: für ${plattform} soll genau eine Datei ${dateiname} unter 5 MB entstehen`, async ({ ver }) => {
      const ergebnis = await ver.fuerPlattformVeroeffentlichen(plattform);

      expect(ver.dateienImOrdner(ergebnis)).toEqual([dateiname]);
      ver.sollKleinerSeinAlsMegabyte(ergebnis, dateiname, KLEINER_ALS_MB);
    });
  }

  test('Szenario 3: die linux-Datei soll allein im leeren Ordner starten und die beiden Commits zeigen', async ({ ver, gr, page }) => {
    const repo = gr.repoMitCommits(['Erster', 'Zweiter']);
    const [erster, zweiter] = repo.hashes;
    const datei = await ver.veroeffentlichteDateiAllein('linux-x64');

    const lauf = await ver.alleinStarten(datei, repo, [erster, zweiter]);

    expect(lauf.adresse).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    expect(lauf.stdout).toBe('');
    await gr.oberflaecheOeffnen(page, lauf);
    await expect(gr.commitZeilen(page)).toHaveCount(2);
    const betreffe = (await gr.commitZeilenLesen(page)).map(zeile => zeile.betreff);
    expect(betreffe).toEqual(['Erster', 'Zweiter']);
  });

  test('Szenario 4: nach Strg+C soll der Lauf mit 130 enden und im Ordner der Datei nur die Datei liegen', async ({ ver, gr, abbruch }) => {
    const repo = gr.repoMitCommits(['Erster', 'Zweiter']);
    const datei = await ver.veroeffentlichteDateiAllein('linux-x64');
    const lauf = await ver.alleinStarten(datei, repo, repo.hashes);

    abbruch.mitStrgCAbbrechen(lauf);

    await abbruch.sollOhneErgebnisAbgebrochenSein(lauf);
    expect(ver.dateienImOrdnerDerDatei(datei)).toEqual(['gitreviewA']);
  });

  test('Szenario 5: das Skript soll ohne Argument drei Plattformordner mit je einer Datei bauen und genau drei Pfade ausgeben', async ({ ver }) => {
    const lauf = await ver.skriptAufrufen([]);

    expect(lauf.exitCode, lauf.stderr).toBe(0);
    expect(lauf.stdoutZeilen).toHaveLength(3);
    for (const [index, plattform] of DREI_PLATTFORMEN.entries()) {
      expect(ver.ordnerNamenDerZeile(lauf.stdoutZeilen[index])).toBe(plattform);
      expect(ver.dateienImOrdnerDerDatei(lauf.stdoutZeilen[index])).toHaveLength(1);
    }
  });

  test('Szenario 6: das Skript soll eine unbekannte Plattform auf stderr nennen, mit Fehlercode enden und stdout leer lassen', async ({ ver }) => {
    const lauf = await ver.skriptAufrufen(['freebsd-x64']);

    expect(lauf.exitCode).not.toBe(0);
    expect(lauf.stderr).toContain('freebsd-x64');
    expect(lauf.stdout).toBe('');
  });
});
