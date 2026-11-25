'use strict';
// Spezifikation R00032 „Umbruch standardmäßig an“: der Startzustand, „überall und bleibend“ und „unberührt“. Die Leistungsprobe
// und das Ergebnis auf stdout ohne Browser folgen. Die Werte des Umschalters prüft bausteine/umbruch-werte.spec.js.
const { test } = require('../dsl/diff-lesen.js');

const LANGE_ZEILE = '0123456789'.repeat(30);
const NUR_AENDERUNGEN = 'nur Änderungen';
const GANZE_DATEI = 'ganze Datei';
const UNTEREINANDER = 'untereinander';
const NEBENEINANDER = 'nebeneinander';

test.describe('Startzustand (R00032)', () => {
  test('Kriterium 1: ohne gewählte Datei steht der Umschalter „an“; die lange Zeile ist umbrochen und der Bereich scrollt nicht waagerecht', async ({ diff }) => {
    await diff.starten();

    await diff.umbruchIst('an');

    await diff.dateiAnsehen('breit.txt');
    await diff.langeZeileUmbrochen(2, LANGE_ZEILE);
  });

  test('Kriterium 2: der Umschalter bleibt bedienbar — auf „aus“ einzeilig mit waagerechtem Scrollen, wieder auf „an“ umbrochen, Text unverändert', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('breit.txt');

    await diff.umbruchUmschalten();
    await diff.langeZeileEinzeilig(2, LANGE_ZEILE);

    await diff.umbruchUmschalten();
    await diff.langeZeileUmbrochen(2, LANGE_ZEILE);
  });

  test('Kriterium 1 (Umschalter): der Umschalter „Umbruch“ ist ein Schalter mit sichtbarem Namen, per Tab erreichbar und mit der Leertaste bedienbar', async ({ diff }) => {
    await diff.starten();

    await diff.umschalterIst('an');

    await diff.dateiAnsehen('breit.txt');
    await diff.umschalterPerTabErreichbar();
    await diff.umbruchPerTastaturUmschalten();
    await diff.umschalterIst('aus');
    await diff.langeZeileEinzeilig(2, LANGE_ZEILE);

    await diff.umbruchPerTastaturUmschalten();
    await diff.umschalterIst('an');
    await diff.langeZeileUmbrochen(2, LANGE_ZEILE);
  });
});

test.describe('Überall und bleibend (R00032)', () => {
  for (const modus of ['einzeln', 'zusammen']) {
    test(`Kriterium 3: in „${modus}“ sind alle acht Kombinationen aus Ansicht, Anordnung und Modus umbrochen, der Umschalter „an“`, async ({ diff }) => {
      await diff.starten({ modus });
      await diff.dateiAnsehen('breit.txt');

      for (const ansicht of [NUR_AENDERUNGEN, GANZE_DATEI]) {
        await diff.ansichtWaehlen(ansicht);
        for (const anordnung of [UNTEREINANDER, NEBENEINANDER]) {
          await diff.anordnungWaehlen(anordnung);
          await diff.umbruchIst('an');
          await diff.zeileUmbrochen(2);
        }
      }
    });
  }

  test('Kriterium 4: die Stellung bleibt über Ansicht, Anordnung, Datei und Commit; nach dem Neuladen gilt wieder „an“', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('breit.txt');

    await diff.ansichtWaehlen(GANZE_DATEI);
    await diff.ansichtWaehlen(NUR_AENDERUNGEN);
    await diff.anordnungWaehlen(NEBENEINANDER);
    await diff.anordnungWaehlen(UNTEREINANDER);
    await diff.dateiAnsehen('src/b.txt');
    await diff.dateiAnsehen('breit.txt');
    await diff.commitAnsehen('p');
    await diff.commitAnsehen('q');
    await diff.dateiAnsehen('breit.txt');

    await diff.langeZeileUmbrochen(2, LANGE_ZEILE);

    // Nur RAM: die Stellung überlebt das Neuladen nicht — die Seite startet wieder mit „an“ (R00032).
    await diff.umbruchUmschalten();
    await diff.langeZeileEinzeilig(2, LANGE_ZEILE);
    await diff.neuLaden();
    await diff.umbruchIst('an');
  });

  test('Kriterium 5: von „Einzeln“ auf „Zusammen“ umgeschaltet bleibt die lange Zeile umbrochen', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('breit.txt');
    await diff.langeZeileUmbrochen(2, LANGE_ZEILE);

    await diff.modusWaehlen('zusammen');
    await diff.dateiAnsehen('breit.txt');

    await diff.umbruchIst('an');
    await diff.zeileUmbrochen(2);
  });

  test('Kriterium 5: ohne lückenlose Kette sind die Abschnitte je Commit gezeigt und die lange Zeile bleibt umbrochen', async ({ diff }) => {
    // `v1` und `v3` bilden keine Kette (es fehlt `v2`); `breit.txt` kommt in `v1` und `v3`.
    await diff.starten({ vorbereitung: 'Repo V', modus: 'zusammen' });
    await diff.dateiAnsehen('breit.txt');

    await diff.herkunft('je Commit, nicht netto — Es fehlen Commits der Auswahl');
    await diff.umbruchIst('an');
    await diff.abschnittZeileUmbrochen('v1', 2);
    await diff.abschnittZeileUmbrochen('v3', 2);
  });
});

test.describe('Unberührt (R00032)', () => {
  test('Kriterium 6: Text, Nummern alt/neu, die Marke für Richtungsänderndes und die Hinweise sind mit Umbruch an wie ohne', async ({ diff }) => {
    await diff.starten();
    await diff.umbruchIst('an');

    await diff.dateiAnsehen('lang.txt');
    await diff.diffZeigt({
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
    });
    await diff.dateiAnsehen('fremd.txt');
    await diff.diffZeigt({
      pfad: 'fremd.txt',
      zeilen: [{ kopf: '@@ -0,0 +1,3 @@' }, { plus: '<img src=x onerror=alert(1)>', neu: 1 }, { plus: '<b>fett</b>', neu: 2 }, { plus: 'a⟨U+202E⟩b', neu: 3 }],
    });
    await diff.fremderTextBleibtText();

    await diff.dateiAnsehen('LIESMICH.md ← README.md');
    await diff.diffMeldet('LIESMICH.md ← README.md', 'Keine Zeilenänderungen');
    await diff.dateiAnsehen('logo.bin');
    await diff.binaerMeldet('logo.bin', 'enthält Null-Bytes');
  });
});

