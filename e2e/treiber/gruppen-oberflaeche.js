'use strict';
// Treiber Oberfläche „Dateiliste nach Gruppen“ (R00040): der einzige Ort, der die Selektoren der Gruppenköpfe kennt und die
// gezeigte Gruppenstruktur liest; die Prüfungen der Oberfläche sitzen hier. Die Dateizeilen selbst liest `oberflaeche.js`.
const { expect } = require('@playwright/test');

const LISTE = '#datei-zeilen';
const GRUPPENKOPF = `${LISTE} > .gruppe-kopf`;
const DATEIZEILE = `${LISTE} .datei-zeile`;

/** Die gezeigte Gruppenstruktur in Reihenfolge: `[{ name, zaehler, eintraege: [{ art, name, tiefe }] }]`. */
async function gruppenLesen(page) {
  return page.locator(`${LISTE} > li`).evaluateAll(eintraege => {
    const gruppen = [];
    let offene = null;
    for (const eintrag of eintraege) {
      if (eintrag.classList.contains('gruppe-kopf')) {
        offene = {
          name: eintrag.querySelector('.gruppe-name').textContent,
          zaehler: eintrag.querySelector('.gruppe-zaehler').textContent,
          eintraege: [],
        };
        gruppen.push(offene);
        continue;
      }
      if (!offene) {
        continue;
      }
      offene.eintraege.push({
        art: eintrag.classList.contains('ordner-zeile') ? 'ordner' : 'datei',
        name: eintrag.querySelector('.pfad').textContent,
        tiefe: Number(eintrag.dataset.tiefe),
      });
    }
    return gruppen;
  });
}

/** Die Namen der Gruppenköpfe in Anzeigereihenfolge. */
async function gruppenNamen(page) {
  return page.locator(GRUPPENKOPF).evaluateAll(köpfe => köpfe.map(kopf => kopf.querySelector('.gruppe-name').textContent));
}

/** Die Namen und Zählertexte der Gruppenköpfe in Anzeigereihenfolge. */
async function gruppenKoepfe(page) {
  return page.locator(GRUPPENKOPF).evaluateAll(köpfe => köpfe.map(kopf => ({
    name: kopf.querySelector('.gruppe-name').textContent,
    zaehler: kopf.querySelector('.gruppe-zaehler').textContent,
  })));
}

/** Die Namen der Dateizeilen in Anzeigereihenfolge (ohne Ordnerzeilen, ohne Gruppenköpfe). */
async function dateizeilenNamen(page) {
  return page.locator(DATEIZEILE).evaluateAll(zeilen => zeilen.map(zeile => zeile.querySelector('.pfad').textContent));
}

/** Wartet, bis die gezeigte Gruppenstruktur genau dieser entspricht (Reihenfolge, Köpfe, Einträge). */
async function pruefeGruppen(page, erwartet) {
  await expect.poll(() => gruppenLesen(page), { message: 'gezeigte Gruppenstruktur', timeout: 5000 }).toEqual(erwartet);
}

/** Wartet, bis die Gruppenköpfe (Name und Zähler) genau diesen entsprechen. */
async function pruefeGruppenKoepfe(page, erwartet) {
  await expect.poll(() => gruppenKoepfe(page), { message: 'Gruppenköpfe', timeout: 5000 }).toEqual(erwartet);
}

/** Wartet, bis die Dateizeilen genau diese Namen in dieser Reihenfolge tragen. */
async function pruefeDateizeilenReihe(page, erwartet) {
  await expect.poll(() => dateizeilenNamen(page), { message: 'Reihenfolge der Dateizeilen', timeout: 5000 }).toEqual(erwartet);
}

/** Keine Gruppenköpfe (etwa wenn alles ausgeblendet ist). */
async function pruefeKeineGruppen(page) {
  await expect(page.locator(GRUPPENKOPF), 'Gruppenköpfe').toHaveCount(0);
}

/** Der Gruppenkopf nennt seinen Namen und seinen Fortschritt als Text (NFA Benutzerfreundlichkeit: Text, nicht nur Balken). */
async function pruefeGruppenkoepfeAlsUeberschriften(page) {
  const gefunden = await page.locator(GRUPPENKOPF).evaluateAll(köpfe => köpfe.map(kopf => ({
    rolle: kopf.querySelector('.gruppe-titel').getAttribute('role'),
    ebene: kopf.querySelector('.gruppe-titel').getAttribute('aria-level'),
    text: kopf.textContent,
  })));
  expect(gefunden.length, 'es stehen Gruppenköpfe').toBeGreaterThan(0);
  for (const kopf of gefunden) {
    expect(kopf.rolle, 'Gruppenkopf ist eine Überschrift').toBe('heading');
    expect(kopf.ebene).toBe('2');
    expect(kopf.text).toMatch(/(Code|Tests|Doku) \d+ von \d+ abgehakt/);
  }
}

/** Die Zahl gesperrter Einträge je Gruppe, unabhängig aus den Zeilen gelesen (`.haken-grund` trägt den Grund, R00014). */
async function gesperrteJeGruppe(page) {
  return page.locator(`${LISTE} > li`).evaluateAll(eintraege => {
    const gruppen = [];
    let offene = null;
    for (const eintrag of eintraege) {
      if (eintrag.classList.contains('gruppe-kopf')) {
        offene = { name: eintrag.querySelector('.gruppe-name').textContent, gesperrt: 0 };
        gruppen.push(offene);
        continue;
      }
      const grund = eintrag.querySelector('.haken-grund');
      if (offene && grund && grund.textContent !== '') {
        offene.gesperrt += 1;
      }
    }
    return gruppen;
  });
}

/** Wartet, bis die Namen der Gruppenköpfe genau diese sind. */
async function pruefeGruppenNamen(page, erwartet) {
  await expect.poll(() => gruppenNamen(page), { message: 'Namen der Gruppenköpfe', timeout: 5000 }).toEqual(erwartet);
}

/** Es gibt keinen Gruppenkopf mit diesem Namen. */
async function pruefeKeineGruppeMitNamen(page, name) {
  await expect.poll(() => gruppenNamen(page), { message: `kein Gruppenkopf ${name}`, timeout: 5000 }).not.toContain(name);
}

module.exports = {
  gruppenLesen, gruppenNamen, gruppenKoepfe, gesperrteJeGruppe, dateizeilenNamen, pruefeGruppen, pruefeGruppenKoepfe,
  pruefeGruppenNamen, pruefeKeineGruppeMitNamen, pruefeDateizeilenReihe, pruefeKeineGruppen, pruefeGruppenkoepfeAlsUeberschriften,
};
