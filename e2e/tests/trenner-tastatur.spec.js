'use strict';
// Spezifikation R00034 „Breite der Seitenleiste ziehen“ (I0035, B3304): der Trenner ist per Tastatur erreichbar und trägt die
// ARIA-Angaben des Splitter-Musters; Pfeil rechts/links verstellen um 16 px, Pos1/Ende setzen auf die Grenzen, ein sichtbarer
// Fokusring liegt an. Browser-Eigenes (Fokus, Tastendruck, aria-*); Vorbereitung Repo S, Fenster 1280 × 800.
const { test, expect } = require('../dsl/breite.js');

test.describe('Trenner per Tastatur (B3304)', () => {
  test('trägt Fokus, die ARIA-Angaben und einen Namen; Pfeile und Pos1/Ende verstellen (Szenario 4)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });

    await breite.fokussiereTrenner();
    expect(await breite.fokusAufTrenner(), 'der Trenner hat den Fokus').toBe(true);
    await breite.trennerAria(360);
    await breite.fokusringSichtbar();

    await breite.druecke('ArrowRight');
    await breite.breiteIst(376);
    expect(await breite.valuenow(), 'aria-valuenow folgt der Breite').toBe(376);

    await breite.druecke('ArrowLeft');
    await breite.breiteIst(360);

    await breite.druecke('Home');
    await breite.breiteIst(240);

    await breite.druecke('End');
    await breite.breiteIst(628); // 1280 − 320 − 6 − 326 (ausgeklappte Ergebnis-Spalte, R00037)
    expect(await breite.valuenow(), 'aria-valuenow zeigt die Höchstbreite').toBe(628);
  });

  test('bleibt an der Mindestbreite stehen: kein Wert unter 240 px (aria-valuenow bleibt)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });

    await breite.fokussiereTrenner();
    await breite.druecke('Home');
    await breite.breiteIst(240);

    await breite.druecke('Home');
    await breite.druecke('ArrowLeft');

    await breite.breiteIst(240);
    expect(await breite.valuenow(), 'aria-valuenow bleibt an der Mindestbreite').toBe(240);
  });

  test('nennt die tatsächliche Höchstbreite im aria-valuemax (enges Fenster: Ende klemmt bei Fenster − 350)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fensterSetzen({ width: 700, height: 800 });

    await breite.fokussiereTrenner();
    expect((await breite.trennerAngaben()).max, 'aria-valuemax im 700-px-Fenster').toBe('350');

    await breite.druecke('End');
    await breite.breiteIst(350);
  });
});
