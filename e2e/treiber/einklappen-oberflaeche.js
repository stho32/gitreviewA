'use strict';
// Treiber Oberfläche „Seitenleiste ein- und ausklappen“ (R00035, I0036): der einzige Ort, der den Ausklapp-Knopf, den Streifen an
// der Grenze, den eingeklappten Zustand der Seitenleiste und die Reihenfolge der Tab-Stopps kennt. Die Prüfungen der Oberfläche
// sitzen hier; die Testsprache darüber kennt nur die Fachwörter.
const { expect } = require('@playwright/test');

const KNOPF = '#einklappen';
const STREIFEN = '.gr-ansicht .gr-streifen';
const SEITENLEISTE = '#seitenleiste';
const RAHMEN = '.gr-ansicht';
const TRENNER = '.gr-ansicht .gr-trenner';

function knopf(page) {
  return page.locator(KNOPF);
}

/** Betätigt den Knopf am Trenner (Maus). */
async function betatigen(page) {
  await knopf(page).click({ timeout: 5000 });
}

/** Die Taste `b` aus dem Katalog. */
async function tasteB(page) {
  await page.keyboard.press('b');
}

/** Alle Angaben des Knopfes, die Vorleser und Prüfung brauchen, in einem Zug. */
function knopfAngaben(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    const pfeil = element.querySelector('.gr-einklappen-pfeil');
    const beschriftung = element.querySelector('.gr-einklappen-text');
    const stil = getComputedStyle(element);
    return {
      erweitert: element.getAttribute('aria-expanded'),
      steuert: element.getAttribute('aria-controls'),
      taste: element.getAttribute('aria-keyshortcuts'),
      beschriftung: beschriftung ? beschriftung.textContent : '',
      pfeil: pfeil ? pfeil.textContent.trim() : null,
      pfeilVerborgen: pfeil ? pfeil.getAttribute('aria-hidden') === 'true' : false,
      kbd: [...element.querySelectorAll('kbd')].map(kbd => kbd.textContent),
      fokussiert: document.activeElement === element,
      fokusring: { breite: stil.outlineWidth, stil: stil.outlineStyle, sichtbar: element.matches(':focus-visible') },
      sichtbar: element.getClientRects().length > 0,
      rolle: element.getAttribute('role'),
      tabindex: element.getAttribute('tabindex') === null ? null : element.getAttribute('tabindex'),
    };
  }, KNOPF);
}

/** Der gezeichnete Fokusring eines Elements: Breite, Stil und ob `:focus-visible` gilt (R00030, B2907). */
function sichtbarerFokusring(element) {
  const stil = getComputedStyle(element);
  return {
    breite: stil.outlineWidth,
    stil: stil.outlineStyle,
    sichtbar: element.matches(':focus-visible'),
  };
}

/** Der Stand der Seitenleiste: verborgen, inert, im Tab-Weg und ihre Breite. */
function seitenleisteAngaben(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    const fokussierbar = [...element.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]')];
    const rechteck = element.getBoundingClientRect();
    return {
      verborgen: element.hidden,
      inert: element.inert === true,
      display: getComputedStyle(element).display,
      sichtbar: element.getClientRects().length > 0,
      breite: Math.round(rechteck.width),
      fokussierbarImDom: fokussierbar.length,
    };
  }, SEITENLEISTE);
}

/** Der Stand des Streifens an der Grenze (Breite, Lage, Sichtbarkeit). */
function streifenAngaben(page) {
  return page.evaluate(sel => {
    const element = document.querySelector(sel);
    if (!element) {
      return null;
    }
    const rechteck = element.getBoundingClientRect();
    return {
      sichtbar: element.getClientRects().length > 0,
      links: Math.round(rechteck.left * 100) / 100,
      rechts: Math.round(rechteck.right * 100) / 100,
      breite: Math.round(rechteck.width),
      hoehe: Math.round(rechteck.height),
      hintergrund: getComputedStyle(element).backgroundColor,
    };
  }, STREIFEN);
}

/** Die Lage von Seitenleiste und Diff-Bereich (links, rechts, Breite) in einem Zug. */
function grenzlage(page) {
  return page.evaluate(([leiste, diff, streifen]) => {
    const l = document.querySelector(leiste);
    const d = document.querySelector(diff);
    const s = document.querySelector(streifen);
    const dl = d.getBoundingClientRect();
    const sr = s ? s.getBoundingClientRect() : null;
    return {
      diffLinks: Math.round(dl.left),
      diffRechts: Math.round(dl.right),
      diffBreite: Math.round(dl.width),
      leisteBreite: l ? Math.round(l.getBoundingClientRect().width) : null,
      streifenRechts: sr ? Math.round(sr.right) : null,
      fensterBreite: window.innerWidth,
    };
  }, [SEITENLEISTE, '#diff', STREIFEN]);
}

/* ── Prüfungen ── */

/** Der Knopf ist da und nennt seinen Zustand über `aria-expanded`. */
async function pruefeZustand(page, eingeklappt) {
  const angaben = await knopfAngaben(page);
  expect(angaben, 'Ausklapp-Knopf vorhanden').not.toBeNull();
  expect(angaben.erweitert, `aria-expanded (eingeklappt: ${eingeklappt})`).toBe(eingeklappt ? 'false' : 'true');
}

/** Der Knopf trägt Rolle, Namen, Pfeilrichtung, Hinweis und steuert die Seitenleiste (B3402). */
async function pruefeKnopf(page, { eingeklappt }) {
  const angaben = await knopfAngaben(page);
  expect(angaben, 'Ausklapp-Knopf vorhanden').not.toBeNull();
  expect(angaben.sichtbar, 'der Knopf steht sichtbar an der Grenze').toBe(true);
  expect(angaben.erweitert, 'aria-expanded').toBe(eingeklappt ? 'false' : 'true');
  expect(angaben.steuert, 'aria-controls').toBe('seitenleiste');
  expect(angaben.rolle, 'role (nativer Knopf)').toBeNull();
  const name = eingeklappt ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen';
  await expect(knopf(page), `zugänglicher Name beginnt mit »${name}«`).toHaveAccessibleName(new RegExp(`^${name}`));
  expect(angaben.beschriftung, 'sichtbarer Text').toBe(name);
  expect(angaben.pfeil, 'sichtbares Bild der Wirkung').toBe(eingeklappt ? '»' : '«');
  expect(angaben.pfeilVerborgen, 'der Pfeil ist für Vorleser verborgen (der Name nennt die Wirkung)').toBe(true);
  expect(angaben.taste, 'aria-keyshortcuts').toBe('b');
  expect(angaben.kbd, 'sichtbarer Hinweis').toEqual(['b']);
}

/** Die eingeklappte Seitenleiste ist weder sichtbar noch im Tab-Weg (`hidden`/`inert`). */
async function pruefeSeitenleisteVerborgen(page) {
  const angaben = await seitenleisteAngaben(page);
  expect(angaben, 'Seitenleiste vorhanden').not.toBeNull();
  expect(angaben.sichtbar, `Seitenleiste sichtbar — ${JSON.stringify(angaben)}`).toBe(false);
  expect(angaben.verborgen, 'hidden').toBe(true);
  expect(angaben.inert, 'inert').toBe(true);
  expect(angaben.display, 'display').toBe('none');
}

/** Die ausgeklappte Seitenleiste steht sichtbar und ist bedienbar. */
async function pruefeSeitenleisteSichtbar(page) {
  const angaben = await seitenleisteAngaben(page);
  expect(angaben, 'Seitenleiste vorhanden').not.toBeNull();
  expect(angaben.verborgen, 'hidden').toBe(false);
  expect(angaben.inert, 'inert').toBe(false);
  expect(angaben.breite, `Breite der Seitenleiste — ${JSON.stringify(angaben)}`).toBeGreaterThan(0);
}

/** Der Streifen an der Grenze steht sichtbar (eingeklappt) und ist schmal. */
async function pruefeStreifen(page) {
  const angaben = await streifenAngaben(page);
  expect(angaben, 'Streifen vorhanden').not.toBeNull();
  expect(angaben.sichtbar, `Streifen sichtbar — ${JSON.stringify(angaben)}`).toBe(true);
  expect(angaben.breite, 'schmaler Streifen').toBeGreaterThan(0);
  expect(angaben.breite, 'schmaler Streifen (schmaler als die Mindestbreite der Seitenleiste)').toBeLessThan(240);
}

/** Der Diff nimmt die volle Breite ein: er beginnt an der Grenze und reicht bis zum Fensterrand. */
async function pruefeVolleBreite(page) {
  const lage = await grenzlage(page);
  expect(lage.diffLinks, `Diff beginnt an der Grenze (${JSON.stringify(lage)})`).toBeLessThanOrEqual(32);
  expect(lage.diffRechts, `Diff reicht bis zum Fensterrand (${JSON.stringify(lage)})`).toBeGreaterThanOrEqual(lage.fensterBreite - 1);
}

/** Der Diff ist breiter als vor dem Einklappen (die Seitenleiste ist gewichen). */
function pruefeDiffBreiter(page, vorher) {
  return grenzlage(page).then(nachher => {
    expect(nachher.diffBreite, `Diff-Breite nach dem Einklappen (${nachher.diffBreite} px, vorher ${vorher} px)`).toBeGreaterThan(vorher);
    return nachher.diffBreite;
  });
}

/** Kein Trenn-Zug, solange eingeklappt ist (der Trenner ist nicht sichtbar). */
async function pruefeKeinTrennzug(page) {
  await expect(page.locator(TRENNER), 'Trenn-Zug eingeklappt').toBeHidden();
}

module.exports = {
  KNOPF, STREIFEN, SEITENLEISTE, RAHMEN, TRENNER,
  knopf, betatigen, tasteB, knopfAngaben, sichtbarerFokusring, seitenleisteAngaben, streifenAngaben, grenzlage,
  pruefeZustand, pruefeKnopf, pruefeSeitenleisteVerborgen, pruefeSeitenleisteSichtbar, pruefeStreifen, pruefeVolleBreite,
  pruefeDiffBreiter, pruefeKeinTrennzug,
};