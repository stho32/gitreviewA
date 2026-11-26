'use strict';
// Szenarien 1, 4, 5 und 7 der User Story R00051: die Commit-Leiste kürzt lange Nachrichten sichtbar, Betreff und Autor
// ebenfalls (Repo K). Dazu die Gegenprobe: `GET /api/commits` liefert die 8 000 000 Zeichen von `kgross` ganz — der
// Server bleibt unverändert (PO 257). Ebene: Oberfläche gegen das echte Programm; nur Browser-Eigenes.
const { test, expect } = require('../dsl/gitreviewa.js');
const { anzeigeSchrankeMs, einfrierSchrankeMs, erwarteBinnenAnzeigeSchranke, erwarteUnterEinfrierSchranke } = require('../dsl/schranken.js');
const absichtSeite = require('../treiber/absicht-oberflaeche.js');

const HINWEIS = anzahl => `… (${anzahl} Zeichen nicht gezeigt)`;

// Die Konsole der Seite bleibt frei von `pageerror` (Auftrag): je Test gesammelt, nach dem Test geprüft.
const seitenfehler = [];
test.beforeEach(({ page }) => {
  seitenfehler.length = 0;
  page.on('pageerror', fehler => seitenfehler.push(fehler.message));
});
test.afterEach(() => {
  expect(seitenfehler, 'Seitenfehler der Konsole').toEqual([]);
});

/** Liest die Länge des Textes eines Elements, auch wenn es zugeklappt (`hidden`) ist. */
function textLaenge(locator) {
  return locator.evaluate(element => element.textContent.length);
}

test.describe('Commit-Leiste kürzt lange Nachrichten (R00051)', () => {
  test('Szenario 1: k25 zeigt in „Zusammen“ 20 000 Zeichen und den Hinweis', async ({ gr, page }) => {
    const repo = gr.repoKNachrichten();
    const kurz = repo.hashes.k25.slice(0, 7);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.k25]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufZeilenWarten(page, 1);

    // DOM-Länge schon zugeklappt: der Rumpf steht gekürzt im DOM, nicht erst beim Aufklappen.
    const laengeZugeklappt = await textLaenge(gr.rumpf(page, kurz));
    expect(laengeZugeklappt).toBeLessThanOrEqual(20000 + HINWEIS(5000).length);
    expect(laengeZugeklappt).toBeGreaterThan(20000);

    await gr.commitZeileAufklappen(page);
    await gr.messageUmschalten(page, kurz);

    const text = await gr.rumpf(page, kurz).textContent();
    expect(text).toBe('x'.repeat(20000) + HINWEIS(5000));
    expect(await gr.fremdElementeInDerLeiste(page)).toBe(0);
  });

  test('Szenario 1 (Einzeln): dieselbe Kürzung im Modus „Einzeln“', async ({ gr, page }) => {
    const repo = gr.repoKNachrichten();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.k25]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await gr.aufZeilenWarten(page, 1);
    const kurz = repo.hashes.k25.slice(0, 7);
    await gr.messageUmschalten(page, kurz);
    expect(await gr.rumpf(page, kurz).textContent()).toBe('x'.repeat(20000) + HINWEIS(5000));
  });

  test('Szenario 4: kr nennt in Leiste und Absicht-Streifen dieselbe Zahl, die Leiste ohne Steuerzeichen', async ({ gr, page }) => {
    const repo = gr.repoKNachrichten();
    const kurz = repo.hashes.kr.slice(0, 7);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.kr]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufZeilenWarten(page, 1);

    await gr.commitZeileAufklappen(page);
    await gr.messageUmschalten(page, kurz);
    const leiste = await gr.rumpf(page, kurz).textContent();
    expect(leiste).toBe('a'.repeat(19999) + HINWEIS(10));
    expect(leiste).not.toContain('\u202E');

    await gr.aufDateizeilenWarten(page, 1);
    await gr.dateiWaehlen(page, 'k.txt');
    if (await absichtSeite.mehrKnopf(page).count() > 0) {
      await absichtSeite.mehrBetatigen(page);
    }
    await absichtSeite.nachrichtAufklappen(page, kurz);
    const streifen = await absichtSeite.rumpfText(page, kurz);

    expect(streifen).toBe('a'.repeat(19999) + '⟨U+202E⟩' + HINWEIS(10));
    expect(streifen).toContain('⟨U+202E⟩');
    expect(streifen).toContain(HINWEIS(10));
  });

  test('Szenario 5: khtml zeigt Auszeichnung als Text, kein Dialog, kein Bild', async ({ gr, page }) => {
    const repo = gr.repoKNachrichten();
    const kurz = repo.hashes.khtml.slice(0, 7);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.khtml]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufZeilenWarten(page, 1);

    await gr.commitZeileAufklappen(page);
    await gr.messageUmschalten(page, kurz);

    const text = await gr.rumpf(page, kurz).textContent();
    expect(text).toBe('x'.repeat(19997) + '<b>' + HINWEIS(36));
    expect(await gr.fremdElementeInDerLeiste(page)).toBe(0);
    expect(await gr.formatierungsElementeZaehlen(page)).toBe(0);
  });

  test('Szenario 7: kgross friert nichts ein, die Leiste bleibt bedienbar', async ({ gr, page }) => {
    test.setTimeout(120000);
    const repo = gr.repoKNachrichten();
    const kurz = repo.hashes.kgross.slice(0, 7);

    // Beobachter vor dem Laden anmelden, damit auch die Lade-Aufgaben des Hauptfadens gesehen werden.
    await page.addInitScript(() => {
      window.__langeAufgaben = [];
      new PerformanceObserver(liste => {
        for (const eintrag of liste.getEntries()) window.__langeAufgaben.push(eintrag.duration);
      }).observe({ entryTypes: ['longtask'] });
    });

    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.kgross]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufZeilenWarten(page, 1);
    const dauerMs = Date.now() - lauf.gestartetUmMs;
    erwarteBinnenAnzeigeSchranke(dauerMs, 'Leiste mit 8 000 000 Zeichen');
    const laengsteBeimLaden = await page.evaluate(() => Math.max(0, ...window.__langeAufgaben));
    erwarteUnterEinfrierSchranke(laengsteBeimLaden, `längste Aufgabe beim Laden (${laengsteBeimLaden} ms)`);

    await page.evaluate(() => { window.__langeAufgaben = []; });
    const start = Date.now();
    await gr.commitZeileAufklappen(page);
    await gr.messageUmschalten(page, kurz);
    const text = await gr.rumpf(page, kurz).textContent();
    const dauerAufklappen = Date.now() - start;
    erwarteBinnenAnzeigeSchranke(dauerAufklappen, 'Aufklappen der 8 000 000 Zeichen');
    const laengsteBeimAufklappen = await page.evaluate(() => Math.max(0, ...window.__langeAufgaben));
    erwarteUnterEinfrierSchranke(laengsteBeimAufklappen, `längste Aufgabe beim Aufklappen (${laengsteBeimAufklappen} ms)`);

    expect(text).toBe('x'.repeat(20000) + HINWEIS(7980000));

    // Die Commit-Liste hat ihren eigenen Bildlauf (300 px), die Dateiliste bleibt sichtbar und bedienbar.
    const bildlauf = await page.locator('#commit-liste').evaluate(liste => ({
      clientHoehe: liste.clientHeight,
      scrollHoehe: liste.scrollHeight,
      ueberlauf: getComputedStyle(liste).overflowY,
    }));
    expect(bildlauf.scrollHoehe).toBeGreaterThan(bildlauf.clientHoehe);
    expect(bildlauf.ueberlauf).toBe('auto');
    expect(bildlauf.clientHoehe).toBeLessThanOrEqual(300);

    await expect(page.locator('#dateiliste')).toBeVisible();
    await gr.aufDateizeilenWarten(page, 1);
    await gr.dateiWaehlen(page, 'k.txt');
  });

  test('Gegenprobe: GET /api/commits liefert die 8 000 000 Zeichen von kgross ganz', async ({ gr }) => {
    test.setTimeout(120000);
    const repo = gr.repoKNachrichten();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.kgross]);
    const antwort = await gr.commitsAbfragen(lauf);
    expect(antwort.status).toBe(200);
    const commits = JSON.parse(antwort.koerper);
    const gross = commits.find(commit => commit.hash === repo.hashes.kgross);
    expect(gross).toBeDefined();
    expect(gross.rumpf.length).toBe(8000000);
    expect(gross.rumpf).toBe('x'.repeat(8000000));
  });
});
