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

module.exports = {
  anordnungWaehlen, pruefeAnordnung, zeilenPaareLesen, pruefeZeilenPaare, pruefeSpaltenkoepfe, pruefeKontextEinmalGelesen, ROLLBEREICH, ZEILE,
};
