'use strict';
// Akzeptanz der User Story R00042 (I0043, B4106): die Szenarien der User Story im ganzen Fluss und das Szenario „Drei Bereiche
// scrollen getrennt“ mit der großen Datei (Repo U, `gross.txt`, 20 000 Zeilen). Fachsprache aus `dsl/breite.js`; Browser-Eigenes.
// Die Kriterien 1–10 haben ihre Specs in `ergebnis-trenner`, `ergebnis-schrumpfen` und `ergebnis-bereiche`; hier laufen die
// Szenarien der Story als Ganzes.
const { test, expect } = require('../dsl/breite.js');

test.describe('User Story R00042 im ganzen Fluss (B4106)', () => {
  test('Szenarien 1, 2, 5 und 7: ziehen, Tastatur, Wechsel, schmaler werden, ausklappen, neu laden', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S zwei Commits', modus: 'zusammen' });
    await breite.spalteBreiteIst(320);

    // Szenario 1: der rechte Trenner zieht die Spalte breit (bis an die Seitenleiste geklemmt).
    await breite.rechtesZiehen(-200);
    await breite.spalteBreiteIst(520);
    await breite.rechtesZiehen(-2000);
    await breite.spalteBreiteIst(588);

    // Szenario 2: Tastatur und Doppelklick.
    await breite.fokussiereRechtenTrenner();
    await breite.druecke('Home');
    await breite.spalteBreiteIst(240);
    await breite.druecke('End');
    await breite.spalteBreiteIst(588);
    await breite.rechtesDoppelklick();
    await breite.spalteBreiteIst(320);

    // Szenario 5: die Breiten bleiben beim Arbeiten, das Neuladen stellt die Startbreiten her.
    await breite.ziehen(120);
    await breite.breiteIst(480);
    await breite.rechtesZiehen(-80);
    await breite.spalteBreiteIst(400);
    await breite.dateiAnsehen('lang.txt');
    await breite.modus('einzeln');
    await breite.ansicht('ganz');
    await breite.anordnung('nebeneinander');
    await breite.breiteIst(480);
    await breite.spalteBreiteIst(400);
    await breite.neuLaden();
    await breite.breiteIst(360);
    await breite.spalteBreiteIst(320);

    // Szenario 7: im schmalen Fenster klappt die Spalte ein; das Ausklappen lässt die Seitenleiste nachgeben.
    await breite.fensterSetzen({ width: 900, height: 800 });
    await breite.spalteVerborgen();
    await breite.spalteAusklappen();
    await breite.spalteBreiteIst(320);
    await breite.breiteIst(248);
    await breite.fensterSetzen({ width: 1280, height: 800 });
    await breite.breiteIst(360);
    await breite.spalteBreiteIst(320);
  });

  test('Szenario 3: drei Bereiche scrollen getrennt (Repo U, `gross.txt`, 20 000 Zeilen)', async ({ breite, page }) => {
    await breite.starten({ vorbereitung: 'Repo U' });
    await page.locator('#datei-zeilen .datei-zeile[data-pfad="gross.txt"]').click();
    await expect.poll(() => breite.diffKnoten(), { timeout: 20000 }).toBeGreaterThan(1000);
    await breite.spalteZeige(Array.from({ length: 300 }, (_, i) => `Ergebnis ${i}`).join('\n'));
    await breite.spalteIstRollbereich();
    await breite.setzeSpaltenVersatz(150);
    const spalte = (await breite.spaltenStand()).scrollTop;
    expect(spalte, 'die Spalte ist gescrollt (Vorbedingung)').toBeGreaterThan(0);

    const stehend = await breite.stehendeTeile();
    await breite.setzeDiffVersatz(180000);

    expect((await breite.spaltenStand()).scrollTop, 'die Spalte bewegt sich nicht').toBe(spalte);
    await breite.unveraendert(stehend, await breite.stehendeTeile(), 'Kopf und Werkzeugzeilen');
    await breite.keinSeitenbildlauf();
    await breite.diffIstRollbereich();
  });
});
