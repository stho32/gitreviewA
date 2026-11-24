'use strict';
const { test, expect } = require('../dsl/auswahl.js');

test.describe('Hash-Präfix mit gleichnamigem Tag oder Zweig', () => {
  const varianten = [
    { weg: 'Argument', art: 'tag', grossbuchstaben: false },
    { weg: 'Argument', art: 'tag', grossbuchstaben: true },
    { weg: 'Argument', art: 'branch', grossbuchstaben: false },
    { weg: 'stdin', art: 'tag', grossbuchstaben: false },
    { weg: 'stdin', art: 'tag', grossbuchstaben: true },
    { weg: 'stdin', art: 'branch', grossbuchstaben: false },
  ];
  for (const { weg, art, grossbuchstaben } of varianten) {
    let schreibweise = 'klein';
    if (grossbuchstaben) {
      schreibweise = 'groß';
    }
    test(`soll ein Präfix über ${weg} abweisen, wenn ein ${art} so heißt und auf einen anderen Commit zeigt (${schreibweise})`, async ({ auswahl }) => {
      const verlauf = auswahl.verlaufMitRefWieHashPraefix({ art, grossbuchstaben });

      let ende;
      if (weg === 'stdin') {
        ende = await auswahl.ueberStdinAufrufen(verlauf.repo, [verlauf.praefix]);
      } else {
        ende = await auswahl.einzelcommitsAufrufen(verlauf.repo, [verlauf.praefix]);
      }

      expect(ende.exitCode).toBe(2);
      expect(ende.meldung).toContain('mehrdeutig');
      expect(ende.meldung.toLowerCase()).not.toContain(verlauf.praefix.toLowerCase());
      expect(ende.serverGestartet).toBe(false);
    });
  }

  test('soll den vollen Hash und ein eindeutiges Präfix ohne gleichnamige Ref als die richtigen Commits zeigen', async ({ auswahl }) => {
    const verlauf = auswahl.verlaufMitRefWieHashPraefix({ art: 'tag', grossbuchstaben: false });
    const eindeutigesPraefix = verlauf.b.slice(0, 4);

    const ueberArgumente = await auswahl.einzelcommitsReviewen(verlauf.repo, [verlauf.a, eindeutigesPraefix]);
    const ueberStdin = await auswahl.ueberStdinReviewen(verlauf.repo, [verlauf.a, eindeutigesPraefix]);

    expect(await auswahl.gezeigteCommits(ueberArgumente)).toEqual([verlauf.a, verlauf.b]);
    expect(await auswahl.gezeigteCommits(ueberStdin)).toEqual([verlauf.a, verlauf.b]);
  });
});
