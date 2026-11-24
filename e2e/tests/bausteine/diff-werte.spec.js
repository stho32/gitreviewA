'use strict';
// Bausteintests (ohne Browser) der Diff-Rechnung: Zeilen mit Nummern aus den Hunk-Köpfen, sichtbare Marken, Blöcke.
const { test, expect } = require('@playwright/test');
const { patchZeilen, sichtbarTeile, bloecke, blockBreite, zuLang, BLOCK_ZEILEN, ZEICHEN_GRENZE, MARKEN_GRENZE, ZEILEN_GRENZE } = require('../../../src/GitReviewA/web/diff-werte.js');

const kopf = text => ({ art: 'kopf', alt: null, neu: null, text });
const kontext = (text, alt, neu) => ({ art: 'kontext', alt, neu, text });
const plus = (text, neu) => ({ art: 'plus', alt: null, neu, text });
const minus = (text, alt) => ({ art: 'minus', alt, neu: null, text });

test.describe('Baustein Diff-Werte', () => {
  test('soll Nummern alt und neu aus dem Hunk-Kopf zählen', () => {
    expect(patchZeilen('@@ -1,2 +1,3 @@\n eins\n-zwei\n+ZWEI\n+drei\n')).toEqual([
      kopf('@@ -1,2 +1,3 @@'), kontext('eins', 1, 1), minus('zwei', 2), plus('ZWEI', 2), plus('drei', 3),
    ]);
  });

  test('soll je Hunk neu ansetzen und den Abschnittstitel im Kopf lassen', () => {
    const zeilen = patchZeilen('@@ -1,2 +1,2 @@\n-z01\n+Z01\n z02\n@@ -15,3 +15,2 @@ z14\n z15\n-z16\n z17\n');

    expect(zeilen).toEqual([
      kopf('@@ -1,2 +1,2 @@'), minus('z01', 1), plus('Z01', 1), kontext('z02', 2, 2),
      kopf('@@ -15,3 +15,2 @@ z14'), kontext('z15', 15, 15), minus('z16', 16), kontext('z17', 17, 16),
    ]);
  });

  test('soll leere Bereiche, ausgelassene Anzahlen und den Hinweis ohne Zeilenende rechnen', () => {
    expect(patchZeilen('@@ -0,0 +1,2 @@\n+kurz\n+lang\n')).toEqual([kopf('@@ -0,0 +1,2 @@'), plus('kurz', 1), plus('lang', 2)]);
    expect(patchZeilen('@@ -1,2 +0,0 @@\n-a1\n-a2\n')).toEqual([kopf('@@ -1,2 +0,0 @@'), minus('a1', 1), minus('a2', 2)]);
    expect(patchZeilen('@@ -1 +1 @@\n-a\n\\ No newline at end of file\n+a\n')).toEqual([
      kopf('@@ -1 +1 @@'), minus('a', 1), { art: 'hinweis', alt: null, neu: null, text: '\\ No newline at end of file' }, plus('a', 1),
    ]);
  });

  test('soll eine leere Kontextzeile mit Nummern zählen und nur an \\n trennen', () => {
    expect(patchZeilen('@@ -1,3 +1,3 @@\n oben\n \n-unten\n+UNTEN\n')).toEqual([
      kopf('@@ -1,3 +1,3 @@'), kontext('oben', 1, 1), kontext('', 2, 2), minus('unten', 3), plus('UNTEN', 3),
    ]);
    expect(patchZeilen('@@ -0,0 +1 @@\n+a\rb\u2028c\n')).toEqual([kopf('@@ -0,0 +1 @@'), plus('a\rb\u2028c', 1)]);
    expect(patchZeilen('')).toEqual([]);
  });

  test('soll Richtungsänderndes und Steuerzeichen als Marke zeigen und gewöhnlichen Text als einen Teil lassen', () => {
    expect(sichtbarTeile('a\u202Eb')).toEqual([{ text: 'a' }, { marke: 'bidi', code: 'U+202E', text: '⟨U+202E⟩' }, { text: 'b' }]);
    expect(sichtbarTeile('x\u200By')).toEqual([{ text: 'x' }, { marke: 'steuer', code: 'U+200B', text: 'U+200B' }, { text: 'y' }]);
    expect(sichtbarTeile('a\u0007')).toEqual([{ text: 'a' }, { marke: 'steuer', code: 'U+0007', text: '␇ U+0007' }]);
    expect(sichtbarTeile('zeile\r')).toEqual([{ text: 'zeile' }, { marke: 'steuer', code: 'U+000D', text: '␍' }]);
    expect(sichtbarTeile('<b>fett</b>\tmit Tab')).toEqual([{ text: '<b>fett</b>\tmit Tab' }]);
    expect(sichtbarTeile('')).toEqual([]);
    for (const zeichen of ['\u061C', '\u200E', '\u200F', '\u202A', '\u202B', '\u202C', '\u202D', '\u2066', '\u2067', '\u2068', '\u2069']) {
      expect(sichtbarTeile(zeichen)[0].marke, `U+${zeichen.codePointAt(0).toString(16)}`).toBe('bidi');
    }
  });

  test('soll gleiche Steuerzeichen in Folge zu einer Marke mit Anzahl zusammenfassen', () => {
    expect(sichtbarTeile('a\u0000\u0000\u0000b')).toEqual([{ text: 'a' }, { marke: 'steuer', code: 'U+0000', text: '␀ U+0000 ×3', anzahl: 3 }, { text: 'b' }]);
    expect(sichtbarTeile('\u0000\u0001\u0000')).toHaveLength(3);
    expect(sichtbarTeile('\u202E\u202E')).toEqual([{ marke: 'bidi', code: 'U+202E', text: '⟨U+202E⟩ ×2', anzahl: 2 }]);
    expect(sichtbarTeile('x\r\r')).toEqual([
      { text: 'x' }, { marke: 'steuer', code: 'U+000D', text: '␍ U+000D' }, { marke: 'steuer', code: 'U+000D', text: '␍' },
    ]);
    const lang = sichtbarTeile('\u0000'.repeat(3000000));
    expect(lang).toEqual([{ marke: 'steuer', code: 'U+0000', text: '␀ U+0000 ×3000000', anzahl: 3000000 }]);
  });

  test('soll einen Text über der Zeilen-, Zeichen- oder Markengrenze als zu lang melden und darunter nicht', () => {
    const zeilen = anzahl => Array.from({ length: anzahl }, (_, index) => plus('x', index + 1));
    expect([ZEILEN_GRENZE, ZEICHEN_GRENZE, MARKEN_GRENZE]).toEqual([20000, 262144, 10000]);
    expect(zuLang(zeilen(20000))).toBeNull();
    expect(zuLang([...zeilen(20000), plus('x', 20001)])).toEqual({ anzahl: 20001, einheit: 'Zeilen' });
    expect(zuLang([plus('a'.repeat(ZEICHEN_GRENZE), 1)])).toBeNull();
    expect(zuLang([plus('a'.repeat(ZEICHEN_GRENZE + 1), 1)])).toEqual({ anzahl: ZEICHEN_GRENZE + 1, einheit: 'Zeichen' });
    expect(zuLang([kopf('@@ -0,0 +1 @@'), plus('\u0000'.repeat(ZEICHEN_GRENZE), 1)])).toBeNull();
    expect(zuLang([plus('\u0000a'.repeat(MARKEN_GRENZE), 1)])).toBeNull();
    expect(zuLang([plus('\u0000a'.repeat(MARKEN_GRENZE + 1), 1)])).toEqual({ anzahl: MARKEN_GRENZE + 1, einheit: 'Marken' });
  });

  test('soll große Eingaben schnell rechnen', () => {
    const start = Date.now();
    zuLang([plus('\u0000'.repeat(3000000), 1)]);
    sichtbarTeile('\u0000'.repeat(3000000));
    expect(Date.now() - start).toBeLessThan(500);
  });

  test('soll Zeilen in Blöcke zu 500 teilen', () => {
    const zeilen = Array.from({ length: 1201 }, (_, index) => plus(`z${index}`, index + 1));

    const geteilt = bloecke(zeilen);

    expect(BLOCK_ZEILEN).toBe(500);
    expect(geteilt.map(block => block.length)).toEqual([500, 500, 201]);
    expect(geteilt.flat()).toEqual(zeilen);
    expect(bloecke([])).toEqual([]);
  });

  test('soll die Breite eines Blocks nach seiner längsten Zeile schätzen', () => {
    expect(blockBreite([plus('kurz', 1), plus('0123456789'.repeat(30), 2)])).toBe(300 * 8 + 140);
    expect(blockBreite([plus('\tx', 1)])).toBe(5 * 8 + 140);
    expect(blockBreite([plus('日本', 1)])).toBe(4 * 8 + 140);
    expect(blockBreite([])).toBe(140);
  });

  test('soll 20 000 Zeilen schnell rechnen', () => {
    const patch = `@@ -0,0 +1,20000 @@\n${Array.from({ length: 20000 }, (_, index) => `+zeile ${index + 1}`).join('\n')}\n`;
    const start = performance.now();

    const zeilen = patchZeilen(patch);

    expect(zeilen).toHaveLength(20001);
    expect(zeilen[20000]).toEqual(plus('zeile 20000', 20000));
    expect(performance.now() - start).toBeLessThan(200);
  });
});
