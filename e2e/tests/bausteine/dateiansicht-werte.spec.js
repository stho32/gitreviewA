'use strict';
// Bausteintests der reinen Werte der Dateiansicht (R00043): Marken, Zeilen, Kürzung, Zahlwörter, Pfadkürzung, Bestätigung.
const { test, expect } = require('@playwright/test');
const {
  alsMarken, zeilenVon, kuerzeZeile, zahl, zeilenWort, pfadKuerzen, kopierbestaetigung,
} = require('../../../src/GitReviewA/web/dateiansicht-werte.js');

test.describe('Baustein Dateiansicht-Werte', () => {
  test('soll unsichtbare und richtungsändernde Zeichen als Marke zeigen und Tab sowie Text unverändert lassen', () => {
    expect(alsMarken('a\u202eb\u200bc\u{E0041}d\u000De')).toBe('a⟨U+202E⟩b⟨U+200B⟩c⟨U+E0041⟩d⟨U+000D⟩e');
    expect(alsMarken('a\tb ä')).toBe('a\tb ä');
  });

  test('soll Zeilen an LF trennen, CR vor LF als Zeilenende nehmen und ein einzelnes CR als Text behalten', () => {
    expect(zeilenVon('')).toEqual([]);
    expect(zeilenVon('a')).toEqual(['a']);
    expect(zeilenVon('a\n')).toEqual(['a']);
    expect(zeilenVon('a\r\nb\r\n')).toEqual(['a', 'b']);
    expect(zeilenVon('a\nb')).toEqual(['a', 'b']);
    expect(zeilenVon('\n')).toEqual(['']);
    expect(zeilenVon('a\rb')).toEqual(['a\rb']);
  });

  test('soll eine Zeile nach 10 000 UTF-16-Einheiten kürzen und die Zahl der weiteren Zeichen nennen', () => {
    const lang = kuerzeZeile('x'.repeat(10001));
    expect(lang.gezeigt.length).toBe(10000);
    expect(lang.weitere).toBe(1);

    const grenzeAmSurrogat = kuerzeZeile('a'.repeat(9999) + '😀');
    expect(grenzeAmSurrogat.gezeigt.length).toBe(9999);
    expect(grenzeAmSurrogat.weitere).toBe(2);
    expect(kuerzeZeile('kurz').weitere).toBe(0);
  });

  test('soll Zahlen mit Leerzeichen gruppieren und Zeilen zählen', () => {
    expect(zahl(30000)).toBe('30 000');
    expect(zahl(1000000)).toBe('1 000 000');
    expect(zeilenWort(1)).toBe('1 Zeile');
    expect(zeilenWort(2)).toBe('2 Zeilen');
    expect(zeilenWort(30000)).toBe('30 000 Zeilen');
  });

  test('soll die Bestätigung den Zeilen und den nur gekürzt gezeigten Zeilen nennen', () => {
    expect(kopierbestaetigung(2, 0)).toBe('Datei kopiert (2 Zeilen)');
    expect(kopierbestaetigung(1, 0)).toBe('Datei kopiert (1 Zeile)');
    expect(kopierbestaetigung(1, 1)).toBe('Datei kopiert (1 Zeile, davon 1 nur gekürzt gezeigt)');
    expect(kopierbestaetigung(3, 2)).toBe('Datei kopiert (3 Zeilen, davon 2 nur gekürzt gezeigt)');
  });

  test('soll einen langen Pfad in der Mitte kürzen, kurz lassen und an den Enden erhalten', () => {
    const lang = `/home/beispiel/${'a'.repeat(200)}/datei.sql`;
    const gekuerzt = pfadKuerzen(lang, 60);
    expect(gekuerzt.length).toBeLessThanOrEqual(60);
    expect(gekuerzt).toContain('…');
    expect(gekuerzt.startsWith('/home/be')).toBe(true);
    expect(gekuerzt.endsWith('datei.sql')).toBe(true);
    expect(pfadKuerzen('/kurz/a.sql', 60)).toBe('/kurz/a.sql');
  });

  test('soll beim Pfadkürzen nie mitten in einer Marke schneiden (R00045, Kriterium 6)', () => {
    const halbeMarke = `${'a'.repeat(46)}⟨U+202E⟩${'b'.repeat(100)}`;
    const gekuerzt = pfadKuerzen(halbeMarke, 100);
    expect(gekuerzt).not.toContain('⟨');
    expect(gekuerzt).not.toContain('⟩');
    expect(gekuerzt).toBe(`${'a'.repeat(46)}…${'b'.repeat(49)}`);

    const ganzeMarke = `⟨U+202E⟩${'b'.repeat(120)}`;
    expect(pfadKuerzen(ganzeMarke, 100)).toContain('⟨U+202E⟩');
  });
});