'use strict';
// Spezifikation R00033 „Seitenleiste bleibt stehen“ (I0034): der feste Rahmen, die zwei getrennten Rollbereiche, die Wahl in
// den Blick, alle Anzeigeverfahren und das schmale Fenster. Dieser Slice ist ausschließlich Browser-Eigenes (Layout, Scrollen,
// Fokus) — es gibt keinen Serverweg; die Kriterien laufen deshalb als Playwright-Akzeptanztests. Vorbereitung: Repo S
// (`s1` 200 Zeilen und 60 Dateien), Repo L (`l2`, Lücken im Diff), Repo Z (`z1 z3`, keine lückenlose Kette), Fenster 1280 × 800.
const { test, expect } = require('../dsl/seitenleiste.js');

const ERSTE_ZEILE = '#datei-zeilen .datei-zeile:first-child';

test.describe('Zwei getrennte Rollbereiche', () => {
  test('die Seite selbst scrollt nicht, Dateiliste und Diff-Bereich haben je eine eigene Bildlaufleiste', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S' });
    await seit.dateiAnsehen('lang.txt');

    await seit.keinSeitenbildlauf();
    await seit.listeIstRollbereich();
    await seit.diffIstRollbereich();
  });

  test('Scrollen im Diff lässt Kopf, Commit-Zeile, Werkzeugzeilen und Dateiliste stehen; die Liste bewegt den Diff nicht', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S' });
    await seit.dateiAnsehen('lang.txt');

    const vorher = await seit.standbild();
    await seit.listeGanzOben();
    const listeVorher = (await seit.listeStand()).scrollTop;
    const diffVorher = (await seit.diffStand()).scrollTop;

    await seit.diffGanzUnten();

    await seit.versatzGeaendert(diffVorher, (await seit.diffStand()).scrollTop, 'Diff-Bereich');
    await seit.unveraendert(await seit.stehendeTeile(vorher), await seit.stehendeTeile(await seit.standbild()), 'Kopf, Commit-Zeile, Werkzeugzeilen und Dateiliste');
    await seit.versatzGleich(listeVorher, (await seit.listeStand()).scrollTop, 'Dateiliste');

    const diffNachDiff = (await seit.diffStand()).scrollTop;
    await seit.listeGanzUnten();

    await seit.versatzGeaendert(listeVorher, (await seit.listeStand()).scrollTop, 'Dateiliste');
    await seit.versatzGleich(diffNachDiff, (await seit.diffStand()).scrollTop, 'Diff-Bereich');
    await seit.keinSeitenbildlauf();
  });

  test('bei Fensterhöhe 600 bleiben beide Rollbereiche intakt und der Kopf samt Werkzeugzeilen sichtbar', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S', fenster: { width: 1280, height: 600 } });
    await seit.dateiAnsehen('lang.txt');

    await seit.keinSeitenbildlauf();
    await seit.listeIstRollbereich();
    await seit.diffIstRollbereich();

    const kopf = await seit.lage('header.kz');
    const werkzeuge = await seit.lage('#dateiliste .dateien-kopf');
    expect(kopf.y, 'Kopf am oberen Rand').toBe(0);
    expect(kopf.unten, 'Kopf sichtbar').toBeLessThanOrEqual(600);
    expect(werkzeuge.y, 'Werkzeugzeile der Dateiliste unter dem Kopf').toBeGreaterThanOrEqual(kopf.unten - 1);
    expect(werkzeuge.unten, 'Werkzeugzeile der Dateiliste sichtbar').toBeLessThanOrEqual(600);
  });
});

test.describe('Schmales Fenster', () => {
  test('unter 566 px eine Spalte ohne getrennte Rollbereiche, ab 566 px zwei Spalten mit getrennten Rollbereichen', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S' });
    await seit.dateiAnsehen('lang.txt');

    await seit.fensterSetzen({ width: 560, height: 800 });

    await seit.eineSpalte();
    await seit.seitenbildlauf();
    await seit.keinTrennerKeinEinklappen();

    await seit.fensterSetzen({ width: 566, height: 800 });

    await seit.zweiSpalten();
    await seit.keinSeitenbildlauf();
    await seit.listeIstRollbereich();
    await seit.diffIstRollbereich();
  });
});

test.describe('Wahl in den Blick', () => {
  test('j holt die gewählte Zeile gerade so weit in den Blick, der Diff beginnt oben, der Fokus steht auf der Zeile', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S' });
    await seit.listeGanzOben();

    for (let schritt = 0; schritt < 45; schritt += 1) {
      await seit.druecke('j');
    }

    const wahl = await seit.lageDerWahl();
    expect(wahl.pfad, 'die Wahl ist 45 Zeilen weiter').toBe('d45.txt');
    expect(wahl.ganzImBlick, `gewählte Zeile ${wahl.pfad} im Blick`).toBe(true);
    expect(wahl.listenVersatz, 'die Liste ist gescrollt (die erste Zeile ist nicht mehr sichtbar)').toBeGreaterThan(0);
    expect((await seit.lage(ERSTE_ZEILE)).unten, 'erste Zeile aus dem Blick').toBeLessThan(0);
    // Kleinste Bewegung: die Zeile sitzt genau am unteren Rand ihres Rollbereichs, nicht in der Mitte.
    const abstand = await seit.abstandDerWahl();
    expect(abstand.unten, `Abstand der gewählten Zeile zum unteren Rand (${abstand.unten} px)`).toBeLessThanOrEqual(1);
    expect(wahl.diffVersatz, 'der Diff beginnt oben').toBe(0);
    expect(wahl.seitenVersatz, 'die Seite selbst scrollt nicht').toBe(0);

    await seit.fokusAufDateizeile(wahl.pfad);
    await seit.diffZeigt(wahl.pfad);
  });

  test('„Nächste ungeprüfte“ holt die Zeile in den Blick, der Diff beginnt oben, der Fokus bleibt auf dem Knopf', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S' });
    await seit.dateiAnsehen('lang.txt');
    await seit.setzeDiffVersatz(1500);
    await seit.kaestchen('d01.txt').click();
    await seit.abgehakt('d01.txt', true);
    await seit.listeGanzUnten();

    await seit.naechsteUngepruefte();

    await seit.gewaehlt('d02.txt');
    await seit.diffZeigt('d02.txt');
    await seit.diffOben();
    await seit.fokusAufKnopf();
    expect(await seit.wahlImRollbereich(), 'die gewählte Zeile ist im Blick').toBe(true);
    await seit.keinSeitenbildlauf();
  });

  test('eine schon sichtbare Wahl scrollt die Liste nicht', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S' });
    await seit.listeGanzOben();

    await seit.druecke('j');
    const nachErstem = (await seit.listeStand()).scrollTop;
    await seit.druecke('j');

    await seit.versatzGleich(0, nachErstem, 'Dateiliste nach dem ersten Schritt');
    await seit.versatzGleich(nachErstem, (await seit.listeStand()).scrollTop, 'Dateiliste nach dem zweiten Schritt');
    expect(await seit.wahlImRollbereich(), 'die gewählte Zeile ist im Blick').toBe(true);
  });

  test('der Diff springt bei Modus-, Ansichts- und Anordnungswechsel an den Anfang', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S zwei Commits' });
    await seit.dateiAnsehen('lang.txt');

    for (const wechsel of [
      ['Modus', () => seit.modus('einzeln')],
      ['Ansicht', () => seit.ansicht('ganz')],
      ['Anordnung', () => seit.anordnung('nebeneinander')],
    ]) {
      const [name, umschalten] = wechsel;
      await seit.dateiAnsehen('lang.txt');
      await seit.setzeDiffVersatz(1500);
      expect((await seit.diffStand()).scrollTop, `${name}: Vorbedingung gescrollter Diff`).toBe(1500);

      await umschalten();

      await seit.diffZeigt('lang.txt');
      await seit.diffOben();
    }
  });
});
