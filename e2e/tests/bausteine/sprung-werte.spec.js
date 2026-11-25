'use strict';
// B2007 Baustein (ohne Browser) der Sprung-Rechnung: welche Nummer neu eine Zeile oder ein Abschnittskopf öffnet und wie der Link entsteht.
const { test, expect } = require('@playwright/test');
const { sprungZeile, sprungLink, ersteSprungzeile } = require('../../../src/GitReviewA/web/sprung-werte.js');

const kopf = text => ({ art: 'kopf', alt: null, neu: null, text });
const kontext = (text, alt, neu) => ({ art: 'kontext', alt, neu, text });
const plus = (text, neu) => ({ art: 'plus', alt: null, neu, text });
const minus = (text, alt) => ({ art: 'minus', alt, neu: null, text });
const hinweis = text => ({ art: 'hinweis', alt: null, neu: null, text });

test.describe('Baustein Sprung-Werte', () => {
  test('soll jeder Zeile mit Nummer neu ihre Nummer geben und entfernten und Hinweiszeilen keine', () => {
    expect(sprungZeile(kontext('a1', 1, 1))).toBe(1);
    expect(sprungZeile(plus('A2', 2))).toBe(2);
    expect(sprungZeile(minus('a2', 2))).toBeNull();
    expect(sprungZeile(hinweis('\\ No newline at end of file'))).toBeNull();
  });

  test('soll einen Abschnittskopf auf die erste Zeile seiner neuen Seite legen', () => {
    expect(sprungZeile(kopf('@@ -1,3 +1,4 @@'))).toBe(1);
    expect(sprungZeile(kopf('@@ -15,6 +15,5 @@ z14'))).toBe(15);
    expect(sprungZeile(kopf('@@ -0,0 +1,2 @@'))).toBe(1);
    expect(sprungZeile(kopf('@@ -1,4 +0,0 @@'))).toBe(1);
  });

  test('soll den Link aus Ziel und Nummer zusammensetzen und ohne eines von beidem null liefern', () => {
    expect(sprungLink('vscode://file/x/a.txt', 4)).toBe('vscode://file/x/a.txt:4');
    expect(sprungLink('', 4)).toBeNull();
    expect(sprungLink('vscode://file/x/a.txt', null)).toBeNull();
  });

  test('soll ohne gewählte Zeile die erste Zeile mit Nummer neu nehmen, sonst die erste Abschnittskopf-Nummer, sonst 1', () => {
    expect(ersteSprungzeile([kopf('@@ -1,3 +1,4 @@'), kontext('a1', 1, 1), plus('A2', 2)])).toBe(1);
    expect(ersteSprungzeile([kopf('@@ -1,4 +0,0 @@'), minus('a1', 1)])).toBe(1);
    expect(ersteSprungzeile([])).toBe(1);
  });
});
