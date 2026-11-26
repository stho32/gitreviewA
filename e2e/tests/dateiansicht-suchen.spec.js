'use strict';
// R00044 Kriterien 6 und 8 (Dateiansicht): in der Datei suchen — dieselbe Suche wie im Diff (R00027), Treffer auch im nur
// gekürzt gezeigten Teil. Browser-Eigenes: Feld, Fokus, Tasten, Blick.
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

const sucheFeld = page => page.locator('#da-suche');
const zaehler = page => page.locator('.da-suche-zaehler');
const markierung = page => page.locator('#da-markierung');
const nummer = (page, n) => page.locator(`.da-zeile[data-nummer="${n}"] .da-nr`);

test.describe('Dateiansicht suchen (R00044, Kriterium 6)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('„/“ fokussiert, „Teil 4“ nennt „1 von 1“ und holt Zeile 4 in den Blick; die Markierung übersteht den Umbruch-Wechsel', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      await page.keyboard.press('/');
      await expect(sucheFeld(page)).toBeFocused();

      await sucheFeld(page).fill('Teil 4');
      await page.keyboard.press('Enter');

      await expect(zaehler(page)).toHaveText('1 von 1');
      const blick = await page.evaluate(() => {
        const roll = document.getElementById('da-roll').getBoundingClientRect();
        const zeile = document.querySelector('.da-zeile[data-nummer="4"]').getBoundingClientRect();
        return zeile.top >= roll.top && zeile.bottom <= roll.bottom;
      });
      expect(blick, 'Zeile 4 ist im Blick').toBe(true);

      // Kriterium 6: die Markierung übersteht den Umbruch-Wechsel.
      await page.locator('#da-roll').click();
      await nummer(page, 4).click();
      await expect(markierung(page)).toHaveText('Zeile 4 markiert');
      await page.keyboard.press('w');
      await expect(page.locator('#da-inhalt')).not.toHaveClass(/umbr/);
      await expect(markierung(page)).toHaveText('Zeile 4 markiert');
      await page.keyboard.press('w');
      await expect(page.locator('#da-inhalt')).toHaveClass(/umbr/);
      await expect(markierung(page)).toHaveText('Zeile 4 markiert');
    });
  });

  test('Kriterium 6: die Suche findet die Marke ⟨U+202E⟩ in trojan.sql', async ({ page }) => {
    await mitLauf('trojan.sql', page, async () => {
      await sucheFeld(page).fill('⟨U+202E⟩');
      await page.keyboard.press('Enter');

      await expect(zaehler(page)).toHaveText('1 von 1');
      await expect(page.locator('#da-inhalt .suche-treffer')).toHaveCount(1);
    });
  });

  test('ein Begriff ohne Treffer nennt „keine Treffer“', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      await sucheFeld(page).fill('gibtsnicht');
      await page.keyboard.press('Enter');

      await expect(zaehler(page)).toHaveText('keine Treffer');
    });
  });
});

test.describe('Dateiansicht suchen — nur gekürzt gezeigter Teil (R00044, Kriterium 8, Matrix L5)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('ein Begriff jenseits Zeichen 10 000 wird gezählt, obwohl die Zeile gekürzt gezeigt wird', async ({ page }) => {
    await mitLauf('fern.sql', page, async () => {
      // Die Anzeige ist gekürzt (10 000 Zeichen), der Begriff steht erst danach.
      await expect(page.locator('#da-hinweis')).toHaveText('1 Zeile nur gekürzt gezeigt');
      await expect(page.locator('#da-inhalt .da-text').first()).toContainText('weitere Zeichen');

      await sucheFeld(page).fill('FERNTREFFER');
      await page.keyboard.press('Enter');

      await expect(zaehler(page)).toHaveText('1 von 1');
      // nicht markiert: der Treffer liegt außerhalb des gezeigten Teils.
      await expect(page.locator('#da-inhalt .suche-treffer')).toHaveCount(0);
    });
  });

  test('Gegenprobe: ein Begriff im gezeigten Teil wird gezählt und markiert', async ({ page }) => {
    await mitLauf('fern.sql', page, async () => {
      await sucheFeld(page).fill('NAHBEI');
      await page.keyboard.press('Enter');

      await expect(zaehler(page)).toHaveText('1 von 1');
      await expect(page.locator('#da-inhalt .suche-treffer').first()).toHaveText('NAHBEI');
    });
  });
});
