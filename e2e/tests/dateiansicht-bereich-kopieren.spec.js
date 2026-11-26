'use strict';
// R00044 Kriterien 1–5 und 7 (Dateiansicht): Bereich mit den Gesten aus I0032 markieren und byte-genau kopieren.
// Browser-Eigenes: Gesten, Zwischenablage. Die Rechnung selbst prüfen die Bausteintests (bereich-werte.spec.js).
const fs = require('fs');
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

const nummer = (page, n) => page.locator(`.da-zeile[data-nummer="${n}"] .da-nr`);
const markierte = page => page.locator('#da-inhalt .da-zeile.da-markiert');
const markierung = page => page.locator('#da-markierung');
const status = page => page.locator('#da-status');

async function zwischenablage(page) {
  return Buffer.from(await page.evaluate(() => navigator.clipboard.readText()), 'utf8');
}

async function ziehen(page, von, bis) {
  await nummer(page, von).hover();
  await page.mouse.down();
  await nummer(page, bis).hover();
  await page.mouse.up();
}

test.describe('Dateiansicht Bereich markieren (R00044, Kriterium 1)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Klick auf 3, Umschalt-Klick auf 5 markiert die Zeilen 3–5 und nennt sie in der Werkzeugleiste', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      await nummer(page, 3).click();
      await expect(markierung(page)).toHaveText('Zeile 3 markiert');
      await expect(markierte(page)).toHaveCount(1);

      await nummer(page, 5).click({ modifiers: ['Shift'] });

      await expect(markierung(page)).toHaveText('Zeilen 3–5 markiert');
      await expect(markierte(page)).toHaveCount(3);
      await expect(page.locator('#bereich-kopieren')).toBeEnabled();
      // nicht allein über Farbe: die Nummernspalte trägt einen Balken.
      const balken = await nummer(page, 4).evaluate(element => getComputedStyle(element).boxShadow);
      expect(balken).not.toBe('none');
    });
  });

  test('Umschalt-Klick auf 2 statt 5 ergibt „Zeilen 2–3“', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      await nummer(page, 3).click();
      await nummer(page, 2).click({ modifiers: ['Shift'] });

      await expect(markierung(page)).toHaveText('Zeilen 2–3 markiert');
      await expect(markierte(page)).toHaveCount(2);
    });
  });

  test('Ziehen über die Nummern 6 bis 4 ergibt „Zeilen 4–6“, Umschalt+↓ daraus 4–7, Esc hebt auf', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      await ziehen(page, 6, 4);
      await expect(markierung(page)).toHaveText('Zeilen 4–6 markiert');

      await page.keyboard.press('Shift+ArrowDown');
      await expect(markierung(page)).toHaveText('Zeilen 4–7 markiert');

      await page.keyboard.press('Escape');
      await expect(markierung(page)).toHaveText('');
      await expect(markierte(page)).toHaveCount(0);
      await expect(page.locator('#bereich-kopieren')).toBeDisabled();
    });
  });
});

test.describe('Dateiansicht Bereich kopieren (R00044, Kriterien 2, 3, 5 und 7)', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1280, height: 800 } });

  test('Kriterium 2: „Bereich kopieren“ legt die Zeilen 3–5 samt drei CRLF byte-genau ab (33 Bytes)', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      await nummer(page, 3).click();
      await nummer(page, 5).click({ modifiers: ['Shift'] });
      await page.locator('#bereich-kopieren').click();

      await expect(status(page)).toHaveText('Zeilen 3–5 kopiert');
      const gelesen = await zwischenablage(page);
      expect(gelesen.length).toBe(33);
      expect(gelesen.toString('utf8')).toBe('-- Teil 3\r\n-- Teil 4\r\n-- Teil 5\r\n');
      expect(gelesen.toString('utf8')).not.toMatch(/\d\t/);
    });
  });

  test('Kriterium 2: die Zeilen 7–8 enden nach Zeile 8 ohne Zeilenende', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      await nummer(page, 7).click();
      await nummer(page, 8).click({ modifiers: ['Shift'] });
      await page.locator('#bereich-kopieren').click();

      await expect(status(page)).toHaveText('Zeilen 7–8 kopiert');
      expect((await zwischenablage(page)).toString('utf8')).toBe('-- Teil 7\r\n-- Teil 8');
    });
  });

  test('Kriterium 3: y und Strg+C legen ohne freie Auswahl denselben Bereich ab', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      await nummer(page, 3).click();
      await nummer(page, 5).click({ modifiers: ['Shift'] });

      await page.keyboard.press('y');
      await expect(status(page)).toHaveText('Zeilen 3–5 kopiert');
      expect((await zwischenablage(page)).toString('utf8')).toBe('-- Teil 3\r\n-- Teil 4\r\n-- Teil 5\r\n');

      await page.evaluate(() => navigator.clipboard.writeText('MARKER'));
      await page.keyboard.press('Control+c');
      await expect(status(page)).toHaveText('Zeilen 3–5 kopiert');
      expect((await zwischenablage(page)).toString('utf8')).toBe('-- Teil 3\r\n-- Teil 4\r\n-- Teil 5\r\n');
    });
  });

  test('Kriterium 3: mit freier Textauswahl kopiert Strg+C die Auswahl, nicht den markierten Bereich', async ({ page }) => {
    await mitLauf('mig.sql', page, async () => {
      // Ein Bereich ist markiert — Strg+C darf ihn nicht nehmen, wenn Text frei ausgewählt ist.
      await nummer(page, 1).click();
      await nummer(page, 2).click({ modifiers: ['Shift'] });
      await expect(markierung(page)).toHaveText('Zeilen 1–2 markiert');

      const auswahl = await page.evaluate(() => {
        const von = document.querySelector('.da-zeile[data-nummer="3"] .da-text');
        const bis = document.querySelector('.da-zeile[data-nummer="4"] .da-text');
        const bereich = document.createRange();
        bereich.setStart(von, 0);
        bereich.setEnd(bis, bis.childNodes.length);
        const auswahl = window.getSelection();
        auswahl.removeAllRanges();
        auswahl.addRange(bereich);
        return auswahl.toString();
      });
      expect(auswahl).toContain('-- Teil 3');

      await page.keyboard.press('Control+c');

      const gelesen = (await zwischenablage(page)).toString('utf8');
      expect(gelesen).toContain('-- Teil 3');
      expect(gelesen).toContain('-- Teil 4');
      expect(gelesen, 'die Auswahl, nicht der markierte Bereich').not.toContain('-- Teil 1');
      expect(gelesen, 'ohne Zeilennummern').not.toMatch(/^\s*\d+\s*-- Teil/m);
    });
  });

  test('Kriterium 5: breit.sql mit Zeile 1 markiert kopiert 50 000 Zeichen plus LF, nicht die gezeigten 10 000', async ({ page }) => {
    await mitLauf('breit.sql', page, async () => {
      await nummer(page, 1).click();
      await expect(markierung(page)).toHaveText('Zeile 1 markiert');
      await page.locator('#bereich-kopieren').click();

      await expect(status(page)).toHaveText('Zeile 1 kopiert');
      const gelesen = await zwischenablage(page);
      expect(gelesen.length).toBe(50001);
      expect(gelesen.equals(fs.readFileSync(d.pfad('breit.sql')))).toBe(true);
    });
  });

  test('Kriterium 7: ein einzelnes CR in der markierten Zeile bleibt byte-gleich (kein LF, keine Marke)', async ({ page }) => {
    await mitLauf('cr.sql', page, async () => {
      await expect(page.locator('#da-inhalt .da-text').first()).toContainText('⟨U+000D⟩');
      await nummer(page, 1).click();
      await page.locator('#bereich-kopieren').click();

      await expect(status(page)).toHaveText('Zeile 1 kopiert');
      const gelesen = (await zwischenablage(page)).toString('utf8');
      expect(gelesen).toBe('-- harmlos\rDROP TABLE x;\n');
      expect(gelesen.includes('\r')).toBe(true);
      expect(gelesen.includes('⟨U+')).toBe(false);
    });
  });
});

test.describe('Dateiansicht Bereich kopieren — Ersatzweg (R00044, Kriterium 4)', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1280, height: 800 } });

  test('Kriterium 4: verweigerte Zwischenablage nennt den Ersatzweg, danach legt Strg+C den Bereich ab', async ({ page }) => {
    await page.addInitScript(() => {
      const prototyp = Object.getPrototypeOf(navigator.clipboard);
      prototyp.writeText = () => Promise.reject(new DOMException('verweigert', 'NotAllowedError'));
    });

    await mitLauf('mig.sql', page, async () => {
      await nummer(page, 3).click();
      await nummer(page, 5).click({ modifiers: ['Shift'] });
      await page.locator('#bereich-kopieren').click();

      await expect(status(page)).toHaveText('Zwischenablage verweigert — Strg+C kopiert den Bereich');
      await page.keyboard.press('Control+c');

      await expect(status(page)).toHaveText('Zeilen 3–5 kopiert');
      expect((await zwischenablage(page)).toString('utf8')).toBe('-- Teil 3\r\n-- Teil 4\r\n-- Teil 5\r\n');
    });
  });
});
