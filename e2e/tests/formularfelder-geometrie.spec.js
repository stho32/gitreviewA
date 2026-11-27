'use strict';
// Spezifikation R00055 „Eine Breitenregel für Formularfelder im Rollbereich“ (B5501): jedes Eingabefeld der Oberfläche (Text,
// Suche, Auswahl) liegt ganz in seinem Rollbereich — mit dem längsten Inhalt und vorhandener Anmerkung im Ändern-Modus, bei
// 1280 und 812 px, mit offener und zugeklappter Ergebnis-Spalte, Seitenleiste 240 und 640 px, in jeder Ansicht (Seitenleiste,
// Diff, Dateiansicht) und jedem Anzeigeverfahren. Die Felder werden per DOM gesammelt (nicht aufgezählt), damit ein vergessenes
// Feld auffällt. Browser-Eigenes (Geometrie), Repo P. Die Messung führt der Treiber `formularfelder-oberflaeche.js`.
const { test, expect } = require('../dsl/zeile-annotieren.js');
const dTreiber = require('../treiber/dateiansicht-d.js');
const trennerSeite = require('../treiber/trenner-oberflaeche.js');
const formularFelder = require('../treiber/formularfelder-oberflaeche.js');

const FENSTER = { width: 1280, height: 800 };
const SCHMAL = { width: 812, height: 800 };

// Die längsten Inhalte (Grenzen aus B4501 und der Anforderung): 200 Zeichen Suchtext und Muster, 2 000 Zeichen ohne Leerzeichen.
const LANG_SUCHE = 'x'.repeat(200);
const LANG_MUSTER = 'm'.repeat(200);
const LANG_NOTIZ = 'z'.repeat(2000);

/** Sammelt Seitenfehler ab jetzt (Konsole ohne `pageerror`); vor dem Öffnen der Seite aufrufen. */
function seitenfehlerSammeln(page) {
  const fehler = [];
  page.on('pageerror', e => fehler.push(String(e)));
  return () => fehler;
}

/** Den Spaltenzustand der Abnahme-Probe herstellen: 1280 startet mit offener Spalte, 812 mit zugeklappter (R00037/R00042). */
async function spaltenzustand(anm, fenster, spalteOffen) {
  await anm.fensterSetzen(fenster);
  const startetOffen = fenster.width >= 1012;
  if (spalteOffen !== startetOffen) {
    await anm.ergebnisSpalteUmschalten();
  }
  if (spalteOffen) {
    await anm.ergebnisSpalteSichtbar();
  } else {
    await anm.ergebnisSpalteVerborgen();
  }
}

/** Die Ansicht der Abnahme-Probe: Repo P, Fenster, Spaltenzustand, Seitenleistenbreite, eine Datei angesehen, Suche im Diff offen. */
async function ansichtVorbereiten(anm, fenster, spalteOffen, breite) {
  await anm.starten({ vorbereitung: 'Repo P', modus: 'zusammen' });
  await spaltenzustand(anm, fenster, spalteOffen);
  await anm.seitenleisteZiehenAuf(breite);
  await anm.dateiAnsehen('src/app.js');
  await anm.suchen('app');
}

/** Die Felder der Seitenleiste und des Diffs, die in der Probe vorkommen müssen (Positivkontrolle der Sammlung). */
const FELDER_ZUSAMMEN = ['dateisuche-eingabe', 'ausblenden-eingabe', 'diff-suche'];

test.describe('Kriterium 1: kein Feld ragt über seinen Rollbereich (Repo P, jede Fenster-, Spalten- und Leistenbreite)', () => {
  // 640 px Seitenleiste ist nur bei genügend Fenster (≥ 24 + 6 + 320 + 640 = 990 px) und zugeklappter Spalte erreichbar;
  // bei 812 px bleibt der Seitenleiste zu wenig Platz — 240 px ist dort die schmalste geprüfte Breite (R00034-Grenzen).
  const FAELLE = [
    ['1280 × 800, Spalte offen, Leiste 240', FENSTER, true, 240],
    ['1280 × 800, Spalte zu, Leiste 240', FENSTER, false, 240],
    ['1280 × 800, Spalte zu, Leiste 640', FENSTER, false, 640],
    ['812 × 800, Spalte offen, Leiste 240', SCHMAL, true, 240],
    ['812 × 800, Spalte zu, Leiste 240', SCHMAL, false, 240],
  ];
  for (const [name, fenster, spalteOffen, breite] of FAELLE) {
    test(`soll bei ${name} jedes Feld im Rollbereich halten`, async ({ anm, page }) => {
      const seitenfehler = seitenfehlerSammeln(page);
      await ansichtVorbereiten(anm, fenster, spalteOffen, breite);

      await formularFelder.erwarteFelder(page, FELDER_ZUSAMMEN, name);
      await formularFelder.erwarteFelderImBereich(page, name);
      expect(seitenfehler(), `Seitenfehler (${name})`).toEqual([]);
    });
  }
});

test.describe('Kriterium 2: auch mit dem längsten Inhalt hängt die Feldbreite nicht vom Inhalt ab', () => {
  for (const [name, fenster] of [['1280 × 800', FENSTER], ['812 × 800', SCHMAL]]) {
    test(`soll bei ${name}, Leiste 240, mit 200 Zeichen Suchtext/Muster und 2 000 Zeichen Notiz jedes Feld im Rollbereich halten`, async ({ anm, page }) => {
      const seitenfehler = seitenfehlerSammeln(page);
      await anm.starten({ vorbereitung: 'Repo P', modus: 'zusammen' });
      const angelegt = await anm.ueberDieSchnittstelleAnlegen('p2', 'src/app.js', 1, LANG_NOTIZ);
      await anm.neuLaden();
      await spaltenzustand(anm, fenster, true);
      await anm.seitenleisteZiehenAuf(240);
      await anm.dateiAnsehen('src/app.js');
      await anm.suchen('app');
      await anm.aendern(angelegt.nummer);

      const vorher = await formularFelder.lage(page);
      // Längster Inhalt: 200 Zeichen ins Suchfeld und ins Ausblendmuster (nach der Messung ohne Inhalt für den Vergleich).
      await page.locator('#dateiliste-suche').fill(LANG_SUCHE);
      await page.locator('#ausblenden-eingabe').fill(LANG_MUSTER);

      await formularFelder.erwarteFelder(page, [...FELDER_ZUSAMMEN, 'anm-eingabe'], name);
      const nachher = await formularFelder.erwarteFelderImBereich(page, name);

      // Die Feldbreite hängt nicht vom Inhalt ab: jedes weiterhin sichtbare Feld behält seine Breite.
      const breitenVorher = new Map(vorher.map(e => [e.feld.kennung, e.feld.breite]));
      for (const { feld } of nachher) {
        if (breitenVorher.has(feld.kennung)) {
          expect(feld.breite, `${feld.kennung}: Breite mit langem Inhalt (${name})`).toBe(breitenVorher.get(feld.kennung));
        }
      }
      expect(seitenfehler(), `Seitenfehler (${name})`).toEqual([]);
    });
  }
});

test.describe('Kriterium 3: in jedem Anzeigeverfahren dieselbe Lage', () => {
  const VERFAHREN = [
    ['nur Änderungen, untereinander', 'nur Änderungen', 'untereinander'],
    ['ganze Datei, untereinander', 'ganze Datei', 'untereinander'],
    ['nur Änderungen, nebeneinander', 'nur Änderungen', 'nebeneinander'],
  ];
  for (const [name, ansicht, anordnung] of VERFAHREN) {
    for (const umbruch of ['an (Start)', 'umgeschaltet']) {
      test(`soll bei 812 × 800, Leiste 240, in „Einzeln“ — ${name}, Umbruch ${umbruch} — jedes Feld im Rollbereich halten`, async ({ anm, page }) => {
        const seitenfehler = seitenfehlerSammeln(page);
        await ansichtVorbereiten(anm, SCHMAL, true, 240);
        await anm.modusWaehlen('einzeln');
        await anm.ansichtWaehlen(ansicht);
        await anm.ansichtWaehlen(anordnung);
        if (umbruch === 'umgeschaltet') {
          await anm.umbruchUmschalten();
        }

        // „Einzeln“ zeigt den Commit-Wähler: die Auswahl ist ein Feld der Regel und muss dabei sein.
        await formularFelder.erwarteFelder(page, [...FELDER_ZUSAMMEN, 'gr-waehler-auswahl'], `${name}, Umbruch ${umbruch}`);
        await formularFelder.erwarteFelderImBereich(page, `${name}, Umbruch ${umbruch}`);
        expect(seitenfehler(), `Seitenfehler (${name}, Umbruch ${umbruch})`).toEqual([]);
      });
    }
  }
});

test.describe('Kriterium 1 in der Dateiansicht (--dateien)', () => {
  let d;
  test.beforeAll(() => {
    d = dTreiber.ordnerDAnlegen();
  });
  test.afterAll(() => {
    dTreiber.entfernen(d);
  });

  // Die Leiste der Dateiansicht lässt sich wie im Review ziehen (R00045): die schmalste Breite 240 und ein Zug bis an die
  // Höchstbreite (er wird dort geklemmt) geben die engste Werkzeugleiste — dort bricht sie um, statt über den Bereich zu laufen.
  const FAELLE = [
    ['1280 × 800, Leiste 360', FENSTER, null],
    ['812 × 800, Leiste 240', SCHMAL, 240],
    ['812 × 800, Leiste an die Höchstbreite gezogen', SCHMAL, 640],
  ];
  for (const [name, fenster, zielBreite] of FAELLE) {
    test(`soll bei ${name} das Suchfeld der Dateiansicht ganz in seinem Rollbereich halten`, async ({ page }) => {
      const seitenfehler = seitenfehlerSammeln(page);
      const lauf = await dTreiber.starten(d, 'mig.sql');
      try {
        await page.setViewportSize(fenster);
        await dTreiber.oeffnen(page, lauf);
        if (zielBreite !== null) {
          await trennerSeite.warteAufGroesse(page);
          const jetzt = Number((await trennerSeite.trennerAngaben(page)).jetzt);
          await trennerSeite.ziehen(page, zielBreite - jetzt);
        }
        await page.locator('#da-suche').fill('Teil');

        await formularFelder.erwarteFelder(page, ['da-suche'], name);
        await formularFelder.erwarteFelderImBereich(page, name);
        expect(seitenfehler(), `Seitenfehler (${name})`).toEqual([]);
      } finally {
        await dTreiber.beenden(lauf);
      }
    });
  }
});
