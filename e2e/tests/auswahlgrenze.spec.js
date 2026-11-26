'use strict';
const { test, expect } = require('../dsl/auswahl.js');
const { anzeigeSchrankeMs } = require('../dsl/schranken.js');

test.describe('Menge der Auswahl und Lastprofil', () => {
  for (const weg of ['Bereich', 'stdin']) {
    test(`Szenario 10: soll 200 Commits als ${weg} spätestens 5 s nach dem Start zeigen, ohne Warnung`, async ({ auswahl, page }) => {
      const verlauf = auswahl.verlaufMitCommits(200);
      await page.goto('about:blank');

      const lauf = await auswahl.alleCommitsReviewen(verlauf, weg);
      const sekunden = await auswahl.sekundenBisAlleZeilenSichtbar(page, lauf, 200);

      test.info().annotations.push({ type: 'Messwert', description: `${weg}: 200 Zeilen nach ${sekunden} s (Anzeige-Schranke ${anzeigeSchrankeMs / 1000} s)` });
      console.log(`Messwert Szenario 10 (${weg}): 200 Zeilen sichtbar nach ${sekunden} s`);
      expect(sekunden).toBeLessThanOrEqual(anzeigeSchrankeMs / 1000);
      expect(auswahl.warnungen(lauf)).toEqual([]);
    });
  }

  for (const weg of ['Bereich', 'stdin']) {
    test(`Szenario 11: soll 1 000 Commits als ${weg} zeigen und beim Start warnen`, async ({ auswahl, page }) => {
      test.setTimeout(60000);
      const verlauf = auswahl.verlaufMitCommits(1000);

      const lauf = await auswahl.alleCommitsReviewen(verlauf, weg);
      await auswahl.sekundenBisAlleZeilenSichtbar(page, lauf, 1000);

      expect(auswahl.warnungen(lauf)).toHaveLength(1);
    });

    test(`Szenario 11: soll 1 001 Commits als ${weg} mit der Grenze 1 000 abweisen, ohne Server`, async ({ auswahl }) => {
      test.setTimeout(60000);
      const verlauf = auswahl.verlaufMitCommits(1001);

      const abweisung = await auswahl.alleCommitsAufrufen(verlauf, weg);

      expect(abweisung.exitCode).not.toBe(0);
      expect(abweisung.meldung).toContain('1 000');
      expect(abweisung.serverGestartet).toBe(false);
    });
  }
});
