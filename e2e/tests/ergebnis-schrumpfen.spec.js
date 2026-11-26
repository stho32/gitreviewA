'use strict';
// Spezifikation R00042 „Ergebnis-Spalte ziehen“ (I0043, B4104): das schrumpfende und wachsende Fenster und das Ausklappen im engen
// Fenster — beim Schrumpfen gibt zuerst die Ergebnis-Spalte nach (bis 240), dann klappt sie selbständig ein und bleibt zu, bis
// man sie ausklappt; klappt der Mensch die Spalte im engen Fenster aus, gibt zuerst die Seitenleiste nach (Vorrang A, PO Zeile
// 248); klappt er die Seitenleiste aus, während die Spalte offen ist, klappt die Spalte ein; der Fokus geht beim selbständigen
// Einklappen nie ins Leere (Kriterien 4, 7, 8, 9). Browser-Eigenes (Fenstergröße, Fokus, Tab-Weg); Vorbereitung Repo S, 1280 × 800.
const { test, expect } = require('../dsl/breite.js');

test.describe('Schrumpfendes Fenster (B4104, Kriterium 4)', () => {
  test('1100 → 1000 → 900: erst 320, dann 308, dann klappt sie ein und bleibt zu; Ausklappen bringt 320 zurück', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.spalteBreiteIst(320);

    await breite.fensterSetzen({ width: 1100, height: 800 });
    await breite.spalteBreiteIst(320);
    expect((await breite.rechteLage()).diffBreite, 'Diff bei 1100 (1100 − 360 − 12 − 320)').toBe(408);

    await breite.fensterSetzen({ width: 1000, height: 800 });
    await breite.spalteBreiteIst(308);
    expect((await breite.rechteLage()).diffBreite, 'Diff bei 1000').toBe(320);

    await breite.fensterSetzen({ width: 900, height: 800 });
    await breite.spalteVerborgen();
    expect((await breite.rechteLage()).diffBreite, 'Diff bei 900 (Spalte zu)').toBeGreaterThanOrEqual(320);

    // Beim Wachsen kommt die Spalte nicht von selbst zurück (R00042: sie bleibt zu, bis man sie ausklappt).
    await breite.fensterSetzen({ width: 1280, height: 800 });
    await breite.spalteVerborgen();

    await breite.spalteAusklappen();
    await breite.spalteSichtbar();
    await breite.spalteBreiteIst(320);
  });
});

test.describe('Ausklappen im engen Fenster (B4104, Kriterium 7)', () => {
  test('die Seitenleiste gibt auf 248 nach (Diff 320), bei 1280 px sind es wieder 360/320, bei 1000 px wieder die Reihenfolge von 4', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fensterSetzen({ width: 900, height: 800 });
    await breite.spalteVerborgen();

    await breite.spalteAusklappen();
    await breite.spalteSichtbar();
    await breite.spalteBreiteIst(320);
    await breite.breiteIst(248);
    expect((await breite.rechteLage()).diffBreite, 'Diff bei 900 mit ausgeklappter Spalte').toBe(320);

    await breite.fensterSetzen({ width: 1280, height: 800 });
    await breite.spalteBreiteIst(320);
    await breite.breiteIst(360);

    // Danach gilt wieder die normale Reihenfolge: die Spalte gibt zuerst nach.
    await breite.fensterSetzen({ width: 1000, height: 800 });
    await breite.spalteBreiteIst(308);
    await breite.breiteIst(360);
  });
});

test.describe('Seitenleiste ausklappen bei offener Spalte (B4104, Kriterium 8)', () => {
  test('die Spalte klappt ein (Diff 510) und bleibt zu, wenn die Seitenleiste wieder einklappt', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.druecke('b');
    await breite.seitenleisteVerborgen();

    // 900 px, Seitenleiste eingeklappt, Spalte offen — die Spalte bleibt offen (900 − 24 − 6 − 320 = 550 ≥ 320).
    await breite.fensterSetzen({ width: 900, height: 800 });
    await breite.spalteSichtbar();
    await breite.spalteBreiteIst(320);

    // Seitenleiste ausdrücklich ausklappen: 360 + 6 + 240 + 6 + 320 = 932 > 900 → die Spalte klappt ein.
    await breite.druecke('b');
    await breite.seitenleisteSichtbar();
    await breite.spalteVerborgen();
    expect((await breite.rechteLage()).diffBreite, 'Diff bei 900 (900 − 360 − 6 − 24)').toBe(510);

    await breite.druecke('b');
    await breite.seitenleisteVerborgen();
    await breite.spalteVerborgen();
  });

  test('bei 1280 px und eingeklappter Seitenleiste ist die Höchstbreite der Spalte 640', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.druecke('b');
    await breite.seitenleisteVerborgen();

    await breite.fokussiereRechtenTrenner();
    await breite.druecke('End');
    await breite.spalteBreiteIst(640);
  });
});

test.describe('Fokus beim selbständigen Einklappen (B4104, Kriterium 9)', () => {
  test('stand der Fokus auf dem rechten Trenner, steht er nach dem Verkleinern auf dem Ausklapp-Knopf; der Tab-Weg hat keinen unsichtbaren Stopp', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fokussiereRechtenTrenner();
    expect((await breite.rechterTrennerAngaben()).fokussiert, 'Vorbedingung: Fokus auf dem rechten Trenner').toBe(true);

    await breite.fensterSetzen({ width: 900, height: 800 });
    await breite.spalteVerborgen();
    await breite.fokusAufSpaltenKnopf();

    await breite.druecke('Tab');
    const stopp = await breite.tabWeiter();
    expect(stopp.sichtbar, `der nächste Tab-Stopp ist sichtbar (${JSON.stringify(stopp)})`).toBe(true);
    expect(stopp.istRechterTrenner, 'kein unsichtbarer Stopp auf dem eingeklappten Trenner').toBe(false);
  });
});
