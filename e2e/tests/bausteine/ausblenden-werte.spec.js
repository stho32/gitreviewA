'use strict';
// Bausteintests (ohne Browser) des reinen Ausblend-Bausteins: Glob-Abgleich, Ausgeblendete je Liste, Zählertext, Musterprüfung (R00025, B2403).
const { test, expect } = require('@playwright/test');
const {
  passt, sichtbareDateien, anzahlAusgeblendet, musterFehler,
} = require('../../../src/GitReviewA/web/ausblenden-werte.js');

const datei = pfad => ({ status: 'A', pfad, alterPfad: null, plus: 1, minus: 0 });

test.describe('Baustein Ausblenden-Werte', () => {
  test('soll ein Muster ohne Schrägstrich auf den Dateinamen jeder Ebene anwenden', () => {
    expect(passt('*.lock', 'app.lock')).toBe(true);
    expect(passt('*.lock', 'build/app.lock')).toBe(true);
    expect(passt('*.lock', 'src/generated/api.lock')).toBe(true);
    expect(passt('*.lock', 'app.txt')).toBe(false);
    expect(passt('*.log', 'build/out.log')).toBe(true);
    expect(passt('README.md', 'docs/README.md')).toBe(true);
  });

  test('soll ein Muster mit Schrägstrich gegen den ganzen Pfad von der Wurzel vergleichen', () => {
    expect(passt('docs/README.md', 'docs/README.md')).toBe(true);
    expect(passt('docs/README.md', 'x/docs/README.md')).toBe(false);
    expect(passt('src/**', 'src/a.txt')).toBe(true);
    expect(passt('src/**', 'src/generated/api.cs')).toBe(true);
    expect(passt('src/**', 'docs/README.md')).toBe(false);
  });

  test('soll einen einzelnen Stern nur innerhalb eines Pfadsegments gelten lassen und ** über Segmente', () => {
    expect(passt('a/*.txt', 'a/b.txt')).toBe(true);
    expect(passt('a/*.txt', 'a/b/c.txt')).toBe(false);
    expect(passt('a/**/c.txt', 'a/c.txt')).toBe(true);
    expect(passt('a/**/c.txt', 'a/b/c.txt')).toBe(true);
    expect(passt('a/**/c.txt', 'a/b/d/c.txt')).toBe(true);
    expect(passt('a/**/c.txt', 'a/xb/c.txt')).toBe(true);
  });

  test('soll ? als ein Zeichen und [abc]/[a-z] als Zeichenklasse lesen', () => {
    expect(passt('a?c.txt', 'abc.txt')).toBe(true);
    expect(passt('a?c.txt', 'ac.txt')).toBe(false);
    expect(passt('file[0-9].txt', 'file7.txt')).toBe(true);
    expect(passt('file[0-9].txt', 'filex.txt')).toBe(false);
    expect(passt('file[abc].txt', 'fileb.txt')).toBe(true);
  });

  test('soll Groß und Klein unterscheiden und Punkt am Anfang, Umlaut und Leerzeichen im Pfad tragen', () => {
    expect(passt('*.LOCK', 'app.lock')).toBe(false);
    expect(passt('*.lock', 'app.LOCK')).toBe(false);
    expect(passt('.*', '.gitignore')).toBe(true);
    expect(passt('*.md', '.gitignore')).toBe(false);
    expect(passt('*.txt', 'ä ö.txt')).toBe(true);
    expect(passt('ä ö.txt', 'ä ö.txt')).toBe(true);
  });

  test('soll auch bei vielen Sternen ohne Rückverfolgung antworten', () => {
    expect(passt(`${'*'.repeat(60)}.lock`, 'tief/verschachtelt/app.lock')).toBe(true);
    expect(passt(`${'*'.repeat(60)}.lock`, 'tief/verschachtelt/app.txt')).toBe(false);
  });

  test('soll ein Muster, das nichts trifft, als gültig ohne Ausblenden behandeln', () => {
    expect(passt('*.zzz', 'app.lock')).toBe(false);
  });

  test('soll die Sicht je Liste liefern und die Ausgeblendeten zählen', () => {
    const dateien = [datei('README.md'), datei('app.lock'), datei('build/out.log'), datei('docs/README.md')];

    const sichtbar = sichtbareDateien(dateien, ['*.lock', 'build/**']);

    expect(sichtbar.map(d => d.pfad)).toEqual(['README.md', 'docs/README.md']);
    expect(anzahlAusgeblendet(dateien, ['*.lock', 'build/**'])).toBe(2);
    expect(anzahlAusgeblendet(dateien, [])).toBe(0);
  });

  test('soll ein Muster im Feld nach derselben Regel prüfen', () => {
    expect(musterFehler('*.lock', 0)).toBeNull();
    expect(musterFehler(' a ', 0)).toBeNull();
    expect(musterFehler('*', 0)).toBeNull();
    expect(musterFehler('', 0)).toBe('Ein Muster darf nicht leer sein.');
    expect(musterFehler('   ', 0)).toBe('Ein Muster darf nicht leer sein.');
    expect(musterFehler('a\nb', 0)).toBe('Ein Muster darf keine Steuer- oder Richtungszeichen enthalten.');
    expect(musterFehler('a\u202Eb', 0)).toBe('Ein Muster darf keine Steuer- oder Richtungszeichen enthalten.');
    expect(musterFehler(new Array(202).join('a'), 0)).toBe('Ein Muster darf höchstens 200 Zeichen haben.');
    expect(musterFehler('*.lock', 20)).toBe('Höchstens 20 Muster sind erlaubt.');
  });
});
