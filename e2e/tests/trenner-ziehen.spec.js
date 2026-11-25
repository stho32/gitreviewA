'use strict';
// Spezifikation R00034 „Breite der Seitenleiste ziehen“ (I0035, B3303): das Ziehen mit dem Zeiger verstellt die Breite mit, an
// beiden Grenzen geklemmt, und der Diff wird nie schmaler als 320 px; Pointer-Capture hält den Zug auch bei einem schnellen
// Sprung. Browser-Eigenes (Ziehen, Darstellung); Vorbereitung Repo S, Fenster 1280 × 800.
const { test, expect } = require('../dsl/breite.js');

test.describe('Trenner ziehen (B3303)', () => {
  test('folgt dem Zeiger: +100 px ergibt 460 px, danach −150 px ergibt 310 px (Szenario 1)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.breiteIst(360);

    await breite.ziehen(100);
    await breite.breiteIst(460);

    await breite.ziehen(-150);
    await breite.breiteIst(310);

    const lage = await breite.lage();
    expect(lage.diffBreite, `Diff-Breite (${lage.diffBreite} px)`).toBeGreaterThanOrEqual(320);
  });

  test('klemmt an der Höchst- und Mindestbreite (Szenario 2)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });

    await breite.ziehen(2000); // weit über die Höchstbreite hinaus
    await breite.breiteIst(640);

    await breite.ziehen(-2000); // weit über die Mindestbreite hinaus
    await breite.breiteIst(240);

    const lage = await breite.lage();
    expect(lage.diffBreite, `Diff-Breite an der Mindestbreite der Seitenleiste (${lage.diffBreite} px)`).toBeGreaterThanOrEqual(320);
  });

  test('hält den Zug auch bei einem schnellen Sprung (Pointer-Capture)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });

    await breite.ziehen(120, { schritte: 1 }); // ein einziger Sprung, keine Zwischenschritte

    await breite.breiteIst(480);
  });
});
