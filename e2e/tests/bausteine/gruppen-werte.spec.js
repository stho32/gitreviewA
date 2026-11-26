'use strict';
// Bausteintests (ohne Browser) der Gruppenregel (R00040, B3901): aus dem Anzeigenamen eines Pfades die Gruppe Code, Tests
// oder Doku — Tests vor Doku vor Code; Ordner ohne Rücksicht auf ASCII-Groß/Klein, Dateinamen wie geschrieben.
const { test, expect } = require('@playwright/test');
const { gruppeDes } = require('../../../src/GitReviewA/web/gruppen-werte.js');

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

  test('soll einen sehr langen Pfad (4 096 Zeichen) einordnen', () => {
    const lang = `${'x'.repeat(4088)}.md`;

    expect(lang).toHaveLength(4091);
    expect(gruppeDes(lang)).toBe('doku');
    expect(gruppeDes(`src/${'y'.repeat(4092)}.txt`)).toBe('code');
  });
});
