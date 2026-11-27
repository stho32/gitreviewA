'use strict';
// Spezifikation R00056 „Dateinamen in schmaler Seitenleiste“ (B5601, Messprobe): Repo N (User Story R00056) bei 812 × 800 mit
// offener Ergebnis-Spalte (Seitenleiste 240 px) und 1280 × 800 (360 px). Kriterien 1–6: Pfadbreite ≥ 5rem, Umbruch nur nach einem
// Trenner (`/`, `-`, `_`, `.`) oder im Notfall-Stück, kein Überlauf (`scrollWidth ≤ clientWidth`, rechte Kante jedes Kindes),
// bedienbare Haken und Zahlen, einzeilig bei 1280 für Namen, die in den Pfad passen (Tiefe 0/1), alle Anzeigeverfahren.
// Kriterium 7 (Text unverändert) prüft `dateinamen-text.spec.js`. Browser-Eigenes (Geometrie, Zeilenlage), Treiber
// `dateinamen-oberflaeche.js`.
const { test, expect, ANZAHL_DATEIEN, SCHMALE_LEISTE } = require('../dsl/dateinamen.js');

/** Die Dateizeilen einer Messung. */
const dateizeilen = messung => messung.eintraege.filter(eintrag => eintrag.art === 'datei');

/** Steht der Pfad allein auf seiner Flex-Zeile? Dann hat er die volle Zeilenbreite (Kriterium 1); sonst teilt er sie mit den
    festen Geschwistern (Haken, Status, Balken, Zahlen). Geprüft wird das Band der ersten Textzeile des Pfads: liegt kein
    anderes sichtbares Kind darin, steht der Pfad allein. */
function pfadAllein(zeile) {
  const oben = zeile.pfadOben - 1;
  const unten = zeile.pfadOben + zeile.pfadHoehe + 1;
  return !zeile.kinder.some(kind => kind.sichtbar && !kind.klasse.split(/\s+/).includes('pfad')
    && (kind.oben + kind.unten) / 2 > oben && (kind.oben + kind.unten) / 2 < unten);
}

/** Kriterium 1: jeder Pfad (Datei- und Ordnerzeile) ist mindestens 5rem breit (der Wert aus der Wurzelschrift); steht der Pfad
    allein auf seiner Zeile, hat er die volle Zeilenbreite (≥ 8rem, PO Zeile 281). */
async function erwartePfadbreite(namen, kontext) {
  const masse = await namen.wurzelmasse();
  const messung = await namen.messen();
  const zeilen = dateizeilen(messung);
  expect(zeilen.length, `Dateizeilen in ${kontext}`).toBeGreaterThan(0);
  for (const eintrag of messung.eintraege.filter(e => e.art !== 'gruppe')) {
    expect(eintrag.pfadBreite, `Pfadbreite „${eintrag.pfad}“ in ${kontext}`).toBeGreaterThanOrEqual(masse.basisRem - 0.5);
    if (pfadAllein(eintrag)) {
      expect(eintrag.pfadBreite, `Pfad „${eintrag.pfad}“ steht allein → volle Zeilenbreite in ${kontext}`).toBeGreaterThanOrEqual(8 * masse.schrift);
    }
  }
  return messung;
}

/** Kriterium 3: die Liste und jede Zeile laufen nicht über, jedes sichtbare Kind liegt in der Liste. */
async function erwarteKeinUeberlauf(messung, kontext) {
  const liste = messung.liste;
  expect(liste.scrollWidth, `Listenüberlauf (scrollWidth ≤ clientWidth) in ${kontext}`).toBeLessThanOrEqual(liste.clientWidth);
  for (const eintrag of messung.eintraege) {
    const name = eintrag.pfad || eintrag.art;
    expect(eintrag.liScrollWidth, `Zeilenüberlauf „${name}“ in ${kontext}`).toBeLessThanOrEqual(eintrag.liClientWidth);
    for (const kind of eintrag.kinder.filter(eintrag1 => eintrag1.sichtbar)) {
      expect(kind.rechts, `rechte Kante von ${kind.klasse} ≤ Innenkante der Liste in ${kontext}`).toBeLessThanOrEqual(liste.innenRechts + 0.5);
    }
  }
}

/** Kriterium 2: jeder Umbruch im Pfad fällt nach einem Trenner oder in ein Stück, das allein breiter als der Pfad ist. */
async function erwarteBruecheAnTrennern(namen, kontext) {
  const masse = await namen.wurzelmasse();
  const messung = await namen.messen();
  for (const zeile of dateizeilen(messung)) {
    const referenz = Math.max(zeile.pfadBreite, masse.basisRem);
    for (const bruch of zeile.brueche) {
      const erlaubt = bruch.amTrenner || bruch.stueckBreite > referenz + 0.5;
      expect(erlaubt, `Umbruch in „${zeile.pfad}“ nach „${bruch.zeichen}“ (Stück „${bruch.stueck}“ ${Math.round(bruch.stueckBreite)} px, Pfad ${Math.round(referenz)} px) in ${kontext}`).toBe(true);
    }
  }
}

test.describe('Kriterium 1: der Pfad hat 5rem (812 px, offene Ergebnis-Spalte)', () => {
  for (const darstellung of ['flach', 'baum']) {
    test(`soll in „Zusammen“ ${darstellung} jedem Pfad einer Dateizeile 5rem geben`, async ({ namen }) => {
      await namen.starten({ modus: 'zusammen' });
      await namen.schmalOffen();
      if (darstellung === 'baum') {
        await namen.darstellung('baum');
      }

      await erwartePfadbreite(namen, `812/Zusammen/${darstellung}`);
      expect(namen.seitenfehler(), 'Seitenfehler').toEqual([]);
    });
  }
});

test.describe('Kriterium 2: kein Wort wird getrennt, das passt', () => {
  for (const darstellung of ['flach', 'baum']) {
    test(`soll in „Zusammen“ ${darstellung} nur nach /, -, _ oder . umbrechen`, async ({ namen }) => {
      await namen.starten({ modus: 'zusammen' });
      await namen.schmalOffen();
      if (darstellung === 'baum') {
        await namen.darstellung('baum');
      }

      await erwarteBruecheAnTrennern(namen, `812/Zusammen/${darstellung}`);
      expect(namen.seitenfehler(), 'Seitenfehler').toEqual([]);
    });
  }

  test('soll den langen Namen aus Repo N an `-`, `_` und `.` umbrechen', async ({ namen }) => {
    await namen.starten({ modus: 'zusammen' });
    await namen.schmalOffen();

    const masse = await namen.wurzelmasse();
    const messung = await namen.messen();
    const lang = dateizeilen(messung).find(zeile => zeile.pfad.includes('modul-mit-sehr-langem'));
    expect(lang, 'die lange Datei steht in der Liste').toBeTruthy();
    expect(lang.pfadBreite, 'der lange Pfad hat 5rem').toBeGreaterThanOrEqual(masse.basisRem - 0.5);
    const trenner = lang.brueche.filter(bruch => bruch.amTrenner).map(bruch => bruch.zeichen);
    for (const zeichen of ['-', '_', '.']) {
      expect(trenner, `Umbruch nach „${zeichen}“ in ${lang.pfad}`).toContain(zeichen);
    }
    const referenz = Math.max(lang.pfadBreite, masse.basisRem);
    const mitten = lang.brueche.filter(bruch => !bruch.amTrenner && !(bruch.stueckBreite > referenz + 0.5));
    expect(mitten, `Umbruch mitten in einem passenden Wort: ${JSON.stringify(mitten)}`).toEqual([]);
  });
});

test.describe('Kriterium 3: nichts läuft über, mit dem längsten Inhalt und vorhandenem Zustand', () => {
  test('soll bei 812 px offener Spalte in „Zusammen“ nicht überlaufen (255-Zeichen-Name, 60-Zeichen-Ordner, Binärdatei)', async ({ namen }) => {
    await namen.starten({ modus: 'zusammen' });
    await namen.schmalOffen();
    await namen.zustandHerstellen();
    await namen.darstellung('baum');

    await erwarteKeinUeberlauf(await namen.messen(), '812/Zusammen/Baum');
    const staende = (await namen.messen()).eintraege.filter(e => e.art === 'datei').map(e => e.status);
    expect(staende, 'in „Zusammen“ ist jede Datei neu (A)').toEqual(Array(staende.length).fill('A'));
    expect(namen.seitenfehler(), 'Seitenfehler').toEqual([]);
  });

  test('soll bei 1280 px in „Zusammen“ nicht überlaufen', async ({ namen }) => {
    await namen.starten({ modus: 'zusammen' });
    await namen.breit();
    await namen.zustandHerstellen();

    await erwarteKeinUeberlauf(await namen.messen(), '1280/Zusammen');
    expect(namen.seitenfehler(), 'Seitenfehler').toEqual([]);
  });

  test('soll in „Einzeln“ (Commit p2) mit den Zuständen A, M, D, R nicht überlaufen', async ({ namen }) => {
    await namen.starten({ modus: 'zusammen' });
    await namen.schmalOffen();
    await namen.einzelnen('p2');
    await namen.aufDateizeilenWarten(4);

    const messung = await namen.messen();
    await erwarteKeinUeberlauf(messung, '812/Einzeln/p2');
    const staende = [...new Set(dateizeilen(messung).map(zeile => zeile.status))].sort();
    // `p2` ändert und löscht und benennt um; die Additionszeile (`A`) steht in „Zusammen“ (alle Dateien sind dort neu).
    expect(staende, 'die Stände D, M und R sind in „Einzeln“ vorhanden').toEqual(['D', 'M', 'R']);
    expect(namen.seitenfehler(), 'Seitenfehler').toEqual([]);
  });
});

test.describe('Kriterium 4: Haken und Zahlen bleiben bedienbar', () => {
  test('soll das Kästchen einer umbrochenen Zeile bedienen und über Pfad, Balken und Zahlen wählen', async ({ namen }) => {
    await namen.starten({ modus: 'zusammen' });
    await namen.schmalOffen();
    await namen.abhaken('db/001_anlegen.sql');
    await namen.fortschritt('1 von 8 Dateien abgehakt');

    const langeDatei = 'src/modul-mit-sehr-langem-dateinamen_und_unterstrichen.konfiguration.json';
    const messung = await namen.messen();
    const zeile = dateizeilen(messung).find(eintrag => eintrag.roherPfad === langeDatei);
    expect(zeile.zeilenAnzahl, 'die lange Zeile ist umbrochen').toBeGreaterThan(1);

    // Das Kästchen ist mindestens 24 × 24 px groß und liegt ganz in der Liste.
    const kaestchen = zeile.kinder.find(kind => kind.klasse.includes('haken-ziel'));
    expect(Math.min(kaestchen.breite, kaestchen.hoehe), 'Haken-Ziel ≥ 24 × 24 px').toBeGreaterThanOrEqual(24);
    expect(kaestchen.links, 'Kästchen innerhalb der Liste').toBeGreaterThanOrEqual(messung.liste.innenLinks - 0.5);
    expect(kaestchen.rechts, 'Kästchen innerhalb der Liste').toBeLessThanOrEqual(messung.liste.innenRechts + 0.5);

    await namen.kaestchenMitPfadBetaetigen(langeDatei);
    await namen.fortschritt('2 von 8 Dateien abgehakt');
    await namen.kaestchenMitPfadBetaetigen(langeDatei);
    await namen.fortschritt('1 von 8 Dateien abgehakt');

    // Ein Klick auf Pfad, Balken oder Zahlen wählt die Datei (aria-current).
    for (const teil of ['.pfad', '.balken', '.zahlen']) {
      await namen.page.locator(`#datei-zeilen .datei-zeile[data-pfad="${langeDatei}"] ${teil}`).click();
      expect(await namen.gewaehlteDateien(), `Klick auf ${teil} wählt die Datei`).toContain(zeile.pfad);
    }

    // Mit Tab und Leertaste lässt sich ein Kästchen ohne Maus setzen.
    await namen.perTastaturAbhaken('db/002_aendern.sql');
    await namen.fortschritt('2 von 8 Dateien abgehakt');
    expect(namen.seitenfehler(), 'Seitenfehler').toEqual([]);
  });
});

test.describe('Kriterium 5: bei 1280 px bleibt die Zeile für Namen, die in den Pfad passen, einzeilig (Tiefe 0 und 1, ohne Bildlaufleiste)', () => {
  for (const darstellung of ['flach', 'baum']) {
    test(`soll in „Zusammen“ ${darstellung} jede Dateizeile der Tiefe 0 und 1 mit passendem Namen auf eine Zeile halten`, async ({ namen }) => {
      await namen.starten({ modus: 'zusammen' });
      await namen.breit();
      if (darstellung === 'baum') {
        await namen.darstellung('baum');
      }

      // Nur Namen, die in den Pfad passen (der Pfad bricht nicht um): ein Name, der mehr als die Pfadbreite braucht, macht die
      // Zeile höher und bricht im Pfad um (PO Zeile 281) — `db/001_anlegen.sql` bei Tiefe 1 ist so ein Fall.
      const masse = await namen.wurzelmasse();
      const messung = await namen.messen();
      const einzeilig = dateizeilen(messung).filter(zeile => zeile.tiefe <= 1 && zeile.zeilenAnzahl <= 1);
      expect(einzeilig.length, 'Dateizeilen der Tiefe 0 und 1 mit passendem Namen').toBeGreaterThan(0);
      expect(einzeilig.some(zeile => zeile.roherPfad === 'bild.bin'), 'die Dateizeile „bild.bin“ zählt mit').toBe(true);
      for (const zeile of einzeilig) {
        expect(zeile.liHoehe, `Zeilenhöhe „${zeile.pfad}“ (--kd-row ${masse.zeile} px)`).toBeLessThanOrEqual(masse.zeile + 1);
        // Pfad, Status, Balken und Zahlen stehen auf gleicher Höhe: ihre Mitten fallen zusammen, die Zeile ist eine Flex-Zeile.
        const pfadMitte = zeile.pfadOben + zeile.pfadHoehe / 2;
        for (const klasse of ['status', 'balken', 'zahlen']) {
          const kind = zeile.kinder.find(eintrag => eintrag.sichtbar && eintrag.klasse.split(/\s+/)[0] === klasse);
          expect(kind, `${klasse} in der Zeile „${zeile.pfad}“`).toBeTruthy();
          expect(Math.abs((kind.oben + kind.unten) / 2 - pfadMitte), `${klasse} auf Höhe des Pfads in „${zeile.pfad}“`).toBeLessThanOrEqual(1.5);
        }
      }
      expect(namen.seitenfehler(), 'Seitenfehler').toEqual([]);
    });
  }
});

test.describe('Kriterium 6: alle Anzeigeverfahren', () => {
  const ANSICHTEN = [
    ['Zusammen flach', 'zusammen', 'flach', null, null],
    ['Zusammen Baum', 'zusammen', 'baum', null, null],
    ['Einzeln p2 flach', 'einzeln', 'flach', 4, null],
    ['Zusammen flach mit Suche', 'zusammen', 'flach', 2, 'suche'],
    ['Zusammen flach mit Muster', 'zusammen', 'flach', 7, 'muster'],
  ];

  for (const [name, modus, darstellung, erwarteteZeilen, werkzeug] of ANSICHTEN) {
    test(`soll in „${name}“ die Kriterien 1 und 3 halten`, async ({ namen }) => {
      await namen.starten({ modus: 'zusammen' });
      await namen.schmalOffen();
      if (modus === 'einzeln') {
        await namen.einzelnen('p2');
      }
      if (darstellung === 'baum') {
        await namen.darstellung('baum');
      }
      if (werkzeug === 'suche') {
        await namen.suchen('sql');
      }
      if (werkzeug === 'muster') {
        await namen.musterAusblenden('bild.bin');
      }
      if (erwarteteZeilen !== null) {
        await namen.aufDateizeilenWarten(erwarteteZeilen);
      }

      const messung = await erwartePfadbreite(namen, name);
      await erwarteKeinUeberlauf(messung, name);
      expect(namen.seitenfehler(), 'Seitenfehler').toEqual([]);
    });
  }
});
