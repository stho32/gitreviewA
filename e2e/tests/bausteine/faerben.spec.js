'use strict';
// Bausteintests (ohne Browser) der Tokens je Hunk und Seite (R00007): echte Prism-Grammatiken unter Node, Antwort `[Zeile, von, bis, Rolle]*`.
const { test, expect } = require('@playwright/test');
const { hunkTokens, grammatikVon, prism } = require('../../../src/GitReviewA/web/faerben.js');
const { patchZeilen, ganzeDateiZeilen } = require('../../../src/GitReviewA/web/diff-werte.js');

const SCHLUESSELWORT = 0;
const ZEICHENKETTE = 1;
const KOMMENTAR = 2;
const ZAHL = 3;
const FUNKTION = 4;
const TYP = 5;
const MAKRO = 6;

/** Antwort → je Zeile die gefärbten Textstellen `[text, Rolle]`. */
function stellenJeZeile(zeilen, antwort) {
  const stellen = zeilen.map(() => []);
  for (let stelle = 0; stelle < antwort.length; stelle += 4) {
    const [zeile, von, bis, rolle] = antwort.slice(stelle, stelle + 4);
    stellen[zeile].push([zeilen[zeile].text.slice(von, bis), rolle]);
  }
  return stellen;
}

function faerben(patch, sprache) {
  const zeilen = patchZeilen(patch);
  return stellenJeZeile(zeilen, hunkTokens(zeilen, prism.languages[sprache], prism));
}

test.describe('Baustein Tokens je Hunk und Seite', () => {
  test('soll einen Kommentar über mehrere Zeilen ganz färben, den Kopf nicht (Kriterium 2, kommentar.js)', () => {
    const stellen = faerben('@@ -0,0 +1,4 @@\n+/* Kopf\n+   zweite Zeile\n+*/\n+function main() {}\n', 'javascript');

    expect(stellen[0]).toEqual([]);
    expect(stellen[1]).toEqual([['/* Kopf', KOMMENTAR]]);
    expect(stellen[2]).toEqual([['   zweite Zeile', KOMMENTAR]]);
    expect(stellen[3]).toEqual([['*/', KOMMENTAR]]);
    expect(stellen[4]).toContainEqual(['function', SCHLUESSELWORT]);
  });

  test('soll die entfernte Zeile nach der alten Seite färben, Kontext und hinzugefügte nach der neuen (Kriterium 3, seiten.js)', () => {
    const stellen = faerben('@@ -1,3 +1,3 @@\n var a = 1;\n-/* weg\n+var b = 2;\n */ var c = 3;\n', 'javascript');

    expect(stellen[2]).toEqual([['/* weg', KOMMENTAR]]);
    expect(stellen[3]).toEqual([['var', SCHLUESSELWORT], ['2', ZAHL]]);
    expect(stellen[4]).toContainEqual(['var', SCHLUESSELWORT]);
    expect(stellen[4].map(([text]) => text)).not.toContain('*/');
    expect(stellen[1]).toEqual([['var', SCHLUESSELWORT], ['1', ZAHL]]);
  });

  test('soll eine Kontextzeile genau einmal färben, nach der neuen Seite', () => {
    const zeilen = patchZeilen('@@ -1,2 +1,2 @@\n var a = 1;\n-var b = 2;\n+var b = 3;\n');
    const antwort = hunkTokens(zeilen, prism.languages.javascript, prism);
    const stueckeDerKontextzeile = [];
    for (let stelle = 0; stelle < antwort.length; stelle += 4) {
      if (antwort[stelle] === 1) {
        stueckeDerKontextzeile.push(Array.from(antwort.slice(stelle + 1, stelle + 4)));
      }
    }

    expect(stueckeDerKontextzeile).toEqual([[0, 3, SCHLUESSELWORT], [8, 9, ZAHL]]);
  });

  test('soll die sieben Rollen erkennen, innerste gewinnt (rollen.rs)', () => {
    const zeile = 'fn gruss(name: &str) -> String { format!("Hallo {}", 42) } // Gruß';
    const stellen = faerben(`@@ -0,0 +1 @@\n+${zeile}\n`, 'rust');

    expect(stellen[1]).toEqual(expect.arrayContaining([
      ['fn', SCHLUESSELWORT], ['str', SCHLUESSELWORT], ['gruss', FUNKTION], ['String', TYP], ['format!', MAKRO], ['"Hallo {}"', ZEICHENKETTE],
      ['42', ZAHL], ['// Gruß', KOMMENTAR],
    ]));
  });

  test('soll jeden Hunk für sich färben und Kopf und „No newline“ ohne Rolle lassen', () => {
    const stellen = faerben('@@ -1 +1 @@\n-/* a\n\\ No newline at end of file\n+/* b\n@@ -9 +9 @@ x\n-var x;\n+var y;\n', 'javascript');

    expect(stellen[0]).toEqual([]);
    expect(stellen[2]).toEqual([]);
    expect(stellen[4]).toEqual([]);
    expect(stellen[5]).toEqual([['var', SCHLUESSELWORT]]);
    expect(stellen[6]).toEqual([['var', SCHLUESSELWORT]]);
  });

  test('soll einen Hunk, der im Kommentar beginnt, falsch färben — hingenommen (PO 2026-11-24)', () => {
    const stellen = faerben('@@ -4,4 +4,4 @@\n    vier\n    fünf\n */\n-var x = 1;\n+var x = 2;\n', 'javascript');

    expect(stellen[1].map(([, rolle]) => rolle)).not.toContain(KOMMENTAR);
    expect(stellen[5]).toEqual([['var', SCHLUESSELWORT], ['2', ZAHL]]);
  });

  test('soll die ganze Datei als einen Abschnitt färben, den Kommentar über der Änderung ganz (Kriterium 10, weit.js)', () => {
    const patch = '@@ -1,7 +1,7 @@\n /* Kopf\n    zwei\n    drei\n    vier\n    fünf\n */\n-var x = 1;\n+var x = 2;\n';
    const zeilen = ganzeDateiZeilen(patch);
    const stellen = stellenJeZeile(zeilen, hunkTokens(zeilen, prism.languages.javascript, prism));

    expect(stellen.slice(0, 6)).toEqual(['/* Kopf', '   zwei', '   drei', '   vier', '   fünf', '*/'].map(text => [[text, KOMMENTAR]]));
    expect(stellen[6]).toEqual([['var', SCHLUESSELWORT], ['1', ZAHL]]);
    expect(stellen[7]).toEqual([['var', SCHLUESSELWORT], ['2', ZAHL]]);
  });

  test('soll TypeScript mit der eigenen Grammatik färben: readonly ist dort Schlüsselwort, in JavaScript nicht (Ausbaustufe B0609)', () => {
    const patch = '@@ -0,0 +1 @@\n+export abstract class Gruss { readonly n = 42; }\n';

    expect(faerben(patch, 'typescript')[1]).toEqual(expect.arrayContaining([['readonly', SCHLUESSELWORT], ['abstract', SCHLUESSELWORT], ['42', ZAHL]]));
    expect(faerben(patch, 'javascript')[1].map(([text]) => text)).not.toContain('readonly');
  });

  test('soll nur echte Grammatiken herausgeben, keine Hilfsfunktion von Prism.languages (Sollte des Security-Reviews zu #8)', () => {
    expect(grammatikVon(prism, 'javascript')).toBe(prism.languages.javascript);
    for (const name of ['extend', 'insertBefore', 'DFS', 'unbekannt', '__proto__', 'toString', 'constructor']) {
      expect(() => grammatikVon(prism, name), name).toThrow('keine Grammatik');
    }
    expect(() => grammatikVon(null, 'javascript')).toThrow('keine Grammatik');
  });

  test('soll ohne Zeilen eine leere Antwort geben', () => {
    expect(hunkTokens([], prism.languages.javascript, prism)).toEqual(new Int32Array(0));
  });
});
