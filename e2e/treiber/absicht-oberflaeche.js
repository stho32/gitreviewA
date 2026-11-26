'use strict';
// Treiber Absicht der KI über dem Diff (R00038): der einzige Ort, der die Selektoren des Blocks kennt.
const { expect } = require('@playwright/test');

const ROLLBEREICH = '#diff .df-sc';
const BLOCK = `${ROLLBEREICH} > .absicht`;
const ZEILE = `${BLOCK} .absicht-zeile`;
const MEHR = `${BLOCK} .absicht-mehr`;
const ERSTE_DIFFZEILE = `${ROLLBEREICH} tr[data-art]`;

function block(page) {
  return page.locator(BLOCK);
}

/** Die Zeilen des Blocks in Reihenfolge: Kurz-Hash und Betreff, wie sie sichtbar stehen. */
async function zeilenLesen(page) {
  return page.locator(ZEILE).evaluateAll(zeilen => zeilen.map(zeile => ({
    kurz: zeile.querySelector('.absicht-hash').textContent,
    betreff: zeile.querySelector('.absicht-betreff').textContent,
  })));
}

async function zeilenSind(page, erwartet) {
  await expect.poll(() => zeilenLesen(page), 'Zeilen des Absicht-Blocks').toEqual(erwartet);
}

async function zeilenSindKurz(page, kurze) {
  await expect.poll(async () => (await zeilenLesen(page)).map(zeile => zeile.kurz), 'Kurz-Hashes des Absicht-Blocks').toEqual(kurze);
}

/** Kein Block: er fehlt im Rollbereich (Zustand „Datei wählen“, Wahl aufgehoben). */
async function keinBlock(page) {
  await expect.poll(() => block(page).count(), 'Absicht-Block').toBe(0);
}

/** Ob der Rollbereich verborgen ist (ohne Wahl und ohne Block, R00038). */
async function rollbereichVerborgen(page) {
  return page.locator(ROLLBEREICH).evaluate(element => element.hidden);
}

/** Der Block ist das erste Kind des Rollbereichs — über jeder Diff-Zeile und jeder Meldung. */
async function blockIstErstesKind(page) {
  await expect.poll(() => page.evaluate(rollbereich => {
    const erstes = document.querySelector(rollbereich).firstElementChild;
    return Boolean(erstes && erstes.classList.contains('absicht'));
  }, ROLLBEREICH), 'Absicht-Block als erstes Kind des Rollbereichs').toBe(true);
}

/** Der Block steht im Dokument vor der ersten Diff-Zeile (über dem Inhalt, R00038). */
async function blockStehtUeberDerErstenZeile(page) {
  const vor = await page.evaluate(([rollbereich, blockSelektor, zeileSelektor]) => {
    const blockElement = document.querySelector(blockSelektor);
    const zeileElement = document.querySelector(zeileSelektor);
    if (!blockElement || !zeileElement) {
      return false;
    }
    return Boolean(blockElement.compareDocumentPosition(zeileElement) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, [ROLLBEREICH, BLOCK, ERSTE_DIFFZEILE]);
  expect(vor, 'der Block steht über der ersten Diff-Zeile').toBe(true);
}

function mehrKnopf(page) {
  return page.locator(MEHR);
}

async function mehrText(page) {
  if (await mehrKnopf(page).count() === 0) {
    return null;
  }
  return mehrKnopf(page).textContent();
}

async function mehrBetatigen(page) {
  await mehrKnopf(page).click();
}

function nachrichtKnopf(page, kurzHash) {
  return page.locator(`${ZEILE}[data-hash^="${kurzHash}"] .absicht-nachricht`);
}

async function nachrichtAufklappen(page, kurzHash) {
  await nachrichtKnopf(page, kurzHash).click();
}

async function nachrichtZuklappen(page, kurzHash) {
  await nachrichtKnopf(page, kurzHash).click();
}

/** Der Knopf steht auf `aria-expanded` und der Rumpf ist sichtbar (bzw. beides umgekehrt). */
async function nachrichtZustand(page, kurzHash, offen) {
  await expect(nachrichtKnopf(page, kurzHash)).toHaveAttribute('aria-expanded', String(offen));
  await expect(rumpfInDerZeile(page, kurzHash)).toHaveCount(offen ? 1 : 0);
}

function rumpfInDerZeile(page, kurzHash) {
  return page.locator(`${ZEILE}[data-hash^="${kurzHash}"] .absicht-rumpf`);
}

/** Ob der Rumpf dieses Commits im DOM steht (vor dem Aufklappen nicht, R00038). */
async function rumpfStehtImDom(page, kurzHash) {
  return rumpfInDerZeile(page, kurzHash).count();
}

async function rumpfText(page, kurzHash) {
  return rumpfInDerZeile(page, kurzHash).textContent();
}

/** Der volle Betreff im Hinweistext und im zugänglichen Namen (R00039-Regel, PO Zeile 247). */
async function betreffTitel(page, kurzHash) {
  return page.locator(`${ZEILE}[data-hash^="${kurzHash}"] .absicht-betreff`).getAttribute('title');
}

/** Maße einer Betreffzeile: Höhe (eine Zeile hoch) und die sichtbare Kürzung „…“ statt eines harten Abschnitts. */
async function betreffmass(page, kurzHash) {
  return page.locator(`${ZEILE}[data-hash^="${kurzHash}"] .absicht-betreff`).evaluate(element => {
    const stil = getComputedStyle(element);
    return {
      hoehe: element.getBoundingClientRect().height,
      ueberlaeuft: element.scrollWidth > element.clientWidth,
      textOverflow: stil.textOverflow,
      whiteSpace: stil.whiteSpace,
    };
  });
}

/** Der Block ist das erste Kind des Rollbereichs und steht damit vor dem Inhalt (Bild, Abschnitte, Zeilen) — R00038. */
async function blockStehtUeberDemInhalt(page) {
  const ueber = await page.evaluate(rollbereich => {
    const rollElement = document.querySelector(rollbereich);
    const blockElement = rollElement.querySelector(':scope > .absicht');
    if (!blockElement || rollElement.firstElementChild !== blockElement) {
      return false;
    }
    const inhaltElement = rollElement.querySelector(':scope > :not(.absicht)');
    if (inhaltElement === null) {
      return true;
    }
    return Boolean(blockElement.compareDocumentPosition(inhaltElement) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, ROLLBEREICH);
  expect(ueber, 'der Block steht über dem Inhalt des Rollbereichs').toBe(true);
}

/** Höhe des Diff-Kopfs, Höhe und Bildlauf des Rollbereichs und Höhe des Blocks. */
async function masseLesen(page) {
  return page.evaluate(rollbereich => {
    const rollElement = document.querySelector(rollbereich);
    const kopfElement = document.querySelector('#diff .diff-kopf');
    const blockElement = document.querySelector(`${rollbereich} > .absicht`);
    return {
      kopfHoehe: kopfElement.getBoundingClientRect().height,
      rollHoehe: rollElement.getBoundingClientRect().height,
      blockHoehe: blockElement === null ? 0 : blockElement.getBoundingClientRect().height,
      bildlauf: rollElement.scrollTop,
      rollBreite: rollElement.getBoundingClientRect().width,
    };
  }, ROLLBEREICH);
}

async function bildlaufSetzen(page, versatz) {
  await page.locator(ROLLBEREICH).evaluate((element, wert) => { element.scrollTop = wert; }, versatz);
}

module.exports = {
  zeilenLesen, zeilenSind, zeilenSindKurz, keinBlock, rollbereichVerborgen, blockIstErstesKind, blockStehtUeberDerErstenZeile, blockStehtUeberDemInhalt,
  mehrKnopf, mehrText, mehrBetatigen, nachrichtKnopf, nachrichtAufklappen, nachrichtZuklappen, nachrichtZustand,
  rumpfStehtImDom, rumpfText, betreffTitel, betreffmass, masseLesen, bildlaufSetzen,
};
