'use strict';
// Spezifikation R00012 „Oberfläche Liste–Detail“: die Diff-Fläche trägt für Vorlesewerkzeuge den Anzeigenamen des Pfads —
// unsichtbare Zeichen als Marke, nie roh (Befund H1 des security-reviewer; R00014, Sicherheit der Anforderung).
const { test, expect } = require('../dsl/diff-lesen.js');

const ANGEZEIGT = 'a⟨U+202E⟩b.txt';

test('soll den Pfad im aria-label der Diff-Fläche markiert nennen, nie roh (H1)', async ({ diff, page }) => {
  await diff.starten({ vorbereitung: 'Bidi im Dateinamen', commits: ['b'], modus: 'zusammen' });

  await diff.dateiAnsehen(ANGEZEIGT);

  const flaeche = page.locator('#diff .df-sc');
  await expect(flaeche).toHaveAttribute('aria-label', `Änderungen in ${ANGEZEIGT}`);
  await expect(flaeche.locator('table').first()).toHaveAttribute('aria-label', `Änderungen in ${ANGEZEIGT}`);
  for (const beschriftung of await page.locator('#diff [aria-label^="Änderungen in"]').evaluateAll(elemente => elemente.map(element => element.getAttribute('aria-label')))) {
    expect(beschriftung, 'roher Pfad in aria-label').not.toContain('\u202E');
  }
});