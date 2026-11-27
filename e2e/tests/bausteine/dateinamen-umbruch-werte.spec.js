'use strict';
// Bausteintest (ohne Browser) der Umbruchstellen (R00056, B5603): aus dem Anzeigenamen die Abschnitte, nach denen ein `<wbr>`
// stehen darf — nach `/`, `-`, `_`, `.`, nie in einer Marke `⟨…⟩`; die Texte bleiben Zeichen für Zeichen der Anzeigename (R00011).
const { test, expect } = require('@playwright/test');
const { abschnitte } = require('../../../src/GitReviewA/web/dateinamen-umbruch-werte.js');

const text = teile => teile.map(teil => teil.text).join('');

test.describe('Baustein Umbruchstellen', () => {
  test('soll die Texte unverändert aneinanderreihen (Zeichen für Zeichen)', () => {
    for (const name of ['db/001_anlegen.sql', 'a_b.c-d/e', 'x⟨U+202E⟩y.txt', 'f⟨0xFF⟩.txt', 'aaaaa.txt', '⟨U+202E⟩', '⟨', 'a/', '']) {
      expect(text(abschnitte(name)), name).toBe(name);
    }
  });

  test('soll nach jedem Trenner /, -, _, . einen Abschnitt enden lassen (a_b.c-d/e)', () => {
    expect(abschnitte('a_b.c-d/e')).toEqual([
      { text: 'a_', umbruchDanach: true },
      { text: 'b.', umbruchDanach: true },
      { text: 'c-', umbruchDanach: true },
      { text: 'd/', umbruchDanach: true },
      { text: 'e', umbruchDanach: false },
    ]);
  });

  test('soll der Probe aus Kriterium 2 entsprechen (db/001_anlegen.sql: Umbruch nach / und _ und .)', () => {
    expect(abschnitte('db/001_anlegen.sql')).toEqual([
      { text: 'db/', umbruchDanach: true },
      { text: '001_', umbruchDanach: true },
      { text: 'anlegen.', umbruchDanach: true },
      { text: 'sql', umbruchDanach: false },
    ]);
  });

  test('soll keine Umbruchstelle in eine Marke ⟨…⟩ setzen (R00011)', () => {
    expect(abschnitte('a⟨b_c⟩d/e')).toEqual([
      { text: 'a⟨b_c⟩d/', umbruchDanach: true },
      { text: 'e', umbruchDanach: false },
    ]);
    // Die echten Marken bleiben ganz: hinter `⟩` darf gebrochen werden, hinter einem Trenner in der Marke nicht.
    expect(abschnitte('f⟨U+202E⟩_g.txt')).toEqual([
      { text: 'f⟨U+202E⟩_', umbruchDanach: true },
      { text: 'g.', umbruchDanach: true },
      { text: 'txt', umbruchDanach: false },
    ]);
  });

  test('soll ohne geschlossene Marke ⟨ nicht weiter brechen (ein 〈 allein bleibt Text)', () => {
    const teile = abschnitte('a⟨b_c');
    expect(text(teile)).toBe('a⟨b_c');
    expect(teile.every(teil => !teil.umbruchDanach), 'keine Umbruchstelle nach dem offenen 〈').toBe(true);
  });
});
