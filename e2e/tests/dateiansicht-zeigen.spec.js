'use strict';
// R00043 Kriterien 4, 5, 6, 7 und 14 (Anzeige-Teil): Darstellung, Umbruch, Zuklappen, Kürzung, DOM-Sicherheit, Kopfhöhe.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const dTreiber = require('../treiber/dateiansicht-d.js');

let d;

test.beforeAll(() => {
  d = dTreiber.ordnerDAnlegen();
});

test.afterAll(() => {
  dTreiber.entfernen(d);
});

async function mitLauf(angabe, seite, pruefung) {
  const lauf = await dTreiber.starten(d, angabe);
  try {
    await dTreiber.oeffnen(seite, lauf);
    await pruefung(lauf);
  } finally {
    await dTreiber.beenden(lauf);
  }
}

test.describe('Dateiansicht zeigen', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Kopf nennt Angabe, echten Pfad und 36 Bytes · 3 Zeilen · UTF-8 · LF, Zeilen 1–3 mit gefärbtem SELECT, Umbruch an und über w aus', async ({ page }) => {
    await mitLauf('a.sql', page, async () => {
      await expect(page.locator('#da-name')).toHaveText('a.sql');
      await expect(page.locator('#da-pfad')).toHaveAttribute('aria-label', d.pfad('a.sql'));
      await expect(page.locator('#da-werte')).toHaveText('36 Bytes · 3 Zeilen · UTF-8 · LF');
      await expect(page.locator('.da-nr')).toHaveText(['1', '2', '3']);
      await expect.poll(() => page.locator('#da-inhalt .tk-keyword').first().textContent()).toBe('SELECT');
      await expect(page.locator('#da-inhalt')).toHaveClass(/umbr/);

      await page.keyboard.press('w');
      await expect(page.locator('#da-inhalt')).not.toHaveClass(/umbr/);
      await expect(page.locator('#da-umbruch')).not.toBeChecked();

      await page.reload();
      await expect(page.locator('#da-inhalt')).toHaveClass(/umbr/);
      await expect(page.locator('#da-umbruch')).toBeChecked();
    });
  });

  test('lang.sql ist zugeklappt mit 30 000 Zeilen und „Trotzdem laden“, breit.sql zeigt 10 000 Zeichen und „40 000 weitere“', async ({ page }) => {
    await mitLauf('lang.sql', page, async () => {
      const zugeklappt = page.locator('#da-inhalt .da-zugeklappt');
      await expect(zugeklappt).toBeVisible();
      await expect(zugeklappt).toContainText('30 000 Zeilen');
      await expect(zugeklappt.getByRole('button', { name: 'Trotzdem laden' })).toBeVisible();
      await expect(page.locator('#datei-kopieren')).toBeEnabled();
      await expect(page.locator('.da-zeile')).toHaveCount(0);
    });

    await mitLauf('breit.sql', page, async () => {
      const text = page.locator('#da-inhalt .da-text').first();
      await expect(text).toContainText('… (40 000 weitere Zeichen)');
      const anzeige = await text.evaluate(element => element.textContent);
      expect(anzeige.startsWith('x'.repeat(10000))).toBe(true);
      expect(anzeige).not.toContain('x'.repeat(10001));
      await expect(page.locator('#da-hinweis')).toHaveText('1 Zeile nur gekürzt gezeigt');
      await expect(page.locator('#datei-kopieren')).toBeEnabled();
    });
  });

  test('fremder Name und Inhalt bleiben Text: kein img/b, kein Dialog, U+202E als Marke, einzelnes CR als ⟨U+000D⟩ und Zeilenende keins', async ({ page }) => {
    let dialog = false;
    page.on('dialog', async fenster => {
      dialog = true;
      await fenster.dismiss();
    });

    await mitLauf('<b>x<b>.sql', page, async () => {
      await expect(page.locator('#da-name')).toHaveText('<b>x<b>.sql');
      await expect(page.locator('#da-name b')).toHaveCount(0);
      await expect(page.locator('#da-inhalt img')).toHaveCount(0);
      await expect(page.locator('#da-inhalt .da-text').first()).toHaveText('<img src=x onerror=alert(1)>');
      expect(dialog).toBe(false);
    });

    await mitLauf('trojan.sql', page, async () => {
      await expect(page.locator('#da-inhalt .da-text').first()).toContainText('⟨U+202E⟩');
      const roh = await page.locator('#da-inhalt').evaluate(element => element.textContent.includes('\u202e'));
      expect(roh).toBe(false);
    });

    await mitLauf('cr.sql', page, async () => {
      await expect(page.locator('#da-inhalt .da-text').first()).toContainText('⟨U+000D⟩');
      const rohesCr = await page.locator('#da-inhalt .da-text').first().evaluate(element => element.textContent.includes('\r'));
      expect(rohesCr).toBe(false);
      await expect(page.locator('.da-nr')).toHaveText(['1']);
      await expect(page.locator('#da-werte')).toContainText('· LF');
    });
  });

  test('Kopf bleibt bei einem Pfad von über 300 Zeichen zwei Zeilen hoch, kürzt in der Mitte und nennt den ganzen Pfad zugänglich', async ({ page }) => {
    const tief = path.join('a'.repeat(120), 'b'.repeat(120), 'c'.repeat(60));
    fs.mkdirSync(path.join(d.ordner, tief), { recursive: true });
    const langPfad = path.join(d.ordner, tief, 'datei.sql');
    fs.writeFileSync(langPfad, Array.from({ length: 1000 }, (_, i) => `SELECT ${i + 1};`).join('\n') + '\n');
    expect(langPfad.length).toBeGreaterThan(300);

    await mitLauf(langPfad, page, async () => {
      await expect(page.locator('#da-pfad')).toContainText('…');
      await expect(page.locator('#da-pfad')).toHaveAttribute('aria-label', langPfad);
      const masse = await page.locator('#da-kopf').evaluate(element => {
        const stil = getComputedStyle(element);
        const kasten = element.getBoundingClientRect();
        return {
          hoehe: kasten.height,
          zeile: parseFloat(stil.lineHeight),
          oben: parseFloat(stil.paddingTop),
          unten: parseFloat(stil.paddingBottom),
        };
      });
      expect(masse.hoehe).toBeLessThanOrEqual(2 * masse.zeile + masse.oben + masse.unten + 1);

      const rollen = await page.locator('#da-roll').evaluate(element => ({
        ueberlauf: getComputedStyle(element).overflowY,
        scrollt: element.scrollHeight > element.clientHeight,
        oben: element.getBoundingClientRect().top,
      }));
      expect(rollen.ueberlauf).toBe('auto');
      expect(rollen.scrollt).toBe(true);
      const kopieren = await page.locator('#datei-kopieren').boundingBox();
      expect(kopieren.y).toBeLessThan(rollen.oben);

      await page.locator('#da-roll').evaluate(element => element.scrollTo(0, element.scrollHeight));
      await expect(page.locator('#da-kopf')).toBeVisible();
      await expect(page.locator('#datei-kopieren')).toBeVisible();
    });
  });
});