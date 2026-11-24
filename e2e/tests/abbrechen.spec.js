'use strict';
const { test, expect } = require('../dsl/abbrechen.js');

const ABBRUCH_FRIST_MS = 5000;

test.describe('Review abbrechen', () => {
  test('soll bei Strg+C mit zwei Anmerkungen kein Ergebnis ausgeben und mit 130 enden (US-1)', async ({ gr, abbruch }) => {
    const repo = gr.repoMitCommits();
    const [a, b] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a, b]);
    await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'src/Foo.cs', zeile: 42, text: 'Null-Prüfung fehlt' });
    await gr.anmerkungAnlegen(lauf, { commit: b, datei: 'README.md', text: 'Abschnitt Installation veraltet' });

    abbruch.mitStrgCAbbrechen(lauf);

    await abbruch.sollOhneErgebnisAbgebrochenSein(lauf);
  });

  test('soll bei zweimaligem Beendigungssignal ohne Anmerkung nichts ausgeben und den Abbruch einmal melden (US-2)', async ({ gr, abbruch }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0]]);

    abbruch.mitBeendigungssignalAbbrechen(lauf, { anzahl: 2 });

    await abbruch.sollOhneErgebnisAbgebrochenSein(lauf);
  });

  test('soll trotz offener Oberfläche höchstens 5 s nach Strg+C enden (US-3)', async ({ gr, abbruch, page }) => {
    const repo = gr.repoMitCommits();
    const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.aufZeilenWarten(page, 3);

    const dauerMs = await abbruch.mitStrgCAbbrechenUndDauerMessen(lauf);

    console.log(`Messwert Strg+C bis Prozessende bei offener Oberfläche: ${Math.round(dauerMs)} ms`);
    expect(dauerMs).toBeLessThanOrEqual(ABBRUCH_FRIST_MS);
    await abbruch.sollOhneErgebnisAbgebrochenSein(lauf);
  });

  test('soll bei Strg+C noch während des Starts ohne Ergebnis mit 130 enden', async ({ gr, abbruch }) => {
    const repo = gr.repoMitCommits();

    const lauf = await abbruch.waehrendDesStartsMitStrgCAbbrechen(repo, [repo.hashes[0]]);

    await abbruch.sollOhneErgebnisAbgebrochenSein(lauf);
  });

  for (const { name, anmerkung, mitSetsid } of [
    { name: 'ohne Anmerkung', anmerkung: false, mitSetsid: false },
    { name: 'mit Anmerkung', anmerkung: true, mitSetsid: false },
    { name: 'mit setsid', anmerkung: false, mitSetsid: true },
  ]) {
    test(`soll aus einem Skript im Hintergrund gestartet bei Strg+C ohne Ergebnis mit 130 enden (${name})`, async ({ gr, abbruch }) => {
      const repo = gr.repoMitCommits();
      const [a] = repo.hashes;
      const lauf = await gr.gitreviewAImHintergrundStarten(repo, [a], { mitSetsid });
      if (anmerkung) {
        await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'datei.txt', zeile: 1, text: 'Hintergrundlauf' });
      }

      abbruch.mitStrgCAbbrechen(lauf);

      await abbruch.sollOhneErgebnisAbgebrochenSein(lauf);
    });
  }

  test('soll nach geschlossenem Tab weiterlaufen und beim Beenden die Anmerkung liefern (US-4)', async ({ gr, abbruch, context, page }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a]);
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'src/Foo.cs', zeile: 1, text: 'Test' });

    await abbruch.tabSchliessen(page);
    abbruch.sollWeiterlaufen(lauf);
    const neuerTab = await abbruch.oberflaecheInNeuemTabOeffnen(context, lauf);
    await gr.beendenBetaetigen(neuerTab);

    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toContain('Anmerkungen: 1\n');
    expect(gr.ergebnis(lauf)).toContain('## 1. src/Foo.cs:1\n');
    expect(gr.ergebnis(lauf)).toContain('> Test\n');
  });

  test('soll nach bestätigtem Beenden trotz folgendem Strg+C das Ergebnis liefern und mit 0 enden (US-5)', async ({ gr, abbruch }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a]);
    await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'datei.txt', zeile: 1, text: 'bleibt im Ergebnis' });

    const beenden = await gr.beendenAnfordern(lauf);
    abbruch.mitStrgCAbbrechen(lauf);

    expect(beenden.status).toBe(200);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toContain('Anmerkungen: 1\n');
    expect(gr.ergebnis(lauf)).toContain('> bleibt im Ergebnis\n');
    expect(lauf.stderr).not.toContain('Review abgebrochen');
  });
});
