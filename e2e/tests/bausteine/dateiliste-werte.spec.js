'use strict';
// Bausteintests (ohne Browser) der reinen Funktionen der Dateiliste: Summe, Zahlen, Balken, flache und Baum-Zeilen.
const { test, expect } = require('@playwright/test');
const { summeText, zahlenText, groessteAenderung, balkenTeile, sichtbarerName, flacheZeilen, baumZeilen, sichtbareZeilen, umbenennungsText } = require('../../../src/GitReviewA/web/dateiliste-werte.js');

const datei = (pfad, plus = 1, minus = 0, status = 'A') => ({ status, pfad, alterPfad: null, plus, minus });
const binaer = pfad => ({ status: 'A', pfad, alterPfad: null, plus: null, minus: null });

test.describe('Baustein Dateiliste-Werte', () => {
  test('soll die Summe über alle Dateien bilden und Binärdateien nur mitzählen', () => {
    expect(summeText([datei('a', 2, 1), datei('b', 0, 4), binaer('c'), datei('d', 0, 0)])).toBe('4 Dateien · +2 −5');
    expect(summeText([datei('a', 1, 0)])).toBe('1 Datei · +1 −0');
    expect(summeText(Array.from({ length: 2000 }, (_, i) => datei(`f${i}`)))).toBe('2000 Dateien · +2000 −0');
  });

  test('soll Zahlen als +x −y zeigen und bei Binärdateien das Wort „binär“', () => {
    expect(zahlenText(datei('a', 12, 3))).toBe('+12 −3');
    expect(zahlenText(binaer('b'))).toBe('binär');
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

  test('soll flach und Baum aus derselben Sicht bauen und Ordner ohne sichtbare Datei weglassen (R00029, B2802)', () => {
    const readme = datei('README.md');
    const a = datei('src/a.txt');
    const api = datei('src/generated/api.cs');
    const sicht = { sichtbare: [{ datei: readme }, { datei: a }, { datei: api }] };

    const flach = sichtbareZeilen(sicht, 'flach').map(zeile => `${zeile.art}:${zeile.name}`);
    const baum = sichtbareZeilen(sicht, 'baum').map(zeile => `${zeile.art}:${'  '.repeat(zeile.tiefe)}${zeile.name}`);

    expect(flach).toEqual(['datei:README.md', 'datei:src/a.txt', 'datei:src/generated/api.cs']);
    expect(baum).toEqual(['ordner:src', 'ordner:  generated', 'datei:    api.cs', 'datei:  a.txt', 'datei:README.md']);
  });

  test('soll einen Ordner, dessen alleinige Datei ausgeblendet ist, samt Zeile weglassen', () => {
    const readme = datei('README.md');
    const log = datei('build/out.log');
    const sicht = { sichtbare: [{ datei: readme }] };

    const baum = sichtbareZeilen(sicht, 'baum').map(zeile => `${zeile.art}:${'  '.repeat(zeile.tiefe)}${zeile.name}`);

    expect(baum).toEqual(['datei:README.md']);
    expect(sichtbareZeilen(sicht, 'flach').map(zeile => zeile.name)).toEqual(['README.md']);
    expect(log.pfad).toBe('build/out.log');
  });

  test('soll einen Ordner mit mindestens einer sichtbaren Datei zeigen und die ausgeblendete weglassen', () => {
    const a = datei('src/a.txt');
    const sicht = { sichtbare: [{ datei: a }] };

    const baum = sichtbareZeilen(sicht, 'baum').map(zeile => `${zeile.art}:${'  '.repeat(zeile.tiefe)}${zeile.name}`);

    expect(baum).toEqual(['ordner:src', 'datei:  a.txt']);
  });

  test('soll eine leere Sicht als leere Liste und leeren Baum liefern', () => {
    expect(sichtbareZeilen({ sichtbare: [] }, 'flach')).toEqual([]);
    expect(sichtbareZeilen({ sichtbare: [] }, 'baum')).toEqual([]);
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

  test('soll bei einer Umbenennung den neuen und den alten Namen als `neu ← alt` zeigen (PO 2026-11-25)', () => {
    const umbenannt = { status: 'R', pfad: 'LIESMICH.md', alterPfad: 'README.md', plus: 0, minus: 0 };

    expect(umbenennungsText(umbenannt)).toBe('LIESMICH.md ← README.md');
  });

  test('soll bei einer Umbenennung in einem Ordner beide Namen ohne Ordner zeigen', () => {
    const umbenannt = { status: 'R', pfad: 'bilder/umbenannt.png', alterPfad: 'bilder/alt.png', plus: 0, minus: 0 };

    expect(umbenennungsText(umbenannt)).toBe('umbenannt.png ← alt.png');
  });

  test('soll bei einer Umbenennung Marken für Unsichtbares und Rohbytes in beiden Namen zeigen', () => {
    const bidi = { status: 'R', pfad: 't⟨0xFE⟩.txt', alterPfad: 's\u202E⟨0xFE⟩.txt', plus: 1, minus: 1 };

    expect(umbenennungsText(bidi)).toBe('t⟨0xFE⟩.txt ← s⟨U+202E⟩⟨0xFE⟩.txt');
  });

  test('soll ohne Umbenennung nichts zeigen (Status ≠ R oder kein alter Pfad)', () => {
    expect(umbenennungsText(datei('src/b.txt', 1, 0, 'M'))).toBeNull();
    expect(umbenennungsText({ status: 'R', pfad: 'neu.txt', alterPfad: null, plus: 0, minus: 0 })).toBeNull();
  });

  test('soll jedes unsichtbare Zeichen markieren und kein sichtbares', () => {
    const unsichtbare = [0x0000, 0x000A, 0x00AD, 0x061C, 0x200B, 0x200D, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2028, 0x2029, 0x2060, 0x2065, 0x2066, 0x2067, 0x2068, 0x2069, 0x206A, 0xFEFF, 0xE0041];
    const sichtbare = [0x0009, 0x0041, 0x061B, 0x061D, 0x2010, 0x202F];

    const markiert = code => flacheZeilen([datei(`x${String.fromCodePoint(code)}y`)])[0].name;

    for (const code of unsichtbare) {
      expect(markiert(code)).toBe(`x⟨U+${code.toString(16).toUpperCase().padStart(4, '0')}⟩y`);
    }
    for (const code of sichtbare) {
      expect(markiert(code)).toBe(`x${String.fromCodePoint(code)}y`);
    }
  });

  test('soll legitime Emoji-, koreanische und Braille-Texte tragen und nur das Unsichtbare markieren (R00058, Kriterium 5)', () => {
    expect(sichtbarerName('Gut ❤\uFE0F 👨\u200D👩\u200D👧 😀')).toBe('Gut ❤⟨U+FE0F⟩ 👨⟨U+200D⟩👩⟨U+200D⟩👧 😀');
    expect(sichtbarerName('a\u2800b')).toBe('a⟨U+2800⟩b');
    expect(sichtbarerName('안녕하세요')).toBe('안녕하세요');
    expect(sichtbarerName('안녕하세요.txt')).toBe('안녕하세요.txt');
    // NFD (Dateiname von macOS): Anlaut, Vokal und Auslaut je Silbe, kein Füller.
    expect(sichtbarerName('\u110B\u1161\u11AB\u1102\u1167\u11BC\u1112\u1161\u1109\u1166\u110B\u1169.txt')).toBe('\u110B\u1161\u11AB\u1102\u1167\u11BC\u1112\u1161\u1109\u1166\u110B\u1169.txt');
    expect(sichtbarerName('⠁⠃⠉')).toBe('⠁⠃⠉');
  });
});
