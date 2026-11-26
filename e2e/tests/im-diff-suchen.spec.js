'use strict';
// Spezifikation R00027 „Im Diff suchen“ — Suchfeld und Zähler (B2604) am echten Programm (Browser-Eigenes: Feld, Fokus, Tasten).
// Gesucht wird nur in der gezeigten Datei, wörtlich; die Rechnung selbst prüfen die Bausteintests (suche-werte.spec.js).
const { test, expect } = require('../dsl/gitreviewa.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const repos = require('../treiber/wegwerf-repo.js');
const { SUCHE_TXT, FREMD_TXT, FARBIG_JS, nummernZeilen, dateiUndWarten } = require('../dsl/suche.js');
const { anzeigeSchrankeMs, einfrierSchrankeMs, erwarteBinnenAnzeigeSchranke, erwarteUnterEinfrierSchranke } = require('../dsl/schranken.js');

async function repoY(gr) {
  return gr.repoMitDateien({ 'suche.txt': SUCHE_TXT });
}

/** Wählt `suche.txt` und wartet, bis ihr Diff gezeichnet ist (7 Zeilen und ein Hunk-Kopf). */
async function sucheTxtWaehlen(page, gr) {
  return dateiUndWarten(page, gr, 'suche.txt', 8);
}

test.describe('Im Diff suchen (R00027) — Suchfeld und Zähler (B2604)', () => {
  test('soll ein beschriftetes, per Tab erreichbares Suchfeld im Werkzeugkasten haben', async ({ gr, page }) => {
    const repo = await repoY(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await sucheTxtWaehlen(page, gr);

    await expect(gr.sucheFeld(page)).toBeVisible();
    await expect(gr.sucheFeld(page)).toHaveAccessibleName(/^Suchen/);
    await page.locator('#ansicht-knopf').focus();
    await page.keyboard.press('Shift+Tab');
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

test.describe('Im Diff suchen (R00027) — Anschluss an Färbung, Wechsel und Grenzen (B2606)', () => {
  test('soll beim Wechsel der Datei die Treffer neu rechnen und den Begriff behalten (Szenario 4)', async ({ gr, page }) => {
    const repo = gr.repoMitDateien({ 'suche.txt': SUCHE_TXT, 'fremd.txt': FREMD_TXT });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await sucheTxtWaehlen(page, gr);

    await gr.sucheSuchen(page, 'zwei');
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 4');

    await dateiUndWarten(page, gr, 'fremd.txt', 3);
    await expect(gr.sucheFeld(page)).toHaveValue('zwei');
    await expect(gr.sucheZaehler(page)).toHaveText('keine Treffer');
    await expect(gr.sucheMarken(page)).toHaveCount(0);

    await sucheTxtWaehlen(page, gr);
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 4');
    await expect(gr.sucheMarken(page)).toHaveCount(4);
  });

  test('soll die Markierung nach dem Ende der Färbung erneut auftragen und die Färbung nicht brechen (Szenario 9 und 10)', async ({ gr, page }) => {
    const repo = gr.repoMitDateien({ 'farbig.js': FARBIG_JS });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await dateiUndWarten(page, gr, 'farbig.js', 3);
    await expect.poll(() => diffSeite.warteAufFarbe(page)).toBe('ja');

    await gr.sucheSuchen(page, 'return');
    await expect(gr.sucheMarken(page)).toHaveCount(2);
    const traegtFarbe = await gr.sucheMarken(page).first().evaluate(mark => {
      const farbElement = mark.closest('[class*="tk-"]') || mark.querySelector('[class*="tk-"]');
      return Boolean(farbElement) && mark.textContent === 'return';
    });
    expect(traegtFarbe, 'die markierte Stelle trägt weiter ihre Farbrolle (tk-)').toBe(true);

    await page.evaluate(() => {
      window.__zeichnet = 0;
      document.addEventListener('diff-gezeichnet', () => {
        window.__zeichnet += 1;
      });
    });
    await gr.dateiWaehlen(page, 'farbig.js');
    await page.waitForFunction(() => window.__zeichnet >= 1, undefined, { timeout: 10000, polling: 'raf' });
    await expect.poll(() => page.locator('#diff .df-sc').getAttribute('data-farbe'), { timeout: 15000 }).toBe('ja');
    await expect(gr.sucheMarken(page)).toHaveCount(2);
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 2');
  });

  test('soll eine zugeklappte große Datei nicht durchsuchen und nach „Trotzdem laden“ Treffer finden (Szenario 5)', async ({ gr, page }) => {
    const repo = gr.repoMitDateien({ 'riesig.txt': nummernZeilen(30000, 'zeile') });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await gr.dateiWaehlen(page, 'riesig.txt');
    await diffSeite.pruefeZugeklappt(page, 'riesig.txt', 'Sehr lang: 30.000 Zeilen — zugeklappt');

    await gr.sucheSuchen(page, 'zeile');
    await expect(gr.sucheZaehler(page)).toHaveText('keine Treffer');
    await expect(gr.sucheMarken(page)).toHaveCount(0);

    await diffSeite.trotzdemLaden(page);
    await expect(page.locator('#diff .df-sc tr[data-art]')).toHaveCount(30001);
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 10000+');
    await expect(gr.sucheMarken(page)).toHaveCount(10000);
  });

  test('soll eine späte Antwort einer früheren Wahl verwerfen (Szenario 11, verzögerter Diff)', async ({ gr, page }) => {
    const repo = gr.repoMitDateien({ 'suche.txt': SUCHE_TXT, 'fremd.txt': FREMD_TXT });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    const verzoegert = await diffSeite.diffAntwortVerzoegern(page, 'suche.txt');

    await gr.dateiWaehlen(page, 'suche.txt');
    await dateiUndWarten(page, gr, 'fremd.txt', 3);
    await gr.sucheSuchen(page, 'zwei');
    await expect(gr.sucheZaehler(page)).toHaveText('keine Treffer');

    await verzoegert.eingetroffen();
    await expect(gr.sucheZaehler(page)).toHaveText('keine Treffer');
    await expect(gr.sucheMarken(page)).toHaveCount(0);
  });

  test('soll 20 000 Zeilen spätestens 5 s nach Enter zählen und markieren, in Häppchen unter der Einfrier-Schranke (Szenario 11, Grenzen)', async ({ gr, page }) => {
    const repo = gr.repoMitDateien({ 'gross.txt': nummernZeilen(20000, 'zeile') });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await dateiUndWarten(page, gr, 'gross.txt', 20001);

    await page.evaluate(() => {
      window.__langeAufgaben = [];
      window.__beobachter = new PerformanceObserver(liste => {
        for (const eintrag of liste.getEntries()) {
          window.__langeAufgaben.push(eintrag.duration);
        }
      });
      window.__beobachter.observe({ entryTypes: ['longtask'] });
    });
    const start = Date.now();
    await gr.sucheFeld(page).fill('zeile');
    await page.evaluate(() => new Promise(fertig => {
      const feld = document.querySelector('#diff-suche');
      const zaehler = document.querySelector('.diff-suche-zaehler');
      window.__suchStart = performance.now();
      feld.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      const warten = () => {
        if (zaehler.textContent === '1 von 10000+' && document.querySelectorAll('#diff .df-sc .suche-treffer').length === 10000) {
          window.__suchDauer = performance.now() - window.__suchStart;
          return fertig();
        }
        requestAnimationFrame(warten);
      };
      requestAnimationFrame(warten);
    }));
    const dauer = await page.evaluate(() => window.__suchDauer);
    const laengste = await page.evaluate(() => Math.max(0, ...window.__langeAufgaben));
    console.log(`Messwert: 20000 Zeilen gesucht und markiert in ${dauer} ms (rund ${Date.now() - start} ms); längste Aufgabe ${laengste} ms`);
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 10000+');
    await expect(gr.sucheMarken(page)).toHaveCount(10000);
    erwarteBinnenAnzeigeSchranke(dauer, `20 000 Zeilen gesucht und markiert`);
    erwarteUnterEinfrierSchranke(laengste, `längste Aufgabe (${laengste} ms)`);
  });
});

/** Ein Repo mit drei Commits; ausgewählt werden `y1` (farbig.js) und `y3` (spaet.txt), `mitte.txt` fehlt — im Modus
    „Zusammen“ zeichnet der Diff darum Abschnitte je Commit (Nicht-Kette). */
function repoLueckeFarbig(gr) {
  const ordner = repos.leeresRepoAnlegen();
  repos.dateiSchreiben(ordner, 'farbig.js', FARBIG_JS);
  const y1 = repos.commitAnlegen(ordner, { betreff: 'Anlegen' });
  repos.dateiSchreiben(ordner, 'mitte.txt', 'mitte\n');
  repos.commitAnlegen(ordner, { betreff: 'Mitte' });
  repos.dateiSchreiben(ordner, 'spaet.txt', 'spaet\n');
  const y3 = repos.commitAnlegen(ordner, { betreff: 'Spaet' });
  return { repo: gr.gemerktesRepo({ ordner, hash: y1 }), y1, y3 };
}

/** Der `data-farbe`-Wert des ersten „Zusammen“-Abschnitts (die Färbung setzt ihn je Abschnitt, nicht am `.df-sc`). */
const abschnittFarbe = page => page.locator('#diff .df-sc .diff-abschnitt').first().getAttribute('data-farbe');

/** Eine Zeile aus `anzahl` `x` — der präparierte Fremd-Repo-Inhalt aus dem Security-Review (Verfügbarkeit). */
const einzeile = anzahl => `${'x'.repeat(anzahl)}\n`;

/** Ereignisgenau: den Begriff suchen, bis der Zähler `zaehlertext` und `marken` Treffer stehen; liefert die Dauer ab Enter
    und die längste Aufgabe des Hauptfadens im Fenster. Die Zeitspanne ab Enter misst die Seite selbst (kein Poll-Intervall). */
async function sucheUndMesse(gr, page, begriff, zaehlertext, marken) {
  await page.evaluate(() => {
    window.__langeAufgaben = [];
    window.__beobachter = new PerformanceObserver(liste => {
      for (const eintrag of liste.getEntries()) {
        window.__langeAufgaben.push(eintrag.duration);
      }
    });
    window.__beobachter.observe({ entryTypes: ['longtask'] });
  });
  await gr.sucheFeld(page).fill(begriff);
  await page.evaluate(({ erwartetZaehler, erwartetMarken }) => new Promise(fertig => {
    const feld = document.querySelector('#diff-suche');
    const zaehler = document.querySelector('.diff-suche-zaehler');
    window.__suchStart = performance.now();
    feld.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const warten = () => {
      if (zaehler.textContent === erwartetZaehler && document.querySelectorAll('#diff .df-sc .suche-treffer').length === erwartetMarken) {
        window.__suchDauer = performance.now() - window.__suchStart;
        return fertig();
      }
      requestAnimationFrame(warten);
    };
    requestAnimationFrame(warten);
  }), { erwartetZaehler: zaehlertext, erwartetMarken: marken });
  return {
    dauer: await page.evaluate(() => window.__suchDauer),
    laengste: await page.evaluate(() => Math.max(0, ...window.__langeAufgaben)),
  };
}

const WEIT_1 = Array.from({ length: 12 }, (_, index) => `l${String(index + 1).padStart(2, '0')}`).join('\n') + '\n';
const WEIT_2 = WEIT_1.replace('l06', 'L06');

/** Ein Repo mit zwei Commits: `y1` legt `weit.txt` an (12 Zeilen), `y2` ändert nur Zeile 6 — mit Lücken davor und danach (R00026). */
function repoLuecken(gr) {
  const ordner = repos.leeresRepoAnlegen();
  repos.dateiSchreiben(ordner, 'weit.txt', WEIT_1);
  repos.commitAnlegen(ordner, { betreff: 'Anlegen' });
  repos.dateiSchreiben(ordner, 'weit.txt', WEIT_2);
  const y2 = repos.commitAnlegen(ordner, { betreff: 'Ändern' });
  return gr.gemerktesRepo({ ordner, hash: y2 });
}

test.describe('Im Diff suchen (R00027) — alle Anzeigeverfahren (Lehre #7)', () => {
  test('soll in „Zusammen“ genauso suchen wie in „Einzeln“', async ({ gr, page }) => {
    const repo = await repoY(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await sucheTxtWaehlen(page, gr);

    await gr.sucheSuchen(page, 'zwei');
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 4');
    await expect(gr.sucheMarken(page)).toHaveCount(4);
  });

  test('soll in „ganze Datei“ genauso suchen wie in „nur Änderungen“', async ({ gr, page }) => {
    const repo = await repoY(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await sucheTxtWaehlen(page, gr);

    await diffSeite.ansichtWaehlen(page, 'ganze Datei');
    await expect(gr.sucheFeld(page)).toHaveValue('');
    await gr.sucheSuchen(page, 'zwei');
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 4');
    await expect(gr.sucheMarken(page)).toHaveCount(4);
  });

  test('soll nebeneinander genauso suchen wie untereinander', async ({ gr, page }) => {
    const repo = await repoY(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await sucheTxtWaehlen(page, gr);

    await diffSeite.menueWaehlen(page, 'nebeneinander');
    await expect(page.locator('body')).toHaveAttribute('data-anordnung', 'nebeneinander');
    await gr.sucheSuchen(page, 'zwei');
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 4');
  });

  test('soll in „Zusammen“-Abschnitten die Markierung nach dem Ende der Färbung erneut auftragen (Lehre #7)', async ({ gr, page }) => {
    const { repo, y1, y3 } = repoLueckeFarbig(gr);
    const lauf = await gr.gitreviewAStarten(repo, [y1, y3]);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');

    await gr.dateiWaehlen(page, 'farbig.js');
    await expect(page.locator('#diff .df-sc tr[data-art]')).toHaveCount(3);
    await expect.poll(() => abschnittFarbe(page), { timeout: 15000 }).toBe('ja');

    await gr.sucheSuchen(page, 'return');
    await expect(gr.sucheMarken(page)).toHaveCount(2);
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 2');

    // Jede Variante muss wirklich neu zeichnen (und danach erneut färben) — sonst bliebe die Marke ohnehin stehen und
    // die Prüfung wäre wertlos. Gezählt wird das Ereignis `diff-gezeichnet`.
    await page.evaluate(() => {
      window.__gezeichnet = 0;
      document.addEventListener('diff-gezeichnet', () => {
        window.__gezeichnet += 1;
      });
    });
    const neuGezeichnet = async (aktion) => {
      const vorher = await page.evaluate(() => window.__gezeichnet);
      await aktion();
      await expect.poll(() => page.evaluate(() => window.__gezeichnet), { timeout: 15000 }).toBeGreaterThan(vorher);
      await expect.poll(() => abschnittFarbe(page), { timeout: 15000 }).toBe('ja');
      await expect(gr.sucheMarken(page)).toHaveCount(2);
      await expect(gr.sucheZaehler(page)).toHaveText('1 von 2');
    };

    // Variante A: dieselbe Datei erneut wählen.
    await neuGezeichnet(() => gr.dateiWaehlen(page, 'farbig.js'));
    await expect(page.locator('#diff .df-sc tr[data-art]')).toHaveCount(3);

    // Variante B: Ansicht „ganze Datei“ umschalten.
    await neuGezeichnet(() => diffSeite.ansichtWaehlen(page, 'ganze Datei'));

    // Variante C: Leerraum-Stellung umschalten.
    await neuGezeichnet(() => diffSeite.leerraumUmschalten(page));
  });

  test('soll eine aufgeklappte Lücke mitdurchsuchen (R00026)', async ({ gr, page }) => {
    const repo = repoLuecken(gr);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await dateiUndWarten(page, gr, 'weit.txt', 9);

    await gr.sucheSuchen(page, 'l01');
    await expect(gr.sucheZaehler(page)).toHaveText('keine Treffer');
    await expect(gr.sucheMarken(page)).toHaveCount(0);

    await diffSeite.lueckeAufklappen(page, 0, true);
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 1');
    await expect(gr.sucheMarken(page)).toHaveCount(1);
  });
});

// Security-Review B1 (Verfügbarkeit): viele Treffer in einer einzigen Zeile. Der Aufwand je Treffer darf nicht mit der Zahl
// der Textknoten der Zelle wachsen — markiert wird je Zelle in einem Durchgang. Abnahme: Zähler „1 von 10000+“, Marken binnen
// der Anzeige-Schranke nach Enter, keine Aufgabe des Hauptfadens über der Einfrier-Schranke (ereignisgenau, Positivkontrolle
// „alter Algorithmus“ wird rot).
test.describe('Im Diff suchen (R00027) — viele Treffer in einer Zeile (Verfügbarkeit)', () => {
  test('soll 10 000 Treffer in einer Zeile ohne lange Aufgabe markieren', async ({ gr, page }) => {
    test.setTimeout(120000);
    const repo = gr.repoMitDateien({ 'einzeile.txt': einzeile(20000) });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await dateiUndWarten(page, gr, 'einzeile.txt', 2);

    const { dauer, laengste } = await sucheUndMesse(gr, page, 'x', '1 von 10000+', 10000);
    console.log(`Messwert: 20 000 x in einer Zeile — ${dauer} ms (Anzeige-Schranke ${anzeigeSchrankeMs}); längste Aufgabe ${laengste} ms (Einfrier-Schranke ${einfrierSchrankeMs})`);
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 10000+');
    await expect(gr.sucheMarken(page)).toHaveCount(10000);
    erwarteBinnenAnzeigeSchranke(dauer, '10 000 Treffer in einer Zeile');
    erwarteUnterEinfrierSchranke(laengste, `längste Aufgabe (${laengste} ms)`);
  });

  test('soll die Grenzvariante 2 000 Treffer in einer Zeile ohne lange Aufgabe markieren', async ({ gr, page }) => {
    test.setTimeout(120000);
    const repo = gr.repoMitDateien({ 'einzeile.txt': einzeile(2000) });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await gr.oberflaecheOeffnen(page, lauf, 'einzeln');
    await dateiUndWarten(page, gr, 'einzeile.txt', 2);

    const { dauer, laengste } = await sucheUndMesse(gr, page, 'x', '1 von 2000', 2000);
    console.log(`Messwert: 2 000 x in einer Zeile — ${dauer} ms (Anzeige-Schranke ${anzeigeSchrankeMs}); längste Aufgabe ${laengste} ms (Einfrier-Schranke ${einfrierSchrankeMs})`);
    await expect(gr.sucheZaehler(page)).toHaveText('1 von 2000');
    await expect(gr.sucheMarken(page)).toHaveCount(2000);
    erwarteBinnenAnzeigeSchranke(dauer, '2 000 Treffer in einer Zeile');
    erwarteUnterEinfrierSchranke(laengste, `längste Aufgabe (${laengste} ms)`);
  });
});
