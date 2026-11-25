'use strict';
// Bausteintests (ohne Browser) der reinen Funktionen der Bildanzeige: Seiten, Beschriftung, Dateiname, Größe (R00024).
const { test, expect } = require('@playwright/test');
const { seitenFuer, seitenText, seitenName, grundFuer, groesseText } = require('../../../src/GitReviewA/web/bild-werte.js');

const datei = (status, pfad = 'bilder/logo.png', alterPfad = null) => ({ status, pfad, alterPfad });

test.describe('Baustein Bild-Werte', () => {
  test('soll je Status die vorhandenen Seiten liefern', () => {
    expect(seitenFuer('A')).toEqual(['nachher']);
    expect(seitenFuer('D')).toEqual(['vorher']);
    expect(seitenFuer('M')).toEqual(['vorher', 'nachher']);
    expect(seitenFuer('R')).toEqual(['vorher', 'nachher']);
  });

  test('soll vorher und nachher als Text nennen', () => {
    expect(seitenText('vorher')).toBe('vorher');
    expect(seitenText('nachher')).toBe('nachher');
  });

  test('soll je Seite den Dateinamen liefern, vorher bei einer Umbenennung den alten', () => {
    expect(seitenName(datei('M'), 'nachher')).toBe('bilder/logo.png');
    expect(seitenName(datei('R', 'neu.png', 'alt.png'), 'vorher')).toBe('alt.png');
    expect(seitenName(datei('R', 'neu.png', 'alt.png'), 'nachher')).toBe('neu.png');
  });

  test('soll den Grund einer fehlenden Seite nennen', () => {
    expect(grundFuer(datei('A'), 'nachher')).toBe('neu');
    expect(grundFuer(datei('D'), 'vorher')).toBe('gelöscht');
    expect(grundFuer(datei('M'), 'vorher')).toBeNull();
    expect(grundFuer(datei('A'), 'vorher')).toBeNull();
  });

  test('soll die Größe in deutscher Schreibweise zeigen', () => {
    expect(groesseText(0)).toBe('0 Byte');
    expect(groesseText(70)).toBe('70 Byte');
    expect(groesseText(1023)).toBe('1023 Byte');
    expect(groesseText(1024)).toBe('1,0 KB');
    expect(groesseText(1024 * 50)).toBe('50,0 KB');
    expect(groesseText(1024 * 1024)).toBe('1,0 MB');
    expect(groesseText(2 * 1024 * 1024)).toBe('2,0 MB');
  });
});
