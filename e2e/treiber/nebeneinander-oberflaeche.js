'use strict';
// Treiber Oberfläche der Nebeneinander-Ansicht (R00023): der einzige Ort, der ihre Selektoren kennt; die Prüfungen sitzen hier.
const { expect } = require('@playwright/test');
const diffSeite = require('./diff-oberflaeche.js');

const BEREICH = '#diff';
const ROLLBEREICH = '#diff .df-sc';
const ZEILE = '#diff .dz.ru-nb tbody tr[data-art]';

/** Schaltet die Anordnung über das Menü „Ansicht ▾“ und wartet, bis sie steht (`body[data-anordnung]`). */
async function anordnungWaehlen(page, anordnung) {
  await diffSeite.menueWaehlen(page, anordnung);
  await expect(page.locator('body')).toHaveAttribute('data-anordnung', anordnung);
}

/** Die Anordnung steht: `body[data-anordnung]` und der Menüeintrag stimmen überein. */
async function pruefeAnordnung(page, anordnung) {
  await expect(page.locator('body')).toHaveAttribute('data-anordnung', anordnung);
  const andere = anordnung === 'nebeneinander' ? 'untereinander' : 'nebeneinander';
  await diffSeite.menueOeffnen(page);
  await expect(diffSeite.menueEintrag(page, anordnung)).toHaveAttribute('aria-checked', 'true');
  await expect(diffSeite.menueEintrag(page, andere)).toHaveAttribute('aria-checked', 'false');
  await diffSeite.menueSchliessen(page);
}

/** Die Gruppe „Anordnung“ im Menü trägt ihren Namen und die beiden Einträge (R00023, Kriterium 12). */
async function pruefeGruppe(page) {
  await diffSeite.menueOeffnen(page);
  const gruppe = page.getByRole('group', { name: 'Anordnung' });
  await expect(gruppe).toHaveCount(1);
  await expect(diffSeite.menueEintrag(page, 'untereinander')).toBeVisible();
  await expect(diffSeite.menueEintrag(page, 'nebeneinander')).toBeVisible();
  await diffSeite.menueSchliessen(page);
}

/** Schaltet die Anordnung nur mit der Tastatur: das Kürzel `v` (R00039: die Kürzel wirken bei geschlossenem Menü). */
async function anordnungPerTastatur(page, anordnung) {
  await page.keyboard.press('v');
  await expect(page.locator('body')).toHaveAttribute('data-anordnung', anordnung);
}

/** Wartet, bis der Diff-Bereich gezeichnet ist: Diff-Zeilen stehen oder eine endgültige Meldung (nicht mehr „Diff wird geladen“). */
async function warteAufZeichnung(page) {
  await page.waitForFunction(laden => {
    const roll = document.querySelector('#diff .df-sc');
    if (roll && !roll.hidden && roll.querySelector('tbody tr[data-art]')) {
      return true;
    }
    const meldung = document.querySelector('#diff .diff-meldung');
    return Boolean(meldung) && meldung.textContent !== '' && meldung.textContent !== laden;
  }, 'Diff wird geladen …', { polling: 'raf', timeout: 15000 });
}

/** Die Tabellenzeilen der Nebeneinander-Ansicht: Hunk-Kopf, Hinweiszeile oder ein Paar (links alt, rechts neu);
    `einschraenkung` grenzt die Auswahl ein (etwa `[data-neu="7"]` für eine einzelne Zeile). */
async function zeilenPaareLesen(page, einschraenkung = '') {
  return page.locator(`${ZEILE}${einschraenkung}`).evaluateAll(zeilen => {
    const seite = (zelle, feld) => {
      if (!zelle) {
        return null;
      }
      const lesetext = zelle.querySelector('.vh');
      let text = zelle.textContent;
      if (lesetext) {
        text = text.slice(lesetext.textContent.length);
      }
      const nummer = zelle.dataset[feld];
      return { art: zelle.dataset.art, nummer: nummer === undefined || nummer === '' ? null : nummer, text };
    };
    return zeilen.map(tr => {
      const art = tr.dataset.art;
      if (art === 'kopf') {
        return { kopf: tr.querySelector('td.c').textContent };
      }
      const links = seite(tr.querySelector('td.c-alt'), 'alt');
      const rechts = seite(tr.querySelector('td.c-neu'), 'neu');
      if (art === 'hinweis') {
        const traeger = links || rechts;
        return { hinweis: traeger.text, seite: links ? 'links' : 'rechts' };
      }
      return { links, rechts };
    });
  });
}

/** Erwartete Zeile der Spezifikation → gelesene Form: `{kopf}`, `{hinweis, seite}` oder `{links, rechts}`. */
function alsPaar(erwartet) {
  if ('kopf' in erwartet) {
    return { kopf: erwartet.kopf };
  }
  if ('hinweis' in erwartet) {
    return { hinweis: erwartet.hinweis, seite: erwartet.seite };
  }
  return { links: erwarteteSeite(erwartet.links), rechts: erwarteteSeite(erwartet.rechts) };
}

function erwarteteSeite(seite) {
  if (seite === null || seite === undefined) {
    return null;
  }
  return { art: seite.art, nummer: seite.nummer === undefined ? null : String(seite.nummer), text: seite.text };
}

async function pruefeZeilenPaare(page, erwartet) {
  await expect.poll(() => zeilenPaareLesen(page), 'Zeilenpaare').toEqual(erwartet.map(alsPaar));
}

/** Das gelesene Paar der Tabellenzeile mit Nummer neu `neu` (links die alte, rechts die neue Seite) — auch eine aufgedeckte
    Kontextzeile trägt ihre Nummer neu und steht in beiden Spalten (R00026, Nacharbeit I0007). */
async function pruefePaarMitZeile(page, neu, erwartet) {
  await expect.poll(async () => {
    const paare = await zeilenPaareLesen(page, `[data-neu="${neu}"]`);
    if (paare.length === 0) {
      return null;
    }
    return paare[0];
  }, `Zeile neu ${neu}`).toEqual(alsPaar(erwartet));
}

/** Die Spaltenköpfe „alte Fassung“/„neue Fassung“ und ihre Namen (je über zwei Spalten). */
async function pruefeSpaltenkoepfe(page) {
  const kopf = await page.locator(`${BEREICH} .dz.ru-nb thead th`).evaluateAll(zellen => zellen.map(zelle => ({
    text: zelle.textContent, colspan: zelle.colSpan, scope: zelle.getAttribute('scope'),
  })));
  expect(kopf).toEqual([
    { text: 'alte Fassung', colspan: 2, scope: 'col' },
    { text: 'neue Fassung', colspan: 2, scope: 'col' },
  ]);
}

/** Die rechte Zelle einer unveränderten Zeile ist `aria-hidden` (einmal gelesen). */
async function pruefeKontextEinmalGelesen(page) {
  const zellen = await page.locator(`${ZEILE}[data-art="kontext"]`).evaluateAll(zeilen => zeilen.map(tr => {
    const links = tr.querySelector('td.c-alt');
    const rechts = tr.querySelector('td.c-neu');
    return { linksVerborgen: links.getAttribute('aria-hidden'), rechtsVerborgen: rechts.getAttribute('aria-hidden') };
  }));
  expect(zellen.length).toBeGreaterThan(0);
  for (const zelle of zellen) {
    expect(zelle.linksVerborgen).toBeNull();
    expect(zelle.rechtsVerborgen).toBe('true');
  }
}

/** Kriterium 7: beim Start („Umbruch“ an, R00032) ist die lange Zeile mehrere Bildschirmzeilen hoch und der Bereich scrollt
    nicht waagerecht; nach dem Umschalten steht sie eine Bildschirmzeile hoch und der Bereich scrollt waagerecht; beide
    Code-Spalten sind gleich breit. Liefert die Messwerte. */
async function pruefeBreiteUndUmbruch(page, neu) {
  const messen = () => page.evaluate(([selektor, nummer]) => {
    const zeile = document.querySelector(`${selektor}[data-neu="${nummer}"]`);
    const zeile1 = zeile.parentElement.querySelector('tr[data-neu="1"]');
    const roll = document.querySelector('#diff .df-sc');
    const breite = zelle => (zelle ? zelle.getBoundingClientRect().width : 0);
    return {
      verhaeltnis: zeile.getBoundingClientRect().height / (zeile1 ? zeile1.getBoundingClientRect().height : 1),
      scrolltWaagerecht: roll.scrollWidth > roll.clientWidth,
      breiteAlt: breite(zeile.children[1]),
      breiteNeu: breite(zeile.children[3]),
    };
  }, [ZEILE, neu]);
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"]`)).toBeVisible();
  const mitUmbruch = await messen();
  await diffSeite.umbruchUmschalten(page);
  await page.waitForFunction(([selektor, nummer]) => {
    const zeile = document.querySelector(`${selektor}[data-neu="${nummer}"]`);
    const roll = document.querySelector('#diff .df-sc');
    return zeile && roll.scrollWidth > roll.clientWidth;
  }, [ZEILE, neu], { polling: 'raf', timeout: 10000 });
  const ohneUmbruch = await messen();
  return { ohneUmbruch, mitUmbruch };
}

/** Kriterium 7: die Breiten der vier Spalten der Zeile mit Nummer neu `neu` und die Breite ihres sichtbaren Textes (in px).
    Der ausgeblendete Lesetext für Screenreader (`.vh`) zählt nicht zur Textbreite. */
async function spaltenbreitenLesen(page, neu) {
  await expect(page.locator(`${ZEILE}[data-neu="${neu}"]`)).toBeVisible();
  return page.evaluate(([selektor, nummer]) => {
    const zeile = document.querySelector(`${selektor}[data-neu="${nummer}"]`);
    const breite = element => (element ? element.getBoundingClientRect().width : 0);
    const textBreite = zelle => {
      const bereich = document.createRange();
      let groesste = 0;
      for (const kind of zelle.childNodes) {
        if (kind.nodeType === Node.ELEMENT_NODE && kind.classList.contains('vh')) {
          continue;
        }
        bereich.selectNodeContents(kind);
        for (const rechteck of bereich.getClientRects()) {
          groesste = Math.max(groesste, rechteck.width);
        }
      }
      return groesste;
    };
    const [nummerLinks, links, nummerRechts, rechts] = Array.from(zeile.children);
    return {
      nummerLinks: breite(nummerLinks),
      nummerRechts: breite(nummerRechts),
      codeLinks: breite(links),
      codeRechts: breite(rechts),
      textLinks: textBreite(links),
      textRechts: textBreite(rechts),
    };
  }, [ZEILE, neu]);
}

/** Der Sprunglink der Nummer-neu-Zelle (R00023, Kriterium 12): genau einer mit dem Namen für Vorlesewerkzeuge. */
async function pruefeSprungzeile(page, neu, name) {
  const anker = page.locator(`${ZEILE}[data-neu="${neu}"] td.n.neu > a`);
  await expect(anker, `Sprunglink der Zeile neu ${neu}`).toHaveCount(1);
  await expect(anker).toHaveAttribute('aria-label', name);
}

/** Ob der Sprunglink in einem `aria-hidden`-Teilbaum liegt — dort hat er für Vorlesewerkzeuge keinen Namen. */
function sprungzeileLiegtImVerborgenen(page, neu) {
  return page.locator(`${ZEILE}[data-neu="${neu}"] td.n.neu > a`).evaluate(anker => anker.closest('[aria-hidden="true"]') !== null);
}

/** Die Zahl der Sprunglinks im Bereich. */
function sprunglinksZaehlen(page) {
  return page.locator(`${ZEILE} a`).count();
}

/** Klickt die linke Textzelle der entfernten Zeile mit Nummer alt `alt` (R00023, Kriterium 10). */async function linksTextzelleAnklicken(page, alt) {
  await page.locator(`${ZEILE}[data-art="minus"][data-alt="${alt}"] td.c-alt`).click();
}

/** Klickt die rechte Textzelle der Zeile mit Nummer neu `neu`. */
async function rechtsTextzelleAnklicken(page, neu) {
  await page.locator(`${ZEILE}[data-neu="${neu}"] td.c-neu`).click();
}

/** Die Farbstück-Klassen (`tk-…`) je Textzelle der Tabellenzeilen: links (alte Seite) und rechts (neue Seite). */
async function farbeRollenLesen(page) {
  return page.locator(ZEILE).evaluateAll(zeilen => zeilen.map(tr => {
    const rollen = zelle => (zelle ? Array.from(zelle.querySelectorAll('span[class*="tk-"]')).map(span => span.className) : []);
    return { links: rollen(tr.querySelector('td.c-alt')), rechts: rollen(tr.querySelector('td.c-neu')) };
  }));
}

/** Text und Farbstücke je Textzelle der Tabellenzeilen — für die Probe, dass auch Zeilen ohne Farbstücke in der Ansicht
    bleiben und die Färbung der Zeilen danach nicht abbricht. Der Lesetext für Screenreader zählt nicht zum Text. */
async function farbRollenMitTextLesen(page) {
  return page.locator(ZEILE).evaluateAll(zeilen => zeilen.map(tr => {
    const seite = zelle => {
      if (!zelle) {
        return null;
      }
      const lesetext = zelle.querySelector('.vh');
      let text = zelle.textContent;
      if (lesetext) {
        text = text.slice(lesetext.textContent.length);
      }
      return { text, rollen: Array.from(zelle.querySelectorAll('span[class*="tk-"]')).map(span => span.className) };
    };
    return { links: seite(tr.querySelector('td.c-alt')), rechts: seite(tr.querySelector('td.c-neu')) };
  }));
}

async function entferntHinweis(page) {
  return page.locator('#diff .anmerkung-hinweis').textContent();
}

/** Klickt den Anordnungs-Eintrag im Menü, ohne zu warten (für die Zeitmessung, Kriterium 14). */
async function anordnungKlicken(page, anordnung) {
  await diffSeite.menueOeffnen(page);
  await diffSeite.menueEintrag(page, anordnung).click();
}

/** Führt `aktion` aus und misst, bis die Tabellenzeile links `linksText` und rechts `rechtsText` steht (Kriterium 14). */
async function pruefePaarBinnen(page, aktion, linksText, rechtsText, fristMs) {
  const startUmMs = Date.now();
  await aktion();
  await page.waitForFunction(([selector, links, rechts]) => {
    const text = zelle => {
      if (!zelle) {
        return null;
      }
      const lesetext = zelle.querySelector('.vh');
      let inhalt = zelle.textContent;
      if (lesetext) {
        inhalt = inhalt.slice(lesetext.textContent.length);
      }
      return inhalt;
    };
    return Array.from(document.querySelectorAll(selector)).some(tr => text(tr.querySelector('td.c-alt')) === links && text(tr.querySelector('td.c-neu')) === rechts);
  }, [ZEILE, linksText, rechtsText], { polling: 'raf', timeout: 15000 });
  const dauerMs = Date.now() - startUmMs;
  expect(dauerMs, `${linksText}/${rechtsText} nach ${dauerMs} ms`).toBeLessThanOrEqual(fristMs);
  return dauerMs;
}

/** Ob eine Tabellenzeile links `linksText` und rechts `rechtsText` trägt (jeweils ohne den Lesetext für Screenreader). */
async function hatZeilenpaar(page, linksText, rechtsText) {
  return page.locator(ZEILE).evaluateAll((zeilen, [links, rechts]) => {
    const text = zelle => {
      if (!zelle) {
        return null;
      }
      const lesetext = zelle.querySelector('.vh');
      let inhalt = zelle.textContent;
      if (lesetext) {
        inhalt = inhalt.slice(lesetext.textContent.length);
      }
      return inhalt;
    };
    return zeilen.some(tr => text(tr.querySelector('td.c-alt')) === links && text(tr.querySelector('td.c-neu')) === rechts);
  }, [linksText, rechtsText]);
}

module.exports = {
  anordnungWaehlen, pruefeAnordnung, pruefeGruppe, anordnungPerTastatur, warteAufZeichnung, zeilenPaareLesen, pruefeZeilenPaare, pruefePaarMitZeile, pruefeSpaltenkoepfe, pruefeKontextEinmalGelesen, pruefeBreiteUndUmbruch,
  spaltenbreitenLesen, pruefeSprungzeile, sprungzeileLiegtImVerborgenen, sprunglinksZaehlen,
  linksTextzelleAnklicken, rechtsTextzelleAnklicken, farbeRollenLesen, farbRollenMitTextLesen, entferntHinweis, hatZeilenpaar, anordnungKlicken, pruefePaarBinnen, ROLLBEREICH, ZEILE,
};

