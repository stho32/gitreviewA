'use strict';
// Spezifikation R00053 „Anmerkungsfeld ragt über den rechten Diff-Rand“, B4901–B4903: das Notizfeld jeder Anmerkung liegt ganz
// im Diff-Bereich (rechte Kante sichtbar, kein waagerechter Bildlauf), bei 1280 und 812 px, mit offener und zugeklappter
// Ergebnis-Spalte, für Zeilen-, Bereichs-, Dateianmerkung und „Ändern“, und es hält beim Neuzeichnen. Browser-Eigenes
// (Geometrie), Vorbereitung Repo A (`src/b.txt`), „Zusammen“.
const { test, expect } = require('../dsl/zeile-annotieren.js');

const FENSTER = { width: 1280, height: 800 };
const SCHMAL = { width: 812, height: 800 };
/** Die Stelle im Diff: `src/b.txt` ist in `q` geändert, Zeile 2 trägt `ZWEI`. */
const DATEI = 'src/b.txt';
const ZEILE = 2;

/** Den Spaltenzustand der Abnahme-Probe herstellen: 1280 startet mit offener Spalte, 812 mit zugeklappter (R00037/R00042). */
async function spaltenzustand(anm, fenster, spalteOffen) {
  await anm.fensterSetzen(fenster);
  const startetOffen = fenster.width >= 1012;
  if (spalteOffen !== startetOffen) {
    await anm.ergebnisSpalteUmschalten();
  }
  if (spalteOffen) {
    await anm.ergebnisSpalteSichtbar();
  } else {
    await anm.ergebnisSpalteVerborgen();
  }
}

async function messung(anm, name) {
  const lage = await anm.lageDesFeldes(name);
  expect(lage, `Notizfeld ${name} im DOM`).not.toBeNull();
  return lage;
}

/** Kriterium 1: die rechte Kante liegt im Diff-Bereich und in seinem Rollbereich, und sie ist gezeichnet. */
function erwarteImDiff(lage, name) {
  expect(lage.feld.rechts, `feld.right ≤ #diff.right (${name}: ${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.diffRechts);
  expect(lage.feld.rechts, `feld.right ≤ .df-sc right (${name}: ${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.rollRechts);
  expect(lage.kanteAmFeld, `rechte Kante des Feldes sichtbar (${name}: ${lage.kante.tag}.${lage.kante.klasse})`).toBe(true);
}

test.describe('Abnahme-Probe des Entwicklertesters (B4903: Kriterien 1–3)', () => {
  for (const [name, fenster, spalteOffen] of [
    ['1280 × 800, Spalte offen', FENSTER, true],
    ['1280 × 800, Spalte zu', FENSTER, false],
    ['812 × 800, Spalte offen', SCHMAL, true],
    ['812 × 800, Spalte zu', SCHMAL, false],
  ]) {
    test(`soll bei ${name} das Feld ganz im Diff halten, ohne waagerechten Bildlauf`, async ({ anm, page }) => {
      await anm.starten({ modus: 'zusammen' });
      await spaltenzustand(anm, fenster, spalteOffen);

      await anm.dateiAnsehen(DATEI);
      // Kriterium 6: Öffnen, Tippen und Messen erzeugen keine Anfrage — der geöffnete Diff hat alles geladen.
      let anfragen = 0;
      page.on('request', () => { anfragen += 1; });
      await anm.zeileAnklicken({ neu: ZEILE });
      const vorher = anfragen;
      const lage = await messung(anm, anm.feldname(DATEI, ZEILE));
      expect(anfragen, 'Anfragen durch Öffnen und Messen').toBe(vorher);

      erwarteImDiff(lage, name);
      expect(lage.rollBildlauf, `scrollLeft des Rollbereichs (${name})`).toBe(0);
      expect(lage.feld.breite, `Feld nicht breiter als der Rollbereich (${name})`).toBeLessThanOrEqual(lage.rollRechts - lage.feld.links);
    });
  }
});

test.describe('Alle Anmerkungsarten (B4902: Kriterium 4)', () => {
  test('soll für Zeilen-, Bereichs- und Dateianmerkung und „Ändern“ dieselbe Lage halten', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });
    await anm.dateiAnsehen(DATEI);

    await anm.zeileAnklicken({ neu: ZEILE });
    erwarteImDiff(await messung(anm, anm.feldname(DATEI, ZEILE)), 'Zeilenanmerkung');
    await anm.abbrechen(DATEI, ZEILE);

    await anm.bereichZiehen(1, ZEILE);
    const bereichsfeld = anm.bereichFeldname(DATEI, 1, ZEILE);
    erwarteImDiff(await messung(anm, bereichsfeld), 'Bereichsanmerkung');
    await anm.abbrechenMitName(bereichsfeld);

    await anm.dateiAnmerken();
    const dateilage = await messung(anm, anm.dateiFeldname(DATEI));
    // Die Dateianmerkung steht im Datei-Kopf über dem Rollbereich (R00022): ihre Grenze ist der Diff-Bereich, nicht `.df-sc`.
    expect(dateilage.feld.rechts, `Dateianmerkung im Diff (${JSON.stringify(dateilage)})`).toBeLessThanOrEqual(dateilage.diffRechts);
    expect(dateilage.kanteAmFeld, 'rechte Kante der Dateianmerkung sichtbar').toBe(true);
    await anm.dateiAbbrechen(DATEI);

    const angelegt = await anm.ueberDieSchnittstelleAnlegen('q', DATEI, ZEILE, 'Text zum Ändern');
    await anm.neuLaden();
    await anm.dateiAnsehen(DATEI);
    await anm.aendern(angelegt.nummer);
    erwarteImDiff(await messung(anm, anm.feldname(DATEI, ZEILE)), 'Ändern-Feld');
  });
});

test.describe('Offenes Feld übersteht das Neuzeichnen (Kriterium 5)', () => {
  test('soll nach dem Neuzeichnen im Diff bleiben und den Text behalten', async ({ anm }) => {
    await anm.starten({ modus: 'zusammen' });
    await anm.dateiAnsehen(DATEI);
    await anm.zeileAnklicken({ neu: ZEILE });
    await anm.textSchreiben(DATEI, ZEILE, 'Bleibt im Diff');

    const vorher = await messung(anm, anm.feldname(DATEI, ZEILE));
    await anm.neuzeichnen();
    const nachher = await messung(anm, anm.feldname(DATEI, ZEILE));

    erwarteImDiff(nachher, 'nach dem Neuzeichnen');
    expect(nachher.feld.rechts, 'dieselbe Lage wie vor dem Neuzeichnen').toBe(vorher.feld.rechts);
    await anm.feldEnthaelt(DATEI, ZEILE, 'Bleibt im Diff');
  });
});