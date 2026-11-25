'use strict';
// Treiber Oberfläche der Nebeneinander-Ansicht (R00023): der einzige Ort, der ihre Selektoren kennt; die Prüfungen sitzen hier.
const { expect } = require('@playwright/test');

const BEREICH = '#diff';
const ROLLBEREICH = '#diff .df-sc';
const ANORDNUNG = '#diff .anordnung-wahl';
const ZEILE = '#diff .dz.ru-nb tbody tr[data-art]';

/** Schaltet die Anordnung über den Werkzeugkasten und wartet, bis sie steht (`body[data-anordnung]`). */
async function anordnungWaehlen(page, anordnung) {
  await page.locator(ANORDNUNG).getByRole('button', { name: anordnung, exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-anordnung', anordnung);
}

/** Die Anordnung steht: der gedrückte Knopf ist der gewählte, die übrigen sind es nicht. */
async function pruefeAnordnung(page, anordnung) {
  await expect(page.locator('body')).toHaveAttribute('data-anordnung', anordnung);
  for (const wert of ['untereinander', 'nebeneinander']) {
    await expect(page.locator(`${ANORDNUNG} [data-anordnung="${wert}"]`)).toHaveAttribute('aria-pressed', String(wert === anordnung));
  }
  await expect(page.locator(`${ANORDNUNG} [data-anordnung]`)).toHaveCount(2);
}

/** Die Gruppe „Anordnung“ trägt ihren Namen und die beiden Knöpfe (R00023, Kriterium 12). */
async function pruefeGruppe(page) {
  const gruppe = page.getByRole('group', { name: 'Anordnung' });
  await expect(gruppe).toHaveCount(1);
  await expect(gruppe.getByRole('button', { name: 'untereinander', exact: true })).toBeVisible();
  await expect(gruppe.getByRole('button', { name: 'nebeneinander', exact: true })).toBeVisible();
}

/** Schaltet die Anordnung nur mit der Tastatur: Fokus auf den Knopf, dann Leertaste. */
async function anordnungPerTastatur(page, anordnung) {
  await page.locator(`${ANORDNUNG} [data-anordnung="${anordnung}"]`).focus();
  await page.keyboard.press('Space');
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

/** Die Tabellenzeilen der Nebeneinander-Ansicht: Hunk-Kopf, Hinweiszeile oder ein Paar (links alt, rechts neu). */
async function zeilenPaareLesen(page) {
  return page.locator(ZEILE).evaluateAll(zeilen => {
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

/** Kriterium 7: ohne Umbruch steht die lange Zeile einzeilig und der Bereich scrollt waagerecht, mit Umbruch ist sie mehrere
    Bildschirmzeilen hoch und der Bereich scrollt nicht waagerecht; beide Code-Spalten sind gleich breit. Liefert die Messwerte. */
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
  const ohneUmbruch = await messen();
  await page.locator('#diff .diff-kopf').getByLabel('Umbruch').click();
  await page.waitForFunction(([selektor, nummer]) => {
    const zeile = document.querySelector(`${selektor}[data-neu="${nummer}"]`);
    const roll = document.querySelector('#diff .df-sc');
    return zeile && roll.scrollWidth <= roll.clientWidth;
  }, [ZEILE, neu], { polling: 'raf', timeout: 10000 });
  const mitUmbruch = await messen();
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

async function entferntHinweis(page) {
  return page.locator('#diff .anmerkung-hinweis').textContent();
}

/** Klickt den Anordnungs-Knopf, ohne zu warten (für die Zeitmessung, Kriterium 14). */
async function anordnungKlicken(page, anordnung) {
  await page.locator(`${ANORDNUNG} [data-anordnung="${anordnung}"]`).click();
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
  anordnungWaehlen, pruefeAnordnung, pruefeGruppe, anordnungPerTastatur, warteAufZeichnung, zeilenPaareLesen, pruefeZeilenPaare, pruefeSpaltenkoepfe, pruefeKontextEinmalGelesen, pruefeBreiteUndUmbruch,
  spaltenbreitenLesen, pruefeSprungzeile, sprungzeileLiegtImVerborgenen, sprunglinksZaehlen,
  linksTextzelleAnklicken, rechtsTextzelleAnklicken, farbeRollenLesen, entferntHinweis, hatZeilenpaar, anordnungKlicken, pruefePaarBinnen, ROLLBEREICH, ZEILE,
};

