'use strict';
// Treiber Oberfläche „Diff-Werkzeugleiste sichtbar“ (R00057): der einzige Ort, der die Maße der Werkzeugleiste über dem Diff
// kennt. Gemessen wird das, was der Mensch sieht: die sichtbare Breite des Suchfelds entlang seiner Mitte (Pixel, an denen
// `elementFromPoint` das Feld liefert — keine Rechnung aus CSS), die rechten Kanten von Feld, Zähler, Meldung und „Ansicht ▾“
// gegen die Innenkante des Diff-Bereichs, die Schnittfläche ihrer Rechtecke, der waagerechte Bildlauf des Diff-Bereichs, die
// Zeilenzahl der Leiste, ihre Höhe und die Höhe des Rollbereichs darunter.
const { expect } = require('@playwright/test');

/** Ein Rechteck als ganze Zahlen in px. */
function rechteck(rahmen) {
  return {
    links: Math.round(rahmen.left),
    rechts: Math.round(rahmen.right),
    breite: Math.round(rahmen.width),
    oben: Math.round(rahmen.top),
    unten: Math.round(rahmen.bottom),
    hoehe: Math.round(rahmen.height),
  };
}

/** Die Maße der Werkzeugleiste und ihres Feldes in einem Zug aus der Seite. */
function mass(page) {
  return page.evaluate(() => {
    const r = element => {
      if (!element) {
        return null;
      }
      const b = element.getBoundingClientRect();
      return {
        links: Math.round(b.left),
        rechts: Math.round(b.right),
        breite: Math.round(b.width),
        oben: Math.round(b.top),
        unten: Math.round(b.bottom),
        hoehe: Math.round(b.height),
      };
    };
    const feld = document.querySelector('#diff .diff-werkzeuge #diff-suche');
    const kasten = feld.getBoundingClientRect();
    const yMitte = kasten.top + kasten.height / 2;
    let sichtbar = 0;
    for (let x = Math.ceil(kasten.left); x < Math.floor(kasten.right); x += 1) {
      if (document.elementFromPoint(x, yMitte) === feld) {
        sichtbar += 1;
      }
    }
    const kopf = document.querySelector('#diff .diff-kopf');
    const werkzeuge = document.querySelector('#diff .diff-werkzeuge');
    const diff = document.getElementById('diff');
    const roll = document.querySelector('#diff .df-sc');
    const teile = {
      feld: r(feld),
      zaehler: r(werkzeuge.querySelector('.diff-suche-zaehler')),
      meldung: r(werkzeuge.querySelector('#diff-suche-fehler')),
      menue: r(werkzeuge.querySelector('.ansicht-menue')),
    };
    // Zeilen der Leiste: die sichtbaren Kinder des Kopfs nach ihrer senkrechten Mitte gruppieren (Toleranz 12 px, wie
    // `leistenmass` in `diff-oberflaeche.js`). Die Werkzeugleiste selbst ist ein Kind; bricht sie um, wächst der Kopf.
    const traeger = [...kopf.children].filter(element => element.getClientRects().length > 0);
    const mitte = element => {
      const b = element.getBoundingClientRect();
      return (b.top + b.bottom) / 2;
    };
    const reihen = [];
    for (const element of traeger) {
      const m = mitte(element);
      if (!reihen.some(reihe => Math.abs(reihe - m) < 12)) {
        reihen.push(m);
      }
    }
    const schneidet = (a, b) => a && b && Math.min(a.rechts, b.rechts) > Math.max(a.links, b.links)
      && Math.min(a.unten, b.unten) > Math.max(a.oben, b.oben);
    const paare = [['feld', 'zaehler'], ['feld', 'meldung'], ['feld', 'menue'], ['zaehler', 'meldung'], ['zaehler', 'menue'], ['meldung', 'menue']];
    const ueberschneidungen = paare.filter(([a, b]) => schneidet(teile[a], teile[b])).map(([a, b]) => `${a}×${b}`);
    const diffStil = getComputedStyle(diff);
    const diffKasten = diff.getBoundingClientRect();
    const diffInnenRechts = diffKasten.right - parseFloat(diffStil.borderRightWidth || '0') - parseFloat(diffStil.paddingRight || '0');
    return {
      fenster: { breite: window.innerWidth, hoehe: window.innerHeight },
      diff: r(diff),
      diffInnenRechts: Math.round(diffInnenRechts),
      kopf: r(kopf),
      werkzeuge: r(werkzeuge),
      teile,
      feldSichtbarPx: sichtbar,
      mitteTrifftFeld: document.elementFromPoint(kasten.left + kasten.width / 2, yMitte) === feld,
      ueberschneidungen,
      diffBildlauf: diff.scrollWidth > diff.clientWidth,
      kopfBildlauf: kopf.scrollWidth > kopf.clientWidth,
      rollbereichHoehe: roll ? Math.round(roll.getBoundingClientRect().height) : 0,
      zeilen: reihen.length,
      wurzelSchriftPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
      zaehlerText: werkzeuge.querySelector('.diff-suche-zaehler').textContent,
      meldungText: werkzeuge.querySelector('#diff-suche-fehler').textContent,
    };
  });
}

/** Wartet, bis die Anzeige steht: zwei Bilder ohne offene Nachladung (Layout und Schrift). */
async function warteAufRuhe(page) {
  await page.waitForFunction(() => document.fonts.ready.then(() => true), undefined, { polling: 'raf' });
  await page.evaluate(() => new Promise(fertig => requestAnimationFrame(() => requestAnimationFrame(fertig))));
}

/** Die kleinste sichtbare Feldbreite, die die Anforderung zulässt: 3rem, in px aus der Wurzelschrift der Seite gelesen. */
function mindestFeldPx(m) {
  return 3 * m.wurzelSchriftPx;
}

/** Prüft Kriterium 1 und 2 für einen gemessenen Zustand: Feldmitte trifft das Feld, mindestens 3rem sichtbar; die rechten
    Kanten von Feld, Zähler, Meldung und „Ansicht ▾“ liegen im Diff-Bereich; ihre Rechtecke schneiden sich nicht; der
    Diff-Bereich rollt nicht waagerecht. */
function erwarteImBereich(m, kontext) {
  const teileRechts = Object.entries(m.teile).filter(([, teil]) => teil && teil.breite > 0);
  for (const [name, teil] of teileRechts) {
    expect(teil.rechts, `${name} rechts ${teil.rechts} ≤ Diff-Innenkante ${m.diffInnenRechts} (${kontext})`).toBeLessThanOrEqual(m.diffInnenRechts);
  }
  expect(m.diffBildlauf, `#diff ohne waagerechten Bildlauf (${kontext})`).toBe(false);
  expect(m.mitteTrifftFeld, `Feldmitte ist das Feld selbst (${kontext})`).toBe(true);
  expect(m.feldSichtbarPx, `sichtbare Feldbreite ${m.feldSichtbarPx} px ≥ ${mindestFeldPx(m)} px (3rem) (${kontext})`).toBeGreaterThanOrEqual(mindestFeldPx(m));
  expect(m.ueberschneidungen, `nichts überdeckt etwas (${kontext})`).toEqual([]);
}

module.exports = { rechteck, mass, warteAufRuhe, mindestFeldPx, erwarteImBereich };
