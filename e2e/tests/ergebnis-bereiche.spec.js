'use strict';
// Spezifikation R00042 „Ergebnis-Spalte ziehen“ (I0043, B4105): die drei Rollbereiche scrollen je für sich, Kopf und Statuszeile
// stehen (Kriterium 3); die gezogenen Breiten bleiben über Datei-, Commit-, Modus-, Ansichts- und Anordnungswechsel und fallen
// beim Neuladen auf 360/320 zurück (Kriterium 5); das Ziehen beider Trenner verwirft nichts und stellt keine neue Diff-Anfrage
// (Kriterium 6, Lehre #23) — in der Dateiliste bleibt die oberste sichtbare Dateizeile (PO Zeile 282: die Zeilenhöhe wechselt
// mit der Breite, weil Namen umbrechen, R00056), Diff und Ergebnis-Spalte behalten ihre Bildlaufposition in Pixeln; bei Diff
// 320 px bleibt der Diff-Kopf höchstens zwei Zeilen, bei 668 px eine, die Herkunft ist nie still gekürzt (Kriterium 10,
// R00039/PO Zeile 247). Browser-Eigenes (Darstellung, gemessene Höhe und Breite).
const { test, expect } = require('../dsl/breite.js');
const { erwarteUnterEinfrierSchranke } = require('../dsl/schranken.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');

/** Vergleicht die oberste sichtbare Dateizeile: dieselbe Datei oder höchstens eine Zeile Abweichung am Rand (PO Zeile 282);
    ein Pixelwert bleibt nicht, weil die Zeilenhöhe der Liste mit der Breite wechselt, sobald Namen umbrechen (R00056). */
function erwarteObersteDatei(nachher, vorher, kontext) {
  expect(nachher, `oberste sichtbare Dateizeile ${kontext} — Liste vorhanden`).not.toBeNull();
  const gleich = nachher.pfad === vorher.pfad || Math.abs(nachher.rang - vorher.rang) <= 1;
  expect(gleich, `oberste sichtbare Dateizeile ${kontext}: ${JSON.stringify(nachher)} statt ${JSON.stringify(vorher)}`).toBe(true);
}

/** 400 Zeilen für die Ergebnis-Spalte: sie wird damit zu einem eigenen Rollbereich (Vorbereitung). */
function spaltenText(zeilen = 400) {
  return Array.from({ length: zeilen }, (_, nummer) => `Ergebnis-Zeile ${nummer}`).join('\n');
}

test.describe('Drei Rollbereiche (B4105, Kriterium 3)', () => {
  test('der Diff scrollt allein: Liste und Spalte bewegen sich nicht, Kopf und Statuszeile stehen, die Seite scrollt nicht', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.dateiAnsehen('lang.txt');
    await breite.ansicht('ganz');
    await breite.spalteZeige(spaltenText());
    await breite.spalteIstRollbereich();
    await breite.diffIstRollbereich();
    await breite.listeIstRollbereich();

    await breite.setzeListenVersatz(300);
    await breite.setzeSpaltenVersatz(300);
    const liste = (await breite.listeStand()).scrollTop;
    const spalte = (await breite.spaltenStand()).scrollTop;
    expect(liste, 'Liste gescrollt (Vorbedingung)').toBeGreaterThan(0);
    expect(spalte, 'Spalte gescrollt (Vorbedingung)').toBeGreaterThan(0);

    const stehend = await breite.stehendeTeile();
    const statuszeile = await breite.lage('.statuszeile');

    await breite.setzeDiffVersatz(1500);

    expect((await breite.listeStand()).scrollTop, 'die Liste bewegt sich nicht').toBe(liste);
    expect((await breite.spaltenStand()).scrollTop, 'die Spalte bewegt sich nicht').toBe(spalte);
    await breite.unveraendert(stehend, await breite.stehendeTeile(), 'Kopf und Werkzeugzeilen');
    expect(await breite.lage('.statuszeile'), 'Statuszeile steht an Ort und Höhe').toEqual(statuszeile);
    await breite.keinSeitenbildlauf();
  });
});

test.describe('Breiten bleiben beim Arbeiten (B4105, Kriterium 5)', () => {
  test('beide Breiten bleiben über alle Wechsel; nach dem Neuladen gelten 360 und 320 px', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S zwei Commits' });

    await breite.rechtesZiehen(-80); // 320 → 400
    await breite.spalteBreiteIst(400);
    await breite.ziehen(120); // 360 → 480
    await breite.breiteIst(480);

    await breite.dateiAnsehen('lang.txt');
    await breite.spalteBreiteIst(400);
    await breite.breiteIst(480);

    await breite.modus('einzeln');
    await breite.druecke(']');
    await breite.modus('zusammen');
    await breite.ansicht('ganz');
    await breite.ansicht('aenderungen');
    await breite.anordnung('nebeneinander');
    await breite.anordnung('untereinander');

    await breite.spalteBreiteIst(400);
    await breite.breiteIst(480);

    await breite.neuLaden();
    await breite.breiteIst(360);
    await breite.spalteBreiteIst(320);
  });
});

test.describe('Ziehen verwirft nichts (B4105, Kriterium 6)', () => {
  test('offenes Notizfeld, Treffer und drei Bildlaufpositionen bleiben; keine neue Diff-Anfrage', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo S' });
    await breite.dateiAnsehen('lang.txt');
    await breite.ansicht('ganz');
    await breite.spalteZeige(spaltenText());
    const anfragen = breite.zaehleDiffAnfragen();

    const name = breite.feldname('lang.txt', 5);
    await breite.zeileAnklicken({ neu: 5 });
    await breite.notizSchreiben(name, 'Klammer fehlt');
    await breite.feldIstOffenMitFokus(name);
    await breite.sucheImDiff('z200');
    expect(await breite.marken(), 'Suchtreffer vorhanden').toBeGreaterThan(0);

    await breite.feldFokussieren(name);
    await breite.setzeDiffVersatz(1200);
    await breite.setzeListenVersatz(200);
    await breite.setzeSpaltenVersatz(200);

    const vorher = {
      text: await breite.feldText(name),
      felder: await breite.anzahlNotizfelder(),
      marken: await breite.marken(),
      diffZeilen: await breite.diffZeilen(),
      diffVersatz: (await breite.diffStand()).scrollTop,
      listenVersatz: (await breite.listeStand()).scrollTop,
      obersteDatei: await breite.obersteSichtbareDatei(),
      spaltenVersatz: (await breite.spaltenStand()).scrollTop,
      anfragen: anfragen(),
    };
    expect(vorher.felder, 'Notizfeld offen (Vorbedingung)').toBe(1);
    expect(vorher.diffVersatz, 'Diff gescrollt (Vorbedingung)').toBeGreaterThan(0);
    expect(vorher.listenVersatz, 'Liste gescrollt (Vorbedingung)').toBeGreaterThan(0);

    await breite.ziehen(80);
    await breite.rechtesZiehen(-80);
    await breite.ziehen(-40);

    await breite.feldIstOffenMitFokus(name);
    expect(await breite.feldText(name), 'Text des offenen Feldes unverändert').toBe(vorher.text);
    expect(await breite.anzahlNotizfelder(), 'Notizfeld bleibt offen').toBe(vorher.felder);
    expect(await breite.marken(), 'Suchtreffer bleiben').toBe(vorher.marken);
    expect(await breite.diffZeilen(), 'Diff-Zeilen unverändert (kein Neuzeichnen)').toBe(vorher.diffZeilen);
    expect((await breite.diffStand()).scrollTop, 'Diff-Bildlauf bleibt').toBe(vorher.diffVersatz);
    erwarteObersteDatei(await breite.obersteSichtbareDatei(), vorher.obersteDatei, 'bleibt über die drei Züge');
    expect((await breite.spaltenStand()).scrollTop, 'Spalten-Bildlauf bleibt').toBe(vorher.spaltenVersatz);
    expect(anfragen(), 'keine neue Diff-Anfrage').toBe(vorher.anfragen);
  });

  test('Zusatzfall: die oberste Dateizeile bleibt beim Wechsel 360 → 240 → 360 px (Repo N, Baum)', async ({ breite }) => {
    await breite.starten({ vorbereitung: 'Repo N' });
    await breite.darstellung('baum');
    await breite.setzeObersteDatei(2); // die dritte Dateizeile der Liste steht oben
    const anfang = await breite.listeStand();
    const vorher = await breite.obersteSichtbareDatei();
    expect(anfang.scrollTop, 'die Liste ist gescrollt (Vorbedingung)').toBeGreaterThan(0);
    expect(vorher, 'oberste Dateizeile (Vorbedingung)').not.toBeNull();

    await breite.ziehen(-120); // 360 → 240 px
    await breite.breiteIst(240);
    const nach240 = await breite.listeStand();
    erwarteObersteDatei(await breite.obersteSichtbareDatei(), vorher, 'nach 240 px');

    await breite.ziehen(120); // 240 → 360 px
    await breite.breiteIst(360);
    erwarteObersteDatei(await breite.obersteSichtbareDatei(), vorher, 'nach 360 px');

    // Die Zeilenhöhe wechselt nachweislich mit der Breite: bei 240 px ist der Listeninhalt höher, weil Namen umbrechen (R00056).
    expect(nach240.scrollHeight, 'die Liste ist bei 240 px höher (Zeilenhöhe wechselt)').toBeGreaterThan(anfang.scrollHeight);
  });

  test('Ziehen über 20 000 Zeilen und eine lange Spalte friert keine Aufgabe über die Schranke (Positivkontrolle: Knotenzähler)', async ({ breite, page }) => {
    await breite.starten({ vorbereitung: 'Repo U' });
    // Der Diff mit 20 000 Zeilen braucht länger als die übliche Wartezeit; gewartet wird auf den beobachtbaren Knotenzähler.
    await page.locator('#datei-zeilen .datei-zeile[data-pfad="gross.txt"]').click();
    await expect.poll(() => breite.diffKnoten(), { timeout: 20000 }).toBeGreaterThan(1000);
    await breite.spalteZeige(spaltenText(500));

    const knoten = await breite.diffKnoten();
    expect(knoten, `Positivkontrolle: der Diff trägt die vielen Zeilen (${knoten})`).toBeGreaterThan(1000);

    const aufgaben = await breite.messeZugLangAufgabe(-200);
    const laengste = aufgaben.length === 0 ? 0 : Math.max(...aufgaben);
    erwarteUnterEinfrierSchranke(laengste, `längste Aufgabe beim Ziehen über ${knoten} Zeilen`);
    await breite.spalteBreiteIst(520);
  });
});

test.describe('Der Diff bleibt lesbar (B4105, Kriterium 10)', () => {
  test('bei Diff 320 px höchstens drei Kopfzeilen, bei 668 px eine; die Herkunft nie still gekürzt; die Spalte ohne waagerechten Bildlauf', async ({ breite, page }) => {
    await breite.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await breite.dateiAnsehen('src/a.txt');
    await breite.dateiAnmerkungenAnlegen(1, 'x'.repeat(5000));

    for (const anordnung of ['untereinander', 'nebeneinander']) {
      await breite.anordnung(anordnung);
      for (const umbruch of ['an', 'aus']) {
        if ((await diffSeite.umbruchStellung(page)) !== umbruch) {
          await diffSeite.umbruchUmschalten(page);
        }
        for (const modus of ['zusammen', 'einzeln']) {
          await breite.modus(modus);
          await breite.dateiAnsehen('src/a.txt');

          // Diff 320 px (Spalte 588): höchstens drei Zeilen (R00057 Kriterium 5, PO 287: unter 400 px höchstens drei,
          // gemessen 94 px), kein waagerechter Überlauf.
          await breite.setzeSpaltenBreite(588);
          await breite.spalteBreiteIst(588);
          const bei320 = await breite.leistenmass();
          expect(bei320.zeilen, `bei Diff 320 px höchstens drei Zeilen (${anordnung}/${umbruch}/${modus}: ${JSON.stringify(bei320)})`).toBeLessThanOrEqual(3);
          expect(bei320.ueberlauf, `kein waagerechter Überlauf (${anordnung}/${umbruch}/${modus})`).toBeLessThanOrEqual(0);
          await pruefeHerkunftNieStill(page, breite, modus);

          // Diff 668 px (Spalte 240): eine Zeile; die schmalste Spalte hat keinen waagerechten Bildlauf.
          await breite.setzeSpaltenBreite(240);
          await breite.spalteBreiteIst(240);
          const bei668 = await breite.leistenmass();
          expect(bei668.zeilen, `bei Diff 668 px eine Zeile (${anordnung}/${umbruch}/${modus}: ${JSON.stringify(bei668)})`).toBe(1);
          expect(bei668.ueberlauf, `kein waagerechter Überlauf (${anordnung}/${umbruch}/${modus})`).toBeLessThanOrEqual(0);
          const spalte = await breite.spaltenStand();
          expect(spalte.ueberhangX, `Spalte bei 240 px ohne waagerechten Bildlauf (${JSON.stringify(spalte)})`).toBeLessThanOrEqual(0);
          await breite.keinSeitenbildlauf();
        }
      }
    }
  });
});

/** Die Herkunft im Diff-Kopf ist sichtbar oder — wenn sie nicht ganz sichtbar ist — ganz in `title` und im Namen (PO 247). In
    „Zusammen“ nennt der Kopf die Herkunft (R00012); in „Einzeln“ trägt sie der Abschnittskopf, der Datei-Kopf bleibt leer. */
async function pruefeHerkunftNieStill(page, breite, modus) {
  const mass = await breite.herkunftmass();
  if (modus === 'zusammen') {
    expect(mass.text, 'die Herkunft ist im Kopf gesetzt').not.toBe('');
  }
  if (mass.text !== '' && mass.ueberlauf > 1) {
    expect(mass.name, `gekürzte Herkunft steht ganz im Namen (${JSON.stringify(mass)})`).toBe(mass.text);
    expect(mass.titel, `gekürzte Herkunft steht ganz als Titel (${JSON.stringify(mass)})`).toBe(mass.text);
  }
}
