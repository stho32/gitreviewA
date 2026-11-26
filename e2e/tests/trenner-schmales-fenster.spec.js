'use strict';
// Spezifikation R00034 „Breite der Seitenleiste ziehen“ (I0035, B3307): das schmale zweispaltige Fenster — im 700-px-Fenster klemmt
// die tatsächliche Höchstbreite bei 700 − 320 − 6 − 24 = 350 px (nicht 640; die 24 px sind der Streifen der eingeklappten
// Ergebnis-Spalte, R00037), der Diff bleibt mindestens 320 px; unter 566 px verschwindet der Trenner und es gilt der Rückfall auf
// eine Spalte (R00033); genau an 566 px gibt es ihn wieder. Browser-Eigenes (Darstellung).
const { test, expect } = require('../dsl/breite.js');

test.describe('Schmales Fenster (B3307, Szenario 7)', () => {
  test('im 700-px-Fenster klemmt die Höchstbreite bei 350 px, unter 566 px verschwindet der Trenner (eine Spalte)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fensterSetzen({ width: 700, height: 800 });

    await breite.ziehen(2000); // weit über die Höchstbreite hinaus
    await breite.breiteIst(350);

    const lage = await breite.lage();
    expect(lage.diffBreite, `Diff-Breite im 700-px-Fenster (${lage.diffBreite} px)`).toBeGreaterThanOrEqual(320);

    await breite.fensterSetzen({ width: 560, height: 800 });

    await expect.poll(() => breite.trennerVorhanden(), 'unter 566 px kein Trenner').toBe(0);
    await breite.eineSpalte();
    await breite.seitenbildlauf();
  });

  test('genau an 566 px gibt es den Trenner wieder (zwei Spalten, getrennte Rollbereiche)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fensterSetzen({ width: 566, height: 800 });
    await breite.dateiAnsehen('lang.txt');

    await expect.poll(() => breite.trennerVorhanden(), 'an 566 px ein Trenner').toBe(1);
    await breite.trennerAnDerGrenze();
    await breite.zweiSpalten();
    await breite.listeIstRollbereich();
    await breite.diffIstRollbereich();
  });
});
