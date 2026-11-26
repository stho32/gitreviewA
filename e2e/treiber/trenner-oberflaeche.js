'use strict';
// Treiber Oberfläche „Breite der Seitenleiste ziehen“ (R00034): der einzige Ort, der den Trenner, seine Attribute, die Breite der
// Seitenleiste und das Ziehen kennt. Die Prüfungen der Oberfläche sitzen hier; die Testsprache darüber kennt nur die Fachwörter.
const { expect } = require('@playwright/test');

const SEITENLEISTE = '#seitenleiste';
const TRENNER = '.gr-ansicht .gr-trenner';
const DIFF = '#diff';

/** Die gemessene Breite des Seitenleisten-Elements (R00034: „an der gemessenen Breite … abgelesen“). */
function breiteDerSeitenleiste(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    return Math.round(element.getBoundingClientRect().width);
  }, SEITENLEISTE);
}

async function pruefeBreite(page, erwartet) {
  const breite = await breiteDerSeitenleiste(page);
  expect(breite, `Breite der Seitenleiste (${breite} px, erwartet ${erwartet} px)`).toBe(erwartet);
}

/** Alle Angaben des Trennzugs, die der Vorleser braucht, in einem Zug. */
function trennerAngaben(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    return {
      rolle: element.getAttribute('role'),
      orientierung: element.getAttribute('aria-orientation'),
      steuert: element.getAttribute('aria-controls'),
      jetzt: element.getAttribute('aria-valuenow'),
      min: element.getAttribute('aria-valuemin'),
      max: element.getAttribute('aria-valuemax'),
      name: element.getAttribute('aria-label'),
      tabindex: element.getAttribute('tabindex'),
      fokussiert: document.activeElement === element,
    };
  }, TRENNER);
}

/** Ist der Trenner vorhanden (im DOM)? */
function trennerVorhanden(page) {
  return page.locator(TRENNER).count();
}

/** Wartet, bis der Trennzug die ARIA-Angaben der aktuellen Fenstergröße trägt. Die Größenänderung kommt im Browser asynchron
    an; statt einer festen Zeit wird gepollt, bis `aria-valuemax` der Höchstbreite entspricht, die das Programm selbst aus dem
    Fenster rechnet. Ob ein Trenner dazugehört (Rückfall unter 566 px), klärt die Sprache mit `rahmen.warteAufAufbau` — hier
    steht nur noch der Wert; ein fehlender Trenner ist damit kein „nichts zu warten", sondern der Rückfall. */
async function warteAufGroesse(page) {
  await expect.poll(
    async () => {
      const angaben = await trennerAngaben(page);
      if (!angaben) {
        return true;
      }
      const hoechste = await page.evaluate(() => window.gitreviewaBreite.hoechste());
      return Number(angaben.max) === hoechste;
    },
    'die ARIA-Angaben des Trennzugs folgen der Fenstergröße'
  ).toBe(true);
}

/** Liegt der Fokus auf dem Trenner? */
function fokusAufTrenner(page) {
  return trennerAngaben(page).then(angaben => angaben && angaben.fokussiert);
}

/** Zieht den Trenner mit der Maus um `deltaX` px (positiv = nach rechts) aus seiner Mitte. */
async function ziehen(page, deltaX, { schritte = 5 } = {}) {
  const box = await page.locator(TRENNER).boundingBox();
  const mitte = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(mitte.x, mitte.y);
  await page.mouse.down();
  await page.mouse.move(mitte.x + deltaX, mitte.y, { steps: schritte });
  await page.mouse.up();
}

/** Doppelklick auf den Trenner. */
async function doppelklick(page) {
  await page.locator(TRENNER).dblclick();
}

/** Den Trenner per Tastatur fokussieren (programmatischer Fokus plus eine Tastaturbewegung, damit `:focus-visible` gilt). */
async function fokussiereTrenner(page) {
  await page.locator(TRENNER).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
}

/** Der Fokusring am Trenner: Breite, Stil, Farbe und ob `:focus-visible` gilt. */
function fokusring(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    const stil = getComputedStyle(element);
    return {
      breite: stil.outlineWidth,
      stil: stil.outlineStyle,
      sichtbar: element.matches(':focus-visible') || element.classList.contains('aktiv'),
    };
  }, TRENNER);
}

/** Zählt die Diff-Anfragen der Seite (`…/diff?…`); liefert eine Funktion, die den aktuellen Stand liest (Lehre #23: kein neuer Aufruf). */
function zaehleDiffAnfragen(page) {
  const zaehler = { anzahl: 0 };
  page.on('request', anfrage => {
    if (anfrage.url().includes('/diff?')) {
      zaehler.anzahl += 1;
    }
  });
  return () => zaehler.anzahl;
}

/** Der Abstand der Seitenleiste zum Diff-Bereich (der Trenner sitzt dazwischen) und die Breite des Diff-Bereichs. */
function lageSeitenleiste(page) {
  return page.evaluate(([links, diff]) => {
    const l = document.querySelector(links).getBoundingClientRect();
    const d = document.querySelector(diff).getBoundingClientRect();
    return { rechts: Math.round(l.right), diffLinks: Math.round(d.left), breite: Math.round(l.width), diffBreite: Math.round(d.width) };
  }, [SEITENLEISTE, DIFF]);
}

/* ── Prüfungen ── */

async function pruefeTrennerVorhanden(page, erwartet) {
  expect(await trennerVorhanden(page), 'Trenner im DOM').toBe(erwartet);
}

/** Der Trenner sitzt sichtbar an der Grenze zwischen Seitenleiste und Diff. */
async function pruefeTrennerAnDerGrenze(page) {
  const lage = await lageSeitenleiste(page);
  expect(lage.diffLinks, `Diff links (${lage.diffLinks}) rechts der Seitenleiste (${lage.rechts})`).toBeGreaterThanOrEqual(lage.rechts);
  await expect(page.locator(TRENNER)).toBeVisible();
}

/** Die ARIA-Angaben des Trennzugs; der sichtbare Name beginnt mit „Breite der Dateiliste“. */
async function pruefeTrennerAria(page, erwarteteBreite) {
  const angaben = await trennerAngaben(page);
  expect(angaben, 'Trenner vorhanden').not.toBeNull();
  expect(angaben.rolle, 'role').toBe('separator');
  expect(angaben.orientierung, 'aria-orientation').toBe('vertical');
  expect(angaben.steuert, 'aria-controls auf die Seitenleiste').toBe('seitenleiste');
  expect(Number(angaben.jetzt), 'aria-valuenow').toBe(erwarteteBreite);
  expect(Number(angaben.min), 'aria-valuemin').toBe(240);
  expect(Number(angaben.max), 'aria-valuemax').toBeGreaterThanOrEqual(240);
  expect(angaben.name, 'Name').toMatch(/^Breite der Dateiliste/);
  expect(angaben.tabindex, 'tabindex').toBe('0');
}

/* ── Die rechte Seite: der Trenner zwischen Diff und Ergebnis-Spalte (R00042) ── */

const RECHTS_TRENNER = '.gr-ansicht .gr-ergebnis-trenner';
const ERGEBNIS = '#ergebnis';

/** Die gemessene Breite der Ergebnis-Spalte (R00042: „die Spalte 520 px breit“). */
function breiteDerErgebnisSpalte(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    return Math.round(element.getBoundingClientRect().width);
  }, ERGEBNIS);
}

async function pruefeErgebnisBreite(page, erwartet) {
  const breite = await breiteDerErgebnisSpalte(page);
  expect(breite, `Breite der Ergebnis-Spalte (${breite} px, erwartet ${erwartet} px)`).toBe(erwartet);
}

/** Alle Angaben des rechten Trennzugs, die der Vorleser braucht, in einem Zug. */
function rechterTrennerAngaben(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    return {
      rolle: element.getAttribute('role'),
      orientierung: element.getAttribute('aria-orientation'),
      steuert: element.getAttribute('aria-controls'),
      jetzt: element.getAttribute('aria-valuenow'),
      min: element.getAttribute('aria-valuemin'),
      max: element.getAttribute('aria-valuemax'),
      name: element.getAttribute('aria-label'),
      tabindex: element.getAttribute('tabindex'),
      fokussiert: document.activeElement === element,
      sichtbar: element.getClientRects().length > 0,
    };
  }, RECHTS_TRENNER);
}

/** Ist der rechte Trenner vorhanden (im DOM)? Eingeklappt gibt es ihn nicht. */
function rechterTrennerVorhanden(page) {
  return page.locator(RECHTS_TRENNER).count();
}

/** Zieht den rechten Trenner mit der Maus um `deltaX` px (negativ = nach links, die Spalte wächst). */
async function rechtesZiehen(page, deltaX, { schritte = 5 } = {}) {
  const box = await page.locator(RECHTS_TRENNER).boundingBox();
  const mitte = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(mitte.x, mitte.y);
  await page.mouse.down();
  await page.mouse.move(mitte.x + deltaX, mitte.y, { steps: schritte });
  await page.mouse.up();
}

/** Doppelklick auf den rechten Trenner. */
async function rechtesDoppelklick(page) {
  await page.locator(RECHTS_TRENNER).dblclick();
}

/** Den rechten Trenner per Tastatur fokussieren (programmatischer Fokus plus eine Tastaturbewegung, damit `:focus-visible` gilt). */
async function fokussiereRechtenTrenner(page) {
  await page.locator(RECHTS_TRENNER).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
}

/** Die ARIA-Angaben des rechten Trennzugs; der Name ist „Breite der Ergebnis-Spalte“. */
async function pruefeRechterTrennerAria(page, erwarteteBreite) {
  const angaben = await rechterTrennerAngaben(page);
  expect(angaben, 'rechter Trenner vorhanden').not.toBeNull();
  expect(angaben.rolle, 'role').toBe('separator');
  expect(angaben.orientierung, 'aria-orientation').toBe('vertical');
  expect(angaben.steuert, 'aria-controls auf die Ergebnis-Spalte').toBe('ergebnis');
  expect(Number(angaben.jetzt), 'aria-valuenow').toBe(erwarteteBreite);
  expect(Number(angaben.min), 'aria-valuemin').toBe(240);
  expect(Number(angaben.max), 'aria-valuemax').toBeGreaterThanOrEqual(240);
  expect(angaben.name, 'Name').toBe('Breite der Ergebnis-Spalte');
  expect(angaben.tabindex, 'tabindex').toBe('0');
}

/** Die Lage von Diff und Ergebnis-Spalte (Breiten und die Grenze dazwischen). */
function lageRechts(page) {
  return page.evaluate(([diff, ergebnis]) => {
    const d = document.querySelector(diff).getBoundingClientRect();
    const e = document.querySelector(ergebnis).getBoundingClientRect();
    return {
      diffBreite: Math.round(d.width),
      diffRechts: Math.round(d.right),
      ergebnisBreite: Math.round(e.width),
      ergebnisLinks: Math.round(e.left),
    };
  }, [DIFF, ERGEBNIS]);
}

/** Wartet, bis die Ergebnis-Spalte der aktuellen Fenstergröße folgt: `hidden` und `aria-valuenow` stimmen mit der einen
    Breitenregel überein (kein Zustand von gestern, keine feste Zeit). Unter 566 px gilt die eine Spalte: dann steht die Spalte
    ohne Trenner (R00033). */
async function warteAufSpalte(page) {
  await expect.poll(
    () => page.evaluate(() => {
      const zwei = window.gitreviewaTrennerWerte.passtZweiSpaltig(window.innerWidth);
      const gezeigt = window.gitreviewaBreiten.gezeigt();
      const spalte = document.getElementById('ergebnis');
      const trenner = document.querySelector('.gr-ansicht .gr-ergebnis-trenner');
      if (!zwei) {
        return spalte !== null && spalte.hidden === false && trenner === null;
      }
      return spalte !== null && spalte.hidden === gezeigt.rechtsEin && trenner !== null
        && Number(trenner.getAttribute('aria-valuenow')) === gezeigt.rechts;
    }),
    'die Ergebnis-Spalte folgt der Fenstergröße'
  ).toBe(true);
}

/* ── Die Ergebnis-Spalte und ihr Ausklapp-Knopf (R00042, B4104) ── */

const ERGEBNIS_KNOPF = '#ergebnis-einklappen';

/** Die Angaben des Ausklapp-Knopfes der Ergebnis-Spalte. */
function spaltenKnopfAngaben(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    return {
      erweitert: element.getAttribute('aria-expanded'),
      gesperrt: element.getAttribute('aria-disabled'),
      grund: element.getAttribute('title'),
      fokussiert: document.activeElement === element,
      sichtbar: element.getClientRects().length > 0,
    };
  }, ERGEBNIS_KNOPF);
}

/** Betätigt den Ausklapp-Knopf der Ergebnis-Spalte (Maus). */
async function spaltenKnopfBetatigen(page) {
  await page.locator(ERGEBNIS_KNOPF).click({ timeout: 5000 });
}

/** Die Ergebnis-Spalte steht sichtbar (ausgeklappt). */
async function pruefeErgebnisSpalteSichtbar(page) {
  await expect(page.locator(ERGEBNIS), 'Ergebnis-Spalte sichtbar').toBeVisible();
  const angaben = await spaltenKnopfAngaben(page);
  expect(angaben, 'Ausklapp-Knopf vorhanden').not.toBeNull();
  expect(angaben.erweitert, 'aria-expanded').toBe('true');
}

/** Die Ergebnis-Spalte ist eingeklappt: `hidden`, der Knopf nennt „ausklappen“. */
async function pruefeErgebnisSpalteVerborgen(page) {
  await expect(page.locator(ERGEBNIS), 'Ergebnis-Spalte verborgen').toBeHidden();
  const angaben = await spaltenKnopfAngaben(page);
  expect(angaben, 'Ausklapp-Knopf vorhanden').not.toBeNull();
  expect(angaben.erweitert, 'aria-expanded').toBe('false');
}

/** Der Fokus steht auf dem Ausklapp-Knopf der Ergebnis-Spalte (R00042, Kriterium 9: nie ins Leere). */
async function pruefeSpaltenKnopfFokus(page) {
  const angaben = await spaltenKnopfAngaben(page);
  expect(angaben, 'Ausklapp-Knopf vorhanden').not.toBeNull();
  expect(angaben.fokussiert, `der Fokus steht auf dem Ausklapp-Knopf — ${JSON.stringify(angaben)}`).toBe(true);
}

/** Der nächste Tab-Stopp nach dem aktuellen Fokus: sichtbar und kein verborgener Trenner (kein unsichtbarer Stopp). */
function tabWeiterSichtbar(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    return {
      tag: element ? element.tagName : null,
      kennung: element ? (element.id || '') : '',
      sichtbar: element ? element.getClientRects().length > 0 : false,
      istRechterTrenner: element ? element.classList.contains('gr-ergebnis-trenner') : false,
      istRechteSpalte: element ? element.id === 'ergebnis' : false,
    };
  });
}

/** Der Bildlauf der Ergebnis-Spalte und ihr Überhang (eigener Rollbereich, R00037/R00042). */
function rollstandSpalte(page) {
  return page.evaluate(() => {
    const element = document.getElementById('ergebnis');
    if (!element) {
      return null;
    }
    return {
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      ueberhang: element.scrollHeight - element.clientHeight,
      ueberhangX: element.scrollWidth - element.clientWidth,
      overflowY: getComputedStyle(element).overflowY,
    };
  });
}

/** Den Bildlauf der Ergebnis-Spalte setzen (Vorbereitung einer Prüfung). */
function setzeSpaltenVersatz(page, wert) {
  return page.evaluate(w => {
    document.getElementById('ergebnis').scrollTop = w;
  }, wert);
}

/** Die Ergebnis-Spalte ist ein eigener Rollbereich (senkrechter Überhang, eigene Bildlaufleiste). */
async function pruefeSpalteRollbereich(page) {
  const stand = await rollstandSpalte(page);
  expect(stand, 'Ergebnis-Spalte vorhanden').not.toBeNull();
  expect(stand.ueberhang, `Ergebnis-Spalte: Überhang (scrollHeight ${stand.scrollHeight}, clientHeight ${stand.clientHeight})`).toBeGreaterThan(0);
  expect(stand.overflowY, 'Ergebnis-Spalte: senkrechte Überlauf-Regel').toMatch(/^(auto|scroll)$/);
}

/** Den Stand der Ergebnis-Spalte setzen (wie ihn der Server liefert) — nur für die Vorbereitung großer Inhalte. */
function spalteZeige(page, text) {
  return page.evaluate(t => window.gitreviewaErgebnisSpalte.zeige(t), text);
}

/** Die Zahl der Diff-Zeilenknoten (Positivkontrolle: der Zug lief über eine wirklich große Datei). */
function diffKnoten(page) {
  return page.evaluate(() => document.querySelectorAll('#diff .df-sc tr[data-art]').length);
}

/**
 * Misst die längste Aufgabe des Hauptfadens während eines echten Zugs am rechten Trenner (Einfrier-Schranke R00047). Der
 * Beobachter wird vor dem Zug eingerichtet und danach ausgelesen; die Rückgabe ist die Liste der Aufgabendauern.
 */
async function messeZugLangAufgabe(page, deltaX, { schritte = 20 } = {}) {
  await page.evaluate(() => {
    window.__grAufgaben = [];
    window.__grBeobachter = new PerformanceObserver(liste => {
      for (const eintrag of liste.getEntries()) {
        window.__grAufgaben.push(eintrag.duration);
      }
    });
    window.__grBeobachter.observe({ type: 'longtask' });
  });
  await rechtesZiehen(page, deltaX, { schritte });
  return page.evaluate(() => {
    window.__grBeobachter.takeRecords().forEach(eintrag => window.__grAufgaben.push(eintrag.duration));
    window.__grBeobachter.disconnect();
    const aufgaben = window.__grAufgaben;
    delete window.__grAufgaben;
    delete window.__grBeobachter;
    return aufgaben;
  });
}

module.exports = {
  SEITENLEISTE, TRENNER, DIFF, RECHTS_TRENNER, ERGEBNIS, ERGEBNIS_KNOPF,
  breiteDerSeitenleiste, pruefeBreite, trennerAngaben, trennerVorhanden, warteAufGroesse, fokusAufTrenner,
  ziehen, doppelklick, fokussiereTrenner, fokusring, zaehleDiffAnfragen, lageSeitenleiste,
  pruefeTrennerVorhanden, pruefeTrennerAnDerGrenze, pruefeTrennerAria,
  breiteDerErgebnisSpalte, pruefeErgebnisBreite, rechterTrennerAngaben, rechterTrennerVorhanden,
  rechtesZiehen, rechtesDoppelklick, fokussiereRechtenTrenner, pruefeRechterTrennerAria, lageRechts, warteAufSpalte,
  spaltenKnopfAngaben, spaltenKnopfBetatigen, pruefeErgebnisSpalteSichtbar, pruefeErgebnisSpalteVerborgen,
  pruefeSpaltenKnopfFokus, tabWeiterSichtbar,
  rollstandSpalte, setzeSpaltenVersatz, pruefeSpalteRollbereich, spalteZeige, diffKnoten, messeZugLangAufgabe,
};
