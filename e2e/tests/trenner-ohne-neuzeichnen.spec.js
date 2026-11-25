'use strict';
// Spezifikation R00034 „Breite der Seitenleiste ziehen“ (I0035, B3306): die Breite wirkt über das Layout, ohne den Diff neu zu
// zeichnen (Lehre #23). Ein offenes Notizfeld samt Text und Fokus, die Markierung, der Suchtreffer und die Bildlaufposition
// bleiben; es wird keine neue Diff-Anfrage gestellt. Browser-Eigenes; Vorbereitung Repo S (`lang.txt`, 200 Zeilen), 1280 × 800.
const { test, expect } = require('../dsl/breite.js');

test.describe('Breite ohne Neuzeichnen (B3306, Lehre #23)', () => {
  test('offenes Notizfeld, Markierung, Suchtreffer und Bildlaufposition überstehen das Ziehen — ohne neue Diff-Anfrage', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.dateiAnsehen('lang.txt');
    await breite.ansicht('ganz'); // die ganze Datei: ein langer, scrollbarer Diff

    const anfragen = breite.zaehleDiffAnfragen();

    const name = breite.feldname('lang.txt', 5);
    await breite.zeileAnklicken({ neu: 5 });
    await breite.notizSchreiben(name, 'Klammer fehlt');
    await breite.feldIstOffenMitFokus(name);

    await breite.sucheImDiff('z200');
    expect(await breite.marken(), 'Suchtreffer vorhanden').toBeGreaterThan(0);

    await breite.feldFokussieren(name);
    await breite.setzeDiffVersatz(1200);

    const vorher = {
      text: await breite.feldText(name),
      felder: await breite.anzahlNotizfelder(),
      marken: await breite.marken(),
      diffZeilen: await breite.diffZeilen(),
      versatz: (await breite.diffStand()).scrollTop,
      anfragen: anfragen(),
    };
    expect(vorher.felder, 'Notizfeld offen').toBe(1);
    expect(vorher.versatz, 'Diff gescrollt (Vorbedingung)').toBeGreaterThan(0);

    await breite.ziehen(80);
    await breite.breiteIst(440);

    await breite.feldIstOffenMitFokus(name);
    expect(await breite.feldText(name), 'Text des offenen Feldes unverändert').toBe(vorher.text);
    expect(await breite.anzahlNotizfelder(), 'Notizfeld bleibt offen').toBe(vorher.felder);
    expect(await breite.marken(), 'Suchtreffer bleiben').toBe(vorher.marken);
    expect(await breite.diffZeilen(), 'Diff-Zeilen unverändert (kein Neuzeichnen)').toBe(vorher.diffZeilen);
    expect((await breite.diffStand()).scrollTop, 'Bildlaufposition bleibt').toBe(vorher.versatz);
    expect(anfragen(), 'keine neue Diff-Anfrage').toBe(vorher.anfragen);
  });
});
