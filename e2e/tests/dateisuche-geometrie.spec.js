'use strict';
// Spezifikation R00052 „Suchfeld der Dateiliste ragt unter den Einklapp-Knopf“, B4801–B4803: das Feld „Dateien suchen“ liegt
// ganz im Kopf der Seitenleiste, ein Klick auf seine rechte Kante fokussiert es statt die Seitenleiste einzuklappen, und das gilt
// bei jeder Seitenleistenbreite (240–640 px) und jeder Fensterbreite. Browser-Eigenes (Geometrie, Klickfläche), Repo P.
const { test, expect } = require('../dsl/dateisuche.js');

const SQL_DATEIEN = ['db/001_anlegen.sql', 'db/002_aendern.sql', 'src/data/app.sql'];
const FENSTER = { width: 1280, height: 800 };
const SCHMAL = { width: 812, height: 800 };

/** Die Breiten der Abnahme-Probe (Kriterium 3, R00034): schmalste, Start- und breiteste Seitenleiste. */
const BREITEN = [240, 360, 640];

async function messung(dateisuche) {
  const lage = await dateisuche.lage();
  expect(lage, 'Suchfeld, Knopf und Seitenleiste im DOM').not.toBeNull();
  return lage;
}

test.describe('Kopfzeile der Seitenleiste ohne Überlauf (B4802: Kriterium 1, Vorarbeit)', () => {
  for (const [name, fenster] of [['1280 × 800', FENSTER], ['812 × 800', SCHMAL]]) {
    test(`soll bei ${name} kein Kind der Kopfzeile aus der Seitenleiste laufen lassen`, async ({ dateisuche }) => {
      await dateisuche.starten();
      await dateisuche.fensterSetzen(fenster);

      const lage = await messung(dateisuche);

      expect(lage.suchzeile.rechts, `rechte Kante der Suchzeile (${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.leiste.innenRechts);
      expect(lage.feldzeile.rechts, `rechte Kante der Feldzeile (${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.leiste.innenRechts);
    });
  }
});

test.describe('Breite des Suchfelds am Behälter (B4801: Kriterium 1, Vorarbeit)', () => {
  for (const [name, fenster] of [['1280 × 800', FENSTER], ['812 × 800', SCHMAL]]) {
    test(`soll bei ${name} nie breiter als der Innenbereich der Seitenleiste sein`, async ({ dateisuche }) => {
      await dateisuche.starten();
      await dateisuche.fensterSetzen(fenster);

      const lage = await messung(dateisuche);

      expect(lage.feld.breite, `Breite des Feldes (${JSON.stringify(lage)})`).toBeLessThanOrEqual(256);
      expect(lage.feld.rechts, `rechte Feldkante (${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.leiste.innenRechts);
    });
  }

  // Die alte Regel band die Obergrenze an den Viewport (60vw): im schmalen Fenster (eine Spalte, R00033) wurde das Feld 240 px
  // breit, obwohl sein Behälter 16rem trägt. Die Behälterbindung hält den Startwert 16rem — hier ist der Unterschied messbar.
  test('soll den Startwert 16rem am Behälter messen, nicht am Viewport (400 px: 256 statt 60vw)', async ({ dateisuche }) => {
    await dateisuche.starten();
    await dateisuche.fensterSetzen({ width: 400, height: 800 });

    const lage = await messung(dateisuche);

    expect(lage.feld.breite, `16rem = 256 px im schmalen Fenster (${JSON.stringify(lage)})`).toBe(256);
    expect(lage.feld.rechts, `rechte Feldkante (${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.leiste.innenRechts);
  });
});

test.describe('Abnahme-Probe des Entwicklertesters (B4803: Kriterium 1)', () => {
  for (const [name, fenster] of [['1280 × 800', FENSTER], ['812 × 800', SCHMAL]]) {
    test(`soll bei ${name} das Feld vor dem Knopf halten, und der Treffer an seiner rechten Kante ist das Feld`, async ({ dateisuche }) => {
      await dateisuche.starten();
      await dateisuche.fensterSetzen(fenster);

      const lage = await messung(dateisuche);

      expect(lage.feld.rechts, `feld.right ≤ knopf.left (${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.knopf.links);
      expect(lage.trefferFeld, `elementFromPoint(feld.right−4) trifft ${lage.treffer}`).toBe(true);
      expect(lage.kanteAmFeld, 'die rechte Kante des Feldes ist gezeichnet').toBe(true);
    });
  }
});

test.describe('Klickfläche des Feldes (Kriterium 2)', () => {
  test('soll beim Klick auf den rechten Feldrand fokussieren, die Seitenleiste offen lassen und *.sql filtern', async ({ dateisuche }) => {
    await dateisuche.starten();

    await dateisuche.klickAnDieRechteFeldkante();

    await dateisuche.fokusImSuchfeld();
    expect(await dateisuche.einklappKnopfErweitert(), 'die Seitenleiste bleibt ausgeklappt').toBe('true');
    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(3);
    expect(await dateisuche.dateinamen()).toEqual(SQL_DATEIEN);
  });
});

test.describe('Jede Darstellung und der eingeklappte Zustand (Kriterien 4 und 5)', () => {
  test('soll in „Einzeln“ und im Baum dieselbe Lage haben', async ({ dateisuche }) => {
    await dateisuche.starten();

    for (const modus of ['einzeln', 'zusammen']) {
      await dateisuche.modusWaehlen(modus);
      for (const art of ['flach', 'baum']) {
        await dateisuche.darstellung(art);
        const lage = await messung(dateisuche);
        expect(lage.feld.rechts, `feld.right ≤ knopf.left in ${modus}/${art} (${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.knopf.links);
        expect(lage.trefferFeld, `Treffer an der rechten Feldkante in ${modus}/${art} (${lage.treffer})`).toBe(true);
      }
    }
  });

  test('soll nach dem Einklappen und Ausklappen wieder ganz in der Seitenleiste stehen, und f fokussiert das Feld', async ({ dateisuche }) => {
    await dateisuche.starten();

    await dateisuche.einklappen();
    await dateisuche.eingeklappt();
    await dateisuche.einklappen();
    await dateisuche.ausgeklappt();

    const lage = await messung(dateisuche);
    expect(lage.feld.rechts, `feld.right ≤ knopf.left nach dem Ausklappen (${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.knopf.links);
    expect(lage.trefferFeld, `Treffer an der rechten Feldkante (${lage.treffer})`).toBe(true);

    await dateisuche.druecke('f');
    await dateisuche.fokusImSuchfeld();
  });
});

test.describe('Jede Seitenleistenbreite (Kriterium 3)', () => {
  test('soll bei 240, 360 und 640 px gelten, wenn man die Breite am Trenner zieht', async ({ dateisuche }) => {
    await dateisuche.starten();
    // Bei 1280 px gäbe die Ergebnis-Spalte die breiteste Seitenleiste nicht frei (R00042) — sie ist für diese Probe nicht nötig.
    await dateisuche.ergebnisSpalteEinklappen();
    await dateisuche.ergebnisSpalteVerborgen();

    for (const breite of BREITEN) {
      await dateisuche.seitenleisteZiehenAuf(breite);
      const lage = await messung(dateisuche);

      expect(lage.feld.rechts, `feld.right ≤ knopf.left bei ${breite} px (${JSON.stringify(lage)})`).toBeLessThanOrEqual(lage.knopf.links);
      expect(lage.trefferFeld, `Treffer an der rechten Feldkante bei ${breite} px (${lage.treffer})`).toBe(true);
      expect(lage.feld.breite, `Feld nie breiter als der Innenbereich bei ${breite} px`).toBeLessThanOrEqual(lage.leiste.innenRechts - lage.feld.links);
    }
  });
});