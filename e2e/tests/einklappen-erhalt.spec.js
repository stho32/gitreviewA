'use strict';
// Spezifikation R00035 „Seitenleiste ein- und ausklappen“ (I0036, B3405): das Ein- und Ausklappen verwirft keine Eingabe
// (Lehre #23) — ein offenes Notizfeld mit Text und Fokus, die Markierung eines Zeilenbereichs (R00031), der Suchtreffer und die
// Bildlaufposition bleiben, und es wird keine neue Diff-Anfrage gestellt; das gilt auch bei verzögert antwortendem Diff (Fake).
// Dazu die Anzeige-Schranke der Suite (5 s) mit einer Positivkontrolle derselben Messung. Browser-
// Eigenes; Vorbereitung Repo Z (`src/a.txt`, angelegt in z1), 1280 × 800.
const { test, expect } = require('../dsl/einklappen.js');
const { erwarteBinnenAnzeigeSchranke } = require('../dsl/schranken.js');

const VERZOEGERUNG_MS = 500;

test.describe('Einklappen verwirft keine Eingabe (B3405, Lehre #23)', () => {
  test('offenes Notizfeld samt Text und Fokus, Markierung, Suchtreffer und Bildlauf überstehen das Ein- und Ausklappen (Szenario 6)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo Z', commits: ['z1'], modus: 'einzeln' });
    const anfragen = einklappen.zaehleDiffAnfragen();
    await einklappen.dateiAnsehen('src/a.txt');

    const name = einklappen.bereichFeldname('src/a.txt', 1, 3);
    await einklappen.bereichWaehlen(1, 3);
    await einklappen.notizSchreiben(name, 'Klammer fehlt');
    await einklappen.sucheImDiff('zwei');
    expect(await einklappen.marken(), 'Suchtreffer vorhanden').toBeGreaterThan(0);
    await einklappen.feldFokussieren(name);

    const vorher = {
      text: await einklappen.feldText(name),
      felder: await einklappen.anzahlNotizfelder(),
      marken: await einklappen.marken(),
      markiert: await einklappen.markierteZeilen(),
      anfragen: anfragen(),
    };
    expect(vorher.felder, 'Notizfeld offen').toBe(1);
    expect(vorher.markiert.length, 'Zeilenbereich markiert (Vorbedingung)').toBe(3);

    await einklappen.knopfBetatigen();
    await einklappen.seitenleisteVerborgen();
    await einklappen.feldIstOffenMitFokus(name);

    await einklappen.knopfBetatigen();
    await einklappen.seitenleisteSichtbar();
    await einklappen.feldIstOffenMitFokus(name);

    expect(await einklappen.feldText(name), 'Text des offenen Feldes unverändert').toBe(vorher.text);
    expect(await einklappen.anzahlNotizfelder(), 'Notizfeld bleibt offen').toBe(vorher.felder);
    expect(await einklappen.marken(), 'Suchtreffer bleiben').toBe(vorher.marken);
    expect(await einklappen.markierteZeilen(), 'Markierung bleibt').toEqual(vorher.markiert);
    expect(anfragen(), 'keine neue Diff-Anfrage').toBe(vorher.anfragen);
  });

  test('wirkt auch bei verzögert antwortendem Diff sofort: kein Warten auf eine Anfrage (verzögerter Fake)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo Z', commits: ['z1'], modus: 'einzeln' });
    await einklappen.dateiAnsehen('src/a.txt');
    await einklappen.verzoegerteDiffAntworten(VERZOEGERUNG_MS);

    const anfragen = einklappen.zaehleDiffAnfragen();
    const zeit = await einklappen.dauerEinklappen();

    erwarteBinnenAnzeigeSchranke(zeit, `Einklappen bei zurückgehaltenen Diff-Antworten (${Math.round(zeit)} ms)`);
    expect(anfragen(), 'keine neue Diff-Anfrage (der Fake hätte sie um 500 ms verzögert)').toBe(0);
    await einklappen.seitenleisteVerborgen();
  });

  test('die Anzeige-Schranke (5 s) hält beim Einklappen — die Messung sieht eine Verzögerung (Positivkontrolle)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.dateiAnsehen('lang.txt');

    const ohneVerzoegerung = await einklappen.dauerDateiwechsel('d02.txt');
    await einklappen.verzoegerteDiffAntworten(VERZOEGERUNG_MS);
    const mitVerzoegerung = await einklappen.dauerDateiwechsel('d03.txt');
    expect(mitVerzoegerung, `Wechsel ohne ${Math.round(ohneVerzoegerung)} ms, mit Verzögerung ${Math.round(mitVerzoegerung)} ms`)
      .toBeGreaterThanOrEqual(ohneVerzoegerung + VERZOEGERUNG_MS * 0.8);

    const zeit = await einklappen.dauerEinklappen();
    erwarteBinnenAnzeigeSchranke(zeit, `Einklappen wirkt nach ${Math.round(zeit)} ms`);
    expect(zeit, 'das Einklappen wartet auf keine Antwort der verzögerten Quelle').toBeLessThanOrEqual(mitVerzoegerung * 0.7);
  });
});