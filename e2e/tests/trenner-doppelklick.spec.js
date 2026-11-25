'use strict';
// Spezifikation R00034 „Breite der Seitenleiste ziehen“ (I0035, B3305): ein Doppelklick auf den Trenner setzt die Breite auf die
// Startbreite 360 px zurück. Browser-Eigenes; Vorbereitung Repo S, Fenster 1280 × 800.
const { test } = require('../dsl/breite.js');

test.describe('Doppelklick setzt zurück (B3305)', () => {
  test('setzt eine gezogene Breite auf die Startbreite 360 px zurück (Szenario 3)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });

    await breite.setzeBreite(500);
    await breite.breiteIst(500);

    await breite.doppelklick();

    await breite.breiteIst(360);
  });

  test('lässt die Startbreite unverändert', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });

    await breite.doppelklick();

    await breite.breiteIst(360);
  });
});
