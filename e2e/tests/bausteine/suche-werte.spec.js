'use strict';
// Bausteintests (ohne Browser) der reinen Suche: Suchbegriff prüfen (R00027, B2601).
const { test, expect } = require('@playwright/test');
const { pruefe, finde, aufTeile, zaehlertext, ZEICHEN_GRENZE, TREFFER_GRENZE } = require('../../../src/GitReviewA/web/suche-werte.js');

test.describe('Baustein Suche-Werte — Suchbegriff prüfen (R00027, B2601)', () => {
  test('soll einen nicht-leeren Begriff bis zur Längengrenze annehmen', () => {
    expect(ZEICHEN_GRENZE).toBe(200);
    expect(pruefe('zwei')).toEqual({ gueltig: true, grund: null, meldung: '' });
    expect(pruefe('a.c')).toEqual({ gueltig: true, grund: null, meldung: '' });
    expect(pruefe('.*')).toEqual({ gueltig: true, grund: null, meldung: '' });
    expect(pruefe('  a  ')).toEqual({ gueltig: true, grund: null, meldung: '' });
    expect(pruefe('a'.repeat(ZEICHEN_GRENZE)).gueltig).toBe(true);
  });

  test('soll einen leeren Begriff oder nur Leerraum ablehnen', () => {
    expect(pruefe('')).toEqual({ gueltig: false, grund: 'leer', meldung: 'Bitte einen Suchbegriff eingeben.' });
    expect(pruefe('   ')).toEqual({ gueltig: false, grund: 'leer', meldung: 'Bitte einen Suchbegriff eingeben.' });
    expect(pruefe('\t')).toEqual({ gueltig: false, grund: 'leer', meldung: 'Bitte einen Suchbegriff eingeben.' });
  });

  test('soll einen Begriff über 200 Zeichen ablehnen', () => {
    expect(pruefe('a'.repeat(ZEICHEN_GRENZE + 1))).toEqual({
      gueltig: false, grund: 'zuLang', meldung: 'Der Suchbegriff darf höchstens 200 Zeichen haben.',
    });
  });
});

test.describe('Baustein Suche-Werte — Treffer finden (R00027, B2602)', () => {
  const zeilen = ['z01 eins zwei', 'z02 zwei drei', 'z03 drei zwei', 'z04 vier', 'z05 zwei vier', 'z06 a.c', 'z07 abc'];

  test('soll jede Fundstelle wörtlich als Zeile und Zeichenspanne liefern', () => {
    expect(finde(zeilen, 'zwei')).toEqual({
      treffer: [
        { zeile: 0, von: 9, bis: 13 }, { zeile: 1, von: 4, bis: 8 },
        { zeile: 2, von: 9, bis: 13 }, { zeile: 4, von: 4, bis: 8 },
      ],
      gedeckelt: false,
    });
  });

  test('soll mehrere Treffer je Zeile einzeln zählen und am Zeilenrand treffen', () => {
    expect(finde(['aaa'], 'a')).toEqual({ treffer: [{ zeile: 0, von: 0, bis: 1 }, { zeile: 0, von: 1, bis: 2 }, { zeile: 0, von: 2, bis: 3 }], gedeckelt: false });
    expect(finde(['zwei'], 'zwei')).toEqual({ treffer: [{ zeile: 0, von: 0, bis: 4 }], gedeckelt: false });
    expect(finde(['xzweix'], 'zwei')).toEqual({ treffer: [{ zeile: 0, von: 1, bis: 5 }], gedeckelt: false });
  });

  test('soll nichts finden, was nicht dasteht', () => {
    expect(finde(zeilen, 'zzz')).toEqual({ treffer: [], gedeckelt: false });
    expect(finde([], 'zwei')).toEqual({ treffer: [], gedeckelt: false });
    expect(finde(zeilen, '')).toEqual({ treffer: [], gedeckelt: false });
  });

  test('soll Sonderzeichen wörtlich suchen, nie als regulären Ausdruck', () => {
    expect(finde(zeilen, 'a.c')).toEqual({ treffer: [{ zeile: 5, von: 4, bis: 7 }], gedeckelt: false });
    expect(finde(zeilen, '.*')).toEqual({ treffer: [], gedeckelt: false });
    expect(finde(['[a]'], '[')).toEqual({ treffer: [{ zeile: 0, von: 0, bis: 1 }], gedeckelt: false });
    expect(finde(['a\\b'], '\\')).toEqual({ treffer: [{ zeile: 0, von: 1, bis: 2 }], gedeckelt: false });
  });

  test('soll Groß und klein unterscheiden', () => {
    expect(finde(zeilen, 'ZWEI')).toEqual({ treffer: [], gedeckelt: false });
    expect(finde(['ZWEI'], 'zwei')).toEqual({ treffer: [], gedeckelt: false });
  });

  test('soll einen Treffer über eine sichtbar gemachte Marke hinweg finden', () => {
    expect(finde(['a⟨U+202E⟩b'], '⟨U+202E⟩')).toEqual({ treffer: [{ zeile: 0, von: 1, bis: 9 }], gedeckelt: false });
    expect(finde(['a⟨U+202E⟩b'], 'a⟨U+202E⟩b')).toEqual({ treffer: [{ zeile: 0, von: 0, bis: 10 }], gedeckelt: false });
  });

  test('soll höchstens 10 000 Treffer zählen und darüber hinaus deckeln', () => {
    expect(TREFFER_GRENZE).toBe(10000);
    const genau = ['x'.repeat(TREFFER_GRENZE)];
    expect(finde(genau, 'x').treffer).toHaveLength(TREFFER_GRENZE);
    expect(finde(genau, 'x').gedeckelt).toBe(false);
    const mehr = finde(['x'.repeat(TREFFER_GRENZE + 5)], 'x');
    expect(mehr.treffer).toHaveLength(TREFFER_GRENZE);
    expect(mehr.gedeckelt).toBe(true);
  });
});

test.describe('Baustein Suche-Werte — Treffer auf die Textteile legen (R00027, B2603)', () => {
  const marke = { marke: 'bidi', code: 'U+202E', text: '⟨U+202E⟩' };

  test('soll einen Treffer innerhalb eines Teils als lokale Spanne legen', () => {
    expect(aufTeile([{ text: 'abcdef' }], [{ von: 1, bis: 3 }])).toEqual([{ text: 'abcdef', treffer: [{ von: 1, bis: 3 }] }]);
    expect(aufTeile([{ text: 'abcdef' }], [{ von: 0, bis: 6 }])).toEqual([{ text: 'abcdef', treffer: [{ von: 0, bis: 6 }] }]);
  });

  test('soll einen Treffer über eine Marke hinweg auf alle berührten Teile legen, eine Marke zählt als ihr Text', () => {
    const teile = [{ text: 'a' }, { ...marke }, { text: 'b' }];
    expect(aufTeile(teile, [{ von: 0, bis: 10 }])).toEqual([
      { text: 'a', treffer: [{ von: 0, bis: 1 }] },
      { ...marke, treffer: [{ von: 0, bis: 8 }] },
      { text: 'b', treffer: [{ von: 0, bis: 1 }] },
    ]);
  });

  test('soll einen Treffer am Teilrand dem richtigen Teil zuordnen', () => {
    const teile = [{ text: 'abc' }, { text: 'def' }];
    expect(aufTeile(teile, [{ von: 2, bis: 4 }])).toEqual([
      { text: 'abc', treffer: [{ von: 2, bis: 3 }] },
      { text: 'def', treffer: [{ von: 0, bis: 1 }] },
    ]);
  });

  test('soll Teile ohne Treffer unverändert lassen', () => {
    expect(aufTeile([{ text: 'abc' }, { text: 'def' }], [])).toEqual([{ text: 'abc' }, { text: 'def' }]);
    expect(aufTeile([{ text: '' }], [{ von: 0, bis: 1 }])).toEqual([{ text: '' }]);
  });

  test('soll den Zählertext bilden: keine Treffer, k von n, 10000+ über der Grenze', () => {
    expect(zaehlertext(0, 0)).toBe('keine Treffer');
    expect(zaehlertext(1, 4)).toBe('1 von 4');
    expect(zaehlertext(3, 7)).toBe('3 von 7');
    expect(zaehlertext(1, TREFFER_GRENZE, true)).toBe('1 von 10000+');
    expect(zaehlertext(2, TREFFER_GRENZE, false)).toBe('2 von 10000');
  });
});
