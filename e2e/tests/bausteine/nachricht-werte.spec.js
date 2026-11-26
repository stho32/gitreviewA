'use strict';

const { test, expect } = require('@playwright/test');
const nachrichtWerte = require('../../../src/GitReviewA/web/nachricht-werte.js');
const absichtWerte = require('../../../src/GitReviewA/web/absicht-werte.js');
const commitWerte = require('../../../src/GitReviewA/web/commit-werte.js');

const { nachrichtText, NACHRICHT_GRENZE } = nachrichtWerte;

test.describe('Baustein Nachricht-Werte — die eine Kürzungsregel (R00051)', () => {
  test('Kriterium 1: 25 000 Zeichen werden auf 20 000 gekürzt, der Rest wird gezählt', () => {
    expect(NACHRICHT_GRENZE).toBe(20000);
    expect(nachrichtText('x'.repeat(25000))).toBe(`${'x'.repeat(20000)}… (5000 Zeichen nicht gezeigt)`);
  });

  test('Kriterium 2: 19 999, 20 000 und 20 001 Zeichen an der Grenze', () => {
    expect(nachrichtText('x'.repeat(19999))).toBe('x'.repeat(19999));
    expect(nachrichtText('x'.repeat(20000))).toBe('x'.repeat(20000));
    expect(nachrichtText('x'.repeat(20001))).toBe(`${'x'.repeat(20000)}… (1 Zeichen nicht gezeigt)`);
  });

  test('Kriterium 3: ein Surrogatpaar an der Kante bleibt ganz', () => {
    const mitEmoji = `${'a'.repeat(19999)}😀b`;
    expect(nachrichtText(mitEmoji)).toBe(`${'a'.repeat(19999)}😀… (1 Zeichen nicht gezeigt)`);
    expect(nachrichtText(`${'a'.repeat(19999)}😀`)).toBe(`${'a'.repeat(19999)}😀`);
    expect(nachrichtText(mitEmoji)).not.toContain('\uFFFD');
  });

  test('Kriterium 4: ein Mehrbyte-Zeichen an der Kante bleibt ganz', () => {
    expect(nachrichtText('ä'.repeat(20001))).toBe(`${'ä'.repeat(20000)}… (1 Zeichen nicht gezeigt)`);
  });

  test('Grenze ± 1 und eine eigene Grenze', () => {
    expect(nachrichtText('abcdef', 5)).toBe('abcde… (1 Zeichen nicht gezeigt)');
    expect(nachrichtText('abcde', 5)).toBe('abcde');
    expect(nachrichtText('abcdef', 6)).toBe('abcdef');
  });

  test('Kriterium 6: Leiste und Streifen rufen denselben Baustein', () => {
    expect(commitWerte.nachrichtText).toBe(nachrichtText);
    expect(absichtWerte.nachrichtText).toBe(nachrichtText);
    expect(absichtWerte.NACHRICHT_GRENZE).toBe(NACHRICHT_GRENZE);
  });
});
