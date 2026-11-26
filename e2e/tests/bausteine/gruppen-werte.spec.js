'use strict';
// Bausteintests (ohne Browser) der Gruppenregel und der Gruppenzähler (R00040, B3901/B3903): aus dem Anzeigenamen eines
// Pfades die Gruppe Code, Tests oder Doku — Tests vor Doku vor Code; Ordner ohne Rücksicht auf ASCII-Groß/Klein,
// Dateinamen wie geschrieben; dazu die Zähler je Gruppe und die Summe, die der Fortschritt im Kopf ist.
const { test, expect } = require('@playwright/test');
const { gruppeDes, nachGruppen, zaehlerJeGruppe, summe, zaehlerText } = require('../../../src/GitReviewA/web/gruppen-werte.js');

const eintrag = (anzeigename, abgehakt = false, gesperrt = false) => ({ anzeigename, abgehakt, gesperrt });
const zahl = ({ name, text, abgehakt, gesamt, nichtLesbar }) => ({ name, text, abgehakt, gesamt, nichtLesbar });

test.describe('Baustein Gruppenregel', () => {
  test('soll die Beispiele aus R00040 Kriterium 1 einordnen', () => {
    const tests = ['tests/app.test.js', 'web/haken-werte.spec.js', 'tests/README.md', 'src/LatestTest.cs', 'E2E/x.ts'];
    const doku = ['docs/api.md', 'README.md', 'Docs/Bild.png', 'LIESMICH.txt', 't⟨0xFE⟩/a.md'];
    const code = ['src/app.js', 'src/Contest.cs', 'src/a.txt'];

    for (const pfad of code) {
      expect(gruppeDes(pfad), pfad).toBe('code');
    }
    for (const pfad of tests) {
      expect(gruppeDes(pfad), pfad).toBe('tests');
    }
    for (const pfad of doku) {
      expect(gruppeDes(pfad), pfad).toBe('doku');
    }
  });

  test('soll Testordner ohne Rücksicht auf ASCII-Groß/Klein erkennen (jede Ebene)', () => {
    for (const pfad of ['test/a.js', 'Tests/a.js', 'SPEC/a.js', 'src/specs/a.js', '__tests__/a.js', 'e2e/a.js', 'a/TEST/b/c.txt']) {
      expect(gruppeDes(pfad), pfad).toBe('tests');
    }
  });

  test('soll Test-Dateinamen wie geschrieben erkennen (Groß/Klein zählt)', () => {
    for (const pfad of ['a.test.js', 'a.spec.js', 'LatestTest.cs', 'AllTests.cs', 'test_app.py', 'app_test.go']) {
      expect(gruppeDes(pfad), pfad).toBe('tests');
    }
    expect(gruppeDes('src/Contest.cs'), 'Contest.cs trägt kein großes T').toBe('code');
    expect(gruppeDes('src/latesttest.cs'), 'kleines t passt nicht auf *Test.*').toBe('code');
    expect(gruppeDes('test_app.rb'), 'test_*.py verlangt die Endung .py').toBe('code');
  });

  test('soll Tests vor Doku werten', () => {
    expect(gruppeDes('tests/README.md'), 'Testordner schlägt .md').toBe('tests');
    expect(gruppeDes('docs/app.test.js'), 'Testname schlägt Dokuordner').toBe('tests');
    expect(gruppeDes('LIESMICH_test.txt')).toBe('tests');
  });

  test('soll Dokuordner ohne Rücksicht auf ASCII-Groß/Klein erkennen', () => {
    for (const pfad of ['doc/a.js', 'DOCS/a.js', 'Dokumentation/a.js', 'documentation/a.js']) {
      expect(gruppeDes(pfad), pfad).toBe('doku');
    }
  });

  test('soll die Doku-Endungen wie geschrieben erkennen', () => {
    for (const pfad of ['a.md', 'a.markdown', 'a.rst', 'a.adoc', 'tief/und/tiefer/a.md']) {
      expect(gruppeDes(pfad), pfad).toBe('doku');
    }
    expect(gruppeDes('a.MD'), 'die Endung steht wie geschrieben').toBe('code');
    expect(gruppeDes('a.mdx')).toBe('code');
  });

  test('soll Dateinamen mit README, LIESMICH, LICENSE und CHANGELOG als Doku erkennen', () => {
    for (const pfad of ['README', 'README.txt', 'LIESMICH.txt', 'LICENSE', 'CHANGELOG.md', 'CHANGELOG']) {
      expect(gruppeDes(pfad), pfad).toBe('doku');
    }
    expect(gruppeDes('liesmich.txt'), 'der Anfang steht wie geschrieben').toBe('code');
  });

  test('soll sonst Code liefern (.txt und unbekannte Endungen)', () => {
    for (const pfad of ['src/a.txt', 'a.json', 'a.yml', 'Makefile', 'src/ohne/endung']) {
      expect(gruppeDes(pfad), pfad).toBe('code');
    }
  });

  test('soll einen Pfad mit unsichtbaren Zeichen am Anzeigenamen einordnen (Marken ändern die Gruppe nicht)', () => {
    expect(gruppeDes('t⟨0xFE⟩/a.md')).toBe('doku');
    expect(gruppeDes('e2e⟨U+202E⟩/a.ts')).toBe('code');
    expect(gruppeDes('tests/a⟨U+200B⟩.test.js')).toBe('tests');
  });

  test('soll einen sehr langen Pfad (über 4 096 Zeichen) einordnen', () => {
    const lang = `${'x'.repeat(4088)}.md`;

    expect(lang).toHaveLength(4091);
    expect(gruppeDes(lang)).toBe('doku');
    expect(gruppeDes(`src/${'y'.repeat(4092)}.txt`)).toBe('code');
  });
});

test.describe('Baustein Gruppenzähler', () => {
  /** Die acht Dateien aus R00040 Kriterium 2 in der Reihenfolge der Übersicht (git); `src/app.js` und `tests/app.test.js` abgehakt. */
  const repoG = [
    eintrag('README.md'), eintrag('docs/api.md'), eintrag('src/Contest.cs'), eintrag('src/a.txt'),
    eintrag('src/app.js', true), eintrag('tests/README.md'), eintrag('tests/app.test.js', true), eintrag('web/haken-werte.spec.js'),
  ];

  test('soll die Einträge nach Code, Tests und Doku ordnen und die Reihenfolge in der Gruppe halten', () => {
    expect(nachGruppen(repoG).map(gruppe => [gruppe.name, gruppe.eintraege.map(e => e.anzeigename)])).toEqual([
      ['Code', ['src/Contest.cs', 'src/a.txt', 'src/app.js']],
      ['Tests', ['tests/README.md', 'tests/app.test.js', 'web/haken-werte.spec.js']],
      ['Doku', ['README.md', 'docs/api.md']],
    ]);
  });

  test('soll eine leere Gruppe weglassen', () => {
    expect(nachGruppen([eintrag('src/app.js'), eintrag('src/b.js')]).map(gruppe => gruppe.name)).toEqual(['Code']);
    expect(nachGruppen([])).toEqual([]);
  });

  test('soll den Fortschritt je Gruppe zählen (R00040 Kriterium 2)', () => {
    expect(zaehlerJeGruppe(repoG).map(zahl)).toEqual([
      { name: 'Code', text: '1 von 3 abgehakt', abgehakt: 1, gesamt: 3, nichtLesbar: 0 },
      { name: 'Tests', text: '1 von 3 abgehakt', abgehakt: 1, gesamt: 3, nichtLesbar: 0 },
      { name: 'Doku', text: '0 von 2 abgehakt', abgehakt: 0, gesamt: 2, nichtLesbar: 0 },
    ]);
    expect(summe(repoG), 'der Kopf').toEqual({ abgehakt: 2, gesamt: 8, nichtLesbar: 0 });
  });

  test('soll die Summe der Gruppen über viele Fälle abtasten: sie ist der Kopf', () => {
    for (const anzahl of [0, 1, 2, 3, 7, 40]) {
      const eintraege = Array.from({ length: anzahl }, (_, nummer) => eintrag(`src/f${nummer}.txt`, nummer % 3 === 0, nummer % 7 === 0));
      const zaehler = zaehlerJeGruppe(eintraege);

      expect(zaehler.reduce((bisher, eintrag) => bisher + eintrag.abgehakt, 0), `abgehakt bei ${anzahl}`).toBe(summe(eintraege).abgehakt);
      expect(zaehler.reduce((bisher, eintrag) => bisher + eintrag.gesamt, 0), `gesamt bei ${anzahl}`).toBe(anzahl);
      expect(zaehler.reduce((bisher, eintrag) => bisher + eintrag.nichtLesbar, 0), `nicht lesbar bei ${anzahl}`).toBe(summe(eintraege).nichtLesbar);
    }
  });

  test('soll die Summe der Gruppen über gemischte Gruppen abtasten: sie ist der Kopf', () => {
    const gemischt = [...repoG, eintrag('tests/c.spec.js', false, true), eintrag('docs/bild.png', false, true), eintrag('CHANGELOG.md')];
    const zaehler = zaehlerJeGruppe(gemischt);

    expect(zaehler.map(gruppe => gruppe.name)).toEqual(['Code', 'Tests', 'Doku']);
    expect(summe(gemischt), 'der Kopf').toEqual({ abgehakt: 2, gesamt: 11, nichtLesbar: 2 });
    expect(zaehler.reduce((bisher, eintrag) => bisher + eintrag.abgehakt, 0)).toBe(2);
    expect(zaehler.reduce((bisher, eintrag) => bisher + eintrag.gesamt, 0)).toBe(11);
    expect(zaehler.reduce((bisher, eintrag) => bisher + eintrag.nichtLesbar, 0)).toBe(2);
  });

  test('soll gesperrte Einträge mit „ (k nicht lesbar)“ nennen (R00040 Kriterium 5)', () => {
    const eintraege = [
      eintrag('src/a.txt', false, true), eintrag('src/b.txt', true), eintrag('tests/a.test.js', false, true),
      eintrag('tests/b.test.js', false, true), eintrag('README.md'),
    ];

    expect(zaehlerJeGruppe(eintraege).map(zahl)).toEqual([
      { name: 'Code', text: '1 von 2 abgehakt (1 nicht lesbar)', abgehakt: 1, gesamt: 2, nichtLesbar: 1 },
      { name: 'Tests', text: '0 von 2 abgehakt (2 nicht lesbar)', abgehakt: 0, gesamt: 2, nichtLesbar: 2 },
      { name: 'Doku', text: '0 von 1 abgehakt', abgehakt: 0, gesamt: 1, nichtLesbar: 0 },
    ]);
  });

  test('soll ausgeblendete Einträge in b mitzählen (sie stehen nur nicht in der Liste)', () => {
    const alle = [eintrag('README.md'), eintrag('docs/api.md', true), eintrag('src/a.txt')];

    expect(zaehlerJeGruppe(alle).map(zahl)).toEqual([
      { name: 'Code', text: '0 von 1 abgehakt', abgehakt: 0, gesamt: 1, nichtLesbar: 0 },
      { name: 'Doku', text: '1 von 2 abgehakt', abgehakt: 1, gesamt: 2, nichtLesbar: 0 },
    ]);
  });

  test('soll den Text ohne Zusatz bei k = 0 und mit Zusatz bei jedem k ≥ 1 bilden', () => {
    expect(zaehlerText({ abgehakt: 0, gesamt: 1, nichtLesbar: 0 })).toBe('0 von 1 abgehakt');
    expect(zaehlerText({ abgehakt: 3, gesamt: 5, nichtLesbar: 1 })).toBe('3 von 5 abgehakt (1 nicht lesbar)');
    expect(zaehlerText({ abgehakt: 0, gesamt: 4, nichtLesbar: 4 })).toBe('0 von 4 abgehakt (4 nicht lesbar)');
  });

  test('soll eine Auswahl aus lauter einer Gruppe als eine Gruppe zählen (Kriterium 3: eine Auswahl nur mit Code)', () => {
    const zaehler = zaehlerJeGruppe([eintrag('src/app.js'), eintrag('src/b.js')]);

    expect(zaehler.map(gruppe => gruppe.name)).toEqual(['Code']);
    expect(zaehler[0].text).toBe('0 von 2 abgehakt');
  });

  test('soll einen Anzeigenamen mit Marken in dieselbe Gruppe wie den Rohpfad legen', () => {
    expect(nachGruppen([eintrag('t⟨0xFE⟩/a.md'), eintrag('tests/a.test.js')]).map(gruppe => gruppe.name)).toEqual(['Tests', 'Doku']);
  });
});
