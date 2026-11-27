'use strict';
// Szenarien 1, 2, 5 und 6 der User Story R00054 (Repo U): unsichtbare Zeichen in Betreff, Autor und Message stehen als
// Marke `⟨U+202E⟩` da, an jeder Stelle der Leiste, und die Kürzung halbiert keine Marke. Dazu die Gegenprobe, dass
// `GET /api/commits` die Texte roh liefert (Server unverändert). Ebene: Oberfläche gegen das echte Programm
// (Browser-Eigenes: Abschnittskopf, DOM-Länge, Rollbereich) und Integration am Endpunkt.
const { test, expect } = require('../dsl/gitreviewa.js');
const absichtSeite = require('../treiber/absicht-oberflaeche.js');

const HINWEIS = anzahl => `… (${anzahl} Zeichen nicht gezeigt)`;
const MARKE_200B = '⟨U+200B⟩';

// Die Konsole der Seite bleibt frei von `pageerror` (Auftrag): je Test gesammelt, nach dem Test geprüft.
const seitenfehler = [];
test.beforeEach(({ page }) => {
  seitenfehler.length = 0;
  page.on('pageerror', fehler => seitenfehler.push(fehler.message));
});
test.afterEach(() => {
  expect(seitenfehler, 'Seitenfehler der Konsole').toEqual([]);
});

test.describe('Commit-Leiste zeigt Marken (R00054)', () => {
  test('Szenario 1: ubidi zeigt Betreff und Autor mit Marke, die Leiste trägt kein Rohzeichen (Abnahme-Probe)', async ({ gr, page }) => {
    const repo = gr.repoUNachrichten();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.ubidi]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufZeilenWarten(page, 1);

    const [zeile] = await gr.commitDetailsLesen(page);
    expect(zeile.betreff).toBe('abc⟨U+202E⟩fed.exe');
    expect(zeile.autor).toBe('Anna⟨U+200B⟩Beispiel');
    const leiste = await page.locator('#commit-liste').textContent();
    expect(leiste).not.toMatch(/[\u202E\u200B]/);

    // Gegenprobe: der Server bleibt unverändert und liefert die Texte roh.
    const antwort = await gr.commitsAbfragen(lauf);
    expect(antwort.status).toBe(200);
    const commits = JSON.parse(antwort.koerper);
    const bidi = commits.find(commit => commit.hash === repo.hashes.ubidi);
    expect(bidi.betreff).toBe('abc\u202Efed.exe');
    expect(bidi.autor).toBe('Anna\u200BBeispiel');
  });

  test('Szenario 2: Message, Abschnittskopf, Wähler-Stand, Menü und Streifen zeigen dieselben Marken', async ({ gr, page }) => {
    const repo = gr.repoUNachrichten();
    const kurz = repo.hashes.uwege.slice(0, 7);
    const betreff = 'Start⟨U+2066⟩x⟨U+2069⟩';
    // Zwei Commits mit einer Lücke dazwischen: die Kette ist unterbrochen, der Abschnittskopf „ohne Kette“ erscheint.
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.uwege, repo.hashes.uleer]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufZeilenWarten(page, 2);

    // „Zusammen“ zuerst: Message ausklappen, Abschnittskopf „ohne Kette“ ansehen.
    await gr.commitZeileAufklappen(page);
    await gr.messageUmschalten(page, kurz);
    expect(await gr.rumpf(page, kurz).textContent()).toBe('a⟨U+202E⟩b\nc⟨U+200B⟩d\ne⟨U+E0041⟩\tf⟨U+000D⟩g');

    await gr.aufDateizeilenWarten(page, 1);
    await gr.dateiWaehlen(page, 'u.txt');
    const abschnittskopf = page.locator(`#diff .diff-abschnitt[data-commit="${repo.hashes.uwege}"] .diff-abschnitt-kopf`);
    await expect(abschnittskopf).toHaveText(`Commit ${kurz} · ${betreff}`);
    expect(await abschnittskopf.textContent()).not.toContain('\u2066');

    // Der Streifen „Absicht der KI“ zeigt Betreff und Message mit demselben Text.
    const streifenZeile = (await absichtSeite.zeilenLesen(page)).find(zeile => zeile.kurz === kurz);
    expect(streifenZeile, 'uwege im Streifen').toEqual({ kurz, betreff });
    await absichtSeite.nachrichtAufklappen(page, kurz);
    expect(await absichtSeite.rumpfText(page, kurz)).toBe('a⟨U+202E⟩b\nc⟨U+200B⟩d\ne⟨U+E0041⟩\tf⟨U+000D⟩g');

    // Danach „Einzeln“: Stand des Wählers und sein Menüeintrag tragen denselben Betreff.
    await gr.modusWaehlen(page, 'einzeln');
    await expect(page.locator('#waehler-stand')).toContainText(betreff);
    const menue = await page.locator('#waehler-auswahl option').allTextContents();
    const eintrag = menue.find(text => text.includes(kurz));
    expect(eintrag).toContain(betreff);
    expect(eintrag).not.toContain('\u2066');
  });

  test('Szenario 5: uviele trägt schon zugeklappt 20 000 Marken und liegt ausgeklappt im Rollbereich', async ({ gr, page }) => {
    test.setTimeout(120000);
    const repo = gr.repoUNachrichten();
    const kurz = repo.hashes.uviele.slice(0, 7);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.uviele]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufZeilenWarten(page, 1);

    // Schon zugeklappt (`hidden`) steht der gekürzte, markierte Text im DOM — nicht erst beim Ausklappen.
    const zugeklappt = await gr.rumpf(page, kurz).textContent();
    expect(zugeklappt).toBe(MARKE_200B.repeat(20000) + HINWEIS(5000));
    expect(zugeklappt.length).toBe(160000 + HINWEIS(5000).length);
    expect(await gr.rumpf(page, kurz).isHidden()).toBe(true);

    await gr.commitZeileAufklappen(page);
    await gr.messageUmschalten(page, kurz);
    const bildlauf = await page.locator('#commit-liste').evaluate(liste => ({
      clientHoehe: liste.clientHeight,
      scrollHoehe: liste.scrollHeight,
      ueberlauf: getComputedStyle(liste).overflowY,
    }));
    expect(bildlauf.ueberlauf).toBe('auto');
    expect(bildlauf.clientHoehe).toBeLessThanOrEqual(300);
    expect(bildlauf.scrollHoehe).toBeGreaterThan(bildlauf.clientHoehe);

    // Die Dateiliste darunter bleibt sichtbar und bedienbar.
    await expect(page.locator('#dateiliste')).toBeVisible();
    await gr.aufDateizeilenWarten(page, 1);
    await gr.dateiWaehlen(page, 'u.txt');
  });

  // R00058 (Karte #68), B5805, Kriterium 1 — Abnahme-Probe der Karte: Autor `Anna`+U+FE0F und Betreff `Gut`+U+3164 aus Repo V.
  test('R00058 Kriterium 1: die Leiste zeigt Anna⟨U+FE0F⟩ und Gut⟨U+3164⟩, kein rohes Zeichen', async ({ gr, page }) => {
    const repo = gr.repoV();
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.vsel]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufZeilenWarten(page, 1);

    const [zeile] = await gr.commitDetailsLesen(page);
    expect(zeile.autor).toBe('Anna⟨U+FE0F⟩');
    expect(zeile.betreff).toBe('Gut⟨U+3164⟩');
    const leiste = await page.locator('#commit-liste').textContent();
    expect(leiste.includes('\uFE0F')).toBe(false);
    expect(leiste.includes('\u3164')).toBe(false);
  });

  test('Szenario 6: unur hat den Knopf „Message“ mit Marke, uleer keinen', async ({ gr, page }) => {
    const repo = gr.repoUNachrichten();
    const unur = repo.hashes.unur.slice(0, 7);
    const uleer = repo.hashes.uleer.slice(0, 7);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes.unur, repo.hashes.uleer]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await gr.aufZeilenWarten(page, 2);

    await expect(gr.messageSchalter(page, unur)).toHaveCount(1);
    await expect(gr.messageSchalter(page, uleer)).toHaveCount(0);

    await gr.commitZeileAufklappen(page);
    await gr.messageUmschalten(page, unur);
    expect(await gr.rumpf(page, unur).textContent()).toBe(MARKE_200B);
  });
});