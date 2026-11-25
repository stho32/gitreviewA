'use strict';
// Bausteintest (im Browser) der zweispaltigen Tabelle (R00023, B2202): aus einer Gegenüberstellung entsteht eine Tabelle mit vier
// Spalten je Zeile (Nummer alt, Text alt, Nummer neu, Text neu), Zellen mit `data-art`/`data-alt`/`data-neu`, alles Text;
// Spalten „alte Fassung“/„neue Fassung“, die rechte Zelle einer unveränderten Zeile ist `aria-hidden` (einmal gelesen).
const { test, expect } = require('@playwright/test');
const path = require('path');

const WERTE = path.resolve(__dirname, '../../../src/GitReviewA/web/nebeneinander-werte.js');
const NEBEN = path.resolve(__dirname, '../../../src/GitReviewA/web/nebeneinander.js');
const DIFF_WERTE = path.resolve(__dirname, '../../../src/GitReviewA/web/diff-werte.js');

const ART = { plus: 'hinzugefügt: ', minus: 'entfernt: ' };
const VORZEICHEN = { plus: '+', minus: '−', kontext: '' };

/** Ein Page-Kontext mit den geladenen Bausteinen; `bauen` baut die Tabelle aus `zeilen` und liefert die Zellen je Tabellenzeile. */
async function seiteMitBausteinen(page) {
  await page.goto('about:blank');
  await page.addScriptTag({ path: DIFF_WERTE });
  await page.addScriptTag({ path: WERTE });
  await page.addScriptTag({ path: NEBEN });
}

/** Zeilen der Spezifikation der Testsprache gleich: `{art, alt, neu, text}`. */
test.describe('Baustein Nebeneinander-Tabelle', () => {
  test('soll vier Spalten je Zeile mit Nummern und Texten bauen und entfernte gegen hinzugefügte paaren', async ({ page }) => {
    await seiteMitBausteinen(page);
    const patch = '@@ -1,6 +1,7 @@\n eins\n-zwei\n-drei\n+X\n+Y\n+Z\n vier\n fünf\n sechs\n';

    const gelesen = await page.evaluate(([patchText]) => {
      const zeilen = patchZeilen(patchText);
      const tabelle = gegenueberstellen(zeilen);
      const name = 'Änderungen in t.txt';
      const bereich = window.gitreviewaNebeneinander.tabelleBauen(tabelle, zeilen, name, zeile => {
        const knoten = [];
        const lesetext = { plus: 'hinzugefügt: ', minus: 'entfernt: ' }[zeile.art];
        if (lesetext) {
          const span = document.createElement('span');
          span.className = 'vh';
          span.textContent = lesetext;
          knoten.push(span);
        }
        knoten.push(document.createTextNode(zeile.text));
        return knoten;
      });
      document.body.append(bereich);
      return Array.from(bereich.querySelectorAll('tr')).map(tr => ({
        klasse: tr.className,
        art: tr.dataset.art ?? null,
        zellen: Array.from(tr.children).map(td => ({
          klassen: td.className,
          colspan: td.colSpan,
          verborgen: td.getAttribute('aria-hidden'),
          numerisch: td.dataset.art ?? null,
          text: td.textContent,
        })),
      }));
    }, [patch]);

    // Die Kopfzeile nennt die beiden Fassungen (jede über zwei Spalten).
    expect(gelesen[0].zellen.map(z => [z.text, z.colspan])).toEqual([['alte Fassung', 2], ['neue Fassung', 2]]);
    // Der Hunk-Kopf steht über alle vier Spalten.
    expect(gelesen[1].art).toBe('kopf');
    expect(gelesen[1].zellen).toHaveLength(1);
    expect(gelesen[1].zellen[0].colspan).toBe(4);
    expect(gelesen[1].zellen[0].text).toContain('@@ -1,6 +1,7 @@');
    // `eins` steht links (alt 1) und rechts (neu 1), beides derselbe Text; die rechte Zelle ist verborgen (einmal gelesen).
    expect(gelesen[2].zellen.map(z => z.text)).toEqual(['1', 'eins', '1', 'eins']);
    expect(gelesen[2].zellen[3].verborgen).toBe('true');
    // Die Nummernspalte alt ist verborgen (einmal gelesen), die Nummernspalte neu nicht: sie trägt den VS-Code-Sprunglink (R00021).
    expect(gelesen[2].zellen[0].verborgen, 'Nummernspalte alt').toBe('true');
    expect(gelesen[2].zellen[2].verborgen, 'Nummernspalte neu').toBeNull();
    // `−zwei` (alt 2) gegen `+X` (neu 2).
    expect(gelesen[3].zellen.map(z => z.text)).toEqual(['2', 'entfernt: zwei', '2', 'hinzugefügt: X']);
  });

  test('soll den Überhang rechts als leere linke Seite bauen', async ({ page }) => {
    await seiteMitBausteinen(page);
    const patch = '@@ -1,6 +1,7 @@\n eins\n-zwei\n-drei\n+X\n+Y\n+Z\n vier\n fünf\n sechs\n';

    const ueberhang = await page.evaluate(([patchText]) => {
      const zeilen = patchZeilen(patchText);
      const tabelle = gegenueberstellen(zeilen);
      const bereich = window.gitreviewaNebeneinander.tabelleBauen(tabelle, zeilen, 'x', zeile => [document.createTextNode(zeile.text)]);
      document.body.append(bereich);
      // Die Tabellenzeile mit dem hinzugefügten `Z` ist die letzte vor dem Kontext `vier`.
      const zeileZ = Array.from(bereich.querySelectorAll('tbody tr')).find(tr => tr.textContent.includes('Z') && !tr.textContent.includes('ZWEI'));
      return {
        links: Array.from(zeileZ.children).slice(0, 2).map(td => td.textContent),
        neu: zeileZ.querySelector('.n.neu').textContent,
        rechts: zeileZ.querySelector('.c.c-neu').textContent,
      };
    }, [patch]);

    expect(ueberhang.links).toEqual(['', '']);
    expect(ueberhang.neu).toBe('4');
    expect(ueberhang.rechts).toBe('Z');
  });

  test('soll die Spaltenköpfe mit colspan und scope tragen und jede Zelle über data-art/data-alt/data-neu auszeichnen', async ({ page }) => {
    await seiteMitBausteinen(page);
    const patch = '@@ -1,2 +1,3 @@\n eins\n-zwei\n+ZWEI\n+drei\n';

    const angaben = await page.evaluate(([patchText]) => {
      const zeilen = patchZeilen(patchText);
      const tabelle = gegenueberstellen(zeilen);
      const bereich = window.gitreviewaNebeneinander.tabelleBauen(tabelle, zeilen, 'x', zeile => [document.createTextNode(zeile.text)]);
      document.body.append(bereich);
      return {
        kopf: Array.from(bereich.querySelectorAll('th')).map(th => ({ text: th.textContent, colspan: th.colSpan, scope: th.getAttribute('scope') })),
        zellen: Array.from(bereich.querySelectorAll('tbody tr')).map(tr => ({
          links: tr.querySelector('.c.c-alt') ? { art: tr.querySelector('.c.c-alt').dataset.art, alt: tr.querySelector('.c.c-alt').dataset.alt } : null,
          rechts: tr.querySelector('.c.c-neu') ? { art: tr.querySelector('.c.c-neu').dataset.art, neu: tr.querySelector('.c.c-neu').dataset.neu } : null,
        })),
      };
    }, [patch]);

    expect(angaben.kopf).toEqual([
      { text: 'alte Fassung', colspan: 2, scope: 'col' },
      { text: 'neue Fassung', colspan: 2, scope: 'col' },
    ]);
    // Kopf | Kontext eins | −zwei/+ZWEI | leer/+drei
    expect(angaben.zellen[1]).toEqual({ links: { art: 'kontext', alt: '1' }, rechts: { art: 'kontext', neu: '1' } });
    expect(angaben.zellen[2]).toEqual({ links: { art: 'minus', alt: '2' }, rechts: { art: 'plus', neu: '2' } });
    expect(angaben.zellen[3]).toEqual({ links: null, rechts: { art: 'plus', neu: '3' } });
  });
});
