'use strict';
// Akzeptanztests R00003 (User Story Szenarien 1–14): Commit-Leiste und Dateiliste des gewählten Commits.
const fs = require('fs');
const path = require('path');
const { test, expect, kurz } = require('../dsl/gitreviewa.js');

const SUMME_P = '4 Dateien · +11 −0';
const DATEIEN_P = [
  { status: 'A', name: 'README.md', zahlen: '+2 −0', tiefe: 0 },
  { status: 'A', name: 'alt.txt', zahlen: '+4 −0', tiefe: 0 },
  { status: 'A', name: 'src/a.txt', zahlen: '+3 −0', tiefe: 0 },
  { status: 'A', name: 'src/b.txt', zahlen: '+2 −0', tiefe: 0 },
];
const STRICH = '–';

// erwartet rot, bis R00003 gebaut ist; die Markierung fällt mit dem letzten grünen Szenario
test.beforeEach(() => test.fail());

test.describe('Commit-Leiste', () => {
  for (const [zeitzone, datumQ, datumP] of [['Europe/Berlin', '05.03.2026 18:30', '04.03.2026 09:15'], ['UTC', '05.03.2026 17:30', '04.03.2026 08:15']]) {
    test.describe(`Zeitzone ${zeitzone}`, () => {
      test.use({ timezoneId: zeitzone });

      test(`Szenario 1: drei Zeilen in Aufrufreihenfolge mit Kurz-Hash, Autor und Datum in Ortszeit (${zeitzone})`, async ({ gr, page }) => {
        const repo = gr.repoMitVorbereitung();
        const lauf = await gr.gitreviewAStarten(repo, [repo.r, repo.q, repo.p]);

        await gr.oberflaecheOeffnen(page, lauf);

        await expect(gr.commitZeilen(page)).toHaveCount(3);
        const zeilen = await gr.commitDetailsLesen(page);
        expect(zeilen.map(z => [z.kurzHash, z.betreff])).toEqual([[kurz(repo.r), 'Nichts'], [kurz(repo.q), 'Dateien ändern'], [kurz(repo.p), 'Start']]);
        expect(zeilen[1]).toMatchObject({ autor: 'Bernd Beispiel', datum: datumQ, datumHinweis: '2026-03-05T18:30:00+01:00' });
        expect(zeilen[2]).toMatchObject({ autor: 'Anna Beispiel', datum: datumP, datumHinweis: '2026-03-04T09:15:00+01:00' });
      });
    });
  }

  test('Szenario 2: die Message von q ist eingeklappt, klappt mit beiden Zeilen auf und wieder zu; p bietet nichts an', async ({ gr, page }) => {
    const repo = gr.repoMitVorbereitung();
    const lauf = await gr.gitreviewAStarten(repo, [repo.r, repo.q, repo.p]);
    await gr.oberflaecheOeffnen(page, lauf);
    await expect(gr.commitZeilen(page)).toHaveCount(3);

    await expect(gr.rumpf(page, kurz(repo.q))).toBeHidden();
    await gr.messageUmschalten(page, kurz(repo.q));
    await expect(gr.rumpf(page, kurz(repo.q))).toBeVisible();
    await expect(gr.rumpf(page, kurz(repo.q))).toHaveText('Zeile eins\nZeile zwei');
    await gr.messageUmschalten(page, kurz(repo.q));
    await expect(gr.rumpf(page, kurz(repo.q))).toBeHidden();

    await expect(gr.messageSchalter(page, kurz(repo.q))).toHaveCount(1);
    await expect(gr.messageSchalter(page, kurz(repo.p))).toHaveCount(0);
    await expect(gr.messageSchalter(page, kurz(repo.r))).toHaveCount(0);
  });

  test('Szenario 3: Autor, Betreff und Rumpf mit HTML stehen als Text da, kein Dialog, nichts fett', async ({ gr, page }) => {
    const repo = gr.repoMitFremdemText({ autor: '<i>Mallory</i>', betreff: '<script>alert(1)</script>', rumpf: '<b>fett</b>' });
    let dialoge = 0;
    page.on('dialog', dialog => { dialoge += 1; dialog.dismiss(); });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf);
    await expect(gr.commitZeilen(page)).toHaveCount(1);

    await gr.messageUmschalten(page, kurz(repo.hash));

    const [zeile] = await gr.commitDetailsLesen(page);
    expect(zeile).toMatchObject({ autor: '<i>Mallory</i>', betreff: '<script>alert(1)</script>' });
    await expect(gr.rumpf(page, kurz(repo.hash))).toHaveText('<b>fett</b>');
    expect(await gr.formatierungsElementeZaehlen(page)).toBe(0);
    expect(dialoge).toBe(0);
    await page.evaluate(() => alert('Positivkontrolle'));
    expect(dialoge).toBe(1);
  });
});

test.describe('Dateiliste', () => {
  test('Szenario 4: beim Start ist p gewählt, vier Dateien A in git-Reihenfolge und die Summe', async ({ gr, page }) => {
    const repo = gr.repoMitVorbereitung();
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.q, repo.r]);

    await gr.oberflaecheOeffnen(page, lauf);

    await expect(gr.dateizeilen(page)).toHaveCount(4);
    expect(await gr.gewaehlteCommits(page)).toEqual([kurz(repo.p)]);
    expect(await gr.dateilisteLesen(page)).toEqual(DATEIEN_P);
    await expect(gr.dateiSumme(page)).toHaveText(SUMME_P);
  });

  test('Szenario 5: q zeigt M, D, R, A mit Strich bei der Binärdatei und die Summe ohne sie', async ({ gr, page }) => {
    const repo = gr.repoMitVorbereitung();
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.q, repo.r]);
    await gr.oberflaecheOeffnen(page, lauf);
    await expect(gr.dateizeilen(page)).toHaveCount(4);

    await gr.commitWaehlen(page, kurz(repo.q));

    await expect(gr.dateiSumme(page)).toHaveText('4 Dateien · +2 −5');
    expect(await gr.gewaehlteCommits(page)).toEqual([kurz(repo.q)]);
    const eintraege = await gr.dateilisteLesen(page);
    expect([...eintraege].sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      { status: 'R', name: 'LIESMICH.md', zahlen: '+0 −0', tiefe: 0 },
      { status: 'D', name: 'alt.txt', zahlen: '+0 −4', tiefe: 0 },
      { status: 'A', name: 'logo.bin', zahlen: STRICH, tiefe: 0 },
      { status: 'M', name: 'src/b.txt', zahlen: '+2 −1', tiefe: 0 },
    ]);
  });

  test('Szenario 6: der leere Commit r zeigt „Keine Dateien geändert“', async ({ gr, page }) => {
    const repo = gr.repoMitVorbereitung();
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.q, repo.r]);
    await gr.oberflaecheOeffnen(page, lauf);
    await expect(gr.dateizeilen(page)).toHaveCount(4);

    await gr.commitWaehlen(page, kurz(repo.r));

    await expect(gr.dateilistenMeldung(page)).toHaveText('Keine Dateien geändert');
    await expect(gr.dateizeilen(page)).toHaveCount(0);
  });

  test('Szenario 7: Pfade mit Umlaut, Leerzeichen und spitzen Klammern stehen als Text da', async ({ gr, page }) => {
    const repo = gr.repoMitDateien({ 'ä ö.txt': 'eins\n', '<b>fett</b>.txt': 'zwei\n' });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);

    await gr.oberflaecheOeffnen(page, lauf);

    await expect(gr.dateizeilen(page)).toHaveCount(2);
    const eintraege = await gr.dateilisteLesen(page);
    expect([...eintraege].sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      { status: 'A', name: '<b>fett</b>.txt', zahlen: '+1 −0', tiefe: 0 },
      { status: 'A', name: 'ä ö.txt', zahlen: '+1 −0', tiefe: 0 },
    ]);
    expect(await gr.formatierungsElementeZaehlen(page)).toBe(0);
  });

  test('Szenario 8: Baum ordnet Ordner vor Dateien, bleibt beim Commit-Wechsel, flach zeigt wieder volle Pfade', async ({ gr, page }) => {
    const repo = gr.repoMitVorbereitung();
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.q, repo.r]);
    await gr.oberflaecheOeffnen(page, lauf);
    await expect(gr.dateizeilen(page)).toHaveCount(4);
    await gr.commitWaehlen(page, kurz(repo.q));
    await expect(gr.dateiSumme(page)).toHaveText('4 Dateien · +2 −5');

    await gr.darstellungWaehlen(page, 'baum');
    expect((await gr.dateilisteLesen(page)).map(e => [e.name, e.tiefe])).toEqual([
      ['src', 0], ['b.txt', 1], ['alt.txt', 0], ['LIESMICH.md', 0], ['logo.bin', 0],
    ]);
    expect((await gr.dateilisteLesen(page))[0].ordner).toBe(true);

    await gr.commitWaehlen(page, kurz(repo.p));
    await expect(gr.dateiSumme(page)).toHaveText(SUMME_P);
    expect((await gr.dateilisteLesen(page)).map(e => [e.name, e.tiefe])).toEqual([
      ['src', 0], ['a.txt', 1], ['b.txt', 1], ['alt.txt', 0], ['README.md', 0],
    ]);

    await gr.darstellungWaehlen(page, 'flach');
    expect(await gr.dateilisteLesen(page)).toEqual(DATEIEN_P);
  });

  test('Szenario 9: genau eine Datei ist gewählt, der Commit-Wechsel hebt die Wahl auf, das Ereignis nennt Commit und Pfad', async ({ gr, page }) => {
    const repo = gr.repoMitVorbereitung();
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.q, repo.r]);
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.dateiwahlenSammeln(page);
    await expect(gr.dateizeilen(page)).toHaveCount(4);
    await gr.commitWaehlen(page, kurz(repo.q));
    await expect(gr.dateiSumme(page)).toHaveText('4 Dateien · +2 −5');
    expect(await gr.gewaehlteDateien(page)).toEqual([]);

    await gr.dateiWaehlen(page, 'src/b.txt');
    expect(await gr.gewaehlteDateien(page)).toEqual(['src/b.txt']);
    await gr.dateiWaehlen(page, 'LIESMICH.md');
    expect(await gr.gewaehlteDateien(page)).toEqual(['LIESMICH.md']);
    await gr.commitWaehlen(page, kurz(repo.p));
    await expect(gr.dateiSumme(page)).toHaveText(SUMME_P);
    expect(await gr.gewaehlteDateien(page)).toEqual([]);

    expect(await gr.gesammelteDateiwahlen(page)).toEqual([
      { commit: repo.q, pfad: 'src/b.txt', status: 'M', alterPfad: null },
      { commit: repo.q, pfad: 'LIESMICH.md', status: 'R', alterPfad: 'README.md' },
    ]);
  });

  test('Szenario 9, Baum: auch im Baum ist genau die angeklickte Datei gewählt', async ({ gr, page }) => {
    const repo = gr.repoMitVorbereitung();
    const lauf = await gr.gitreviewAStarten(repo, [repo.p]);
    await gr.oberflaecheOeffnen(page, lauf);
    await expect(gr.dateizeilen(page)).toHaveCount(4);
    await gr.darstellungWaehlen(page, 'baum');

    await gr.dateiWaehlen(page, 'b.txt');

    expect(await gr.gewaehlteDateien(page)).toEqual(['b.txt']);
  });

  test('späte Antwort: wechselt man vor der Antwort zu einem anderen Commit, zeigt die Liste dessen Dateien', async ({ gr, page }) => {
    const repo = gr.repoMitVorbereitung();
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.q]);
    let antwortQFreigeben;
    const antwortQFrei = new Promise(frei => { antwortQFreigeben = frei; });
    await page.route(`**/api/commits/${repo.q}/dateien`, async route => {
      await antwortQFrei;
      await route.continue();
    });
    await gr.oberflaecheOeffnen(page, lauf);
    await expect(gr.dateiSumme(page)).toHaveText(SUMME_P);

    await gr.commitWaehlen(page, kurz(repo.q));
    await gr.commitWaehlen(page, kurz(repo.p));
    await expect(gr.dateiSumme(page)).toHaveText(SUMME_P);
    const antwortQ = page.waitForResponse(`**/api/commits/${repo.q}/dateien`);
    antwortQFreigeben();
    await antwortQ;
    await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));

    await expect(gr.dateiSumme(page)).toHaveText(SUMME_P);
    expect(await gr.gewaehlteCommits(page)).toEqual([kurz(repo.p)]);
    expect(await gr.dateilisteLesen(page)).toEqual(DATEIEN_P);
  });
});

test.describe('Laden und Eingabe an git', () => {
  test('Szenario 10: die Dateiliste wird erst bei Auswahl gelesen, eine Debug-Zeile und ein git-Aufruf je gewähltem Commit', async ({ gr, page }) => {
    const repo = gr.repoMitVorbereitung();
    const zaehler = gr.gitZaehler();
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.q, repo.r], { zusatz: ['--verbose'], pfadVorne: zaehler.ordner });
    const dateienZeilen = hash => gr.stderrZeilen(lauf).filter(zeile => zeile.includes(`GET /api/commits/${hash}/dateien`));

    await gr.oberflaecheOeffnen(page, lauf);
    await expect(gr.dateizeilen(page)).toHaveCount(4);
    await expect.poll(() => dateienZeilen(repo.p).length).toBe(1);
    expect(zaehler.aufrufe().length).toBe(2);

    await gr.commitWaehlen(page, kurz(repo.q));
    await expect(gr.dateiSumme(page)).toHaveText('4 Dateien · +2 −5');

    await expect.poll(() => dateienZeilen(repo.p).length + dateienZeilen(repo.q).length).toBe(2);
    expect(dateienZeilen(repo.r)).toHaveLength(0);
    expect(zaehler.aufrufe().length).toBe(3);
    expect(zaehler.aufrufe().filter(aufruf => aufruf.includes(' show '))).toHaveLength(2);
  });

  test('Szenario 11: HEAD, eine Option, ein nicht übergebener und ein kurzer Hash enden mit 404 ohne git', async ({ gr }) => {
    const repo = gr.repoMitVorbereitung();
    const zaehler = gr.gitZaehler();
    const lauf = await gr.gitreviewAStarten(repo, [repo.p], { pfadVorne: zaehler.ordner });
    const aufrufeNachStart = zaehler.aufrufe().length;

    for (const fremd of ['HEAD', '--output=pwn', repo.q, kurz(repo.p)]) {
      expect((await gr.dateienAbfragen(lauf, fremd)).status, fremd).toBe(404);
    }

    expect(zaehler.aufrufe().length).toBe(aufrufeNachStart);
    expect(fs.existsSync(path.join(repo.ordner, 'pwn'))).toBe(false);
    expect((await gr.dateienAbfragen(lauf, repo.p)).status).toBe(200);
    expect(zaehler.aufrufe().length).toBe(aufrufeNachStart + 1);
  });

  test('Szenario 12: fehlt das Objekt von q, meldet die Dateiliste den Fehler, die Leiste bleibt bedienbar', async ({ gr, page }) => {
    const repo = gr.repoMitVorbereitung();
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.q]);
    await gr.oberflaecheOeffnen(page, lauf);
    await expect(gr.dateizeilen(page)).toHaveCount(4);
    gr.commitObjektEntfernen(repo, repo.q);

    await gr.commitWaehlen(page, kurz(repo.q));
    await expect(gr.dateilistenMeldung(page)).toHaveText('Dateien konnten nicht gelesen werden');
    await expect(gr.dateizeilen(page)).toHaveCount(0);

    await gr.commitWaehlen(page, kurz(repo.p));
    await expect(gr.dateizeilen(page)).toHaveCount(4);
    expect(await gr.dateilisteLesen(page)).toEqual(DATEIEN_P);

    await page.reload();
    await expect(gr.commitZeilen(page)).toHaveCount(2);
    expect(gr.stderrZeilen(lauf).filter(zeile => zeile.includes(' FEHLER ') && zeile.includes(repo.q))).toHaveLength(1);
    expect(lauf.stdout).toBe('');
  });
});

test.describe('Lastprofil', () => {
  test('Szenario 13: 200 Commits mit Autor und Rumpf stehen spätestens 2 s nach dem Prozessstart, ein git-Aufruf', async ({ gr, page }) => {
    const repo = gr.repoMitVielenCommits(200);
    const zaehler = gr.gitZaehler();
    await page.goto('about:blank');

    const lauf = await gr.gitreviewAStarten(repo, repo.hashes, { pfadVorne: zaehler.ordner });
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.aufZeilenWarten(page, 200);
    const dauerMs = Date.now() - lauf.gestartetUmMs;

    test.info().annotations.push({ type: 'Messwert', description: `200 Zeilen nach ${dauerMs} ms (Grenze 2000 ms)` });
    console.log(`Messwert Szenario 13: 200 Zeilen sichtbar nach ${dauerMs} ms`);
    expect(dauerMs).toBeLessThanOrEqual(2000);
    const zeilen = await gr.commitDetailsLesen(page);
    expect(zeilen[199]).toMatchObject({ kurzHash: kurz(repo.hashes[199]), betreff: 'Commit Nummer 200', autor: 'Autor 200' });
    expect(zaehler.aufrufe().filter(aufruf => aufruf.includes(' log '))).toHaveLength(1);
  });

  test('Szenario 14: 2 000 Dateien stehen spätestens 1 s nach dem Klick, Summe „2000 Dateien · +2000 −0“', async ({ gr, page }) => {
    const repo = gr.repoMitGrossemCommit(2000);
    const lauf = await gr.gitreviewAStarten(repo, [repo.p, repo.u]);
    await gr.oberflaecheOeffnen(page, lauf);
    await gr.aufDateizeilenWarten(page, 1);

    const klickUmMs = Date.now();
    await gr.commitWaehlen(page, kurz(repo.u));
    await gr.aufDateizeilenWarten(page, 2000);
    const dauerMs = Date.now() - klickUmMs;

    test.info().annotations.push({ type: 'Messwert', description: `2000 Dateizeilen nach ${dauerMs} ms (Grenze 1000 ms)` });
    console.log(`Messwert Szenario 14: 2000 Dateizeilen sichtbar nach ${dauerMs} ms`);
    expect(dauerMs).toBeLessThanOrEqual(1000);
    await expect(gr.dateiSumme(page)).toHaveText('2000 Dateien · +2000 −0');
  });
});
