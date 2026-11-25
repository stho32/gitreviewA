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
    Fenster rechnet. Im einspaltigen Rückfall gibt es keinen Trenner — dann ist nichts zu warten. */
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

module.exports = {
  SEITENLEISTE, TRENNER, DIFF,
  breiteDerSeitenleiste, pruefeBreite, trennerAngaben, trennerVorhanden, warteAufGroesse, fokusAufTrenner,
  ziehen, doppelklick, fokussiereTrenner, fokusring, zaehleDiffAnfragen, lageSeitenleiste,
  pruefeTrennerVorhanden, pruefeTrennerAnDerGrenze, pruefeTrennerAria,
};
