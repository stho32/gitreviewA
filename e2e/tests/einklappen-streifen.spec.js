'use strict';
// Spezifikation R00035 „Seitenleiste ein- und ausklappen“ (I0036, B3403): eingeklappt ist die Seitenleiste `hidden`/`inert`, der
// Diff nimmt die volle Breite ein, und an der Grenze bleibt ein schmaler Streifen mit dem Knopf; es gibt keinen Trenn-Zug mehr.
// Das Einklappen wirkt allein über das Layout: offenes Notizfeld, Markierungen, Suchtreffer und Bildlaufposition bleiben, es wird
// keine neue Diff-Anfrage gestellt (Lehre #23); es gilt in beiden Modi, Ansichten und Anordnungen (Lehre #7). Browser-Eigenes
// (Darstellung, Bildlauf, Anfragen); Vorbereitung Repo S (200 Zeilen, 60 Dateien), Fenster 1280 × 800.
const { test, expect } = require('../dsl/einklappen.js');

test.describe('Einklappen: Streifen und volle Breite (B3403)', () => {
  test('nimmt der Liste Sichtbarkeit und Tab-Weg, gibt dem Diff die volle Breite; der Streifen bleibt (Szenario 1)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.dateiAnsehen('lang.txt');
    const fortschritt = await einklappen.fortschritt();
    const vorher = (await einklappen.grenzlage()).diffBreite;

    await einklappen.knopfBetatigen();

    await einklappen.seitenleisteVerborgen();
    await einklappen.streifenPruefen();
    await einklappen.volleBreite();
    await einklappen.diffBreiter(vorher);
    await einklappen.keinTrennzug();
    await einklappen.knopfPruefen({ eingeklappt: true });
    expect(await einklappen.fortschritt(), 'der Fortschritt bleibt im Kopf (der eine Zähler)').toBe(fortschritt);
  });

  test('zeichnet den Diff nicht neu: Bildlauf und Inhalt bleiben, keine neue Diff-Anfrage (Kriterium 1.3, Lehre #23)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    const anfragen = einklappen.zaehleDiffAnfragen();
    await einklappen.dateiAnsehen('lang.txt');
    expect(anfragen(), 'Positivkontrolle: das Laden der Datei zählt als Diff-Anfrage').toBeGreaterThan(0);

    await einklappen.diffGanzUnten();
    const versatzVorher = (await einklappen.diffStand()).scrollTop;
    expect(versatzVorher, 'der Diff ist gescrollt').toBeGreaterThan(0);
    const anfragenVorher = anfragen();

    await einklappen.knopfBetatigen();
    await einklappen.knopfBetatigen();

    await einklappen.versatzGleich(versatzVorher, (await einklappen.diffStand()).scrollTop, 'Diff-Bildlauf');
    expect(anfragen(), 'keine neue Diff-Anfrage beim Ein- und Ausklappen').toBe(anfragenVorher);
    await einklappen.keinSeitenbildlauf();
    await einklappen.diffIstRollbereich();
  });

  test('das Ausklappen stellt die zuletzt gesetzte Breite und die gewählte Zeile im Blick her (Szenario 2)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.dateiAnsehen('d55.txt');
    await einklappen.setzeBreite(500);
    await einklappen.breiteIst(500);

    await einklappen.knopfBetatigen();
    await einklappen.seitenleisteVerborgen();
    await einklappen.knopfBetatigen();

    await einklappen.seitenleisteSichtbar();
    await einklappen.breiteIst(500);
    await einklappen.wahlImRollbereich();
    await einklappen.knopfPruefen({ eingeklappt: false });
  });

  test('gilt in beiden Modi, beiden Ansichten und beiden Anordnungen (Lehre #7)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.dateiAnsehen('lang.txt');
    await einklappen.knopfBetatigen();

    for (const modus of ['zusammen', 'einzeln']) {
      await einklappen.modus(modus);
      for (const ansicht of ['ganz', 'aenderungen']) {
        await einklappen.ansicht(ansicht);
        for (const anordnung of ['nebeneinander', 'untereinander']) {
          await einklappen.anordnung(anordnung);
          await einklappen.eingeklappt();
          await einklappen.seitenleisteVerborgen();
          await einklappen.volleBreite();
          await einklappen.keinTrennzug();
        }
      }
    }
  });

  test('unter 590 px gilt die eine Spalte: Liste und kein Knopf; zurück bleibt die Leiste eingeklappt (Grenzfall)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.knopfBetatigen();
    await einklappen.seitenleisteVerborgen();

    await einklappen.fensterSetzen({ width: 560, height: 800 });
    await einklappen.eineSpalte();
    await einklappen.keinTrennerKeinEinklappen();
    await einklappen.seitenleisteSichtbar();

    await einklappen.fensterSetzen({ width: 1280, height: 800 });
    await einklappen.zweiSpalten();
    await einklappen.eingeklappt();
    await einklappen.seitenleisteVerborgen();
    await einklappen.streifenPruefen();
  });
});