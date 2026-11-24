'use strict';
// Bausteintests (ohne Browser) der reinen Funktionen der Dateiliste: Summe, Zahlen, Balken, flache und Baum-Zeilen.
const { test, expect } = require('@playwright/test');
const { summeText, zahlenText, groessteAenderung, balkenTeile, flacheZeilen, baumZeilen } = require('../../../src/GitReviewA/web/dateiliste-werte.js');

const datei = (pfad, plus = 1, minus = 0, status = 'A') => ({ status, pfad, alterPfad: null, plus, minus });
const binaer = pfad => ({ status: 'A', pfad, alterPfad: null, plus: null, minus: null });

test.describe('Baustein Dateiliste-Werte', () => {
  test('soll die Summe über alle Dateien bilden und Binärdateien nur mitzählen', () => {
    expect(summeText([datei('a', 2, 1), datei('b', 0, 4), binaer('c'), datei('d', 0, 0)])).toBe('4 Dateien · +2 −5');
    expect(summeText([datei('a', 1, 0)])).toBe('1 Datei · +1 −0');
    expect(summeText(Array.from({ length: 2000 }, (_, i) => datei(`f${i}`)))).toBe('2000 Dateien · +2000 −0');
  });

  test('soll Zahlen als +x −y zeigen und bei Binärdateien einen Strich', () => {
    expect(zahlenText(datei('a', 12, 3))).toBe('+12 −3');
    expect(zahlenText(binaer('b'))).toBe('–');
  });

  test('soll die Balken als Anteile an der größten Änderung der Liste rechnen', () => {
    const dateien = [datei('a', 6, 2), datei('b', 1, 0), binaer('c')];

    const groesste = groessteAenderung(dateien);

    expect(groesste).toBe(8);
    expect(balkenTeile(dateien[0], groesste)).toEqual({ plus: 0.75, minus: 0.25 });
    expect(balkenTeile(dateien[1], groesste)).toEqual({ plus: 0.125, minus: 0 });
    expect(balkenTeile(dateien[2], groesste)).toEqual({ plus: 0, minus: 0 });
    expect(balkenTeile(datei('d', 0, 0), groessteAenderung([datei('d', 0, 0)]))).toEqual({ plus: 0, minus: 0 });
  });

  test('soll flach je Datei eine Zeile mit vollem Pfad in git-Reihenfolge liefern', () => {
    const dateien = [datei('z.txt'), datei('src/a.txt')];

    expect(flacheZeilen(dateien)).toEqual([
      { art: 'datei', name: 'z.txt', tiefe: 0, datei: dateien[0] },
      { art: 'datei', name: 'src/a.txt', tiefe: 0, datei: dateien[1] },
    ]);
  });

  test('soll im Baum Ordner vor Dateien und je alphabetisch ohne Schreibweise ordnen, verschachtelt eingerückt', () => {
    const dateien = [datei('logo.bin'), datei('src/b.txt'), datei('alt.txt'), datei('LIESMICH.md'), datei('Src2/x/y.txt'), datei('src/A/c.txt')];

    const zeilen = baumZeilen(dateien).map(({ art, name, tiefe }) => `${art}:${'  '.repeat(tiefe)}${name}`);

    expect(zeilen).toEqual([
      'ordner:src', 'ordner:  A', 'datei:    c.txt', 'datei:  b.txt',
      'ordner:Src2', 'ordner:  x', 'datei:    y.txt',
      'datei:alt.txt', 'datei:LIESMICH.md', 'datei:logo.bin',
    ]);
  });

  test('soll im Baum je Datei die Änderung mitgeben', () => {
    const dateien = [datei('src/b.txt', 2, 1, 'M')];

    const dateizeile = baumZeilen(dateien).find(zeile => zeile.art === 'datei');

    expect(dateizeile.datei).toBe(dateien[0]);
  });

  test('soll richtungsändernde Zeichen in Pfaden flach und im Baum als Marke zeigen und den Pfad der Datei roh lassen', () => {
    const roh = 'o\u202Er/a\u2066b\u200Fc\u200E\u061C.txt';
    const dateien = [datei(roh), datei('ä ö.txt')];

    const flach = flacheZeilen(dateien);
    const baum = baumZeilen(dateien).map(({ art, name, tiefe }) => `${art}:${'  '.repeat(tiefe)}${name}`);

    expect(flach.map(zeile => zeile.name)).toEqual(['o⟨U+202E⟩r/a⟨U+2066⟩b⟨U+200F⟩c⟨U+200E⟩⟨U+061C⟩.txt', 'ä ö.txt']);
    expect(flach[0].datei.pfad).toBe(roh);
    expect(baum).toEqual(['ordner:o⟨U+202E⟩r', 'datei:  a⟨U+2066⟩b⟨U+200F⟩c⟨U+200E⟩⟨U+061C⟩.txt', 'datei:ä ö.txt']);
  });

  test('soll jedes richtungsändernde Zeichen markieren und kein anderes', () => {
    const richtungszeichen = [0x061C, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2066, 0x2067, 0x2068, 0x2069];
    const nachbarn = [0x061B, 0x061D, 0x200D, 0x2010, 0x2029, 0x202F, 0x2065, 0x206A];

    const markiert = code => flacheZeilen([datei(`x${String.fromCodePoint(code)}y`)])[0].name;

    for (const code of richtungszeichen) {
      expect(markiert(code)).toBe(`x⟨U+${code.toString(16).toUpperCase().padStart(4, '0')}⟩y`);
    }
    for (const code of nachbarn) {
      expect(markiert(code)).toBe(`x${String.fromCodePoint(code)}y`);
    }
  });
});
