'use strict';
// Spezifikation R00004 „Diff einer Datei lesen“ (User Story Szenarien 1–16). Commits heißen wie in der Vorbereitung der Anforderung (p, q, s; m; u).
const { test } = require('../dsl/diff-lesen.js');
const { anzeigeSchrankeMs } = require('../dsl/schranken.js');

const LANGE_ZEILE = '0123456789'.repeat(30);
const DIFF_VON_B = {
  pfad: 'src/b.txt',
  zeilen: [
    { kopf: '@@ -1,2 +1,3 @@' },
    { kontext: 'eins', alt: 1, neu: 1 },
    { minus: 'zwei', alt: 2 },
    { plus: 'ZWEI', neu: 2 },
    { plus: 'drei', neu: 3 },
  ],
};
const DIFF_VON_LANG = {
  pfad: 'lang.txt',
  zeilen: [
    { kopf: '@@ -1,6 +1,6 @@' },
    { kontext: 'z01', alt: 1, neu: 1 },
    { kontext: 'z02', alt: 2, neu: 2 },
    { minus: 'z03', alt: 3 },
    { plus: 'Z03', neu: 3 },
    { kontext: 'z04', alt: 4, neu: 4 },
    { kontext: 'z05', alt: 5, neu: 5 },
    { kontext: 'z06', alt: 6, neu: 6 },
    { kopf: '@@ -15,6 +15,5 @@ z14' },
    { kontext: 'z15', alt: 15, neu: 15 },
    { kontext: 'z16', alt: 16, neu: 16 },
    { kontext: 'z17', alt: 17, neu: 17 },
    { minus: 'z18', alt: 18 },
    { kontext: 'z19', alt: 19, neu: 18 },
    { kontext: 'z20', alt: 20, neu: 19 },
  ],
};
const DIFF_VON_K = {
  pfad: 'k.txt',
  zeilen: [
    { kopf: '@@ -1,3 +1,3 @@' },
    { kontext: 'oben', alt: 1, neu: 1 },
    { kontext: '', alt: 2, neu: 2 },
    { minus: 'unten', alt: 3 },
    { plus: 'UNTEN', neu: 3 },
  ],
};

test.describe('Diff einer Datei lesen', () => {
  test('soll den Diff mit Zeilennummern alt und neu ohne den Dateikopf von git zeigen', async ({ diff }) => {
    await diff.starten();

    await diff.dateiAnsehen('src/b.txt');

    await diff.diffZeigt(DIFF_VON_B);
  });

  test('soll in mehreren Änderungsabschnitten die Nummern nach einer gelöschten Zeile verschieben', async ({ diff }) => {
    await diff.starten();

    await diff.dateiAnsehen('lang.txt');

    await diff.diffZeigt(DIFF_VON_LANG);
  });

  test('soll hinzugefügte und gelöschte Dateien als reine Plus- bzw. Minuszeilen zeigen', async ({ diff }) => {
    await diff.starten();

    await diff.dateiAnsehen('breit.txt');
    await diff.diffZeigt({ pfad: 'breit.txt', zeilen: [{ kopf: '@@ -0,0 +1,2 @@' }, { plus: 'kurz', neu: 1 }, { plus: LANGE_ZEILE, neu: 2 }] });
    await diff.dateiAnsehen('alt.txt');
    await diff.diffZeigt({
      pfad: 'alt.txt',
      zeilen: [{ kopf: '@@ -1,4 +0,0 @@' }, { minus: 'a1', alt: 1 }, { minus: 'a2', alt: 2 }, { minus: 'a3', alt: 3 }, { minus: 'a4', alt: 4 }],
    });
  });

  test('soll den Hinweis auf das fehlende Zeilenende ohne Vorzeichen und Nummern zeigen', async ({ diff }) => {
    await diff.starten();

    await diff.dateiAnsehen('ende.txt');

    await diff.diffZeigt({ pfad: 'ende.txt', zeilen: [{ kopf: '@@ -1 +1 @@' }, { minus: 'a', alt: 1 }, { hinweis: '\\ No newline at end of file' }, { plus: 'a', neu: 1 }] });
  });

  test('soll bei einer unveränderten Umbenennung und einer Binärdatei nur eine Meldung zeigen', async ({ diff }) => {
    await diff.starten();

    await diff.dateiAnsehen('LIESMICH.md ← README.md');
    await diff.diffMeldet('LIESMICH.md ← README.md', 'Keine Zeilenänderungen');
    await diff.dateiAnsehen('logo.bin');
    await diff.binaerMeldet('logo.bin', 'enthält Null-Bytes');
  });

  test('soll einen Merge-Commit gegenüber seinem ersten Elternteil zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Merge', commits: ['m'] });

    await diff.dateienSind(['f.txt']);
    await diff.dateiAnsehen('f.txt');

    await diff.diffZeigt({ pfad: 'f.txt', zeilen: [{ kopf: '@@ -0,0 +1 @@' }, { plus: 'neu', neu: 1 }] });
  });

  test('soll lange Zeilen umbrochen zeigen, auf Wunsch einzeilig schalten und die Wahl beim Dateiwechsel behalten', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('breit.txt');

    await diff.langeZeileUmbrochen(2, LANGE_ZEILE);
    await diff.umbruchUmschalten();
    await diff.langeZeileEinzeilig(2, LANGE_ZEILE);
    await diff.dateiAnsehen('src/b.txt');
    await diff.dateiAnsehen('breit.txt');
    await diff.langeZeileEinzeilig(2, LANGE_ZEILE);
  });

  test('soll fremden Text als Text zeigen und richtungsändernde Zeichen als Marke', async ({ diff }) => {
    await diff.starten();

    await diff.dateiAnsehen('fremd.txt');

    await diff.diffZeigt({
      pfad: 'fremd.txt',
      zeilen: [{ kopf: '@@ -0,0 +1,3 @@' }, { plus: '<img src=x onerror=alert(1)>', neu: 1 }, { plus: '<b>fett</b>', neu: 2 }, { plus: 'a⟨U+202E⟩b', neu: 3 }],
    });
    await diff.fremderTextBleibtText();
  });

  test('soll richtungsändernde Zeichen auch im Pfad über dem Diff als Marke zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Bidi im Dateinamen' });

    await diff.dateiAnsehen('a⟨U+202E⟩b.txt');

    await diff.diffZeigt({ pfad: 'a⟨U+202E⟩b.txt', zeilen: [{ kopf: '@@ -0,0 +1 @@' }, { plus: 'x', neu: 1 }] });
  });
});

test.describe('Diff erst bei Auswahl laden', () => {
  test('soll den Diff einer Datei erst bei ihrer Wahl lesen und beim Commit-Wechsel zum Wählen auffordern', async ({ diff }) => {
    await diff.starten({ verbose: true });
    await diff.commitGewaehlt('q');
    await diff.fordertZurWahlAuf();
    await diff.diffsGelesen('q', 0);

    await diff.dateiAnsehen('src/b.txt');
    await diff.diffZeigt(DIFF_VON_B);
    await diff.diffsGelesen('q', 1);
    await diff.dateiAnsehen('lang.txt');
    await diff.diffZeigt(DIFF_VON_LANG);
    await diff.diffsGelesen('q', 2);
    await diff.commitAnsehen('p');

    await diff.fordertZurWahlAuf();
    await diff.diffsGelesen('q', 2);
  });

  test('soll eine späte Antwort nach dem Wechsel der Datei verwerfen', async ({ diff }) => {
    await diff.starten();
    const spaeteAntwort = await diff.antwortVerzoegern('src/b.txt');

    await diff.dateiAnsehen('src/b.txt');
    await diff.dateiAnsehen('lang.txt');
    await diff.diffZeigt(DIFF_VON_LANG);
    await spaeteAntwort.eingetroffen();

    await diff.diffZeigt(DIFF_VON_LANG);
  });

  test('soll eine späte Antwort nach dem Wechsel des Commits verwerfen', async ({ diff }) => {
    await diff.starten();
    const spaeteAntwort = await diff.antwortVerzoegern('src/b.txt');

    await diff.dateiAnsehen('src/b.txt');
    await diff.commitAnsehen('p');
    await spaeteAntwort.eingetroffen();

    await diff.fordertZurWahlAuf();
  });

  test('soll einen nicht lesbaren Diff melden und die Dateiliste bedienbar lassen', async ({ diff }) => {
    await diff.starten({ verbose: true });
    await diff.dateienSind(['LIESMICH.md ← README.md', 'alt.txt', 'breit.txt', 'ende.txt', 'fremd.txt', 'k.txt', 'lang.txt', 'logo.bin', 'src/b.txt']);
    diff.commitObjektEntfernen('q');

    await diff.dateiAnsehen('src/b.txt');
    await diff.diffMeldetFehler('src/b.txt', 'Diff konnte nicht gelesen werden');
    await diff.commitAnsehen('p');
    await diff.dateiAnsehen('src/b.txt');

    await diff.diffZeigt({ pfad: 'src/b.txt', zeilen: [{ kopf: '@@ -0,0 +1,2 @@' }, { plus: 'eins', neu: 1 }, { plus: 'zwei', neu: 2 }] });
    diff.fehlerProtokolliertFuer('q', 'src/b.txt');
    diff.ergebnisBleibtLeer();
  });
});

test.describe('Fremdes Repository', () => {
  test('soll keine Diff-Programme aus der Konfiguration des Repos starten', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Diff-Programme' });

    await diff.dateiAnsehen('src/b.txt');

    await diff.diffZeigt(DIFF_VON_B);
    diff.keinDiffProgrammGelaufen();
  });

  test('soll den Diff unabhängig von Kontext, Leerzeilen und Farben der Repo-Konfiguration zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'fremde Einstellungen' });

    await diff.dateiAnsehen('k.txt');

    await diff.diffZeigt(DIFF_VON_K);
  });

  test('soll fremde Pfade und Kennungen abweisen, ohne sie an git zu geben', async ({ diff }) => {
    await diff.starten({ commits: ['q'], seiteOeffnen: false });

    for (const pfad of ['nicht-da.txt', '../README.md', '--output=pwn', 'src', 'SRC/B.TXT', ':(top)src/b.txt', '*.txt']) {
      await diff.diffAnfrageAbgewiesen({ pfad });
    }
    await diff.diffAnfrageOhnePfadAbgewiesen();
    for (const kennung of ['HEAD', 'p', 'q kurz']) {
      await diff.diffAnfrageAbgewiesen({ kennung, pfad: 'src/b.txt' });
    }

    await diff.keinDiffGelesen();
    diff.keineDateiAngelegt('pwn');
    await diff.diffAnfrageBeantwortet({ pfad: 'src/b.txt' });
  });

  test('soll aus einem Unterordner gestartet den Diff jeder Datei ab der Wurzel zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Start im Unterordner src' });

    await diff.dateiAnsehen('src/b.txt');
    await diff.diffZeigt(DIFF_VON_B);
    await diff.commitAnsehen('p');
    await diff.dateiAnsehen('README.md');
    await diff.diffZeigt({ pfad: 'README.md', zeilen: [{ kopf: '@@ -0,0 +1,2 @@' }, { plus: 'Titel', neu: 1 }, { plus: 'Text', neu: 2 }] });
  });

  test('soll den Zeigerwechsel eines Submoduls zeigen, auch wenn das Repo Submodule als Log darstellt', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Submodul als Log' });

    await diff.dateiAnsehen('sub');

    await diff.submodulWechselZeigt('sub', 'e', 'z');
  });

  test('soll Dateien mit Namen wie Optionen und Muster je nur selbst zeigen', async ({ diff }) => {
    await diff.starten({ commits: ['s'] });

    await diff.dateiAnsehen('--output=pwn');
    await diff.diffZeigt({ pfad: '--output=pwn', zeilen: [{ kopf: '@@ -0,0 +1 @@' }, { plus: 'x', neu: 1 }] });
    await diff.dateiAnsehen(':(glob)*.txt');
    await diff.diffZeigt({ pfad: ':(glob)*.txt', zeilen: [{ kopf: '@@ -0,0 +1 @@' }, { plus: 'y', neu: 1 }] });
    await diff.dateiAnsehen('c.txt');
    await diff.diffZeigt({ pfad: 'c.txt', zeilen: [{ kopf: '@@ -0,0 +1 @@' }, { plus: 'z', neu: 1 }] });

    diff.keineDateiAngelegt('pwn');
  });
});

test.describe('Binärdateien', () => {
  test('soll eine Datei mit Null-Bytes als Binärdatei mit Grund melden und ihren Text erst auf ausdrückliche Wahl zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'versteckter Code' });

    await diff.dateiAnsehen('x.js');
    await diff.binaerMeldet('x.js', 'enthält Null-Bytes');
    await diff.dateiAnsehen('logo.bin');
    await diff.binaerMeldet('logo.bin', 'enthält Null-Bytes');
    await diff.alsTextGelesen(0);

    await diff.dateiAnsehen('x.js');
    await diff.alsTextZeigen();
    await diff.diffZeigt({ pfad: 'x.js', zeilen: [{ kopf: '@@ -0,0 +1,2 @@' }, { plus: 'a␀ U+0000b', neu: 1 }, { plus: 'steal();', neu: 2 }] });
    await diff.alsTextGelesen(1);

    await diff.dateiAnsehen('logo.bin');
    await diff.binaerMeldet('logo.bin', 'enthält Null-Bytes');
    await diff.alsTextGelesen(1);
  });

  test('soll eine per Attribut des Repos als binär markierte Datei mit diesem Grund melden und auf Wahl zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'versteckter Code' });

    await diff.dateiAnsehen('y.txt');
    await diff.binaerMeldet('y.txt', 'per Attribut als binär markiert');
    await diff.alsTextZeigen();

    await diff.diffZeigt({ pfad: 'y.txt', zeilen: [{ kopf: '@@ -1 +1,2 @@' }, { kontext: 'eins', alt: 1, neu: 1 }, { plus: 'steal();', neu: 2 }] });
  });

  test('soll eine Binärdatei über 20 000 Zeilen als Text zugeklappt zeigen, bis „Trotzdem laden“ gewählt wird', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'versteckter Code' });

    await diff.dateiAnsehen('viel.js');
    await diff.alsTextZeigen();
    await diff.zugeklappt('viel.js', 'Sehr lang: 20.001 Zeilen — zugeklappt');
    await diff.trotzdemLaden();

    await diff.zeileZeigt(20001, 'zeile 20000');
  });

  test('soll Änderungen, die das Repo per Attribut, Attributdatei oder Größengrenze als binär ausgeben ließe, als Text zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Binärausgabe des Repos' });

    for (const pfad of ['a.js', 'b.js', 'c.js']) {
      await diff.dateiAnsehen(pfad);
      await diff.diffZeigt({ pfad, zeilen: [{ kopf: '@@ -1 +1,2 @@' }, { kontext: 'eins', alt: 1, neu: 1 }, { plus: 'steal();', neu: 2 }] });
    }
    await diff.alsTextGelesen(0);
  });
});

test.describe('Große Diffs', () => {
  test('soll 20 000 Zeilen spätestens 5 s nach dem Klick zeigen (Anzeige-Schranke)', async ({ diff }) => {
    await diff.starten({ vorbereitung: '20 000 Zeilen', commits: ['u'] });

    const dauerMs = await diff.zeileRechtzeitigNachKlick('gross.txt', { kopf: '@@ -0,0 +1,20000 @@', plus: 'zeile 20000', neu: 20000 });

    test.info().annotations.push({ type: 'Messwert', description: `Zeile 20000 nach ${dauerMs} ms (Anzeige-Schranke ${anzeigeSchrankeMs} ms)` });
  });
});

test.describe('Große Binärdateien als Text', () => {
  test('soll nach „Als Text zeigen“ bei Null-Bytes und Zufall von 100 KB bis 3 MB spätestens 5 s später bedienbar sein', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'große Binärdateien', commits: ['k'] });

    for (const datei of ['k100.bin', 'k500.bin', 'k3m.bin', 'z200.bin']) {
      const dauerMs = await diff.alsTextBleibtBedienbar(datei, 'klein.txt', anzeigeSchrankeMs);

      test.info().annotations.push({ type: 'Messwert', description: `${datei}: bedienbar nach ${dauerMs} ms (Anzeige-Schranke ${anzeigeSchrankeMs} ms)` });
    }
  });
});
