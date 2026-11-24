'use strict';
// Treiber Oberfläche des Diff-Bereichs (R00004): der einzige Ort, der seine Selektoren kennt; die Prüfungen dazu sitzen hier.
const { expect } = require('@playwright/test');

const BEREICH = '#diff';
const PFAD = '#diff .diff-pfad';
const MELDUNG = '#diff .diff-meldung';
const ROLLBEREICH = '#diff .df-sc';
const ZEILE = '#diff .dz tr';
const HINWEIS_ZUR_WAHL = 'Datei wählen, um ihren Diff zu sehen';
const VORZEICHEN = { plus: '+', minus: '−' };
const VERZOEGERUNG_MS = 1500;

/** Je Zeile Art, Nummern (aus den Spalten und aus `data-alt`/`data-neu`), Vorzeichen und Text ohne die Lesetexte für Screenreader. */
async function diffZeilenLesen(page) {
  return page.locator(ZEILE).evaluateAll(zeilen => zeilen.map(zeile => {
    const art = zeile.dataset.art;
    const textZelle = zeile.querySelector('.c');
    const lesetext = textZelle.querySelector('.vh');
    let text = textZelle.textContent;
    if (lesetext) {
      text = text.slice(lesetext.textContent.length);
    }
    if (art === 'kopf') {
      return { art, text };
    }
    return {
      art,
      alt: zeile.querySelector('.alt').textContent,
      neu: zeile.querySelector('.neu').textContent,
      datenAlt: zeile.dataset.alt,
      datenNeu: zeile.dataset.neu,
      vorzeichen: zeile.querySelector('.m').textContent,
      text,
    };
  }));
}

/** Erwartete Zeile der Spezifikation → gelesene Form; Nummern stehen in Spalte und Attribut gleich, leer, wo es keine gibt. */
function alsGeleseneZeile(erwartet) {
  if ('kopf' in erwartet) {
    return { art: 'kopf', text: erwartet.kopf };
  }
  const [art] = ['kontext', 'plus', 'minus', 'hinweis'].filter(name => name in erwartet);
  const alt = nummerText(erwartet.alt);
  const neu = nummerText(erwartet.neu);
  let vorzeichen = VORZEICHEN[art];
  if (vorzeichen === undefined) {
    vorzeichen = '';
  }
  return { art, alt, neu, datenAlt: alt, datenNeu: neu, vorzeichen, text: erwartet[art] };
}

function nummerText(nummer) {
  if (nummer === undefined) {
    return '';
  }
  return String(nummer);
}

async function pruefeDiff(page, { pfad, zeilen }) {
  await expect(page.locator(PFAD)).toHaveText(pfad);
  await pruefeKeinSchalter(page);
  await expect.poll(() => diffZeilenLesen(page), `Diff von ${pfad}`).toEqual(zeilen.map(alsGeleseneZeile));
  await expect(page.locator(MELDUNG)).toHaveText('');
}

async function pruefeMeldung(page, pfad, text, istFehler) {
  await expect(page.locator(PFAD)).toHaveText(pfad);
  await expect(page.locator(MELDUNG)).toHaveText(text);
  await expect(page.locator(ZEILE)).toHaveCount(0);
  if (istFehler) {
    await expect(page.locator(MELDUNG)).toHaveClass(/\bfehler\b/);
  }
}

const ALS_TEXT = 'Als Text zeigen';
const TROTZDEM_LADEN = 'Trotzdem laden';

/** Meldung „Binärdatei — <Grund>“, kein Byte-Inhalt, Schalter „Als Text zeigen“ bereit. */
async function pruefeBinaer(page, pfad, grund) {
  await pruefeMeldung(page, pfad, `Binärdatei — ${grund}`, false);
  await expect(page.locator(BEREICH).getByRole('button', { name: ALS_TEXT })).toBeVisible();
}

async function alsTextZeigen(page) {
  await page.locator(BEREICH).getByRole('button', { name: ALS_TEXT }).click();
}

/** Text über der Grenze: Meldung mit Zeilenzahl, keine Zeilen, Schalter „Trotzdem laden“. */
async function pruefeZugeklappt(page, pfad, meldung) {
  await pruefeMeldung(page, pfad, meldung, false);
  await expect(page.locator(BEREICH).getByRole('button', { name: ALS_TEXT })).toBeHidden();
  await expect(page.locator(BEREICH).getByRole('button', { name: TROTZDEM_LADEN })).toBeVisible();
}

async function trotzdemLaden(page) {
  await page.locator(BEREICH).getByRole('button', { name: TROTZDEM_LADEN }).click();
}

async function pruefeZeile(page, neu, text) {
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${text}`);
  await expect(page.locator(MELDUNG)).toHaveText('');
}

async function pruefeKeinSchalter(page) {
  await expect(page.locator(BEREICH).getByRole('button', { name: ALS_TEXT })).toBeHidden();
  await expect(page.locator(BEREICH).getByRole('button', { name: TROTZDEM_LADEN })).toBeHidden();
}

async function pruefeAufforderungZurWahl(page) {
  await expect(page.locator(MELDUNG)).toHaveText(HINWEIS_ZUR_WAHL);
  await expect(page.locator(PFAD)).toHaveText('');
  await expect(page.locator(ZEILE)).toHaveCount(0);
}

async function umbruchUmschalten(page) {
  await page.locator(BEREICH).getByLabel('Umbruch').click();
}

/** Höhe der Zeile mit Nummer neu `neu` im Verhältnis zur Zeile 1, und ob der Bereich waagerecht scrollen kann. */
async function zeilenmass(page, neu) {
  return page.evaluate(([rollSelektor, zeilenSelektor, nummer]) => {
    const hoehe = n => document.querySelector(`${zeilenSelektor}[data-neu="${n}"]`).getBoundingClientRect().height;
    const rollElement = document.querySelector(rollSelektor);
    return { verhaeltnis: hoehe(nummer) / hoehe(1), scrolltWaagerecht: rollElement.scrollWidth > rollElement.clientWidth };
  }, [ROLLBEREICH, ZEILE, neu]);
}

async function pruefeEinzeilig(page, neu, text) {
  await expect(page.locator(BEREICH).getByLabel('Umbruch')).not.toBeChecked();
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${text}`);
  const mass = await zeilenmass(page, neu);
  // Zeile 1 trägt die halbe Kante des Hunk-Kopfs (border-collapse); eine Bildschirmzeile mehr wäre das Doppelte
  expect(mass.verhaeltnis, `Höhe von Zeile ${neu} zu Zeile 1`).toBeCloseTo(1, 1);
  expect(mass.scrolltWaagerecht, 'waagerecht scrollbar').toBe(true);
}

async function pruefeUmbrochen(page, neu, text) {
  await expect(page.locator(BEREICH).getByLabel('Umbruch')).toBeChecked();
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${text}`);
  const mass = await zeilenmass(page, neu);
  expect(mass.verhaeltnis, `Höhe von Zeile ${neu} zu Zeile 1`).toBeGreaterThan(1.5);
  expect(mass.scrolltWaagerecht, 'waagerecht scrollbar').toBe(false);
}

/** Hält die Antwort auf den Diff von `pfad` 1,5 s zurück; `eingetroffen` wartet, bis sie da ist und gezeichnet sein könnte. */
async function diffAntwortVerzoegern(page, pfad) {
  const istDiffVon = url => url.includes('/diff?') && new URL(url).searchParams.get('pfad') === pfad;
  await page.route(url => istDiffVon(url.toString()), async route => {
    await new Promise(weiter => setTimeout(weiter, VERZOEGERUNG_MS));
    await route.continue();
  });
  const antwort = page.waitForResponse(response => istDiffVon(response.url()));
  return {
    eingetroffen: async () => {
      await antwort;
      await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
    },
  };
}

/** Wählt die Datei über `waehlen` und misst vom Klick, bis die Zeile mit Nummer neu `neu` im Dokument steht; liefert den Messwert. */
async function pruefeZeileBinnenNachKlick(page, waehlen, { kopf, plus, neu }, fristMs) {
  const klickUmMs = Date.now();
  await waehlen();
  await page.waitForFunction(([selektor, nummer]) => document.querySelector(`${selektor}[data-neu="${nummer}"]`) !== null, [ZEILE, neu], { polling: 'raf', timeout: 10000 });
  const dauerMs = Date.now() - klickUmMs;
  expect(dauerMs, `Zeile ${neu} nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  await expect(page.locator(`${ZEILE}[data-art="kopf"]`).first()).toHaveText(kopf);
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"] .c`)).toHaveText(`hinzugefügt: ${plus}`);
  return dauerMs;
}

/** Wählt `datei` (über `dateiWaehlen`), klickt „Als Text zeigen“ und misst, bis Zeilen oder „Trotzdem laden“ stehen und zwei Bilder gezeichnet sind; dann muss ein Klick auf `andereDatei` ihren Diff zeigen. */
async function pruefeBedienbarNachAlsText(page, dateiWaehlen, datei, andereDatei, fristMs) {
  await dateiWaehlen(datei);
  await expect(page.locator(BEREICH).getByRole('button', { name: ALS_TEXT })).toBeVisible();
  const klickUmMs = Date.now();
  await alsTextZeigen(page);
  await page.waitForFunction(
    ([zeile, bereich]) => document.querySelector(zeile) !== null || (document.querySelector(`${bereich} .trotzdem-laden`) && !document.querySelector(`${bereich} .trotzdem-laden`).hidden),
    [`${ZEILE}`, BEREICH],
    { polling: 'raf', timeout: 30000 },
  );
  await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
  await dateiWaehlen(andereDatei);
  await expect(page.locator(`${ZEILE}[data-neu="1"] .c`)).toHaveText('hinzugefügt: eins', { timeout: 30000 });
  const dauerMs = Date.now() - klickUmMs;
  expect(dauerMs, `${datei}: bedienbar nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  return dauerMs;
}

module.exports = {
  pruefeBedienbarNachAlsText,
  pruefeDiff, pruefeMeldung, pruefeAufforderungZurWahl, umbruchUmschalten, pruefeEinzeilig, pruefeUmbrochen, diffAntwortVerzoegern,
  pruefeZeileBinnenNachKlick, pruefeBinaer, alsTextZeigen, pruefeZugeklappt, trotzdemLaden, pruefeZeile, pruefeKeinSchalter,
};
