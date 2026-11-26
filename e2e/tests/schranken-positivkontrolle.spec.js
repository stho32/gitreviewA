'use strict';
// Positivkontrolle der zwei groben Zeitschranken (R00047, B4303): eine allein im Test eingebaute Verzögerung bzw.
// Blockade über der Schranke macht die jeweilige Prüfung rot. Die Verzögerung ist ein Fake der Testschicht
// (`route`, ohne Systemlast), die Blockade läuft im Testbuild der Seite; Produktcode und Schranken bleiben unberührt.
// Gemessen wird ereignisgenau — die Anzeige-Schranke von der auslösenden Handlung bis zum gemeldeten Zeichnen, die
// Einfrier-Schranke am `PerformanceObserver` (`longtask`) —, und derselbe Prüf-Helfer der Suite beurteilt den Messwert.
const { test, expect } = require('../dsl/diff-lesen.js');
const { anzeigeSchrankeMs, einfrierSchrankeMs, erwarteBinnenAnzeigeSchranke, erwarteUnterEinfrierSchranke } = require('../dsl/schranken.js');

/** Künstlich über der Anzeige-Schranke (Millisekunden), allein im Test. */
const VERZOEGERUNG_MS = 6000;
/** Künstliche Blockade über der Einfrier-Schranke (Millisekunden), allein im Testbuild. */
const BLOCKADE_MS = 3000;

/** Blockiert den Hauptfaden der Seite `blockadeMs` lang und liefert die längste Aufgabe, die der `PerformanceObserver` sah. */
async function blockadeMessen(page, blockadeMs) {
  return page.evaluate(async ms => {
    const aufgaben = [];
    const beobachter = new PerformanceObserver(liste => {
      for (const eintrag of liste.getEntries()) {
        aufgaben.push(eintrag.duration);
      }
    });
    beobachter.observe({ type: 'longtask' });
    await new Promise(fertig => setTimeout(fertig, 0));
    const ende = performance.now() + ms;
    while (performance.now() < ende) {
      // Die Blockade des Hauptfadens gehört allein dieser Probe.
    }
    // Die Meldung der Blockade kommt, wenn die Aufgabe des Hauptfadens endet — einen Takt später liegt sie vor.
    await new Promise(fertig => setTimeout(fertig, 250));
    beobachter.disconnect();
    return Math.round(Math.max(0, ...aufgaben));
  }, blockadeMs);
}

test.describe('Positivkontrolle der Schranken (R00047, B4303)', () => {
  test('Anzeige-Schranke: eine im Test eingebaute Verzögerung über der Schranke macht die Prüfung rot', async ({ diff }) => {
    test.setTimeout(60000);
    await diff.starten({ vorbereitung: '20 000 Zeilen', commits: ['u'] });
    await diff.antwortVerzoegern('gross.txt', VERZOEGERUNG_MS);

    const dauerMs = await diff.zeileNachKlickGemessen('gross.txt', { neu: 20000 });

    test.info().annotations.push({ type: 'Messwert', description: `gross.txt nach ${dauerMs} ms bei eingebauter Verzögerung (Anzeige-Schranke ${anzeigeSchrankeMs} ms)` });
    expect(dauerMs, `die ereignisgenaue Messung sieht die eingebaute Verzögerung (${dauerMs} ms)`).toBeGreaterThan(anzeigeSchrankeMs);
    expect(() => erwarteBinnenAnzeigeSchranke(dauerMs, 'Positivkontrolle Anzeige-Schranke'), 'die Prüfung wird über der Schranke rot').toThrow('Anzeige-Schranke');
  });

  test('Einfrier-Schranke: eine im Test eingebaute Blockade über der Schranke macht die Prüfung rot', async ({ diff, page }) => {
    test.setTimeout(60000);
    await diff.starten({ vorbereitung: 'Große Diffs', commits: ['w'] });
    await diff.dateiAnsehen('dicht.js');
    expect(await diff.warteAufFarbe(), 'Vorbedingung: dicht.js ist dicht gefärbt').toBe('ja');

    const laengsteMs = await blockadeMessen(page, BLOCKADE_MS);

    test.info().annotations.push({ type: 'Messwert', description: `längste Aufgabe ${laengsteMs} ms bei eingebauter Blockade (Einfrier-Schranke ${einfrierSchrankeMs} ms)` });
    expect(laengsteMs, `die Probe sieht die eingebaute Blockade (${laengsteMs} ms)`).toBeGreaterThan(einfrierSchrankeMs);
    expect(() => erwarteUnterEinfrierSchranke(laengsteMs, 'Positivkontrolle Einfrier-Schranke'), 'die Prüfung wird über der Schranke rot').toThrow('Einfrier-Schranke');
  });
});
