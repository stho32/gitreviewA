'use strict';
// Spezifikation R00049 „Dateiliste durchsuchen“, Teil Kürzel `f` und eingeklappte Seitenleiste (B4506, Kriterium 9):
// `f` außerhalb von Feldern fokussiert das Suchfeld (bei eingeklappter Seitenleiste klappt sie zuerst aus), im Feld bleibt
// `f` Text, `Esc` leert und gibt den Fokus an die gewählte Dateizeile zurück, `/` bleibt die Suche im Diff. Ebene:
// Playwright — Fokus und Tastatur sind Browser-Eigenes. Der Katalog selbst wird in tasten-werte.spec.js geprüft.
const { test, expect } = require('../dsl/dateisuche.js');

test.describe('Kürzel `f` und eingeklappte Seitenleiste (B4506)', () => {
  test('soll `f` den Fokus ins Suchfeld setzen und den Hinweis am Feld tragen (Kriterium 9)', async ({ dateisuche, page }) => {
    await dateisuche.starten();
    await page.locator('body').focus();

    await dateisuche.kuerzelHinweis();
    await dateisuche.druecke('f');

    await dateisuche.fokusImSuchfeld();
    expect(await dateisuche.feldInhalt()).toBe('');
  });

  test('soll `f` bei eingeklappter Seitenleiste zuerst ausklappen (Kriterium 9)', async ({ dateisuche, page }) => {
    await dateisuche.starten();
    await dateisuche.einklappen();
    await dateisuche.eingeklappt();
    await dateisuche.seitenleisteVerborgen();
    await page.locator('body').focus();

    await dateisuche.druecke('f');

    await dateisuche.ausgeklappt();
    await dateisuche.fokusImSuchfeld();
  });

  test('soll `f` im Feld als Text lassen und nichts auslösen (Kriterium 9)', async ({ dateisuche }) => {
    await dateisuche.starten();
    await dateisuche.einklappen();
    await dateisuche.eingeklappt();
    await dateisuche.druecke('f');
    await dateisuche.fokusImSuchfeld();

    await dateisuche.druecke('f');

    expect(await dateisuche.feldInhalt()).toBe('f');
    await dateisuche.ausgeklappt();
  });

  test('soll `Esc` im Feld leeren und den Fokus auf die gewählte Dateizeile geben (Kriterium 9)', async ({ dateisuche }) => {
    await dateisuche.starten();
    await dateisuche.dateiAnsehen('src/app.js');
    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(3);

    await dateisuche.druecke('f');
    await dateisuche.fokusImSuchfeld();
    await dateisuche.druecke('Escape');

    expect(await dateisuche.feldInhalt()).toBe('');
    await dateisuche.aufZeilen(8);
    await dateisuche.fokusAufDateizeile('src/app.js');
    await dateisuche.gewaehlt('src/app.js');
  });

  test('soll `/` weiter die Suche im Diff fokussieren und nicht das Suchfeld der Liste (Kriterium 9)', async ({ dateisuche, page }) => {
    await dateisuche.starten();
    await dateisuche.dateiAnsehen('src/app.js');
    await page.locator('body').focus();

    await dateisuche.druecke('/');

    await expect(page.locator('#diff-suche')).toBeFocused();
    await expect(page.locator('#dateiliste-suche')).not.toBeFocused();
  });
});
