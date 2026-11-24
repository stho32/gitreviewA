'use strict';
// Spezifikation R00007 „Syntaxhervorhebung im Diff“ (User Story Szenarien 1–13): Rolle einer Textstelle im Browser, Worker, Sicherheitsrichtlinie,
// Farbe und Kontrast, fremder Text, Long Tasks. Die Rechnungen (Sprache, Grenze, Tokens je Hunk-Seite, Schlange mit Frist) prüfen
// die Bausteintests unter tests/bausteine/.
const { test, expect } = require('../dsl/faerbung.js');

const NUR_AENDERUNGEN = 'nur Änderungen';
const GANZE_DATEI = 'ganze Datei';

/** Kriterium 1: Endungen → Zeile (hinzugefügt) → Textstelle → Rolle. */
const SPRACHEN = [
  { endungen: ['cs'], zeile: 'public string Gruss(string name) { return "Hallo " + 42; }', stelle: 'return', rolle: 'Schlüsselwort' },
  { endungen: ['js', 'mjs', 'cjs'], zeile: 'function gruss(name) { return "Hallo " + 42; }', stelle: 'gruss', rolle: 'Funktion' },
  { endungen: ['json'], zeile: '  "n": 42,', stelle: '42', rolle: 'Zahl' },
  { endungen: ['css'], zeile: '/* Gruß */', stelle: '/* Gruß */', rolle: 'Kommentar' },
  { endungen: ['html', 'htm', 'xml', 'svg'], zeile: '<!-- Gruß -->', stelle: '<!-- Gruß -->', rolle: 'Kommentar' },
  { endungen: ['md'], zeile: 'Text mit `code`', stelle: '`code`', rolle: 'Schlüsselwort' },
  { endungen: ['py'], zeile: 'def gruss(name):', stelle: 'def', rolle: 'Schlüsselwort' },
  { endungen: ['sh', 'bash'], zeile: '# Gruß', stelle: '# Gruß', rolle: 'Kommentar' },
  { endungen: ['yml', 'yaml'], zeile: 'n: 42', stelle: '42', rolle: 'Zahl' },
  { endungen: ['sql'], zeile: 'SELECT name FROM nutzer WHERE id = 42;', stelle: 'SELECT', rolle: 'Schlüsselwort' },
  { endungen: ['rs'], zeile: 'fn gruss(name: &str) -> String { format!("Hallo {}", 42) }', stelle: 'format!', rolle: 'Makro' },
  { endungen: ['toml'], zeile: 'n = 42', stelle: '42', rolle: 'Zahl' },
  { endungen: ['php'], zeile: 'echo "Hallo" . 42;', stelle: 'echo', rolle: 'Schlüsselwort' },
];

const ROLLEN_RS = [
  ['fn', 'Schlüsselwort'], ['str', 'Schlüsselwort'], ['gruss', 'Funktion'], ['String', 'Typ'], ['format!', 'Makro'], ['"Hallo {}"', 'Zeichenkette'],
  ['// Gruß', 'Kommentar'],
];
const rollenZeile = zahl => `fn gruss(name: &str) -> String { format!("Hallo {}", ${zahl}) } // Gruß`;
const ROLLEN_ZEILEN = [{ kontext: rollenZeile(42), zahl: '42' }, { minus: rollenZeile(41), zahl: '41' }, { plus: rollenZeile(43), zahl: '43' }];

const KOMMENTAR_JS = ['/* Kopf', '   zweite Zeile', '*/'];
const WEIT_KOMMENTAR = ['/* Kopf', '   zwei', '   drei', '   vier', '   fünf', '*/'];
const kontext = (text, nummer) => ({ kontext: text, alt: nummer, neu: nummer });
const WEIT_GANZ = {
  pfad: 'weit.js',
  zeilen: [...WEIT_KOMMENTAR.map((text, index) => kontext(text, index + 1)), { minus: 'var x = 1;', alt: 7 }, { plus: 'var x = 2;', neu: 7 }],
};
const WEIT_AENDERUNGEN = {
  pfad: 'weit.js',
  zeilen: [{ kopf: '@@ -4,4 +4,4 @@' }, kontext('   vier', 4), kontext('   fünf', 5), kontext('*/', 6), { minus: 'var x = 1;', alt: 7 }, { plus: 'var x = 2;', neu: 7 }],
};

/** Texte der Zeilen von `kommentar.js` je Ansicht, mit Lesetext; „ganze Datei“ zeigt keinen Abschnittskopf. */
function kommentarJsZeilen(ansicht) {
  const zeilen = [...KOMMENTAR_JS, 'function main() {}'].map(text => `hinzugefügt: ${text}`);
  if (ansicht === GANZE_DATEI) {
    return zeilen;
  }
  return ['@@ -0,0 +1,4 @@', ...zeilen];
}

async function pruefeWeitGanzGefaerbt(farbe) {
  for (const text of WEIT_KOMMENTAR) {
    await farbe.traegt({ kontext: text }, text, 'Kommentar');
  }
  await farbe.traegt({ minus: 'var x = 1;' }, 'var', 'Schlüsselwort');
  await farbe.traegt({ minus: 'var x = 1;' }, '1', 'Zahl');
  await farbe.traegt({ plus: 'var x = 2;' }, 'var', 'Schlüsselwort');
  await farbe.traegt({ plus: 'var x = 2;' }, '2', 'Zahl');
  await farbe.nurDerTextTraegtRollen();
}

test.describe('Farbe', () => {
  test('soll jede bekannte Sprache nach ihrer Endung färben (Kriterium 1)', async ({ farbe }) => {
    await farbe.starten();

    for (const { endungen, zeile, stelle, rolle } of SPRACHEN) {
      for (const endung of endungen) {
        expect(await farbe.waehlen(`beispiel.${endung}`), `beispiel.${endung}`).toBe('ja');
        await farbe.traegt({ plus: zeile }, stelle, rolle);
      }
    }
  });

  test('soll nach dem Dateinamen färben: Ordner und Großschreibung egal, gelöscht nach altem, umbenannt nach neuem Pfad (Kriterium 1)', async ({ farbe }) => {
    await farbe.starten();

    await farbe.waehlen('SRC/GROSS.RS');
    await farbe.traegt({ plus: 'fn y() {}' }, 'fn', 'Schlüsselwort');
    await farbe.waehlen('alt.py');
    await farbe.traegt({ minus: 'def alt(): pass' }, 'def', 'Schlüsselwort');
    await farbe.waehlen('umbenannt.rs');
    for (const text of ['// eins', '// zwei', '// drei']) {
      await farbe.traegt({ kontext: text }, text, 'Kommentar');
    }
    await farbe.traegt({ minus: 'fn y() {}' }, 'fn', 'Schlüsselwort');
    await farbe.traegt({ plus: 'fn z() {}' }, 'fn', 'Schlüsselwort');
  });

  test('soll einen Kommentar über mehrere Zeilen ganz färben, Kopf, Vorzeichen und Nummern nicht (Kriterium 2)', async ({ farbe }) => {
    await farbe.starten();

    await farbe.waehlen('kommentar.js');

    for (const text of KOMMENTAR_JS) {
      await farbe.traegt({ plus: text }, text, 'Kommentar');
    }
    await farbe.traegt({ plus: 'function main() {}' }, 'function', 'Schlüsselwort');
    await farbe.nurDerTextTraegtRollen();
    await farbe.textWieVorDerFarbe();
  });

  test('soll die entfernte Zeile nach der alten Seite und Kontext und hinzugefügte nach der neuen färben (Kriterium 3)', async ({ farbe }) => {
    await farbe.starten();

    await farbe.waehlen('seiten.js');

    await farbe.diffZeigt({
      pfad: 'seiten.js',
      zeilen: [{ kopf: '@@ -1,3 +1,3 @@' }, kontext('var a = 1;', 1), { minus: '/* weg', alt: 2 }, { plus: 'var b = 2;', neu: 2 }, kontext('*/ var c = 3;', 3)],
    });
    await farbe.traegt({ minus: '/* weg' }, '/* weg', 'Kommentar');
    await farbe.traegtKeine({ kontext: '*/ var c = 3;' }, '*/');
    await farbe.traegt({ kontext: '*/ var c = 3;' }, 'var', 'Schlüsselwort');
    await farbe.traegt({ plus: 'var b = 2;' }, 'var', 'Schlüsselwort');
  });

  test('soll die sieben Rollen in hell und dunkel unterscheidbar und mit Kontrast ≥ 4,5 : 1 zeigen, nur den Kommentar kursiv (Kriterium 4)', async ({ farbe }) => {
    await farbe.starten();
    const schluesselwort = {};
    const kontraste = [];

    for (const schema of ['light', 'dark']) {
      await farbe.farbschema(schema);
      await farbe.waehlen('rollen.rs');
      for (const zeile of ROLLEN_ZEILEN) {
        const { zahl, ...art } = zeile;
        for (const [stelle, rolle] of ROLLEN_RS) {
          await farbe.traegt(art, stelle, rolle);
        }
        await farbe.traegt(art, zahl, 'Zahl');
      }
      kontraste.push(...(await farbe.rollenfarbenSindUnterscheidbar()).map(wert => ({ schema, ...wert })));
      schluesselwort[schema] = (await farbe.rollenfarbe('plus', 'Schlüsselwort')).join(',');
    }

    expect(kontraste).toHaveLength(42);
    expect(schluesselwort.light).not.toBe(schluesselwort.dark);
    test.info().annotations.push({ type: 'Kontraste', description: JSON.stringify(kontraste) });
  });
});

test.describe('Wo nicht gefärbt wird', () => {
  test('soll Dateien ohne bekannte Endung ungefärbt, mit gleichem Text und ohne Meldung zeigen (Kriterium 5)', async ({ farbe }) => {
    await farbe.starten();
    const ungefaerbt = ['Makefile', 'notiz.unbekannt', 'LIESMICH', 'a.js.txt', 'beispiel.tsx', 'beispiel.go', 'beispiel.java', 'beispiel.c', 'beispiel.cpp', 'App.csproj', 'Seite.razor'];

    for (const pfad of ungefaerbt) {
      expect(await farbe.waehlen(pfad), pfad).toBe('nein');
      await farbe.istUngefaerbt();
      await farbe.keineMeldung();
      await farbe.textWieVorDerFarbe();
    }
  });

  test('soll über den Grenzen ungefärbt bleiben und an der Grenze färben (Kriterium 5)', async ({ farbe }) => {
    await farbe.starten({ vorbereitung: 'Repo L' });

    expect(await farbe.waehlen('drueber.js')).toBe('nein');
    await farbe.istUngefaerbt();
    await farbe.keineMeldung();
    expect(await farbe.waehlen('zu-gross.js')).toBe('nein');
    await farbe.istUngefaerbt();
    await farbe.keineMeldung();
    expect(await farbe.waehlen('grenze.js')).toBe('ja');

    await farbe.traegt({ plus: 'function g() {}' }, 'function', 'Schlüsselwort');
  });

  for (const ausfall of ['Prism nicht abrufbar', 'ohne Worker', 'Färbung wirft']) {
    for (const ansicht of [NUR_AENDERUNGEN, GANZE_DATEI]) {
      test(`soll bei Ausfall „${ausfall}“ in „${ansicht}“ ungefärbt und still bleiben und bedienbar sein (Kriterium 6)`, async ({ farbe }) => {
        await farbe.starten({ ausfall });
        await farbe.ansichtWaehlen(ansicht);

        expect(await farbe.waehlen('kommentar.js')).toBe('nein');

        await farbe.istUngefaerbt();
        await farbe.keineMeldung();
        expect(await farbe.zeilentexte()).toEqual(kommentarJsZeilen(ansicht));
        await farbe.seiteBleibtStill();
        await farbe.umbruchUmschalten();
        const andereAnsicht = ansicht === NUR_AENDERUNGEN ? GANZE_DATEI : NUR_AENDERUNGEN;
        expect(await farbe.ansichtWaehlen(andereAnsicht)).toBe('nein');
        expect(await farbe.waehlen('seiten.js')).toBe('nein');
        await farbe.seiteBleibtStill();
      });
    }
  }

  test('soll bei teurem Inhalt nichts einfrieren und danach mit neuem Worker färben (Kriterium 7)', async ({ farbe }) => {
    await farbe.starten({ vorbereitung: 'Repo L' });

    expect(await farbe.waehlen('feindlich.md')).toBe('nein');

    await farbe.zeilenSind(65);
    await farbe.textWieVorDerFarbe();
    await farbe.nichtsFriertEin();
    await farbe.istUngefaerbt();
    expect(await farbe.waehlen('gut.rs')).toBe('ja');
    await farbe.traegt({ plus: 'fn gut() {}' }, 'fn', 'Schlüsselwort');
  });
});

test.describe('Fremder Text', () => {
  for (const ansicht of [NUR_AENDERUNGEN, GANZE_DATEI]) {
    test(`soll fremden Inhalt in „${ansicht}“ als Text färben, ohne Markup und mit Marke (Kriterium 8)`, async ({ farbe }) => {
      await farbe.starten();
      await farbe.ansichtWaehlen(ansicht);

      expect(await farbe.waehlen('fremd.js')).toBe('ja');

      const erste = 'var s = "<img src=x onerror=alert(1)>"; // <b>fett</b>';
      await farbe.traegt({ plus: erste }, '"<img src=x onerror=alert(1)>"', 'Zeichenkette');
      await farbe.traegt({ plus: erste }, '// <b>fett</b>', 'Kommentar');
      await farbe.traegtKeine({ plus: 'var t = "a⟨U+202E⟩b";' }, '⟨U+202E⟩');
      await farbe.traegt({ plus: 'var t = "a⟨U+202E⟩b";' }, 'var', 'Schlüsselwort');
      const texte = await farbe.textWieVorDerFarbe();
      expect(texte.map(zeile => zeile.text).join('\n')).not.toContain('‮');
      await farbe.fremderTextBleibtText();
      await farbe.keinPrismAufDerSeite();
      await farbe.nurEigenerHost();
    });
  }
});

test.describe('Lastprofil', () => {
  test('soll 20 000 Zeilen spätestens 1 s nach dem Klick zeigen und danach färben (Kriterium 9)', async ({ farbe }) => {
    await farbe.starten({ vorbereitung: 'Repo L' });

    const dauerMs = await farbe.zeileRechtzeitigNachKlick('gross.js', { kopf: '@@ -0,0 +1,20000 @@', plus: 'x20000=1;', neu: 20000 });

    expect(await farbe.farbeAbgeschlossen()).toBe('ja');
    await farbe.traegt({ plus: 'x00001=1;' }, '1', 'Zahl', 2);
    await farbe.traegt({ plus: 'x20000=1;' }, '1', 'Zahl');
    test.info().annotations.push({ type: 'gross.js bis Zeile 20000', description: `${dauerMs} ms` });
  });
});

test.describe('Ganze Datei', () => {
  test('soll die ganze Datei wie die Änderungen färben, auch den Kommentar über der Änderung (Kriterium 10)', async ({ farbe }) => {
    await farbe.starten();
    await farbe.ansichtWaehlen(GANZE_DATEI);

    expect(await farbe.waehlen('weit.js')).toBe('ja');

    await farbe.diffZeigt(WEIT_GANZ);
    await pruefeWeitGanzGefaerbt(farbe);
    await farbe.textWieVorDerFarbe();
  });

  test('soll beim Wechsel der Ansicht neu färben und die Wahl der Ansicht behalten (Kriterium 11)', async ({ farbe }) => {
    await farbe.starten();
    expect(await farbe.waehlen('weit.js')).toBe('ja');
    const aenderungenVorher = await farbe.zeilentexte();
    await farbe.farbeMitzaehlen();

    expect(await farbe.ansichtWaehlen(GANZE_DATEI)).toBe('ja');

    await farbe.farbeLiefNeu();
    await pruefeWeitGanzGefaerbt(farbe);
    expect(await farbe.ansichtWaehlen(NUR_AENDERUNGEN)).toBe('ja');
    await farbe.diffZeigt(WEIT_AENDERUNGEN);
    expect(await farbe.zeilentexte()).toEqual(aenderungenVorher);
    await farbe.traegt({ plus: 'var x = 2;' }, 'var', 'Schlüsselwort');
    expect(await farbe.ansichtWaehlen(GANZE_DATEI)).toBe('ja');
    expect(await farbe.waehlen('kommentar.js')).toBe('ja');
    for (const text of KOMMENTAR_JS) {
      await farbe.traegt({ plus: text }, text, 'Kommentar');
    }
    await farbe.ansichtIst(GANZE_DATEI);
  });

  test('soll die Grenze am Patch der gezeigten Ansicht messen (Kriterium 12)', async ({ farbe }) => {
    await farbe.starten({ vorbereitung: 'Repo L' });

    expect(await farbe.waehlen('mittel.js')).toBe('ja');
    await farbe.traegt({ plus: 'zeile08000 = 2;' }, '2', 'Zahl');
    expect(await farbe.ansichtWaehlen(GANZE_DATEI)).toBe('nein');

    await farbe.zeilenSind(16001);
    await farbe.istUngefaerbt();
    await farbe.keineMeldung();
    await farbe.textWieVorDerFarbe();
  });

  test('soll eine späte Antwort nach dem Umschalten der Ansicht nicht auflegen und die neue Ansicht dennoch färben (Kriterium 13)', async ({ farbe }) => {
    await farbe.starten({ ausfall: 'Worker antwortet verzögert' });
    await farbe.waehlenOhneWarten('weit.js');
    await farbe.antwortenGehalten(1);

    await farbe.ansichtWaehlenOhneWarten(GANZE_DATEI);
    await farbe.workerBeendet(1);
    await farbe.antwortenGehalten(2);
    await farbe.antwortFreigeben(1);

    await farbe.diffZeigt(WEIT_GANZ);
    await farbe.farbeLaeuftOhneRolle();
    await farbe.antwortFreigeben(2);
    expect(await farbe.farbeAbgeschlossen()).toBe('ja');
    await pruefeWeitGanzGefaerbt(farbe);
    await farbe.textWieVorDerFarbe();
  });
});
