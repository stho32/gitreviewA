'use strict';
// Spezifikation R00053 „Anmerkungsfeld ragt über den rechten Diff-Rand“, B4901–B4903: das Notizfeld jeder Anmerkung liegt ganz
// im Diff-Bereich (rechte Kante sichtbar, Knopfzeile „Abbrechen“ unbesehen, kein waagerechter Bildlauf), bei 1280 und 812 px, mit
// offener und zugeklappter Ergebnis-Spalte, für Zeilen-, Bereichs-, Dateianmerkung und „Ändern“, und es hält beim Neuzeichnen.
// Browser-Eigenes (Geometrie). Zwei Stellen: Repo A `src/b.txt` (kurze Zeile) und Repo P `src/app.js` (lange Zeile, R00049/R00053).
const { test, expect } = require('../dsl/zeile-annotieren.js');

const FENSTER = { width: 1280, height: 800 };
const SCHMAL = { width: 812, height: 800 };

/** Die kurze Stelle: `src/b.txt` ist in `q` geändert, Zeile 2 trägt `ZWEI`. */
const KURZ = { vorbereitung: 'Repo A', datei: 'src/b.txt', zeile: 2, commit: 'q' };
/** Die Stelle des Befunds (Karte #63, R00053): `src/app.js` trägt in `q2` in Zeile 2 eine lange Zeile. */
const LANG = { vorbereitung: 'Repo P lang', datei: 'src/app.js', zeile: 2, commit: 'q2' };
const STELLEN = [['kurze Zeile (src/b.txt)', KURZ], ['lange Zeile (src/app.js)', LANG]];

const FENSTERSZENARIEN = [
  ['1280 × 800, Spalte offen', FENSTER, true],
  ['1280 × 800, Spalte zu', FENSTER, false],
  ['812 × 800, Spalte offen', SCHMAL, true],
  ['812 × 800, Spalte zu', SCHMAL, false],
];

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

/** Kriterium 1: die rechte Kante von Feld und Knopfzeile liegen im Diff-Bereich und in seinem Rollbereich, und sie sind
    gezeichnet — „Abbrechen“ wird nicht beschnitten (Karte #63, Befund 1). */
function erwarteImDiff(lage, name) {
  expect(lage.feld.rechts, `feld.right ≤ #diff.right (${name}: ${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.diffRechts);
  expect(lage.feld.rechts, `feld.right ≤ .df-sc right (${name}: ${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.rollRechts);
  expect(lage.kanteAmFeld, `rechte Kante des Feldes sichtbar (${name}: ${lage.kante.tag}.${lage.kante.klasse})`).toBe(true);
  expect(lage.knopf, `Knopfzeile mit „Abbrechen“ im DOM (${name})`).not.toBeNull();
  expect(lage.knopf.rechts, `Abbrechen.right ≤ .df-sc right (${name}: ${JSON.stringify(lage.knopf)})`).toBeLessThanOrEqual(lage.rollRechts);
  expect(lage.kanteAmKnopf, `„Abbrechen“ vollständig sichtbar (${name}: ${lage.kanteKnopf.tag}.${lage.kanteKnopf.klasse})`).toBe(true);
}

test.describe('Abnahme-Probe des Entwicklertesters (B4903: Kriterien 1–3)', () => {
  for (const [stelle, ort] of STELLEN) {
    for (const [name, fenster, spalteOffen] of FENSTERSZENARIEN) {
      test(`soll bei ${name}, ${stelle}, das Feld ganz im Diff halten, ohne waagerechten Bildlauf`, async ({ anm, page }) => {
        await anm.starten({ vorbereitung: ort.vorbereitung, modus: 'zusammen' });
        await spaltenzustand(anm, fenster, spalteOffen);

        await anm.dateiAnsehenGeladen(ort.datei);
        // Kriterium 6: Öffnen und Messen erzeugen keine Anfrage und keine Zeile auf stderr (S1) — der geöffnete Diff hat alles geladen.
        let anfragen = 0;
        page.on('request', () => { anfragen += 1; });
        const vorher = anfragen;
        const protokollVorher = anm.protokollzeilen().length;
        await anm.zeileAnklicken({ neu: ort.zeile });
        const lage = await messung(anm, anm.feldname(ort.datei, ort.zeile));
        expect(anfragen, 'Anfragen durch Öffnen und Messen').toBe(vorher);
        expect(anm.protokollzeilen().length, 'Zeilen auf stderr durch Öffnen und Messen').toBe(protokollVorher);

        erwarteImDiff(lage, name);
        expect(lage.rollBildlauf, `scrollLeft des Rollbereichs (${name})`).toBe(0);
        expect(lage.feld.breite, `Feld nicht breiter als der Rollbereich (${name})`).toBeLessThanOrEqual(lage.rollRechts - lage.feld.links);
      });
    }
  }
});

test.describe('Alle Anmerkungsarten (B4902: Kriterium 4)', () => {
  for (const [stelle, ort] of STELLEN) {
    for (const [name, fenster, spalteOffen] of [FENSTERSZENARIEN[0], FENSTERSZENARIEN[2]]) {
      test(`soll bei ${name}, ${stelle}, für Zeilen-, Bereichs- und Dateianmerkung und „Ändern“ dieselbe Lage halten`, async ({ anm }) => {
        await anm.starten({ vorbereitung: ort.vorbereitung, modus: 'zusammen' });
        await spaltenzustand(anm, fenster, spalteOffen);
        await anm.dateiAnsehen(ort.datei);

        await anm.zeileAnklicken({ neu: ort.zeile });
        erwarteImDiff(await messung(anm, anm.feldname(ort.datei, ort.zeile)), 'Zeilenanmerkung');
        await anm.abbrechen(ort.datei, ort.zeile);

        await anm.bereichZiehen(1, ort.zeile);
        const bereichsfeld = anm.bereichFeldname(ort.datei, 1, ort.zeile);
        erwarteImDiff(await messung(anm, bereichsfeld), 'Bereichsanmerkung');
        await anm.abbrechenMitName(bereichsfeld);

        await anm.dateiAnmerken();
        const dateilage = await messung(anm, anm.dateiFeldname(ort.datei));
        // Die Dateianmerkung steht im Datei-Kopf über dem Rollbereich (R00022): ihre Grenze ist der Diff-Bereich, nicht `.df-sc`.
        expect(dateilage.feld.rechts, `Dateianmerkung im Diff (${JSON.stringify(dateilage)})`).toBeLessThanOrEqual(dateilage.diffRechts);
        expect(dateilage.kanteAmFeld, 'rechte Kante der Dateianmerkung sichtbar').toBe(true);
        await anm.dateiAbbrechen(ort.datei);

        const angelegt = await anm.ueberDieSchnittstelleAnlegen(ort.commit, ort.datei, ort.zeile, 'Text zum Ändern');
        await anm.neuLaden();
        await anm.dateiAnsehen(ort.datei);
        await anm.aendern(angelegt.nummer);
        erwarteImDiff(await messung(anm, anm.feldname(ort.datei, ort.zeile)), 'Ändern-Feld');
      });
    }
  }
});

test.describe('Offenes Feld übersteht das Neuzeichnen (Kriterium 5)', () => {
  for (const [stelle, ort] of STELLEN) {
    test(`soll nach dem Neuzeichnen im Diff bleiben und den Text behalten, ${stelle}`, async ({ anm }) => {
      await anm.starten({ vorbereitung: ort.vorbereitung, modus: 'zusammen' });
      await anm.dateiAnsehen(ort.datei);
      await anm.zeileAnklicken({ neu: ort.zeile });
      await anm.textSchreiben(ort.datei, ort.zeile, 'Bleibt im Diff');

      const vorher = await messung(anm, anm.feldname(ort.datei, ort.zeile));
      await anm.neuzeichnen();
      const nachher = await messung(anm, anm.feldname(ort.datei, ort.zeile));

      erwarteImDiff(nachher, 'nach dem Neuzeichnen');
      expect(nachher.feld.rechts, 'dieselbe Lage wie vor dem Neuzeichnen').toBe(vorher.feld.rechts);
      await anm.feldEnthaelt(ort.datei, ort.zeile, 'Bleibt im Diff');
    });
  }
});
