'use strict';
// Spezifikation R00037 „Ergebnis-Spalte live“ (I0038, B3602/B3604/B3605): die Spalte als eigener Rollbereich mit Titel,
// Text als `textContent` und Umbruch (B3602), das Einklappen ueber den Mechanismus aus I0036 samt `r` (B3604) und die drei
// Bereiche in der Breite (1012/811/566, B3605). Browser-Eigenes (Darstellung, Fokus, `aria-*`); Playwright.
const { test, expect } = require('../dsl/gitreviewa.js');

/** Startet gitreviewA mit der verlangten Fensterbreite und wartet, bis Liste und Haken-Stand stehen. */
async function starten(gr, page, breite) {
  const repo = gr.repoMitCommits();
  const lauf = await gr.gitreviewAStarten(repo, repo.hashes);
  await page.setViewportSize({ width: breite, height: 800 });
  await gr.oberflaecheOeffnen(page, lauf, null);
  await expect(page.locator('#kopf-fortschritt .haken-zaehler')).not.toHaveText('', { timeout: 5000 });
  await expect(page.locator('#datei-zeilen .datei-zeile').first()).toBeVisible({ timeout: 5000 });
  return lauf;
}

function spalte(page) {
  return page.locator('#ergebnis');
}

function knopf(page) {
  return page.locator('#ergebnis-einklappen');
}

async function diffBreite(page) {
  return page.evaluate(() => Math.round(document.querySelector('#diff').getBoundingClientRect().width));
}

test.describe('Ergebnis-Spalte als Bereich (B3602)', () => {
  test('steht rechts als eigener Rollbereich mit Titel; Text als textContent, lange Zeilen umbrochen, kein waagerechter Bildlauf (Kriterium 6)', async ({ gr, page }) => {
    await starten(gr, page, 1280);

    await expect(spalte(page)).toBeVisible();
    await expect(page.locator('#ergebnis-titel')).toHaveText('Ergebnis für die KI');

    const langerText = ['# Ergebnis manueller Review', '', 'x'.repeat(5000)].join('\n');
    await page.evaluate(text => window.gitreviewaErgebnisSpalte.zeige(text), langerText);

    const inhalt = await page.locator('#ergebnis-text').textContent();
    expect(inhalt, 'der Text steht unveraendert in der Spalte').toBe(langerText);

    const masse = await page.evaluate(() => {
      const spalteElement = document.getElementById('ergebnis');
      const textElement = document.getElementById('ergebnis-text');
      return {
        scrollBreite: textElement.scrollWidth,
        clientBreite: spalteElement.clientWidth,
        ueberhang: spalteElement.scrollHeight - spalteElement.clientHeight,
      };
    });
    expect(masse.scrollBreite, 'kein waagerechter Bildlauf').toBeLessThanOrEqual(masse.clientBreite);
    expect(masse.ueberhang, 'eigener senkrechter Bildlauf').toBeGreaterThan(0);
  });

  test('der Fehlerfall kennzeichnet den letzten Stand als veraltet (B3603, Fehlerpfad)', async ({ gr, page }) => {
    await starten(gr, page, 1280);
    await page.evaluate(() => window.gitreviewaErgebnisSpalte.zeige('letzter Stand'));
    await page.evaluate(() => window.gitreviewaErgebnisSpalte.zeigeFehler());

    await expect(page.locator('#ergebnis-fehler')).toHaveText('Ergebnis konnte nicht geladen werden');
    await expect(page.locator('#ergebnis-text')).toHaveText('letzter Stand');
    await expect(page.locator('#ergebnis-veraltet')).toBeVisible();
  });
});

test.describe('Ergebnis-Spalte einklappen (B3604)', () => {
  test('klappt ueber den Knopf und `r` ein und aus: Spalte hidden/inert, Streifen, Fokus, Diff breiter (Kriterium 7)', async ({ gr, page }) => {
    await starten(gr, page, 1280);
    await expect(spalte(page)).toBeVisible();
    await expect(knopf(page)).toHaveAttribute('aria-expanded', 'true');
    const vorher = await diffBreite(page);

    await knopf(page).click();
    await expect(knopf(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(spalte(page)).toBeHidden();
    const eingeklappt = await page.evaluate(() => ({
      hidden: document.getElementById('ergebnis').hidden,
      inert: document.getElementById('ergebnis').inert === true,
      streifenSichtbar: document.querySelector('.gr-ergebnis-streifen').getClientRects().length > 0,
      fokusAufKnopf: document.activeElement === document.getElementById('ergebnis-einklappen'),
    }));
    expect(eingeklappt.hidden, 'hidden').toBe(true);
    expect(eingeklappt.inert, 'inert').toBe(true);
    expect(eingeklappt.streifenSichtbar, 'Streifen bleibt').toBe(true);
    expect(eingeklappt.fokusAufKnopf, 'Fokus auf dem Knopf').toBe(true);
    expect(await diffBreite(page), 'Diff breiter').toBeGreaterThan(vorher);

    await page.keyboard.press('r');
    await expect(knopf(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(spalte(page)).toBeVisible();
    expect(await diffBreite(page), 'Diff wieder schmaler').toBe(vorher);
  });

  test('der Zustand bleibt ueber Modus- und Dateiwechsel; nach dem Neuladen gilt der Start (Kriterium 7)', async ({ gr, page }) => {
    await starten(gr, page, 1280);
    await knopf(page).click();
    await expect(spalte(page)).toBeHidden();

    await page.keyboard.press('m');
    await expect(spalte(page)).toBeHidden();
    await page.reload();
    await expect(page.locator('#kopf-fortschritt .haken-zaehler')).not.toHaveText('', { timeout: 5000 });
    await expect(spalte(page)).toBeVisible();
  });
});

test.describe('Drei Bereiche in der Breite (B3605)', () => {
  test('bei 1011 und 900 px ist die Spalte eingeklappt und ausklappbar; der Diff bleibt danach mindestens 320 px (Kriterium 8)', async ({ gr, page }) => {
    for (const breite of [1011, 900]) {
      await starten(gr, page, breite);
      await expect(spalte(page), `bei ${breite} px eingeklappt`).toBeHidden();
      await expect(knopf(page)).toHaveAttribute('aria-disabled', 'false');

      await knopf(page).click();
      await expect(spalte(page), `bei ${breite} px ausklappbar`).toBeVisible();
      expect(await diffBreite(page), `Diff bei ${breite} px`).toBeGreaterThanOrEqual(320);
    }
  });

  test('bei 811 px ist die Spalte eingeklappt und der Knopf gesperrt mit dem Grund (Kriterium 8)', async ({ gr, page }) => {
    await starten(gr, page, 811);
    await expect(spalte(page)).toBeHidden();
    await expect(knopf(page)).toBeDisabled();
    await expect(knopf(page)).toHaveAttribute('title', 'Fenster zu schmal');
    await knopf(page).dispatchEvent('click');
    await expect(spalte(page), 'gesperrt: bleibt eingeklappt').toBeHidden();
  });

  test('bei 565 px gibt es weder Spalte noch Streifen (Kriterium 8)', async ({ gr, page }) => {
    await starten(gr, page, 565);
    await expect(spalte(page)).toBeHidden();
    await expect(page.locator('.gr-ergebnis-streifen')).toBeHidden();
    await expect(knopf(page)).toHaveCount(0);
  });

  test('bei 1280 px mit ausgeklappter Spalte bleibt der Diff am linken Hoechstmass mindestens 320 px (Kriterium 8)', async ({ gr, page }) => {
    await starten(gr, page, 1280);
    await page.evaluate(() => window.gitreviewaBreite.setzen(640));

    const lage = await page.evaluate(() => ({
      leiste: Math.round(document.getElementById('seitenleiste').getBoundingClientRect().width),
      diff: Math.round(document.querySelector('#diff').getBoundingClientRect().width),
    }));
    expect(lage.diff, `Diff bei linker Hoechstbreite (${JSON.stringify(lage)})`).toBeGreaterThanOrEqual(320);
    expect(lage.leiste).toBeLessThanOrEqual(640);
  });
});
