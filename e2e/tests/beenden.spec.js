'use strict';
const { test, expect } = require('../dsl/gitreviewa.js');

const UEBERSCHRIFT = '# Ergebnis manueller Review';
const LEERES_ERGEBNIS = `${UEBERSCHRIFT}\n\nKeine Anmerkungen.\n`;
const BEENDEN_FRIST_MS = 1000;

function anzahlZeilen(text, zeile) {
  return text.split('\n').filter(z => z === zeile).length;
}

test.describe('Beenden mit Ergebnis', () => {
  test('US-1: Beenden in der Oberfläche ohne Anmerkungen — Meldung, leeres Ergebnis, Exit 0', async ({ gr, page }) => {
    test.fail(true, 'erwartet rot: B0107 Knopf noch nicht gebaut');
    const repo = gr.repoMitCommits();
    const [a, b] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a, b]);
    await gr.oberflaecheOeffnen(page, lauf);

    await gr.beendenBetaetigen(page);

    await expect(gr.beendetMeldung(page)).toBeVisible();
    await expect(gr.beendenKnopf(page)).toHaveCount(0);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toBe(LEERES_ERGEBNIS);
  });

  test('US-2: zwei Anmerkungen — Nummern 1 und 2, Ergebnis Byte für Byte, Exit 0', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a, b] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a, b]);

    const erste = await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'src/Foo.cs', zeile: 42, text: 'Null-Prüfung fehlt' });
    const zweite = await gr.anmerkungAnlegen(lauf, { commit: b, datei: 'README.md', text: 'Abschnitt Installation veraltet' });
    const beenden = await gr.beendenAnfordern(lauf);

    expect([erste.status, erste.nummer]).toEqual([201, 1]);
    expect([zweite.status, zweite.nummer]).toEqual([201, 2]);
    expect(beenden.status).toBe(200);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toBe([
      UEBERSCHRIFT, '', 'Anmerkungen: 2', '',
      '## 1. src/Foo.cs:42', '', `Commit: ${a}`, '', '> Null-Prüfung fehlt', '',
      '## 2. README.md (ganze Datei)', '', `Commit: ${b}`, '', '> Abschnitt Installation veraltet', '',
    ].join('\n'));
  });

  test('US-3: mehrzeiliger Text steht als Zitat und erzeugt keine Überschrift', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a]);

    await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'src/Foo.cs', zeile: 1, text: 'Zeile 1\n\n## Fertig' });
    await gr.beendenAnfordern(lauf);

    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    const zeilen = gr.ergebnis(lauf).split('\n');
    expect(zeilen.slice(-4)).toEqual(['> Zeile 1', '>', '> ## Fertig', '']);
    expect(zeilen.filter(zeile => zeile.startsWith('# '))).toEqual([UEBERSCHRIFT]);
    expect(zeilen.filter(zeile => zeile.startsWith('## '))).toEqual(['## 1. src/Foo.cs:1']);
  });

  test('US-5: stdout trägt nur das Ergebnis, Meldungen stehen auf stderr', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a], { zusatz: ['--verbose'] });

    await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'datei.txt', zeile: 1, text: 'Prüfen: größer ≥ 3' });
    await gr.beendenAnfordern(lauf);

    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toBe([
      UEBERSCHRIFT, '', 'Anmerkungen: 1', '', '## 1. datei.txt:1', '', `Commit: ${a}`, '', '> Prüfen: größer ≥ 3', '',
    ].join('\n'));
    expect(lauf.stderr).toContain(lauf.adresse);
    expect(lauf.stderr).toMatch(/DEBUG \[Anfrage\] POST \/api\/beenden/);
  });

  test('US-6: doppeltes Beenden — Ergebnis genau einmal, Exit 0', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a]);
    await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'datei.txt', zeile: 1, text: 'eine Anmerkung' });

    const antworten = await Promise.allSettled([gr.beendenAnfordern(lauf), gr.beendenAnfordern(lauf)]);

    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(antworten.filter(antwort => antwort.status === 'fulfilled' && antwort.value.status === 200).length).toBeGreaterThanOrEqual(1);
    expect(anzahlZeilen(gr.ergebnis(lauf), UEBERSCHRIFT)).toBe(1);
    expect(anzahlZeilen(gr.ergebnis(lauf), '## 1. datei.txt:1')).toBe(1);
  });

  test('US-7: 500 Anmerkungen zu je 200 Zeichen — Prozessende höchstens 1 s nach der Anforderung', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a, b] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a, b]);
    for (let nummer = 1; nummer <= 500; nummer += 1) {
      let commit = a;
      if (nummer % 2 === 0) {
        commit = b;
      }
      const text = `Anmerkung ${nummer} `.padEnd(200, 'x');
      const angelegt = await gr.anmerkungAnlegen(lauf, { commit, datei: 'datei.txt', zeile: nummer, text });
      expect(angelegt.status).toBe(201);
    }

    const { dauerMs, antwort } = await gr.beendenUndDauerMessen(lauf);

    const messwert = `Beenden bis Prozessende bei 500 Anmerkungen: ${Math.round(dauerMs)} ms`;
    test.info().annotations.push({ type: 'Messwert', description: messwert });
    console.log(`Messwert ${messwert}`);
    expect(antwort.status).toBe(200);
    expect(lauf.exitCode).toBe(0);
    expect(dauerMs).toBeLessThanOrEqual(BEENDEN_FRIST_MS);
    const ueberschriften = gr.ergebnis(lauf).split('\n').filter(zeile => zeile.startsWith('## '));
    expect(ueberschriften).toEqual(Array.from({ length: 500 }, (_, index) => `## ${index + 1}. datei.txt:${index + 1}`));
  });

  test('US-8: ungültige Anmerkungen werden mit 400 abgelehnt, 10 000 Zeichen angenommen', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a, b, c] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a, b]);
    const gueltig = { commit: a, datei: 'src/Foo.cs', zeile: 42, text: 'gültig' };
    const ungueltige = [
      { ...gueltig, commit: c },
      { ...gueltig, commit: a.slice(0, 7) },
      { ...gueltig, datei: '' },
      { ...gueltig, zeile: 0 },
      { ...gueltig, zeile: -1 },
      { ...gueltig, text: '' },
      { ...gueltig, text: '   ' },
      { ...gueltig, text: 'x'.repeat(10001) },
      { ...gueltig, datei: 'src/Foo.cs\n## 9. boese' },
    ];

    for (const anmerkung of ungueltige) {
      const antwort = await gr.anmerkungAnlegen(lauf, anmerkung);
      expect(antwort.status, JSON.stringify(anmerkung).slice(0, 80)).toBe(400);
      expect(antwort.meldung, JSON.stringify(anmerkung).slice(0, 80)).toBeTruthy();
    }
    const grenze = await gr.anmerkungAnlegen(lauf, { ...gueltig, text: 'y'.repeat(10000) });
    await gr.beendenAnfordern(lauf);

    expect([grenze.status, grenze.nummer]).toEqual([201, 1]);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toContain('Anmerkungen: 1\n');
    expect(gr.ergebnis(lauf)).toContain(`> ${'y'.repeat(10000)}\n`);
  });

  test('US-9: Anlegen nach dem Beenden — 409 oder keine Verbindung, nie im Ergebnis', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a]);

    await gr.beendenAnfordern(lauf);
    let status = 'keine Verbindung';
    try {
      status = (await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'datei.txt', zeile: 1, text: 'zu spät' })).status;
    } catch {
      // Server schon gestoppt: Verbindung verweigert ist laut US-9 zulässig
    }

    expect([409, 'keine Verbindung']).toContain(status);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toBe(LEERES_ERGEBNIS);
  });

  test('US-10: fremder Origin und fremder Host werden mit 403 abgelehnt, ohne Origin angenommen', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a]);
    await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'datei.txt', zeile: 1, text: 'vorhanden' });
    const fremd = { commit: a, datei: 'datei.txt', zeile: 2, text: 'fremd' };

    const antworten = [
      await gr.anmerkungAnlegen(lauf, fremd, { origin: 'http://evil.example' }),
      await gr.beendenAnfordern(lauf, { origin: 'http://evil.example' }),
      await gr.anmerkungAnlegen(lauf, fremd, { host: 'evil.example' }),
      await gr.beendenAnfordern(lauf, { host: 'evil.example' }),
    ];

    expect(antworten.map(antwort => antwort.status)).toEqual([403, 403, 403, 403]);
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(gr.ergebnis(lauf)).toBe('');
    expect((await gr.beendenAnfordern(lauf)).status).toBe(200);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toContain('Anmerkungen: 1\n');
    expect(gr.ergebnis(lauf)).not.toContain('fremd');
  });

  test('US-10 (c): eine Seite auf localhost:<anderer Port> kann weder anlegen noch beenden', async ({ gr, page }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a]);
    await gr.anmerkungAnlegen(lauf, { commit: a, datei: 'datei.txt', zeile: 1, text: 'vorhanden' });
    const anmerkung = JSON.stringify({ commit: a, datei: 'datei.txt', zeile: 2, text: 'von fremder Seite' });
    const seite = await gr.fremdeSeite(lauf, `
      window.ergebnisse = [];
      async function versuche(pfad, optionen) {
        try {
          const antwort = await fetch(ZIEL + pfad, { method: 'POST', ...optionen });
          window.ergebnisse.push(antwort.type + ':' + antwort.status);
        } catch {
          window.ergebnisse.push('fehler');
        }
      }
      (async () => {
        await versuche('api/anmerkungen', { headers: { 'Content-Type': 'application/json' }, body: ${JSON.stringify(anmerkung)} });
        await versuche('api/beenden', { headers: { 'Content-Type': 'application/json' }, body: '{}' });
        await versuche('api/anmerkungen', { mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: ${JSON.stringify(anmerkung)} });
        await versuche('api/beenden', { mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
        window.fertig = true;
      })();`);
    const statusDerAntworten = [];
    page.on('response', antwort => {
      const istAnfrageAnDenLauf = antwort.url().startsWith(lauf.adresse);
      if (istAnfrageAnDenLauf) {
        statusDerAntworten.push(antwort.status());
      }
    });

    await page.goto(seite.adresse);
    await page.waitForFunction(() => window.fertig === true);

    expect(await page.evaluate(() => window.ergebnisse)).toEqual(['fehler', 'fehler', 'opaque:0', 'opaque:0']);
    expect(statusDerAntworten.length).toBeGreaterThanOrEqual(2);
    expect(statusDerAntworten.every(status => status === 403)).toBe(true);
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(gr.ergebnis(lauf)).toBe('');
    await gr.beendenAnfordern(lauf);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toContain('Anmerkungen: 1\n');
    expect(gr.ergebnis(lauf)).not.toContain('von fremder Seite');
  });

  test('US-11: Beenden per GET 405, ohne oder mit falschem Inhaltstyp 415 — der Lauf geht weiter', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const [a] = repo.hashes;
    const lauf = await gr.gitreviewAStarten(repo, [a]);
    const anmerkung = { commit: a, datei: 'datei.txt', zeile: 1, text: 'falsche Art' };

    const perGet = await gr.beendenAnfordern(lauf, { methode: 'GET', inhaltstyp: null });
    const ohneInhaltstyp = [
      await gr.beendenAnfordern(lauf, { inhaltstyp: null }),
      await gr.anmerkungAnlegen(lauf, anmerkung, { inhaltstyp: null }),
    ];
    const mitTextPlain = [
      await gr.beendenAnfordern(lauf, { inhaltstyp: 'text/plain' }),
      await gr.anmerkungAnlegen(lauf, anmerkung, { inhaltstyp: 'text/plain' }),
    ];

    expect(perGet.status).toBe(405);
    expect(ohneInhaltstyp.map(antwort => antwort.status)).toEqual([415, 415]);
    expect(mitTextPlain.map(antwort => antwort.status)).toEqual([415, 415]);
    expect(gr.laeuftNoch(lauf)).toBe(true);
    expect(gr.ergebnis(lauf)).toBe('');
    await gr.beendenAnfordern(lauf);
    expect(await gr.aufEndeWarten(lauf)).toBe(0);
    expect(gr.ergebnis(lauf)).toBe(LEERES_ERGEBNIS);
  });
});
