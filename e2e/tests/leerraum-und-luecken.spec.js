'use strict';
// Spezifikation R00026 „Leerraum ausblenden und Lücken aufklappen“, Teil Oberfläche: der Umschalter „Leerraum“ im Diff-Bereich (B2503),
// das Laden bei seinem Wechsel (B2504) und das Aufklappen der Lücken (B2507). Was gelesen wird (Zeilen, Nummern, Orakel, Lücke aus
// der ganzen Datei) prüfen die Akzeptanztests unter tests/GitReviewA.Tests/Akzeptanz/ und die Bausteine in e2e/tests/bausteine/.
const { test, expect } = require('../dsl/diff-lesen.js');

const kontext = (text, nummer) => ({ kontext: text, alt: nummer, neu: nummer });
const VON_SRC_B = {
  pfad: 'src/b.txt',
  zeilen: [{ kopf: '@@ -1,2 +1,3 @@' }, kontext('eins', 1), { minus: 'zwei', alt: 2 }, { plus: 'ZWEI', neu: 2 }, { plus: 'drei', neu: 3 }],
};
const ERSATZ_PATCH = '@@ -1,1 +1,1 @@\n-alt\n+IGNORIERT\n';

/** Ersatz für die ganze Datei: eine Zeile an einer Stelle, die im echten Diff nicht vorkommt — füllt sie eine Lücke, sieht man es. */
const ERSATZ_GANZ = ['@@ -9,23 +9,23 @@', ...Array.from({ length: 23 }, () => ' ERSATZ')].join('\n');

/** „nur Änderungen“ von `weit.txt` aus Repo W (R00026): zwei Abschnitte, dazwischen 23 verborgene Zeilen. */
const WEIT_AENDERUNGEN = [
  '@@ -2,7 +2,7 @@',
  ' z02', ' z03', ' z04', '-z05', '+Z05', ' z06', ' z07', ' z08',
  '@@ -32,7 +32,7 @@',
  ' z32', ' z33', ' z34', '-z35', '+Z35', ' z36', ' z37', ' z38',
].join('\n');

/** „ganze Datei“ von `weit.txt`: 60 Zeilen, geändert in Zeile 5 und 35, fremde Zeilen in 20 und 21. */
const WEIT_GANZ = [
  '@@ -1,60 +1,60 @@',
  ...Array.from({ length: 60 }, (_, stelle) => stelle + 1).flatMap(nummer => {
    if (nummer === 5) {
      return ['-z05', '+Z05'];
    }
    if (nummer === 35) {
      return ['-z35', '+Z35'];
    }
    if (nummer === 20) {
      return [' <b>z20</b>'];
    }
    if (nummer === 21) {
      return [' a\u202Eb'];
    }
    return [` z${String(nummer).padStart(2, '0')}`];
  }),
].join('\n');

/** Fälscht beide Diffs von `lang.txt` (Repo A) mit dem Inhalt von `weit.txt` — geprüft wird die gezeigte Stelle. */
async function weitDateiZeigen(diff) {
  await diff.antwortErsetzen({ pfad: 'lang.txt', patch: WEIT_AENDERUNGEN });
  await diff.antwortErsetzen({ pfad: 'lang.txt', umfang: 'ganz', patch: WEIT_GANZ });
  await diff.dateiAnsehen('lang.txt');
}

test.describe('Umschalter Leerraum', () => {
  test('soll mit „beachten“ starten, per Tastatur umschaltbar sein und die Stellung über Datei- und Commit-Wechsel behalten', async ({ diff }) => {
    await diff.starten();
    await diff.leerraumIst('beachten');

    await diff.leerraumPerTastaturUmschalten();

    await diff.leerraumIst('ignorieren');
    await diff.dateiAnsehen('src/b.txt');
    await diff.leerraumIst('ignorieren');
    await diff.commitAnsehen('p');
    await diff.leerraumIst('ignorieren');

    await diff.leerraumUmschalten();

    await diff.leerraumIst('beachten');
  });

  test('soll die Stellung auch ohne gewählte Datei treffen und nichts laden', async ({ diff }) => {
    await diff.starten();
    await diff.fordertZurWahlAuf();

    await diff.leerraumUmschalten();

    await diff.leerraumIst('ignorieren');
    await diff.fordertZurWahlAuf();
  });
});

test.describe('Laden bei Leerraum-Wechsel', () => {
  test('soll dieselbe Datei mit dem anderen Vergleich laden — „ignorieren“ mit Parameter, „beachten“ ohne', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');
    await diff.anfragenBeobachten();

    await diff.leerraumUmschalten();

    await diff.diffZeigt(VON_SRC_B);
    await diff.dateiGewaehlt('src/b.txt');
    await diff.anfragenEnthalten({ pfad: 'src/b.txt', leerraum: 'ignorieren' });

    await diff.leerraumUmschalten();

    await diff.anfragenEnthalten({ pfad: 'src/b.txt', leerraum: null });
    await diff.dateiGewaehlt('src/b.txt');
  });

  test('soll die späte Antwort der früheren Stellung verwerfen', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');
    const ersatz = await diff.antwortErsetzen({ pfad: 'src/b.txt', leerraum: 'ignorieren', patch: ERSATZ_PATCH, verzoegerungMs: 1500 });

    await diff.leerraumUmschalten();
    await diff.leerraumUmschalten();
    await diff.diffZeigt(VON_SRC_B);
    await ersatz.eingetroffen();

    await diff.diffZeigt(VON_SRC_B);
  });

  test('soll einen Fehler beim Wechsel melden und den Umschalter bedienbar lassen', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('src/b.txt');
    const fehler = await diff.antwortErsetzen({ pfad: 'src/b.txt', leerraum: 'ignorieren', status: 500 });

    await diff.leerraumUmschalten();

    await diff.diffMeldetFehler('src/b.txt', 'Diff konnte nicht gelesen werden');
    await fehler.eingetroffen();
    await diff.diffMeldetFehler('src/b.txt', 'Diff konnte nicht gelesen werden');

    await diff.leerraumUmschalten();

    await diff.diffZeigt(VON_SRC_B);
  });
});

test.describe('Lücke aufklappen', () => {  test('soll die Lücken ankündigen, schrittweise aufdecken und die letzte erst mit der Gesamtzeilenzahl zeigen', async ({ diff }) => {
    await diff.starten();
    await weitDateiZeigen(diff);

    await expect.poll(() => diff.zeilenzahl()).toBe(18);
    await expect.poll(() => diff.luecken()).toEqual([
      { text: '1 verborgene Zeile', schritt: '1 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '23 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);
    expect(await diff.hatZeile(9)).toBe(false);
    expect(await diff.hatZeile(31)).toBe(false);

    await diff.lueckeAufklappen(2);

    await expect.poll(() => diff.zeilenzahl()).toBe(38);
    expect(await diff.zeilentext(9)).toBe('z09');
    expect(await diff.zeilentext(28)).toBe('z28');
    await expect.poll(() => diff.luecken()).toEqual([
      { text: '1 verborgene Zeile', schritt: '1 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '3 verborgene Zeilen', schritt: '3 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '22 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);

    await diff.lueckeAufklappen(1);

    await expect.poll(() => diff.zeilenzahl()).toBe(39);
    expect(await diff.zeilentext(1)).toBe('z01');
    await expect.poll(() => diff.luecken()).toEqual([
      { text: '3 verborgene Zeilen', schritt: '3 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '22 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);

    await diff.lueckeAufklappen(1);

    await expect.poll(() => diff.zeilenzahl()).toBe(42);
    expect(await diff.zeilentext(31)).toBe('z31');
    await expect.poll(() => diff.luecken()).toEqual([{ text: '22 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' }]);

    await diff.lueckeAufklappen(1, true);

    await expect.poll(() => diff.zeilenzahl()).toBe(64);
    expect(await diff.zeilentext(60)).toBe('z60');
    expect(await diff.luecken()).toEqual([]);
  });

  test('soll die Lücke vor dem ersten Abschnitt per Tastatur öffnen und beim Wechsel wieder schließen', async ({ diff }) => {
    await diff.starten();
    await weitDateiZeigen(diff);

    await expect.poll(() => diff.zeilenzahl()).toBe(18);
    await diff.lueckeAufklappen(1, false, true);

    await expect.poll(() => diff.zeilenzahl()).toBe(19);
    expect(await diff.zeilentext(1)).toBe('z01');
    await expect.poll(() => diff.luecken()).toEqual([
      { text: '23 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '22 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);

    await diff.dateiAnsehen('src/b.txt');
    await diff.dateiAnsehen('lang.txt');

    await expect.poll(() => diff.luecken()).toEqual([
      { text: '1 verborgene Zeile', schritt: '1 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '23 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);
  });

  test('soll fremde Zeilen auch dort als Text zeigen und keine Formatierung erzeugen', async ({ diff }) => {
    await diff.starten();
    await weitDateiZeigen(diff);

    await diff.lueckeAufklappen(2, true);

    expect(await diff.zeilentext(20)).toBe('<b>z20</b>');
    expect(await diff.zeilentext(21)).toBe('a⟨U+202E⟩b');
    await diff.fremderTextBleibtText();
  });

  test('soll die ganze Datei je Datei höchstens einmal und erst auf die erste Betätigung lesen', async ({ diff }) => {
    await diff.starten();
    await weitDateiZeigen(diff);
    await diff.anfragenBeobachten();

    expect(await diff.luecken()).toHaveLength(2);

    await diff.lueckeAufklappen(2);
    await diff.lueckeAufklappen(1);
    await diff.lueckeAufklappen(1, true);

    const gelesen = (await diff.anfragenGezaehlt()).filter(anfrage => anfrage.umfang === 'ganz');
    expect(gelesen).toEqual([{ pfad: 'lang.txt', umfang: 'ganz', leerraum: null }]);
  });

  test('soll in der Ansicht „ganze Datei“ keine Lücke suchen — dort wirkt der Umschalter weiter', async ({ diff }) => {
    await diff.starten();
    await weitDateiZeigen(diff);
    expect(await diff.luecken()).toHaveLength(2);

    await diff.ansichtWaehlen('ganze Datei');

    expect(await diff.luecken()).toEqual([]);
    await expect.poll(() => diff.zeilenzahl()).toBe(62);

    await diff.leerraumUmschalten();

    await diff.leerraumIst('ignorieren');
    expect(await diff.luecken()).toEqual([]);
  });

  test('soll bei einem Fehler die Lücke zugeklappt lassen, sie melden und erneut versuchen lassen', async ({ diff }) => {
    await diff.starten();
    await diff.antwortErsetzen({ pfad: 'lang.txt', patch: WEIT_AENDERUNGEN });
    await diff.ganzErstScheitern('lang.txt', 500, WEIT_GANZ);
    await diff.dateiAnsehen('lang.txt');

    await expect.poll(() => diff.zeilenzahl()).toBe(18);

    await diff.lueckeAufklappen(2);

    await expect.poll(() => diff.zeilenzahl()).toBe(18);
    await expect.poll(() => diff.luecken()).toHaveLength(2);
    await diff.lueckeMeldet(2, 'Diff konnte nicht gelesen werden');

    await diff.lueckeAufklappen(2);

    await expect.poll(() => diff.zeilenzahl()).toBe(38);
    expect(await diff.zeilentext(9)).toBe('z09');
  });

  test('soll bei „zu groß“ die Lücke zugeklappt lassen und melden', async ({ diff }) => {
    await diff.starten();
    await diff.antwortErsetzen({ pfad: 'lang.txt', patch: WEIT_AENDERUNGEN });
    const meldung = 'Diff zu groß — die Ausgabe von git überschreitet die Grenze von 1024 Byte';
    await diff.antwortZuGross('lang.txt', meldung, 'ganz');
    await diff.dateiAnsehen('lang.txt');

    await expect.poll(() => diff.zeilenzahl()).toBe(18);

    await diff.lueckeAufklappen(2);

    await expect.poll(() => diff.zeilenzahl()).toBe(18);
    await expect.poll(() => diff.luecken()).toHaveLength(2);
    await diff.lueckeMeldet(2, meldung);
  });

  test('soll die ganze Datei auch bei zwei schnellen Klicks nur einmal lesen (R00026 Z. 31)', async ({ diff }) => {
    await diff.starten();
    await weitDateiZeigen(diff);
    await diff.antwortErsetzen({ pfad: 'lang.txt', umfang: 'ganz', patch: WEIT_GANZ, verzoegerungMs: 800 });
    await diff.anfragenBeobachten();

    await diff.lueckeAufklappen(2);
    await diff.lueckeAufklappen(2);

    await expect.poll(() => diff.zeilenzahl()).toBe(38);
    const gelesen = (await diff.anfragenGezaehlt()).filter(anfrage => anfrage.umfang === 'ganz');
    expect(gelesen).toHaveLength(1);
  });
});

test.describe('Aufgedeckte Zeilen tragen ihren eigenen Text und Link (R00021, B1)', () => {
  const TEXT = neu => (neu === 5 ? 'const z05 = 50;' : neu === 35 ? 'const z35 = 350;' : `const z${String(neu).padStart(2, '0')} = ${neu};`);

  test('soll jede aufgedeckte Zeile mit eigenem Text und eigenem VS-Code-Link zeigen (gefärbt)', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo C' });
    await diff.dateiAnsehen('code.js');
    await expect.poll(() => diff.zeilenzahl()).toBe(18);
    await expect.poll(() => diff.warteAufFarbe()).toBe('ja');

    await diff.lueckeAufklappen(2);

    await expect.poll(() => diff.zeilenzahl()).toBe(38);
    await expect.poll(() => diff.warteAufFarbe()).toBe('ja');

    await diff.zeilenMitEigenemLink(9, 28, TEXT);
  });

  test('soll dieselbe Zuordnung ohne Syntaxfarben zeigen (ungefärbt)', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo C' });
    await diff.dateiAnsehen('code.txt');
    await expect.poll(() => diff.zeilenzahl()).toBe(18);
    await expect.poll(() => diff.warteAufFarbe()).toBe('nein');

    await diff.lueckeAufklappen(2);

    await expect.poll(() => diff.zeilenzahl()).toBe(38);
    await diff.zeilenMitEigenemLink(9, 28, TEXT);
  });

  test('soll nach „ganz“ alle aufgedeckten Zeilen mit eigenem Text und Link zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo C' });
    await diff.dateiAnsehen('code.js');
    await expect.poll(() => diff.zeilenzahl()).toBe(18);
    await expect.poll(() => diff.warteAufFarbe()).toBe('ja');

    await diff.lueckeAufklappen(2, true);

    await expect.poll(() => diff.zeilenzahl()).toBe(41);
    await expect.poll(() => diff.warteAufFarbe()).toBe('ja');

    await diff.zeilenMitEigenemLink(9, 31, TEXT);
  });

  test('soll in „ganze Datei“ jede Zeile mit eigenem Text und Link zeigen (Positivkontrolle)', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo C' });
    await diff.dateiAnsehen('code.js');

    await diff.ansichtWaehlen('ganze Datei');

    await expect.poll(() => diff.zeilenzahl()).toBe(62);
    await expect.poll(() => diff.warteAufFarbe()).toBe('ja');

    await diff.zeilenMitEigenemLink(1, 60, TEXT);
  });
});

test.describe('Repo W (R00026)', () => {
  const LEERRAUM_BEACHTEN = [
    { kopf: '@@ -1,4 +1,5 @@' }, kontext('eins', 1), { minus: 'zwei', alt: 2 }, { minus: 'drei', alt: 3 },
    { plus: '  zwei', neu: 2 }, { plus: 'drei geaendert', neu: 3 }, kontext('vier', 4), { plus: '', neu: 5 },
  ];
  const LEERRAUM_IGNORIEREN = [
    { kopf: '@@ -1,4 +1,5 @@' }, kontext('eins', 1), kontext('  zwei', 2), { minus: 'drei', alt: 3 },
    { plus: 'drei geaendert', neu: 3 }, kontext('vier', 4), { plus: '', neu: 5 },
  ];

  test('soll die Einrückung ausblenden, die echte Änderung und die leere Zeile lassen und nach dem Neuladen wieder „beachten“', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo W' });
    await diff.leerraumIst('beachten');
    await diff.dateiAnsehen('leerraum.txt');
    await diff.diffZeigt({ pfad: 'leerraum.txt', zeilen: LEERRAUM_BEACHTEN });

    await diff.leerraumUmschalten();

    await diff.diffZeigt({ pfad: 'leerraum.txt', zeilen: LEERRAUM_IGNORIEREN });
    await diff.dateiGewaehlt('leerraum.txt');

    await diff.ansichtWaehlen('ganze Datei');

    await diff.diffZeigt({ pfad: 'leerraum.txt', zeilen: LEERRAUM_IGNORIEREN.slice(1) });

    await diff.neuLaden();

    await diff.leerraumIst('beachten');
    await diff.dateiAnsehen('leerraum.txt');
    await diff.diffZeigt({ pfad: 'leerraum.txt', zeilen: LEERRAUM_BEACHTEN });
  });

  test('soll die Lücken von weit.txt ankündigen, je Datei einmal lesen und die fremden Zeilen als Text zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo W', verbose: true });
    await diff.dateiAnsehen('weit.txt');
    await diff.diffsGelesen('w2', 1);

    await expect.poll(() => diff.luecken()).toEqual([
      { text: '1 verborgene Zeile', schritt: '1 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '23 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);
    expect(await diff.hatZeile(9)).toBe(false);

    await diff.lueckeAufklappen(2);

    await expect.poll(() => diff.zeilenzahl()).toBe(38);
    expect(await diff.zeilentext(9)).toBe('z09');
    expect(await diff.zeilentext(28)).toBe('z28');
    await diff.diffsGelesen('w2', 2);

    await diff.lueckeAufklappen(1);
    await diff.lueckeAufklappen(1);
    await diff.lueckeAufklappen(1, true);

    expect(await diff.zeilentext(39)).toBe('z39');
    expect(await diff.zeilentext(60)).toBe('z60');
    expect(await diff.zeilentext(20)).toBe('<b>z20</b>');
    expect(await diff.zeilentext(21)).toBe('a⟨U+202E⟩b');
    await diff.fremderTextBleibtText();
    await diff.diffsGelesen('w2', 2);
  });

  test('soll die verzögerte Antwort der ganzen Datei verwerfen, wenn inzwischen eine andere Datei gewählt ist', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo W' });
    const ersatz = await diff.antwortErsetzen({ pfad: 'weit.txt', umfang: 'ganz', patch: ERSATZ_GANZ, verzoegerungMs: 1500 });
    await diff.dateiAnsehen('weit.txt');

    await diff.lueckeAufklappen(2);
    await diff.dateiAnsehen('leerraum.txt');
    await ersatz.eingetroffen();

    await diff.diffZeigt({
      pfad: 'leerraum.txt',
      zeilen: [
        { kopf: '@@ -1,4 +1,5 @@' }, kontext('eins', 1), { minus: 'zwei', alt: 2 }, { minus: 'drei', alt: 3 },
        { plus: '  zwei', neu: 2 }, { plus: 'drei geaendert', neu: 3 }, kontext('vier', 4), { plus: '', neu: 5 },
      ],
    });
    expect(await diff.hatZeile(9)).toBe(false);
  });
});

// Nacharbeit I0027 (R00012): der Leerraum-Umschalter liegt im Werkzeugkasten, den I0027 baut — er muss auch in „Zusammen“ wirken.
// „Zusammen“ ist der Standard; der Netto-Diff der lückenlosen Kette vergleicht dann mit `-w`.
test.describe('Zusammen: Leerraum-Umschalter (R00012, Nacharbeit)', () => {
  const STILL = [
    { kopf: '@@ -1,2 +1,2 @@' }, kontext('a', 1), { minus: 'b', alt: 2 }, { plus: '  b', neu: 2 },
  ];
  const ECHT = [
    { kopf: '@@ -1,2 +1,2 @@' }, kontext('x', 1), { minus: 'y', alt: 2 }, { plus: 'Y', neu: 2 },
  ];

  test('soll in „Zusammen“ die reine Leerraum-Änderung ausblenden und die echte Änderung lassen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo Still', modus: null });

    await diff.dateiAnsehen('still.txt');
    await diff.diffZeigt({ pfad: 'still.txt', zeilen: STILL });

    await diff.leerraumUmschalten();

    await diff.leerraumIst('ignorieren');
    await diff.diffMeldet('still.txt', 'Keine Zeilenänderungen');

    await diff.dateiAnsehen('echt.txt');
    await diff.diffZeigt({ pfad: 'echt.txt', zeilen: ECHT });

    await diff.leerraumUmschalten();

    await diff.leerraumIst('beachten');
    await diff.dateiAnsehen('still.txt');
    await diff.diffZeigt({ pfad: 'still.txt', zeilen: STILL });
  });
});

// Karte #44 (PO 2026-11-26, R00026): die Lücken-Bedienelemente fehlten in „Zusammen“, weil der Netto-Zweig
// `zeichneZusammenAntwort` ohne Lückenliste zeichnete. Dieselbe Lückenrechnung wie in „Einzeln“; ohne Kette je
// Commit-Abschnitt im Stand seines Commits. Ebene: Playwright — die Rechnung prüfen die Bausteine (`luecken-werte`).
test.describe('Zusammen: Lücke aufklappen (R00026, Karte #44)', () => {
  test('soll im Netto-Diff der lückenlosen Kette die Lücken ankündigen, aufdecken und die ganze Datei einmal lesen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo W', commits: ['w2'], modus: null });
    await diff.dateiAnsehen('weit.txt');
    await diff.anfragenBeobachten();

    await expect.poll(() => diff.zeilenzahl()).toBe(18);
    await expect.poll(() => diff.luecken()).toEqual([
      { text: '1 verborgene Zeile', schritt: '1 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '23 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);
    expect(await diff.hatZeile(9)).toBe(false);

    await diff.lueckeAufklappen(2);

    await expect.poll(() => diff.zeilenzahl()).toBe(38);
    expect(await diff.zeilentext(9)).toBe('z09');
    expect(await diff.zeilentext(28)).toBe('z28');
    await expect.poll(() => diff.luecken()).toEqual([
      { text: '1 verborgene Zeile', schritt: '1 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '3 verborgene Zeilen', schritt: '3 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '22 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);

    await diff.lueckeAufklappen(1);
    await diff.lueckeAufklappen(1);
    await diff.lueckeAufklappen(1, true);

    await expect.poll(() => diff.zeilenzahl()).toBe(64);
    expect(await diff.zeilentext(1)).toBe('z01');
    expect(await diff.zeilentext(20)).toBe('<b>z20</b>');
    expect(await diff.zeilentext(21)).toBe('a⟨U+202E⟩b');
    expect(await diff.zeilentext(60)).toBe('z60');
    expect(await diff.luecken()).toEqual([]);
    await diff.fremderTextBleibtText();
    const gelesen = (await diff.anfragenGezaehlt()).filter(anfrage => anfrage.umfang === 'ganz');
    expect(gelesen).toEqual([{ pfad: 'weit.txt', umfang: 'ganz', leerraum: null }]);
  });

  test('soll ohne Kette je Commit-Abschnitt Lücken zeigen und im Stand des jeweiligen Commits aufdecken', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo Y', modus: null });
    await diff.dateiAnsehen('weit.txt');
    await diff.anfragenBeobachten();

    // `y3` ändert die Zeilen 5 und 35 — zwei Abschnitte mit der Lücke 9–31; `y1` legt die Datei an (ein Abschnitt, keine Lücke).
    await expect.poll(() => diff.abschnittLuecken('y3')).toEqual([
      { text: '1 verborgene Zeile', schritt: '1 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '23 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);
    expect(await diff.abschnittLuecken('y1')).toEqual([]);
    expect(await diff.abschnittZeilenzahl('y3')).toBe(18);
    expect(await diff.abschnittHatZeile('y3', 9)).toBe(false);

    await diff.abschnittLueckeAufklappen('y3', 2);

    await expect.poll(() => diff.abschnittZeilenzahl('y3')).toBe(38);
    expect(await diff.abschnittZeilentext('y3', 9)).toBe('z09');
    expect(await diff.abschnittZeilentext('y3', 28)).toBe('z28');
    await expect.poll(() => diff.abschnittLuecken('y3')).toEqual([
      { text: '1 verborgene Zeile', schritt: '1 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '3 verborgene Zeilen', schritt: '3 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '22 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);

    await diff.abschnittLueckeAufklappen('y3', 1);
    expect(await diff.abschnittZeilentext('y3', 1)).toBe('z01');
    await diff.abschnittLueckeAufklappen('y3', 1);
    await diff.abschnittLueckeAufklappen('y3', 1, true);

    await expect.poll(() => diff.abschnittZeilenzahl('y3')).toBe(64);
    expect(await diff.abschnittZeilentext('y3', 20)).toBe('<b>z20</b>');
    expect(await diff.abschnittZeilentext('y3', 21)).toBe('a⟨U+202E⟩b');
    expect(await diff.abschnittZeilentext('y3', 60)).toBe('z60');
    expect(await diff.abschnittLuecken('y3')).toEqual([]);
    await diff.fremderTextBleibtText();
    expect(await diff.abschnittZeilenzahl('y1')).toBe(61);
    const gelesen = (await diff.anfragenGezaehlt()).filter(anfrage => anfrage.umfang === 'ganz');
    expect(gelesen, 'je Abschnitt höchstens ein Lesevorgang der ganzen Datei').toHaveLength(1);
  });
});
