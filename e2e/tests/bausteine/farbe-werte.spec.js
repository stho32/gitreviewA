'use strict';
// Bausteintests (ohne Browser) der Farbrechnung auf der Seite (R00007): Sprache aus dem Pfad, Grenzen, Stücke je Zeile, Teile mit Rolle.
const { test, expect } = require('@playwright/test');
const { spracheZuPfad, faerbbar, stueckeJeZeile, farbteile, GRENZE_PATCH, GRENZE_ZEILE } = require('../../../src/GitReviewA/web/farbe-werte.js');
const { sichtbarTeile } = require('../../../src/GitReviewA/web/diff-werte.js');

test.describe('Baustein Sprache und Grenze', () => {
  test('soll jede Endung der Tabelle ihrer Grammatik zuordnen', () => {
    const tabelle = {
      cs: 'csharp', js: 'javascript', mjs: 'javascript', cjs: 'javascript', json: 'json', css: 'css', html: 'markup', htm: 'markup', xml: 'markup',
      svg: 'markup', md: 'markdown', py: 'python', sh: 'bash', bash: 'bash', yml: 'yaml', yaml: 'yaml', sql: 'sql', rs: 'rust', toml: 'toml', php: 'php',
      ts: 'typescript', mts: 'typescript', cts: 'typescript',
    };

    for (const [endung, grammatik] of Object.entries(tabelle)) {
      expect(spracheZuPfad(`beispiel.${endung}`), endung).toBe(grammatik);
    }
  });

  test('soll nur die letzte Endung des Dateinamens zählen, Groß- und Kleinschreibung egal, Ordner nicht', () => {
    expect(spracheZuPfad('SRC/GROSS.RS')).toBe('rust');
    expect(spracheZuPfad('a.b/c.Py')).toBe('python');
    expect(spracheZuPfad('a.js.txt')).toBeNull();
    expect(spracheZuPfad('bibliothek.min.js')).toBe('javascript');
    expect(spracheZuPfad('ordner.js/Makefile')).toBeNull();
  });

  test('soll ohne Endung und bei fremden Endungen keine Sprache liefern', () => {
    for (const pfad of ['Makefile', 'LIESMICH', 'notiz.unbekannt', '.gitignore', 'datei.', 'beispiel.tsx', 'beispiel.go', 'beispiel.java', 'beispiel.c',
      'beispiel.cpp', 'App.csproj', 'Seite.razor', 'a.diff', 'a.patch', 'beispiel.constructor', 'beispiel.__proto__']) {
      expect(spracheZuPfad(pfad), pfad).toBeNull();
    }
  });

  test('soll einen Patch bis 262 144 Zeichen färben und darüber nicht', () => {
    const zeile = `+${'a'.repeat(998)}\n`;
    const genau = zeile.repeat(262).padEnd(GRENZE_PATCH, 'b');

    expect(GRENZE_PATCH).toBe(262144);
    expect(genau.length).toBe(262144);
    expect(faerbbar(genau)).toBe(true);
    expect(faerbbar(`${genau}b`)).toBe(false);
  });

  test('soll Zeilen bis 1 000 Zeichen mit Vorzeichen färben und eine längere nicht, in UTF-16 gezählt', () => {
    expect(GRENZE_ZEILE).toBe(1000);
    expect(faerbbar(`@@ -0,0 +1,2 @@\n+${'a'.repeat(999)}\n+function g() {}\n`)).toBe(true);
    expect(faerbbar(`@@ -0,0 +1,2 @@\n+${'a'.repeat(1000)}\n+function h() {}\n`)).toBe(false);
    expect(faerbbar(`+${'😀'.repeat(499)}a\n`)).toBe(true);
    expect(faerbbar(`+${'😀'.repeat(500)}\n`)).toBe(false);
  });

  test('soll die Grenze am Patch der gezeigten Ansicht messen: 272 289 Zeichen nicht, 262 144 schon', () => {
    const zeile = 'x'.repeat(99);
    const patchMit = laenge => `${zeile}\n`.repeat(Math.ceil(laenge / 100)).slice(0, laenge);

    expect(faerbbar(patchMit(272289))).toBe(false);
    expect(faerbbar(patchMit(262144))).toBe(true);
  });
});

test.describe('Baustein Teile mit Rolle', () => {
  test('soll die Antwort des Workers je Zeile aufsteigend sammeln und unbekannte Rollen weglassen', () => {
    const je = stueckeJeZeile(Int32Array.from([0, 0, 3, 0, 2, 0, 6, 2, 0, 4, 5, 3, 2, 7, 9, 7, 1, 0, 1, -1]));

    expect([...je.entries()]).toEqual([
      [0, [{ von: 0, bis: 3, klasse: 'tk-keyword' }, { von: 4, bis: 5, klasse: 'tk-number' }]],
      [2, [{ von: 0, bis: 6, klasse: 'tk-comment' }]],
    ]);
  });

  test('soll Text an den Stückgrenzen teilen und den Rest ohne Rolle lassen', () => {
    const teile = farbteile(sichtbarTeile('var b = 2;'), [{ von: 0, bis: 3, klasse: 'tk-keyword' }, { von: 8, bis: 9, klasse: 'tk-number' }]);

    expect(teile).toEqual([
      { text: 'var', klasse: 'tk-keyword' }, { text: ' b = ' }, { text: '2', klasse: 'tk-number' }, { text: ';' },
    ]);
  });

  test('soll ohne Stücke den Text unverändert lassen', () => {
    expect(farbteile(sichtbarTeile('fn x() {}'), [])).toEqual([{ text: 'fn x() {}' }]);
    expect(farbteile([], [])).toEqual([]);
  });

  test('soll Text unverändert lassen, wenn die Karte für die Zeile keine Stücke führt', () => {
    expect(farbteile(sichtbarTeile('}'), undefined)).toEqual([{ text: '}' }]);
    expect(farbteile(sichtbarTeile(''), undefined)).toEqual([]);
  });

  test('soll Marken ungefärbt mit Vorrang lassen, auch wenn ein Stück über sie reicht', () => {
    const text = 'var t = "a‮b";';
    const teile = farbteile(sichtbarTeile(text), [{ von: 0, bis: 3, klasse: 'tk-keyword' }, { von: 8, bis: 13, klasse: 'tk-string' }]);

    expect(teile).toEqual([
      { text: 'var', klasse: 'tk-keyword' }, { text: ' t = ' }, { text: '"a', klasse: 'tk-string' },
      { marke: 'bidi', code: 'U+202E', text: '⟨U+202E⟩' },
      { text: 'b"', klasse: 'tk-string' }, { text: ';' },
    ]);
  });

  test('soll eine Marke für eine Folge gleicher Zeichen mit ihrer Anzahl verrechnen', () => {
    const text = 'a\u0000\u0000\u0000"x"';
    const teile = farbteile(sichtbarTeile(text), [{ von: 4, bis: 7, klasse: 'tk-string' }]);

    expect(teile.map(teil => [teil.text, teil.klasse])).toEqual([['a', undefined], ['␀ U+0000 ×3', undefined], ['"x"', 'tk-string']]);
  });
});
