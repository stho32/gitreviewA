'use strict';
// Spezifikation R00034 „Breite der Seitenleiste ziehen“ (I0035, Nacharbeit B1): die gewählte Breite bleibt als Wunsch
// erhalten, die gezeigte Breite wird bei jeder Größenänderung neu geklemmt — in beide Richtungen. Unter 566 px gilt eine
// Spalte, der Trenner ist verborgen, die Breite bleibt unverändert. `aria-valuenow` liegt nie außerhalb von min/max.
// Browser-Eigenes (Darstellung); Vorbereitung Repo S.
const { test, expect } = require('../dsl/breite.js');

test.describe('Fenstergröße ändern (Nacharbeit B1)', () => {
  test('1280 → 500 → 1280: Breite bleibt mindestens 240 px, aria-valuenow liegt in der Spanne', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.breiteIst(360);

    await breite.fensterSetzen({ width: 500, height: 800 });
    await expect.poll(() => breite.trennerVorhanden(), 'unter 566 px kein Trenner').toBe(0);

    await breite.fensterSetzen({ width: 1280, height: 800 });
    await expect.poll(() => breite.trennerVorhanden(), 'zurück im zweispaltigen Fenster ein Trenner').toBe(1);

    await breite.breiteIst(360);
    const angaben = await breite.trennerAngaben();
    expect(Number(angaben.jetzt), 'aria-valuenow ≥ aria-valuemin').toBeGreaterThanOrEqual(Number(angaben.min));
    expect(Number(angaben.jetzt), 'aria-valuenow ≤ aria-valuemax').toBeLessThanOrEqual(Number(angaben.max));
  });

  test('700 → 565 → 700: Breite bleibt mindestens 240 px', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fensterSetzen({ width: 700, height: 800 });
    await breite.breiteIst(350);

    await breite.fensterSetzen({ width: 565, height: 800 });
    await expect.poll(() => breite.trennerVorhanden(), 'unter 566 px kein Trenner').toBe(0);

    await breite.fensterSetzen({ width: 700, height: 800 });
    await expect.poll(() => breite.trennerVorhanden(), 'zurück im zweispaltigen Fenster ein Trenner').toBe(1);

    await breite.breiteIst(350);
  });

  test('aus 640 ziehen, verkleinern, vergrößern: Breite bleibt mindestens 240 px, der Wunsch 640 wird gezeigt, sobald er passt', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.ziehen(2000);
    await breite.breiteIst(628); // 1280 − 320 − 6 − 326 (ausgeklappte Ergebnis-Spalte, R00037)

    await breite.fensterSetzen({ width: 500, height: 800 });
    await expect.poll(() => breite.trennerVorhanden(), 'unter 566 px kein Trenner').toBe(0);

    await breite.fensterSetzen({ width: 1280, height: 800 });
    await expect.poll(() => breite.trennerVorhanden(), 'zurück im zweispaltigen Fenster ein Trenner').toBe(1);

    await breite.breiteIst(628);
  });
});
