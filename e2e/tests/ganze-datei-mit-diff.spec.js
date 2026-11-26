'use strict';
// Spezifikation R00008 „Ganze Datei mit Diff“, Teil Oberfläche (User Story Szenarien 1, 3, 6–12, 16, 17): Umschalter, Darstellung, Laden und Zeit
// im Browser. Was gelesen wird (Zeilen, Orakel, Dateiarten, fremdes Repo) prüft tests/GitReviewA.Tests/Akzeptanz/GanzeDateiMitDiffTests.cs.
const { test } = require('../dsl/diff-lesen.js');
const { anzeigeSchrankeMs } = require('../dsl/schranken.js');

const NUR_AENDERUNGEN = 'nur Änderungen';
const GANZE_DATEI = 'ganze Datei';
const LANGE_ZEILE = '0123456789'.repeat(30);

const kontext = (text, nummer) => ({ kontext: text, alt: nummer, neu: nummer });
const AENDERUNGEN_VON_LANG = {
  pfad: 'lang.txt',
  zeilen: [
    { kopf: '@@ -1,6 +1,6 @@' }, kontext('z01', 1), kontext('z02', 2), { minus: 'z03', alt: 3 }, { plus: 'Z03', neu: 3 },
    kontext('z04', 4), kontext('z05', 5), kontext('z06', 6),
    { kopf: '@@ -15,6 +15,5 @@ z14' }, kontext('z15', 15), kontext('z16', 16), kontext('z17', 17), { minus: 'z18', alt: 18 },
    { kontext: 'z19', alt: 19, neu: 18 }, { kontext: 'z20', alt: 20, neu: 19 },
  ],
};
const GANZ_VON_LANG = {
  pfad: 'lang.txt',
  zeilen: [
    kontext('z01', 1), kontext('z02', 2), { minus: 'z03', alt: 3 }, { plus: 'Z03', neu: 3 },
    ...Array.from({ length: 14 }, (_, index) => kontext(`z${String(index + 4).padStart(2, '0')}`, index + 4)),
    { minus: 'z18', alt: 18 }, { kontext: 'z19', alt: 19, neu: 18 }, { kontext: 'z20', alt: 20, neu: 19 },
  ],
};
const AENDERUNGEN_VON_B = {
  pfad: 'src/b.txt',
  zeilen: [{ kopf: '@@ -1,2 +1,3 @@' }, kontext('eins', 1), { minus: 'zwei', alt: 2 }, { plus: 'ZWEI', neu: 2 }, { plus: 'drei', neu: 3 }],
};
const GANZ_VON_B = { pfad: 'src/b.txt', zeilen: AENDERUNGEN_VON_B.zeilen.slice(1) };

test.describe('Ganze Datei mit Diff', () => {
  test('soll beim Umschalten auf „ganze Datei“ die Lücken füllen und zurück wieder nur die Änderungen zeigen', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('lang.txt');
    await diff.diffZeigt(AENDERUNGEN_VON_LANG);

    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.diffZeigt(GANZ_VON_LANG);
    await diff.ansichtWaehlen(NUR_AENDERUNGEN);

    await diff.diffZeigt(AENDERUNGEN_VON_LANG);
  });

  test('soll hinzugefügte und entfernte Zeilen in beiden Ansichten gleich einfärben', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('lang.txt');
    await diff.diffZeigt(AENDERUNGEN_VON_LANG);
    const farbenNurAenderungen = await diff.zeilenfarben();

    await diff.ansichtWaehlen(GANZE_DATEI);

    await diff.diffZeigt(GANZ_VON_LANG);
    await diff.zeilenfarbenSind(farbenNurAenderungen);
  });

  test('soll fremden Text auch in der ganzen Datei als Text zeigen und richtungsändernde Zeichen als Marke', async ({ diff }) => {
    await diff.starten();
    await diff.ansichtWaehlen(GANZE_DATEI);

    await diff.dateiAnsehen('fremd.txt');

    await diff.diffZeigt({
      pfad: 'fremd.txt',
      zeilen: [{ plus: '<img src=x onerror=alert(1)>', neu: 1 }, { plus: '<b>fett</b>', neu: 2 }, { plus: 'a⟨U+202E⟩b', neu: 3 }],
    });
    await diff.fremderTextBleibtText();
  });
});

test.describe('Umschalter und Wahl', () => {
  test('soll mit „nur Änderungen“ starten und beim Umschalten Dateiliste und Auswahl lassen, auch per Tastatur', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');
    await diff.ansichtIst(NUR_AENDERUNGEN);
    await diff.diffZeigt(AENDERUNGEN_VON_B);

    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.diffZeigt(GANZ_VON_B);
    await diff.dateiGewaehlt('src/b.txt');
    await diff.ansichtPerTastaturWechseln();

    await diff.ansichtIst(NUR_AENDERUNGEN);
    await diff.diffZeigt(AENDERUNGEN_VON_B);
    await diff.dateiGewaehlt('src/b.txt');
  });

  test('soll die Wahl beim Wechsel von Datei und Commit behalten', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('lang.txt');
    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.diffZeigt(GANZ_VON_LANG);

    await diff.dateiAnsehen('src/b.txt');
    await diff.diffZeigt(GANZ_VON_B);
    await diff.commitAnsehen('p');
    await diff.dateiAnsehen('lang.txt');

    await diff.diffZeigt({ pfad: 'lang.txt', zeilen: Array.from({ length: 20 }, (_, index) => ({ plus: `z${String(index + 1).padStart(2, '0')}`, neu: index + 1 })) });
    await diff.ansichtIst(GANZE_DATEI);
  });

  test('soll eine Wahl ohne gewählte Datei für die nächste Datei übernehmen', async ({ diff }) => {
    await diff.starten();
    await diff.fordertZurWahlAuf();

    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.fordertZurWahlAuf();
    await diff.dateiAnsehen('lang.txt');

    await diff.diffZeigt(GANZ_VON_LANG);
  });

  test('soll nach dem Wechsel des Commits beim Umschalten nichts laden, bis eine Datei gewählt ist', async ({ diff }) => {
    await diff.starten({ verbose: true });
    await diff.dateiAnsehen('src/b.txt');
    await diff.diffZeigt(AENDERUNGEN_VON_B);
    await diff.commitAnsehen('p');
    await diff.commitAnsehen('q');
    await diff.fordertZurWahlAuf();

    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.fordertZurWahlAuf();
    await diff.dateiAnsehen('lang.txt');

    await diff.diffZeigt(GANZ_VON_LANG);
    await diff.diffsGelesen('q', 2);
  });

  test('soll den Umbruch in beiden Ansichten wirken lassen und beim Umschalten behalten', async ({ diff }) => {
    await diff.starten();
    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.dateiAnsehen('breit.txt');
    await diff.langeZeileUmbrochen(2, LANGE_ZEILE);
    await diff.ansichtWaehlen(NUR_AENDERUNGEN);
    await diff.langeZeileUmbrochen(2, LANGE_ZEILE);
    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.umbruchUmschalten();
    await diff.langeZeileEinzeilig(2, LANGE_ZEILE);

    await diff.ansichtWaehlen(NUR_AENDERUNGEN);
    await diff.langeZeileEinzeilig(2, LANGE_ZEILE);
    await diff.ansichtWaehlen(GANZE_DATEI);

    await diff.langeZeileEinzeilig(2, LANGE_ZEILE);
  });
});

test.describe('Ganze Datei laden', () => {
  test('soll die ganze Datei erst lesen, wenn „ganze Datei“ gilt', async ({ diff }) => {
    await diff.starten({ verbose: true });

    await diff.dateiAnsehen('src/b.txt');
    await diff.diffZeigt(AENDERUNGEN_VON_B);
    await diff.dateiAnsehen('lang.txt');
    await diff.diffZeigt(AENDERUNGEN_VON_LANG);
    await diff.diffsGelesen('q', 2);
    await diff.ansichtWaehlen(GANZE_DATEI);

    await diff.diffZeigt(GANZ_VON_LANG);
    await diff.diffsGelesen('q', 3);
  });

  test('soll eine späte ganze Datei nach dem Zurückschalten verwerfen', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('lang.txt');
    await diff.diffZeigt(AENDERUNGEN_VON_LANG);
    const spaeteAntwort = await diff.ganzeDateiVerzoegern('lang.txt');

    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.ansichtWaehlen(NUR_AENDERUNGEN);
    await diff.diffZeigt(AENDERUNGEN_VON_LANG);
    await spaeteAntwort.eingetroffen();

    await diff.diffZeigt(AENDERUNGEN_VON_LANG);
  });

  test('soll eine späte ganze Datei nach dem Wechsel der Datei verwerfen', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('lang.txt');
    const spaeteAntwort = await diff.ganzeDateiVerzoegern('lang.txt');

    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.dateiAnsehen('src/b.txt');
    await diff.diffZeigt(GANZ_VON_B);
    await spaeteAntwort.eingetroffen();

    await diff.diffZeigt(GANZ_VON_B);
  });

  test('soll eine späte ganze Datei nach dem Wechsel des Commits verwerfen', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('lang.txt');
    const spaeteAntwort = await diff.ganzeDateiVerzoegern('lang.txt');

    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.commitAnsehen('p');
    await spaeteAntwort.eingetroffen();

    await diff.fordertZurWahlAuf();
  });

  test('soll eine nicht lesbare ganze Datei melden und Umschalter und Dateiliste bedienbar lassen', async ({ diff }) => {
    await diff.starten({ verbose: true });
    await diff.dateiAnsehen('src/b.txt');
    await diff.diffZeigt(AENDERUNGEN_VON_B);
    diff.commitObjektEntfernen('q');

    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.diffMeldetFehler('src/b.txt', 'Diff konnte nicht gelesen werden');
    await diff.diffsGelesen('q', 2);
    diff.fehlerProtokolliertFuer('q', 'src/b.txt');
    await diff.ansichtWaehlen(NUR_AENDERUNGEN);
    await diff.ansichtIst(NUR_AENDERUNGEN);
    await diff.diffsGelesen('q', 3);
    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.commitAnsehen('p');
    await diff.dateiAnsehen('src/b.txt');

    await diff.diffZeigt({ pfad: 'src/b.txt', zeilen: [{ plus: 'eins', neu: 1 }, { plus: 'zwei', neu: 2 }] });
    diff.ergebnisBleibtLeer();
  });
});

test.describe('Lastprofil ganze Datei', () => {
  test('soll die ganze Datei über 20 000 Zeilen spätestens 1 s nach dem Umschalten zugeklappt zeigen (R00017)', async ({ diff }) => {
    await diff.starten({ vorbereitung: '20 000 Zeilen, eine geändert' });
    await diff.dateiAnsehen('gross.txt');
    await diff.diffZeigt({
      pfad: 'gross.txt',
      zeilen: [
        { kopf: '@@ -9997,7 +9997,7 @@ zeile 09996' }, kontext('zeile 09997', 9997), kontext('zeile 09998', 9998), kontext('zeile 09999', 9999),
        { minus: 'zeile 10000', alt: 10000 }, { plus: 'geändert 10000', neu: 10000 },
        kontext('zeile 10001', 10001), kontext('zeile 10002', 10002), kontext('zeile 10003', 10003),
      ],
    });

    const dauerMs = await diff.zugeklapptNachUmschalten(GANZE_DATEI, 'gross.txt', 'Sehr lang: 20.001 Zeilen — zugeklappt', anzeigeSchrankeMs);

    test.info().annotations.push({ type: 'Messwert', description: `Zuklappzustand nach ${dauerMs} ms nach dem Umschalten (Anzeige-Schranke ${anzeigeSchrankeMs} ms)` });
  });

  test('soll die ganze Datei über 20 000 Zeilen spätestens 1 s nach dem Klick zugeklappt zeigen, wenn „ganze Datei“ vorher gewählt ist (R00017)', async ({ diff }) => {
    await diff.starten({ vorbereitung: '20 000 Zeilen, eine geändert' });
    await diff.ansichtWaehlen(GANZE_DATEI);

    const dauerMs = await diff.zugeklapptNachKlick('gross.txt', 'gross.txt', 'Sehr lang: 20.001 Zeilen — zugeklappt', anzeigeSchrankeMs);

    test.info().annotations.push({ type: 'Messwert', description: `Zuklappzustand nach ${dauerMs} ms nach dem Klick (Anzeige-Schranke ${anzeigeSchrankeMs} ms)` });
  });
});
