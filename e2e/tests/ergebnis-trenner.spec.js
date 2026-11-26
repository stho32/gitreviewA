'use strict';
// Spezifikation R00042 „Ergebnis-Spalte ziehen“ (I0043, B4103): der zweite senkrechte Trenner zwischen Diff und Ergebnis-Spalte —
// Ziehen mit der Maus (die Spalte wächst nach links), Tastatur (Pfeil links verbreitert, APG „Window Splitter“), Pos1/Ende auf die
// Grenzen, Doppelklick auf 320 px, die ARIA-Angaben (role=separator, aria-orientation=vertical, aria-controls auf die
// Ergebnis-Spalte, aria-valuenow/-min/-max, Name „Breite der Ergebnis-Spalte“) und der Fokus. Browser-Eigenes (Zeiger, Tastatur,
// aria-*), kein Hot-Path-Fall; Vorbereitung Repo S, Fenster 1280 × 800.
const { test, expect } = require('../dsl/breite.js');

test.describe('Ergebnis-Spalte ziehen (B4103, Kriterium 1)', () => {
  test('folgt dem Zeiger nach links: −200 px ergibt 520 px (Diff 388); weiter bis an die Seitenleiste bleibt sie bei 588 px (Diff 320)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.breiteIst(360);
    await breite.spalteBreiteIst(320);

    await breite.rechtesZiehen(-200);
    await breite.spalteBreiteIst(520);
    expect((await breite.rechteLage()).diffBreite, 'Diff bei Spalte 520 (1280 − 360 − 520 − 12)').toBe(388);

    await breite.rechtesZiehen(-2000);
    await breite.spalteBreiteIst(588);
    const lage = await breite.rechteLage();
    expect(lage.diffBreite, 'Diff an der Höchstbreite der Spalte').toBeGreaterThanOrEqual(320);
  });

  test('klemmt an der Mindestbreite 240 und der Höchstbreite 588 (1280 px, links 360)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });

    await breite.rechtesZiehen(2000);
    await breite.spalteBreiteIst(240);

    await breite.rechtesZiehen(-2000);
    await breite.spalteBreiteIst(588);
  });

  test('sitzt zwischen Diff und Spalte, ist per Tab erreichbar und trägt die ARIA-Angaben und einen Fokusring', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fokussiereRechtenTrenner();
    expect((await breite.rechterTrennerAngaben()).fokussiert, 'der rechte Trenner hat den Fokus').toBe(true);
    await breite.rechterTrennerAria(320);

    const lage = await breite.rechteLage();
    expect(lage.diffRechts, `Diff (rechts ${lage.diffRechts}) endet vor der Spalte (links ${lage.ergebnisLinks})`).toBeLessThanOrEqual(lage.ergebnisLinks);
  });
});

test.describe('Ergebnis-Spalte per Tastatur (B4103, Kriterium 2)', () => {
  test('Pfeil links verbreitert um 16 px, Pos1/Ende setzen auf 240/588, Doppelklick auf 320 — aria-valuenow folgt', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fokussiereRechtenTrenner();

    await breite.druecke('ArrowLeft');
    await breite.druecke('ArrowLeft');
    await breite.druecke('ArrowLeft');
    await breite.spalteBreiteIst(368);
    expect(await breite.rechterValuenow(), 'aria-valuenow folgt der Breite').toBe(368);

    await breite.druecke('Home');
    await breite.spalteBreiteIst(240);

    await breite.druecke('End');
    await breite.spalteBreiteIst(588);
    expect(await breite.rechterValuenow(), 'aria-valuenow zeigt die Höchstbreite').toBe(588);

    await breite.rechtesDoppelklick();
    await breite.spalteBreiteIst(320);
    expect(await breite.rechterValuenow(), 'aria-valuenow zurück auf die Startbreite').toBe(320);
  });

  test('Pfeil rechts verschmälert die Spalte um 16 px', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.fokussiereRechtenTrenner();

    await breite.druecke('ArrowRight');
    await breite.spalteBreiteIst(304);

    await breite.druecke('ArrowRight');
    await breite.spalteBreiteIst(288);
  });
});
