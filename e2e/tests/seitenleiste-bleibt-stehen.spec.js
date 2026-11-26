'use strict';
// Spezifikation R00033 „Seitenleiste bleibt stehen“ (I0034): der feste Rahmen, die zwei getrennten Rollbereiche, die Wahl in
// den Blick, alle Anzeigeverfahren und das schmale Fenster. Dieser Slice ist ausschließlich Browser-Eigenes (Layout, Scrollen,
// Fokus) — es gibt keinen Serverweg; die Kriterien laufen deshalb als Playwright-Akzeptanztests. Vorbereitung: Repo S
// (`s1` 200 Zeilen und 60 Dateien), Repo L (`l2`, Lücken im Diff), Repo Z (`z1 z3`, keine lückenlose Kette), Fenster 1280 × 800.
const { test, expect } = require('../dsl/seitenleiste.js');

// Die erste Dateizeile der Liste (der erste Eintrag der Gruppe Code; Gruppenköpfe stehen davor, R00040).
const ERSTE_ZEILE = '#datei-zeilen .datei-zeile';
const DATEI_ANMERKUNG = 'Die Umbenennung bricht den Aufrufer in der Auswertung; bitte die zweite Stelle nachziehen und den Test ergaenzen.';

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

test.describe('Alle Anzeigeverfahren und der Anschluss', () => {
  test('der Rahmen trägt beide Modi, beide Ansichten und beide Anordnungen (Lehre #7)', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo L', modus: 'zusammen' });
    await seit.dateiAnsehen('weit.txt');

    for (const modus of ['zusammen', 'einzeln']) {
      await seit.modus(modus);
      await seit.dateiAnsehen('weit.txt');
      for (const ansicht of ['aenderungen', 'ganz']) {
        await seit.ansicht(ansicht);
        await seit.diffZeigt('weit.txt');
        for (const anordnung of ['untereinander', 'nebeneinander']) {
          await seit.anordnung(anordnung);
          await seit.diffZeigt('weit.txt');
          await seit.keinSeitenbildlauf();
          await seit.listeIstRollbereich();
          await seit.diffIstRollbereich();
        }
      }
    }
  });

  test('das Aufklappen einer Lücke bewegt den Diff-Rollbereich, nicht die Seite', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo L', modus: 'einzeln' });
    await seit.dateiAnsehen('weit.txt');
    await seit.listeGanzUnten();

    const luecken = await seit.luecken();
    expect(luecken.length, 'Lücken im Diff').toBeGreaterThan(1);
    const listeVorher = (await seit.listeStand()).scrollTop;
    const diffVorher = await seit.letzteLueckeInDenBlick();
    const hoeheVorher = (await seit.diffStand()).scrollHeight;
    expect(diffVorher, 'die Lücke stand im Blick').toBeGreaterThan(0);

    await seit.lueckeAufklappen(luecken.length);
    await expect.poll(async () => (await seit.diffStand()).scrollHeight, 'Höhe des Diff-Rollbereichs nach dem Aufklappen').toBeGreaterThan(hoeheVorher);

    expect((await seit.diffStand()).scrollTop, 'der Diff-Rollbereich springt nicht an den Anfang').toBeGreaterThan(0);
    await seit.versatzGleich(listeVorher, (await seit.listeStand()).scrollTop, 'Dateiliste');
    await seit.keinSeitenbildlauf();
    expect((await seit.seitenstand()).scrollTop, 'die Seite selbst steht').toBe(0);
  });

  test('der Abschnittswechsel n scrollt im Diff-Rollbereich, nicht auf der Seite', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo L', modus: 'einzeln' });
    await seit.dateiAnsehen('weit.txt');
    await seit.listeGanzUnten();

    const listeVorher = (await seit.listeStand()).scrollTop;
    expect((await seit.diffStand()).scrollTop, 'Diff am Anfang').toBe(0);

    for (let schritt = 0; schritt < 6; schritt += 1) {
      await seit.abschnittWeiter();
    }

    expect((await seit.diffStand()).scrollTop, 'der Diff-Rollbereich ist dem Abschnittswechsel gefolgt').toBeGreaterThan(0);
    await seit.versatzGleich(listeVorher, (await seit.listeStand()).scrollTop, 'Dateiliste');
    expect((await seit.seitenstand()).scrollTop, 'die Seite selbst steht').toBe(0);
    await seit.keinSeitenbildlauf();
  });

  test('ein Suchtreffer außerhalb des Blicks wird im Diff-Rollbereich in den Blick gescrollt, die Dateiliste steht', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo L', modus: 'einzeln' });
    await seit.dateiAnsehen('weit.txt');
    await seit.listeGanzUnten();
    await seit.setzeDiffVersatz(0);

    const listeVorher = (await seit.listeStand()).scrollTop;
    await seit.suchen('Z1');

    const marken = await seit.sucheMarken();
    expect(marken.length, 'Treffer im Diff').toBeGreaterThan(1);
    const diffNachher = (await seit.diffStand()).scrollTop;
    expect(diffNachher, 'der Diff-Rollbereich ist dem Treffer gefolgt').toBeGreaterThan(0);
    await seit.versatzGleich(listeVorher, (await seit.listeStand()).scrollTop, 'Dateiliste');
    expect((await seit.seitenstand()).scrollTop, 'die Seite selbst steht').toBe(0);
    await seit.keinSeitenbildlauf();

    await seit.sucheWeiter();
    await seit.versatzGleich(listeVorher, (await seit.listeStand()).scrollTop, 'Dateiliste beim nächsten Treffer');
    expect((await seit.seitenstand()).scrollTop, 'die Seite selbst steht auch beim nächsten Treffer').toBe(0);
  });

  test('die Blockgrenze (content-visibility) hält ihren Knotenzähler im Diff-Rollbereich', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo L', modus: 'einzeln' });
    await seit.dateiAnsehen('weit.txt');

    const bloecke = await seit.bloecke();
    const zeilen = await seit.diffZeilen();
    expect(bloecke, 'Blöcke der Blockgrenze').toBeGreaterThan(1);
    expect(zeilen, 'gezeichnete Diff-Zeilen').toBeGreaterThan(100);
    // Auch nach einem Bildlauf durch den eigenen Rollbereich bleibt die Blockgrenze im Bereich: die Zeilen sind da.
    await seit.diffGanzUnten();
    expect(await seit.diffZeilen(), 'Diff-Zeilen nach dem Bildlauf').toBe(zeilen);
    await seit.keinSeitenbildlauf();
  });
});

// Befund B1 (R00033, Nacharbeit): Im festen Rahmen können die festen Kinder über dem Diff-Rollbereich nicht schrumpfen; in
// „Einzeln“ drücken viele Datei-Anmerkungen den Diff-Rollbereich auf 0 px und die Seite scrollt nicht mehr. Abnahme-Probe
// wörtlich: 10 Datei-Anmerkungen bei 1280×800, 6 bei 1280×800, 4 bei 1280×600 → `.df-sc` clientHeight > 0 und die letzte
// `.anm-zelle` erreichbar; dazu „Zusammen“ mit vielen Datei-Anmerkungen (dort liegen sie im Rollbereich).
test.describe('Datei-Anmerkungen verdrängen den Diff nicht', () => {
  for (const fall of [
    { name: '10 Datei-Anmerkungen, 1280×800', anzahl: 10, fenster: { width: 1280, height: 800 } },
    { name: '6 Datei-Anmerkungen, 1280×800', anzahl: 6, fenster: { width: 1280, height: 800 } },
    { name: '4 Datei-Anmerkungen, 1280×600', anzahl: 4, fenster: { width: 1280, height: 600 } },
  ]) {
    test(`${fall.name}: der Diff-Rollbereich bleibt benutzbar und die letzte Anmerkung ist erreichbar`, async ({ seit }) => {
      await seit.starten({ vorbereitung: 'Repo S zwei Commits', modus: 'einzeln', fenster: fall.fenster });
      await seit.dateiAnsehen('lang.txt');

      await seit.dateiAnmerkungenAnlegen(fall.anzahl, DATEI_ANMERKUNG);

      await seit.keinSeitenbildlauf();
      await seit.diffRollbereichBenutzbar();
      await seit.letzteAnmerkungImFenster();
    });
  }

  test('„Zusammen“ mit vielen Datei-Anmerkungen: der Diff-Rollbereich bleibt benutzbar und die letzte Anmerkung erreichbar', async ({ seit }) => {
    await seit.starten({ vorbereitung: 'Repo S zwei Commits', modus: 'zusammen' });
    await seit.dateiAnsehen('lang.txt');

    await seit.dateiAnmerkungenAnlegen(10, DATEI_ANMERKUNG);

    await seit.keinSeitenbildlauf();
    await seit.diffRollbereichBenutzbar();
    await seit.letzteAnmerkungErreichbar();
  });
});
