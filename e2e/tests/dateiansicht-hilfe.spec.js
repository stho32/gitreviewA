'use strict';
// Karte #52 (Kommentar): `?` zeigt auch in der Dateiansicht die Kürzel-Übersicht — nur die Kürzel dieser Laufart
// (`c`, `y`, `w`, `/`, Esc) plus die Listenkürzel der Seitenleiste (`j`, `k`, `b`, Karte #53), aus demselben Katalog
// (`tasten-werte.js`), Ziel und Text je Laufart.
const { test, expect } = require('@playwright/test');
const dTreiber = require('../treiber/dateiansicht-d.js');

let d;

test.beforeAll(() => {
  d = dTreiber.ordnerDAnlegen();
});

test.afterAll(() => {
  dTreiber.entfernen(d);
});

async function mitLauf(angabe, page, pruefung) {
  const lauf = await dTreiber.starten(d, angabe);
  try {
    await dTreiber.oeffnen(page, lauf);
    await pruefung(lauf);
  } finally {
    await dTreiber.beenden(lauf);
  }
}

async function hilfeEintraege(page) {
  return page.evaluate(() => {
    const inhalt = document.querySelector('#hilfe .hilfe-inhalt');
    return [...inhalt.querySelectorAll('.hilfe-gruppe')].map(gruppe => ({
      titel: gruppe.querySelector('h3').textContent,
      eintraege: [...gruppe.querySelectorAll('li')].map(zeile => ({
        anzeige: [...zeile.querySelectorAll('.hilfe-tasten kbd')].map(kbd => kbd.textContent),
        text: zeile.textContent.replace(/\s+/g, ' ').trim(),
        verfuegbar: zeile.dataset.verfuegbar === 'true',
      })),
    }));
  });
}

test.describe('Dateiansicht Kürzel-Übersicht (Karte #52)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('„?“ öffnet die Übersicht nur mit den Kürzeln dieser Laufart, Esc schließt sie', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      await page.keyboard.press('?');
      await expect(page.locator('#hilfe')).toBeVisible();

      const gruppen = await hilfeEintraege(page);
      const eintraege = gruppen.flatMap(gruppe => gruppe.eintraege);
      const anzeigen = eintraege.flatMap(eintrag => eintrag.anzeige);

      expect(anzeigen).toEqual(expect.arrayContaining(['?', 'Esc', 'c', 'y', 'w', '/', 'j', 'k', 'b']));
      for (const fremd of ['n', 'p', 'x', 'm', 'a', 'e', '1', '2', '3', 'r', 'h', 'u', 'g', 'o', 's', 'v', 'l', '↓', '↑']) {
        expect(anzeigen, `Kürzel ${fremd} gehört nicht in die Dateiansicht`).not.toContain(fremd);
      }
      for (const eintrag of eintraege) {
        expect(eintrag.verfuegbar, `${eintrag.text} ist in der Dateiansicht verfügbar`).toBe(true);
      }
      const texte = eintraege.map(eintrag => eintrag.text);
      expect(texte.some(text => text.includes('Bereich kopieren'))).toBe(true);
      expect(texte.some(text => text.includes('In der Datei suchen'))).toBe(true);
      expect(texte.some(text => text.includes('Markierung aufheben'))).toBe(true);

      await page.keyboard.press('Escape');
      await expect(page.locator('#hilfe')).toBeHidden();
    });
  });

  test('die Hinweise am Bedienelement kommen aus demselben Katalog (c, y, w, /)', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      await expect(page.locator('#datei-kopieren')).toHaveAttribute('aria-keyshortcuts', 'c');
      await expect(page.locator('#bereich-kopieren')).toHaveAttribute('aria-keyshortcuts', 'y');
      await expect(page.locator('#da-umbruch')).toHaveAttribute('aria-keyshortcuts', 'w');
      await expect(page.locator('#da-suche')).toHaveAttribute('aria-keyshortcuts', '/');
      await expect(page.locator('#hilfe-knopf')).toHaveAttribute('aria-keyshortcuts', '?');
    });
  });
});
