'use strict';
// Abnahme R00057 „Das Suchfeld der Diff-Werkzeugleiste bleibt sichtbar und bedienbar“ (B5701, Messprobe): das Feld „Im Diff
// suchen“ ist in jedem Fenster- und Spaltenfall, in jedem Zählerzustand und mit der Fehlermeldung mindestens 3rem breit sichtbar
// (Feldmitte per `elementFromPoint` das Feld selbst), nichts in der Leiste überdeckt etwas anderes (Schnittfläche 0), die rechten
// Kanten von Feld, Zähler, Meldung und „Ansicht ▾“ liegen im Diff-Bereich, und der Diff rollt nicht waagerecht. Dazu die
// Bedienbarkeit (Klick, Tastatur, Menü) und alle Anzeigeverfahren (Pflichtpunkt 2). Browser-Eigenes: Maße und Überdeckung sind
// nur im Browser messbar; Messfälle, Zählerzustände und Werte wie im Messraster des planers (`gemeinsam/scratchpad/plan-69/`).
const { test, expect } = require('../dsl/zeile-annotieren.js');
const { mass, warteAufRuhe, erwarteImBereich } = require('../treiber/werkzeugleiste-oberflaeche.js');
const seite = require('../treiber/oberflaeche.js');
const trenner = require('../treiber/trenner-oberflaeche.js');

const FENSTER = { width: 1280, height: 800 };
const SCHMAL = { width: 812, height: 800 };
const LANGER_ZAEHLER = '1 von 10000+';

// Die acht Messfälle der Anforderung: Fenster, Ergebnis-Spalte, Seitenleiste (null = die Standardbreite des Programms).
const FAELLE = [
  ['1280 × 800, Spalte offen, Leiste Standard', FENSTER, true, null],
  ['1280 × 800, Spalte offen, Leiste 240', FENSTER, true, 240],
  ['1280 × 800, Spalte zu, Leiste Standard', FENSTER, false, null],
  ['1280 × 800, Spalte zu, Leiste 240', FENSTER, false, 240],
  ['1280 × 800, Spalte zu, Leiste 640', FENSTER, false, 640],
  ['812 × 800, Spalte offen, Leiste Standard', SCHMAL, true, null],
  ['812 × 800, Spalte zu, Leiste Standard', SCHMAL, false, null],
  ['812 × 800, Spalte zu, Leiste 240', SCHMAL, false, 240],
];

// Die Zählerzustände: leer (keine Suche), „1 von 1“, „keine Treffer“ und die Fehlermeldung (Suchbegriff über 200 Zeichen).
const ZUSTAENDE = [
  ['leer', null],
  ['1 von 1', 'app'],
  ['keine Treffer', 'zzzzzz'],
  ['Fehlermeldung', 'a'.repeat(201)],
];

const FEHLERMELDUNG = 'Der Suchbegriff darf höchstens 200 Zeichen haben.';

/** Fenster setzen und den Spaltenzustand herstellen: 1280 startet mit offener Spalte, 812 mit zugeklappter (R00037/R00042). */
async function spaltenzustand(anm, fenster, spalteOffen) {
  await anm.fensterSetzen(fenster);
  const startetOffen = fenster.width >= 1012;
  if (spalteOffen !== startetOffen) {
    await anm.ergebnisSpalteUmschalten();
  }
  if (spalteOffen) {
    await anm.ergebnisSpalteSichtbar();
  } else {
    await anm.ergebnisSpalteVerborgen();
  }
}

/** Den Fall der Anforderung herstellen: Repo P, Fenster/Spalte/Seitenleiste, `src/app.js` gewählt. */
async function fallVorbereiten(anm, fenster, spalteOffen, leiste) {
  await anm.starten({ vorbereitung: 'Repo P', modus: 'zusammen' });
  await spaltenzustand(anm, fenster, spalteOffen);
  if (leiste !== null) {
    await anm.seitenleisteZiehenAuf(leiste);
  }
  await anm.dateiAnsehen('src/app.js');
}

/** Der Zustand ist wirklich der gesuchte (Positivkontrolle): Zählertext bzw. Fehlermeldung. */
function erwarteZustand(m, art, kontext) {
  if (art === '1 von 1') {
    expect(m.zaehlerText, `Zähler im Zustand „1 von 1“ (${kontext})`).toMatch(/^\d+ von \d+$/);
  } else if (art === 'keine Treffer') {
    expect(m.zaehlerText, `Zähler im Zustand „keine Treffer“ (${kontext})`).toBe('keine Treffer');
  } else if (art === 'Fehlermeldung') {
    expect(m.meldungText, `Fehlermeldung der Suche (${kontext})`).toBe(FEHLERMELDUNG);
  }
}

/** Die Messzeile für die Tabelle (Feld, Kopfhöhe, Zeilen, Rollbereich, Überdeckung). */
function messzeile(fall, zustand, m) {
  return `MASS ${fall} | ${zustand} | Feld ${m.feldSichtbarPx}px | Feldbreite ${m.teile.feld.breite}px | Kopf ${m.kopf.hoehe}px | Zeilen ${m.zeilen} | Rollbereich ${m.rollbereichHoehe}px | Überschneidung ${m.ueberschneidungen.join(',') || 'keine'} | Zähler „${m.zaehlerText}“`;
}

test.describe('R00057 Kriterium 1 und 2: Feld sichtbar, nichts überdeckt etwas (8 Fälle × 4 Zustände)', () => {
  for (const [name, fenster, spalteOffen, leiste] of FAELLE) {
    test(`soll bei ${name} in jedem Zählerzustand das Feld zeigen und nichts überdecken`, async ({ anm, page }) => {
      await fallVorbereiten(anm, fenster, spalteOffen, leiste);
      for (const [art, begriff] of ZUSTAENDE) {
        if (begriff !== null) {
          await anm.suchen(begriff);
        }
        await warteAufRuhe(page);
        const m = await mass(page);
        erwarteZustand(m, art, `${name}, ${art}`);
        erwarteImBereich(m, `${name}, ${art}`);
        if (art === 'Fehlermeldung') {
          expect(m.kopf.hoehe, `Leiste mit Fehlermeldung höchstens 170 px (${name}: ${m.kopf.hoehe} px)`).toBeLessThanOrEqual(170);
        }
        expect(m.rollbereichHoehe, `Rollbereich des Diffs mindestens 480 px (${name}, ${art}: ${m.rollbereichHoehe} px)`).toBeGreaterThanOrEqual(480);
        console.log(messzeile(name, art, m));
      }
    });
  }
});

test.describe('R00057 Kriterium 1: auch der längste Zähler „10000 von 10000+“', () => {
  // Der echte Zähler „10000 von 10000+“ (114 px breit) entsteht aus einer einzigen Zeile mit 20 000 `x` (wie im
  // Verfügbarkeitsfall der Suche); die Leiste hängt nicht vom Diff-Inhalt ab, nur der Zählertext zählt.
  async function langerZaehlerVorbereiten(gr, page, fenster, spalteOffen, leiste) {
    const repo = gr.repoMitDateien({ 'lang.txt': `${'x'.repeat(20000)}\n` });
    const lauf = await gr.gitreviewAStarten(repo, [repo.hash]);
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, 'zusammen');
    await page.setViewportSize(fenster);
    await trenner.warteAufSpalte(page);
    const startetOffen = fenster.width >= 1012;
    if (spalteOffen !== startetOffen) {
      await trenner.spaltenKnopfBetatigen(page);
    }
    if (spalteOffen) {
      await trenner.pruefeErgebnisSpalteSichtbar(page);
    } else {
      await trenner.pruefeErgebnisSpalteVerborgen(page);
    }
    if (leiste !== null) {
      const jetzt = Number((await trenner.trennerAngaben(page)).jetzt);
      await trenner.ziehen(page, leiste - jetzt);
      await expect.poll(async () => Number((await trenner.trennerAngaben(page)).jetzt), `Seitenleiste ${leiste}`).toBe(leiste);
    }
    await seite.dateiWaehlen(page, 'lang.txt');
    await expect(page.locator('#diff .df-sc tr[data-art]')).toHaveCount(2);
    await seite.sucheSuchen(page, 'x');
    await expect(seite.sucheZaehler(page)).toHaveText(LANGER_ZAEHLER, { timeout: 30000 });
  }

  for (const [name, fenster, spalteOffen, leiste] of FAELLE) {
    test(`soll bei ${name} auch mit dem längsten Zähler das Feld zeigen`, async ({ gr, page }) => {
      test.setTimeout(120000);
      await langerZaehlerVorbereiten(gr, page, fenster, spalteOffen, leiste);
      await warteAufRuhe(page);
      const m = await mass(page);
      expect(m.zaehlerText, `Zähler (${name})`).toBe(LANGER_ZAEHLER);
      erwarteImBereich(m, `${name}, längster Zähler`);
      console.log(messzeile(name, 'längster', m));
    });
  }
});

test.describe('R00057 Kriterium 3: das Feld ist bedienbar', () => {
  test('soll im Fall der Karte Klick, Tippen, Enter, Esc, / und das Menü „Ansicht ▾“ tragen', async ({ anm, page }) => {
    // Der Fall der Karte: 1280 × 800, Ergebnis-Spalte offen, Standard-Seitenleiste.
    await fallVorbereiten(anm, FENSTER, true, null);

    // Klick in die Mitte des Feldes und tippen wie der Mensch.
    const kasten = await page.locator('#diff-suche').boundingBox();
    await page.mouse.click(kasten.x + kasten.width / 2, kasten.y + kasten.height / 2);
    await expect(page.locator('#diff-suche'), 'Fokus nach Klick in die Feldmitte').toBeFocused();
    await page.keyboard.type('app');
    await expect(page.locator('#diff-suche'), 'das Feld zeigt den Suchbegriff').toHaveValue('app');

    await page.keyboard.press('Enter');
    const m = await mass(page);
    expect(m.zaehlerText, `Zähler nach der Suche (${m.zaehlerText})`).toMatch(/^\d+ von \d+$/);

    // Esc leert das Feld.
    await page.keyboard.press('Escape');
    await expect(page.locator('#diff-suche'), 'Esc leert das Feld').toHaveValue('');

    // `/` holt den Fokus aus dem Diff zurück ins Feld (R00027/R00030): erst verlässt der Fokus das Feld, dann `/`.
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('/');
    await expect(page.locator('#diff-suche'), 'die Taste / setzt den Fokus ins Feld').toBeFocused();

    // „Ansicht ▾“ öffnet sein Menü; der erste Eintrag ist ganz sichtbar und anklickbar.
    await page.locator('#ansicht-knopf').click();
    await expect(page.locator('#ansicht-menue')).toBeVisible();
    const ersterEintrag = page.locator('#ansicht-menue .menue-eintrag').first();
    await expect(ersterEintrag).toBeVisible();
    const lageEintrag = await ersterEintrag.evaluate(eintrag => {
      const b = eintrag.getBoundingClientRect();
      const mitte = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return {
        oben: Math.round(b.top), unten: Math.round(b.bottom), fenster: window.innerHeight,
        trifftEintrag: Boolean(mitte) && (mitte === eintrag || eintrag.contains(mitte)),
      };
    });
    expect(lageEintrag.oben, `erster Menüeintrag im Fenster (${JSON.stringify(lageEintrag)})`).toBeGreaterThanOrEqual(0);
    expect(lageEintrag.unten, `erster Menüeintrag ganz im Fenster (${JSON.stringify(lageEintrag)})`).toBeLessThanOrEqual(lageEintrag.fenster);
    expect(lageEintrag.trifftEintrag, `erster Menüeintrag anklickbar (${JSON.stringify(lageEintrag)})`).toBe(true);
    await ersterEintrag.click();
    await expect(page.locator('#ansicht-menue')).toBeHidden();
  });
});

test.describe('R00057 Kriterium 4: alle Anzeigeverfahren', () => {
  const VERFAHREN = [
    ['nur Änderungen, untereinander', 'nur Änderungen', 'untereinander'],
    ['ganze Datei, untereinander', 'ganze Datei', 'untereinander'],
    ['nur Änderungen, nebeneinander', 'nur Änderungen', 'nebeneinander'],
    ['ganze Datei, nebeneinander', 'ganze Datei', 'nebeneinander'],
  ];
  for (const [name, ansicht, anordnung] of VERFAHREN) {
    for (const umbruch of ['an (Start)', 'umgeschaltet']) {
      test(`soll bei 812 × 800, Spalte offen, Leiste 240 in „Einzeln“ — ${name}, Umbruch ${umbruch} — das Feld zeigen`, async ({ anm, page }) => {
        await fallVorbereiten(anm, SCHMAL, true, 240);
        await anm.modusWaehlen('einzeln');
        await anm.dateiAnsehen('src/app.js');
        await anm.ansichtWaehlen(ansicht);
        await anm.ansichtWaehlen(anordnung);
        if (umbruch === 'umgeschaltet') {
          await anm.umbruchUmschalten();
        }
        await anm.suchen('app');
        await warteAufRuhe(page);
        const m = await mass(page);
        erwarteImBereich(m, `812 offen 240, Einzeln, ${name}, Umbruch ${umbruch}`);
      });
    }
  }
});
