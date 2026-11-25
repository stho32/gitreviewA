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

test.describe('Lücke aufklappen', () => {
  test('soll die Lücken ankündigen, schrittweise aufdecken und die letzte erst mit der Gesamtzeilenzahl zeigen', async ({ diff }) => {
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

  test('soll bei einem Fehler beim Lesen der ganzen Datei die Meldung zeigen', async ({ diff }) => {
    await diff.starten();
    await diff.antwortErsetzen({ pfad: 'lang.txt', patch: WEIT_AENDERUNGEN });
    await diff.antwortErsetzen({ pfad: 'lang.txt', umfang: 'ganz', status: 500 });
    await diff.dateiAnsehen('lang.txt');

    await diff.lueckeAufklappen(2);

    await diff.diffMeldetFehler('lang.txt', 'Diff konnte nicht gelesen werden');
    await diff.dateiGewaehlt('lang.txt');
  });
});
