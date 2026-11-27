'use strict';
// Treiber Oberfläche „Formularfelder im Rollbereich“ (R00055): der einzige Ort, der die Eingabefelder der Seite per DOM
// einsammelt und je Feld die rechte Kante gegen seinen Rollbereich misst. Gesammelt wird (nicht aufgezählt), damit ein neu
// hinzugekommenes Feld ohne eigene Breitenregel auffällt — das ist der Zweck der Probe über **alle** Felder.
//
// Der Rollbereich eines Feldes ist der nächste Vorfahre, der beschneidet oder scrollt (`overflow` ≠ `visible`): im Review die
// Seitenleiste, der Diff-Bereich oder sein Rollbereich, in der Dateiansicht der Inhalt. Nur seine rechte Innenkante entscheidet,
// ob ein Feld „im Bereich“ liegt; rollt der Rollbereich waagerecht, ist ein Feld zu breit (Kriterium 1: `scrollLeft = 0`).
const { expect } = require('@playwright/test');

/** Sammelt jedes sichtbare Textfeld (`input` mit Text/Suche), jede `textarea` und jede `select` der Seite; Schalter, Kästchen
    und Optionsfelder sind keine Textfelder (R00055, Ausgangssituation) und bleiben außen vor. */
function lage(page) {
  return page.evaluate(() => {
    const TEXTARTEN = ['text', 'search', 'email', 'url', 'tel', 'password'];
    const beschreibe = element => {
      const klassen = typeof element.className === 'string' ? element.className.trim().replace(/\s+/g, '.') : '';
      return klassen ? `${element.tagName.toLowerCase()}.${klassen}` : element.tagName.toLowerCase();
    };
    const istTextfeld = element => {
      const tag = element.tagName.toLowerCase();
      if (tag === 'textarea' || tag === 'select') {
        return true;
      }
      return tag === 'input' && TEXTARTEN.includes((element.getAttribute('type') || 'text').toLowerCase());
    };
    const rollbereich = element => {
      let knoten = element.parentElement;
      while (knoten && knoten !== document.documentElement) {
        const stil = getComputedStyle(knoten);
        if (stil.overflowX !== 'visible' || stil.overflowY !== 'visible') {
          return knoten;
        }
        knoten = knoten.parentElement;
      }
      return document.documentElement;
    };
    return Array.from(document.querySelectorAll('input, textarea, select'))
      .filter(element => istTextfeld(element) && element.getClientRects().length > 0)
      .map(element => {
        const rahmen = element.getBoundingClientRect();
        const behaelter = rollbereich(element);
        const behaelterRahmen = behaelter.getBoundingClientRect();
        const behaelterStil = getComputedStyle(behaelter);
        const istWurzel = behaelter === document.documentElement;
        const innenRechts = behaelterRahmen.right - parseFloat(behaelterStil.borderRightWidth || '0')
          - (istWurzel ? 0 : parseFloat(behaelterStil.paddingRight || '0'));
        return {
          feld: { kennung: beschreibe(element), links: Math.round(rahmen.left), rechts: Math.round(rahmen.right), breite: Math.round(rahmen.width) },
          behaelter: { kennung: beschreibe(behaelter), rechts: Math.round(behaelterRahmen.right), innenRechts: Math.round(innenRechts), bildlauf: Math.round(behaelter.scrollLeft) },
        };
      });
  });
}

/** Die Kennungen aller im DOM gesammelten Felder (Positivkontrolle: die erwarteten Felder sind dabei). */
async function feldKennungen(page) {
  return (await lage(page)).map(eintrag => eintrag.feld.kennung);
}

/** Prüft für **jedes** gesammelte Feld: die rechte Kante liegt in seinem Rollbereich, und der Rollbereich rollt nicht
    waagerecht. Gibt die Messungen zurück (für weitere Prüfungen in der Spec). */
async function erwarteFelderImBereich(page, kontext) {
  const felder = await lage(page);
  expect(felder.length, `Felder gefunden (${kontext})`).toBeGreaterThan(0);
  for (const { feld, behaelter } of felder) {
    expect(feld.rechts, `${feld.kennung}: rechts ${feld.rechts} ≤ ${behaelter.kennung} innen rechts ${behaelter.innenRechts} (${kontext})`).toBeLessThanOrEqual(behaelter.innenRechts);
    expect(behaelter.bildlauf, `scrollLeft von ${behaelter.kennung} (${kontext})`).toBe(0);
  }
  return felder;
}

/** Positivkontrolle: diese Felder müssen unter den gesammelten sein (ein nicht gezeichnetes oder übersehenes Feld fällt auf). */
async function erwarteFelder(page, praefixe, kontext) {
  const kennungen = await feldKennungen(page);
  for (const praefix of praefixe) {
    expect(kennungen.some(kennung => kennung.split('.').includes(praefix)), `${praefix} unter den Feldern (${kontext}: ${kennungen.join(', ')})`).toBe(true);
  }
}

module.exports = { lage, feldKennungen, erwarteFelderImBereich, erwarteFelder };
