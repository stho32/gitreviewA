'use strict';
// R00043 Kriterien 8, 9 und 20: byte-genaues Kopieren (CRLF, ohne Schluss-LF, ohne BOM, echtes U+202E), Ersatzweg über Strg+C,
// leere Datei gesperrt, und kein Schreiben/Lesen der Zwischenablage ohne Geste.
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

async function zwischenablage(page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

function dateiBytes(name) {
  return fs.readFileSync(d.pfad(name));
}

test.describe('Dateiansicht kopieren', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1280, height: 800 } });

  for (const fall of [
    { name: 'crlf.sql', bestaetigung: 'Datei kopiert (2 Zeilen)', ohneBom: false },
    { name: 'ohne-ende.sql', bestaetigung: 'Datei kopiert (1 Zeile)', ohneBom: false },
    { name: 'bom.sql', bestaetigung: 'Datei kopiert (1 Zeile)', ohneBom: true },
    { name: 'trojan.sql', bestaetigung: 'Datei kopiert (1 Zeile)', ohneBom: false },
  ]) {
    test(`Kriterium 8: „Datei kopieren“ legt die Bytes von ${fall.name} byte-genau in die Zwischenablage, ohne Nummern und Marken`, async ({ page }) => {
      await mitLauf(fall.name, page, async () => {
        await page.locator('#datei-kopieren').click();

        await expect(page.locator('#da-status')).toHaveText(fall.bestaetigung);
        const gelesen = Buffer.from(await zwischenablage(page), 'utf8');
        const erwartet = fall.ohneBom ? dateiBytes(fall.name).subarray(3) : dateiBytes(fall.name);
        expect(gelesen.equals(erwartet)).toBe(true);
        expect(gelesen.toString('utf8')).not.toContain('⟨U+');
        expect(gelesen.toString('utf8')).not.toMatch(/^\s*\d+\t/m);
      });
    });
  }

  test('Kriterium 8: das Kürzel c kopiert die Datei über denselben Katalogweg', async ({ page }) => {
    await mitLauf('a.sql', page, async () => {
      await page.keyboard.press('c');

      await expect(page.locator('#da-status')).toHaveText('Datei kopiert (3 Zeilen)');
      expect(Buffer.from(await zwischenablage(page), 'utf8').equals(dateiBytes('a.sql'))).toBe(true);
    });
  });

  test('Kriterium 15: breit.sql nennt die eine nur gekürzt gezeigte Zeile und kopiert trotzdem alle 50 000 Zeichen', async ({ page }) => {
    await mitLauf('breit.sql', page, async () => {
      await expect(page.locator('#da-hinweis')).toHaveText('1 Zeile nur gekürzt gezeigt');

      await page.locator('#datei-kopieren').click();

      await expect(page.locator('#da-status')).toHaveText('Datei kopiert (1 Zeile, davon 1 nur gekürzt gezeigt)');
      const gelesen = await zwischenablage(page);
      expect(gelesen.length).toBe(50001);
      expect(Buffer.from(gelesen, 'utf8').equals(dateiBytes('breit.sql'))).toBe(true);
    });
  });

  test('Kriterium 9: verweigerte Zwischenablage zeigt den Ersatzweg, Strg+C legt denselben Text ab, kein zweites Feld', async ({ page }) => {
    await page.addInitScript(() => {
      const prototyp = Object.getPrototypeOf(navigator.clipboard);
      prototyp.writeText = () => Promise.reject(new DOMException('verweigert', 'NotAllowedError'));
    });

    await mitLauf('crlf.sql', page, async () => {
      await page.locator('#datei-kopieren').click();

      await expect(page.locator('#da-status')).toHaveText('Zwischenablage verweigert — Strg+C kopiert die Datei');
      await expect(page.locator('#da-inhalt')).toHaveClass(/da-kopierziel/);
      await page.keyboard.press('Control+c');

      await expect(page.locator('#da-status')).toHaveText('Datei kopiert (2 Zeilen)');
      expect(Buffer.from(await zwischenablage(page), 'utf8').equals(dateiBytes('crlf.sql'))).toBe(true);
      await expect(page.locator('#da-inhalt textarea, #da-inhalt input, #da-inhalt [contenteditable="true"]')).toHaveCount(0);
    });
  });

  test('Kriterium 9: bei leerer Datei ist „Datei kopieren“ gesperrt mit dem Grund „Datei ist leer“', async ({ page }) => {
    await mitLauf('leer.sql', page, async () => {
      await expect(page.locator('#da-inhalt')).toContainText('Datei ist leer');
      await expect(page.locator('#datei-kopieren')).toBeDisabled();
      await expect(page.locator('#datei-kopieren')).toHaveAttribute('title', 'Datei ist leer');
    });
  });

  test('Kriterium 20: nach Laden, Warten, Neuladen, w, „Trotzdem laden“ und Fokuswechsel ist kein Zwischenablage-Zugriff gezählt', async ({ page }) => {
    await page.addInitScript(() => {
      window.__zaehler = { writeText: 0, write: 0, readText: 0, read: 0, exec: 0, copy: 0, setData: 0 };
      const prototyp = Object.getPrototypeOf(navigator.clipboard || {});
      for (const name of ['writeText', 'write', 'readText', 'read']) {
        const original = prototyp[name];
        if (typeof original !== 'function') {
          continue;
        }
        prototyp[name] = function (...argumente) {
          window.__zaehler[name] += 1;
          return original.apply(this, argumente);
        };
      }
      const exec = document.execCommand.bind(document);
      document.execCommand = (...argumente) => {
        window.__zaehler.exec += 1;
        return exec(...argumente);
      };
      document.addEventListener('copy', () => {
        window.__zaehler.copy += 1;
      });
    });

    await mitLauf('lang.sql', page, async () => {
      await page.waitForTimeout(3000);
      await page.keyboard.press('w');
      await page.locator('button.trotzdem-laden').click();
      await page.locator('#schliessen').focus();
      await page.reload();
      await page.waitForTimeout(500);
      await page.locator('#schliessen').focus();

      const zaehler = await page.evaluate(() => window.__zaehler);
      expect(zaehler.writeText).toBe(0);
      expect(zaehler.write).toBe(0);
      expect(zaehler.readText).toBe(0);
      expect(zaehler.read).toBe(0);
      expect(zaehler.exec).toBe(0);
      expect(zaehler.copy).toBe(0);
    });
  });
});