'use strict';
// Spezifikation R00027 „Im Diff suchen“ — Suchfeld und Zähler (B2604) am echten Programm (Browser-Eigenes: Feld, Fokus, Tasten).
// Gesucht wird nur in der gezeigten Datei, wörtlich; die Rechnung selbst prüfen die Bausteintests (suche-werte.spec.js).
const { test, expect } = require('../dsl/gitreviewa.js');

const SUCHE_TXT = ['z01 eins zwei', 'z02 zwei drei', 'z03 drei zwei', 'z04 vier', 'z05 zwei vier', 'z06 a.c', 'z07 abc'].join('\n') + '\n';

async function repoY(gr) {
  return gr.repoMitDateien({ 'suche.txt': SUCHE_TXT });
}

/** Wählt `suche.txt` und wartet, bis ihr Diff gezeichnet ist (7 Zeilen und ein Hunk-Kopf). */
async function sucheTxtWaehlen(page, gr) {
  await gr.dateiWaehlen(page, 'suche.txt');
  await expect(page.locator('#diff .df-sc tr[data-art]')).toHaveCount(8);
}

test.describe('Im Diff suchen (R00027) — Suchfeld und Zähler (B2604)', () => {
  test('soll ein beschriftetes, per Tab erreichbares Suchfeld im Werkzeugkasten haben', async ({ gr, page }) => {
    const repo = await repoY(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await sucheTxtWaehlen(page, gr);

    await expect(gr.sucheFeld(page)).toBeVisible();
    await expect(gr.sucheFeld(page)).toHaveAccessibleName(/^Suchen/);
    await page.locator('.umbruch-schalter').focus();
    await page.keyboard.press('Tab');
    await expect(gr.sucheFeld(page)).toBeFocused();
  });

  test('soll nach einem Begriff zählen und vor und zurück mit Umlauf gehen', async ({ gr, page }) => {
    const repo = await repoY(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await sucheTxtWaehlen(page, gr);

    await gr.sucheSuchen(page, 'zwei');
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 4');

    await gr.sucheWeiter(page);
    await expect(gr.sucheZaehler(page)).toHaveText('2 von 4');
    await gr.sucheWeiter(page);
    await expect(gr.sucheZaehler(page)).toHaveText('3 von 4');
    await gr.sucheWeiter(page);
    await expect(gr.sucheZaehler(page)).toHaveText('4 von 4');
    await gr.sucheWeiter(page);
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 4');

    await gr.sucheZurueck(page);
    await expect(gr.sucheZaehler(page)).toHaveText('4 von 4');
  });

  test('soll „keine Treffer“ bei 0 nennen und keine Meldung im Feld', async ({ gr, page }) => {
    const repo = await repoY(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await sucheTxtWaehlen(page, gr);

    await gr.sucheSuchen(page, 'zzz');

    await expect(gr.sucheZaehler(page)).toHaveText('keine Treffer');
    await expect(gr.sucheFehler(page)).toHaveText('');
  });

  test('soll einen zu langen oder leeren Suchbegriff melden und nicht suchen', async ({ gr, page }) => {
    const repo = await repoY(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await sucheTxtWaehlen(page, gr);

    await gr.sucheSuchen(page, 'a'.repeat(201));
    await expect(gr.sucheFehler(page)).toHaveText('Der Suchbegriff darf höchstens 200 Zeichen haben.');
    await expect(gr.sucheZaehler(page)).toHaveText('');

    await gr.sucheSuchen(page, '   ');
    await expect(gr.sucheFehler(page)).toHaveText('Bitte einen Suchbegriff eingeben.');
    await expect(gr.sucheZaehler(page)).toHaveText('');

    await gr.sucheSuchen(page, 'a'.repeat(200));
    await expect(gr.sucheFehler(page)).toHaveText('');
    await expect(gr.sucheZaehler(page)).toHaveText('keine Treffer');
  });
});

const FREMD_TXT = 'var s = "<b>x</b>";\nvar t = "a\u202Eb";\n';

test.describe('Im Diff suchen (R00027) — Treffer markieren und springen (B2605)', () => {
  test('soll jedes Vorkommen als eigenes Element markieren und den ersten als aktuellen zeigen', async ({ gr, page }) => {
    const repo = await repoY(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await sucheTxtWaehlen(page, gr);

    await gr.sucheSuchen(page, 'zwei');

    const marken = await gr.sucheMarkenLesen(page);
    expect(marken.map(mark => mark.text)).toEqual(['zwei', 'zwei', 'zwei', 'zwei']);
    expect(marken.map(mark => mark.aktuell)).toEqual([true, false, false, false]);
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 4');
  });

  test('soll mit Enter und Umschalt+Enter den aktuellen Treffer wandern lassen', async ({ gr, page }) => {
    const repo = await repoY(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await sucheTxtWaehlen(page, gr);

    await gr.sucheSuchen(page, 'zwei');
    const aktuellerIndex = async () => (await gr.sucheMarkenLesen(page)).findIndex(mark => mark.aktuell);

    expect(await aktuellerIndex()).toBe(0);
    await gr.sucheWeiter(page);
    expect(await aktuellerIndex()).toBe(1);
    await gr.sucheWeiter(page);
    expect(await aktuellerIndex()).toBe(2);
    await gr.sucheWeiter(page);
    expect(await aktuellerIndex()).toBe(3);
    await gr.sucheWeiter(page);
    expect(await aktuellerIndex()).toBe(0);
    await gr.sucheZurueck(page);
    expect(await aktuellerIndex()).toBe(3);
  });

  test('soll fremdes HTML und eine Marke nur als sichtbaren Text markieren, ohne sie zu deuten', async ({ gr, page }) => {
    const repo = gr.repoMitDateien({ 'fremd.txt': FREMD_TXT });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    const dialogePruefen = gr.dialogeZaehlen(page);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await gr.dateiWaehlen(page, 'fremd.txt');
    await expect(page.locator('#diff .df-sc tr[data-art]')).toHaveCount(3);

    await gr.sucheSuchen(page, '<b>');
    const marken = await gr.sucheMarkenLesen(page);
    expect(marken.map(mark => mark.text)).toEqual(['<b>']);
    const zeileS = await page.locator('#diff .df-sc td.c').filter({ hasText: 'var s' }).first().evaluate(zelle => {
      const klon = zelle.cloneNode(true);
      klon.querySelectorAll('.vh').forEach(verborgen => verborgen.remove());
      return klon.textContent;
    });
    expect(zeileS).toBe('var s = "<b>x</b>";');

    await gr.sucheSuchen(page, '⟨U+202E⟩');
    expect((await gr.sucheMarkenLesen(page)).map(mark => mark.text)).toEqual(['⟨U+202E⟩']);
    const rohzeichenImDiff = await page.locator('#diff .df-sc').evaluate(element => element.textContent.includes('\u202E'));
    expect(rohzeichenImDiff).toBe(false);

    await gr.pruefeKeineFormatierung(page);
    await dialogePruefen();
  });
});
