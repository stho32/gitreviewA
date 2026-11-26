'use strict';
// Spezifikation R00034 „Breite der Seitenleiste ziehen“ (I0035, B3307): das schmale zweispaltige Fenster — im 700-px-Fenster klemmt
// die tatsächliche Höchstbreite bei 700 − 24 − 320 − 6 = 350 px (nicht 640; die 24 px sind der Streifen der eingeklappten
// Ergebnis-Spalte, R00037), der Diff bleibt mindestens 320 px; unter 590 px verschwindet der Trenner und es gilt der Rückfall auf
// eine Spalte (R00033); genau an 590 px gibt es ihn wieder und der Diff behält seine 320 px (Befund B1, PO Zeile 249).
// Browser-Eigenes (Darstellung).
const { test, expect } = require('../dsl/breite.js');

test.describe('Schmales Fenster (B3307, Szenario 7)', () => {
  test('im 700-px-Fenster klemmt die Höchstbreite bei 350 px, an 566 px verschwindet der Trenner (eine Spalte)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fensterSetzen({ width: 700, height: 800 });

    await breite.ziehen(2000); // weit über die Höchstbreite hinaus
    await breite.breiteIst(350);

    const lage = await breite.lage();
    expect(lage.diffBreite, `Diff-Breite im 700-px-Fenster (${lage.diffBreite} px)`).toBeGreaterThanOrEqual(320);

    await breite.fensterSetzen({ width: 566, height: 800 });

    await expect.poll(() => breite.trennerVorhanden(), 'unter 590 px kein Trenner').toBe(0);
    await breite.eineSpalte();
    await breite.seitenbildlauf();
  });

  test('genau an 590 px gibt es den Trenner wieder (zwei Spalten, getrennte Rollbereiche), der Diff bleibt 320 px', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fensterSetzen({ width: 590, height: 800 });
    await breite.dateiAnsehen('lang.txt');

    await expect.poll(() => breite.trennerVorhanden(), 'an 590 px ein Trenner').toBe(1);
    await breite.trennerAnDerGrenze();
    await breite.zweiSpalten();
    await breite.listeIstRollbereich();
    await breite.diffIstRollbereich();

    // Befund B1: an der Grenze geben die Seitenleiste (240) und der Diff (320) genau den Streifen 24 + Trenner 6 her.
    const lage = await breite.rechteLage();
    expect(lage.diffBreite, `Diff-Breite an der Grenze 590 px (${lage.diffBreite} px)`).toBeGreaterThanOrEqual(320);
  });
});
