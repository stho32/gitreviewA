'use strict';
// Spezifikation R00056 „Dateinamen in schmaler Seitenleiste“ (Kriterium 7, R00011): die Umbruchstellen ändern den Text nicht —
// `textContent` ist der Anzeigename (mit Marken), keine Umbruchstelle liegt in einer Marke `⟨…⟩`, Markieren und Kopieren liefern
// denselben Text. Repo mit `a_b.c-d/e` (alle Trenner), `x⟨U+202E⟩y.txt` (Richtungszeichen) und `f⟨0xFF⟩.txt` (ungültiges Byte).
const { test, expect } = require('../dsl/dateinamen.js');
const dateilisteWerte = require('../../src/GitReviewA/web/dateiliste-werte.js');

test.describe('Kriterium 7: der Text bleibt, wie er ist (R00011)', () => {
  test('soll die Anzeigenamen unverändert zeigen, keine Marke teilen und beim Markieren denselben Text liefern', async ({ namen }) => {
    await namen.markenStarten();

    const proben = await namen.textproben();
    expect(proben.length, 'drei Dateizeilen').toBe(3);
    for (const probe of proben) {
      expect(probe.textContent, `textContent von ${probe.roherPfad}`).toBe(dateilisteWerte.sichtbarerName(probe.roherPfad));
      expect(probe.wbrInMarke, `Umbruchstelle in einer Marke von ${probe.roherPfad}`).toBe(false);
      expect(probe.textAuswahl, `Markieren liefert den Anzeigenamen von ${probe.roherPfad}`).toBe(probe.textContent);
      expect(probe.kindarten.filter(art => art !== 'text' && art !== 'wbr'), 'das Pfadelement trägt nur Text und <wbr>').toEqual([]);
    }
    expect([...proben.map(probe => probe.textContent)].sort(), 'Trenner, Richtungs- und Byte-Marke stehen im Text').toEqual(
      ['a_b.c-d/e', 'f⟨0xFF⟩.txt', 'x⟨U+202E⟩y.txt'].sort());
    expect(proben.some(probe => probe.wbrZahl > 0), 'es gibt Umbruchstellen (`<wbr>`)').toBe(true);
    expect(namen.seitenfehler(), 'Seitenfehler').toEqual([]);
  });

  test('soll bei 812 px offener Spalte denselben Text im Pfad zeigen wie ohne Umbruchstellen', async ({ namen }) => {
    await namen.markenStarten();
    await namen.schmalOffen();

    for (const probe of await namen.textproben()) {
      expect(probe.textContent, `textContent von ${probe.roherPfad}`).toBe(dateilisteWerte.sichtbarerName(probe.roherPfad));
      expect(probe.wbrInMarke, `Umbruchstelle in einer Marke von ${probe.roherPfad}`).toBe(false);
    }
    expect(namen.seitenfehler(), 'Seitenfehler').toEqual([]);
  });
});
