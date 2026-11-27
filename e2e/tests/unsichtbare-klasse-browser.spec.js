'use strict';
// B5805 (R00058, Kriterium 2): die eine Klasse im Browser, nur hier prüfbar — die Unicode-Daten der Browser-Engine können von
// denen Nodes abweichen, deshalb wird die Abtastung über alle Codepunkte in der Seite gegen dieselbe Tabelle gefahren.
// Kriterium 1 (Leiste zeigt `Anna⟨U+FE0F⟩`) liegt auf dem Hot Path und steht in `commit-leiste-marken.spec.js`.
const { test, expect } = require('../dsl/gitreviewa.js');
const tabelle = require('../treiber/unsichtbare-klasse-tabelle.js');

test.describe('Unsichtbare Klasse im Browser (R00058, B5805)', () => {
  test('Kriterium 2: die Abtastung in der Seite markiert genau die Codepunkte der Tabelle', async ({ gr, page }) => {
    test.setTimeout(120000);
    const bereiche = tabelle.bereicheLesen();
    expect(tabelle.anzahlDerBereiche(bereiche), 'die Tabelle trägt heute 4273 Codepunkte').toBe(4273);
    const repo = gr.repoMitDateien({ 'a.txt': 'x\n' });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufDateizeilenWarten(page, 1);

    const abweichungen = await page.evaluate(konfiguration => {
      const liegtImBereich = codepunkt => konfiguration.bereiche.some(([von, bis]) => codepunkt >= von && codepunkt <= bis);
      const funde = [];
      for (let codepunkt = 0x0000; codepunkt <= 0x10FFFF; codepunkt += 1) {
        if (codepunkt >= 0xD800 && codepunkt <= 0xDFFF) {
          continue;
        }
        const zeichen = String.fromCodePoint(codepunkt);
        const erwartet = liegtImBereich(codepunkt);
        const wirdMarkiert = window.sichtbarerName(zeichen) !== zeichen;
        // `UNSICHTBARER_TEXT` trägt `\p{Cc}` mit, also auch das Tab; die Aufrufer entfernen Tab vorher.
        const textErwartet = codepunkt === 0x0009 ? true : erwartet;
        const textTrifft = window.UNSICHTBARER_TEXT.test(zeichen);
        if (wirdMarkiert !== erwartet || textTrifft !== textErwartet) {
          if (funde.length < 20) {
            funde.push(`U+${codepunkt.toString(16).toUpperCase().padStart(4, '0')}`);
          }
        }
      }
      return funde;
    }, { bereiche });

    expect(abweichungen, `Codepunkte mit anderem Ergebnis als die Tabelle (erste: ${abweichungen.join(', ')})`).toEqual([]);
  });
});
