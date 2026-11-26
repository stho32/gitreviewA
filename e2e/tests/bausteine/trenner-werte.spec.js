'use strict';
// Bausteintests (ohne Browser) der einen Breitenregel für drei Bereiche (R00034/R00037/R00042, B4101): die festen Werte der
// Entscheidung des PO, die gezeigten Breiten und die Stellung der Ergebnis-Spalte aus Fenster + Wunschbreiten + Stellung, die
// Schrumpf-Reihenfolge (zuerst die Spalte, dann die Seitenleiste), der Vorrang beim Ausklappen im engen Fenster, die Zuggrenzen
// je Seite (die andere Seite gibt beim Ziehen nicht nach), die Taste je Richtung und Pos1/Ende. Lehre „Wert aus einer Einstellung
// als Spanne prüfen“: die Mutanten „zu groß“, „zu klein“, „fest/ignoriert“, „linke Seite gibt zuerst nach“ und „Vorrang nie
// zurückgesetzt“ stehen als eigene Zeilen.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const {
  kleinsteBreite, hoechstLinks, hoechstRechts, anzeige, belegung, streifenPlatz, klemme, breiteNachZug, breiteNachZugRechts, breiteNachTaste,
  passtZweiSpaltig, mindestFensterBreite, ergebnisStartetAusgeklappt, ergebnisAusklappbar, ergebnisVorhanden,
  KLEINSTE, GROESSTE, START, DIFF_MINDEST, TRENNER, SCHRITT,
  ERGEBNIS, ERGEBNIS_MINDEST, ERGEBNIS_START, ERGEBNIS_AUSKLAPPBAR, ERGEBNIS_STREIFEN,
} = require('../../../src/GitReviewA/web/trenner-werte.js');

/** Die offene Stellung beider Seiten ohne Vorrang. */
function offen(links = START, rechts = ERGEBNIS) {
  return { links, rechts, linksEin: false, rechtsEin: false, vorrang: null };
}

test.describe('Baustein Trenner-Werte — feste Werte (R00034/R00037/R00042)', () => {
  test('soll die Grenzen und den Start aus der Entscheidung des PO tragen', () => {
    expect(KLEINSTE).toBe(240);
    expect(GROESSTE).toBe(640);
    expect(START).toBe(360);
    expect(DIFF_MINDEST).toBe(320);
    expect(TRENNER).toBe(6);
    expect(SCHRITT).toBe(16);
    expect(kleinsteBreite()).toBe(240);
  });

  test('soll die Werte der Ergebnis-Spalte aus der Entscheidung des PO tragen', () => {
    expect(ERGEBNIS).toBe(320);
    expect(ERGEBNIS_MINDEST).toBe(240);
    expect(ERGEBNIS_START).toBe(1012);
    expect(ERGEBNIS_AUSKLAPPBAR).toBe(812);
    expect(ERGEBNIS_STREIFEN).toBe(24);
  });
});

test.describe('Baustein Trenner-Werte — Belegung einer Seite (R00042)', () => {
  test('soll eine offene Seite als Trenner + Breite und eine eingeklappte als Streifen rechnen', () => {
    expect(belegung(320, false)).toBe(326); // 6 + 320
    expect(belegung(240, false)).toBe(246);
    expect(belegung(320, true)).toBe(24); // nur der Streifen
    expect(belegung(640, true)).toBe(24);
  });
});

test.describe('Baustein Trenner-Werte — gezeigte Breiten und Stellung (R00042)', () => {
  test('soll bei genug Platz beide Wünsche zeigen (Mutant „fest/ignoriert“ entlarvt)', () => {
    expect(anzeige(1280, { links: 360, rechts: 320 }, offen())).toEqual({ links: 360, rechts: 320, linksEin: false, rechtsEin: false, vorrang: null });
    expect(anzeige(1280, { links: 480, rechts: 400 }, offen())).toEqual({ links: 480, rechts: 400, linksEin: false, rechtsEin: false, vorrang: null });
  });

  test('soll unter der Grenze für zwei Spalten (590 px) die Wünsche lassen und keinen Vorrang tragen (R00033)', () => {
    expect(anzeige(500, { links: 360, rechts: 320 }, offen())).toEqual({ links: 360, rechts: 320, linksEin: false, rechtsEin: false, vorrang: null });
  });

  test('soll an der Grenze 590 px zwei Spalten mit Diff genau 320 px zeigen (Befund B1, PO Zeile 249)', () => {
    // 590: Streifen 24 + Seitenleiste 240 + Trenner 6 + Diff 320 — die Seitenleiste gibt bis zur Mindestbreite nach.
    const lage590 = anzeige(590, { links: 360, rechts: 320 }, offen());
    expect(lage590).toEqual({ links: 240, rechts: 320, linksEin: false, rechtsEin: true, vorrang: null });
    expect(590 - belegung(lage590.links, lage590.linksEin) - belegung(lage590.rechts, lage590.rechtsEin)).toBe(DIFF_MINDEST);

    // 591: der Diff wächst mit dem Fenster, die Seitenleiste bekommt den Überschuss.
    const lage591 = anzeige(591, { links: 360, rechts: 320 }, offen());
    expect(lage591).toEqual({ links: 241, rechts: 320, linksEin: false, rechtsEin: true, vorrang: null });
    expect(591 - belegung(lage591.links, lage591.linksEin) - belegung(lage591.rechts, lage591.rechtsEin)).toBe(DIFF_MINDEST);

    // 589 und 566: eine Spalte (R00033) — die Lücke 566–589 hat keinen Diff unter 320 px mehr.
    expect(anzeige(589, { links: 360, rechts: 320 }, offen())).toEqual({ links: 360, rechts: 320, linksEin: false, rechtsEin: false, vorrang: null });
    expect(anzeige(566, { links: 360, rechts: 320 }, offen())).toEqual({ links: 360, rechts: 320, linksEin: false, rechtsEin: false, vorrang: null });
  });

  test('soll beim Schrumpfen zuerst die Ergebnis-Spalte schmaler machen (Mutant „linke Seite gibt zuerst nach“ entlarvt)', () => {
    // Kriterium 4: 1100 → Spalte 320 (Diff 408), 1000 → Spalte 308 (Diff 320), die Seitenleiste bleibt 360.
    expect(anzeige(1100, { links: 360, rechts: 320 }, offen())).toEqual({ links: 360, rechts: 320, linksEin: false, rechtsEin: false, vorrang: null });
    expect(anzeige(1000, { links: 360, rechts: 320 }, offen())).toEqual({ links: 360, rechts: 308, linksEin: false, rechtsEin: false, vorrang: null });
  });

  test('soll die Spalte selbständig einklappen, wenn sie nicht mehr 240 px breit sein kann (Kriterium 4/8)', () => {
    // 900: 900 − 366 − 6 − 320 = 208 < 240 → die Spalte klappt ein (klebend), die Seitenleiste bleibt 360.
    expect(anzeige(900, { links: 360, rechts: 320 }, offen())).toEqual({ links: 360, rechts: 320, linksEin: false, rechtsEin: true, vorrang: null });
  });

  test('soll die Seitenleiste erst nach der Spalte schmaler machen (Diff bleibt ≥ 320)', () => {
    // 700: die Spalte ist unter 812 ohnehin zu; die Seitenleiste gibt bis Fenster − 350 = 350 nach.
    expect(anzeige(700, { links: 360, rechts: 320 }, offen())).toEqual({ links: 350, rechts: 320, linksEin: false, rechtsEin: true, vorrang: null });
    expect(anzeige(600, { links: 640, rechts: 320 }, offen())).toEqual({ links: 250, rechts: 320, linksEin: false, rechtsEin: true, vorrang: null });
  });

  test('soll unter 812 px die Spalte nicht ausklappen lassen, auch wenn der Mensch sie geöffnet hat', () => {
    expect(anzeige(700, { links: 360, rechts: 320 }, { links: false, rechts: false, vorrang: 'rechts' })).toEqual({ links: 350, rechts: 320, linksEin: false, rechtsEin: true, vorrang: null });
  });

  test('soll beim Ausklappen im engen Fenster zuerst die Seitenleiste nachgeben lassen (Kriterium 7)', () => {
    const vorrang = { links: false, rechts: false, vorrang: 'rechts' };
    // 900: 900 − 12 − 320 = 568; links = 568 − 320 = 248 ≥ 240 → Seitenleiste 248, Spalte 320.
    expect(anzeige(900, { links: 360, rechts: 320 }, vorrang)).toEqual({ links: 248, rechts: 320, linksEin: false, rechtsEin: false, vorrang: 'rechts' });
    // 850: links auf 240, dann gibt die Spalte nach → 850 − 12 − 320 − 240 = 278.
    expect(anzeige(850, { links: 360, rechts: 320 }, vorrang)).toEqual({ links: 240, rechts: 278, linksEin: false, rechtsEin: false, vorrang: 'rechts' });
  });

  test('soll den Vorrang fallen lassen, sobald die gewählten Breiten wieder passen (Mutant „Vorrang nie zurückgesetzt“ entlarvt)', () => {
    // 1280: 360 + 320 + 12 + 320 = 1012 ≤ 1280 → die Wünsche passen wieder.
    expect(anzeige(1280, { links: 360, rechts: 320 }, { links: false, rechts: false, vorrang: 'rechts' })).toEqual({ links: 360, rechts: 320, linksEin: false, rechtsEin: false, vorrang: null });
  });

  test('soll bei eingeklappter Seitenleiste der Spalte den Streifen statt der Leiste einrechnen (Kriterium 8)', () => {
    // 900, Seitenleiste eingeklappt (24 px): Spalte 320 → Diff 544; die Spalte bleibt offen.
    expect(anzeige(900, { links: 360, rechts: 320 }, { linksEin: true, rechtsEin: false, vorrang: null })).toEqual({ links: 360, rechts: 320, linksEin: true, rechtsEin: false, vorrang: null });
    // Wird die Seitenleiste ausdrücklich ausgeklappt, klappt die Spalte ein (900 − 360 − 6 − 24 = 510).
    expect(anzeige(900, { links: 360, rechts: 320 }, { linksEin: false, rechtsEin: false, vorrang: null })).toEqual({ links: 360, rechts: 320, linksEin: false, rechtsEin: true, vorrang: null });
  });

  test('soll bei 1280 px und eingeklappter Seitenleiste die Höchstbreite der Spalte bei 640 klemmen (Kriterium 8)', () => {
    const gezeigt = anzeige(1280, { links: 360, rechts: 640 }, { linksEin: true, rechtsEin: false, vorrang: null });
    expect(gezeigt.rechts).toBe(640);
    expect(hoechstRechts(1280, { links: 360, linksEin: true })).toBe(640);
  });
});

test.describe('Baustein Trenner-Werte — Spannen und Grenzen (R00042)', () => {
  test('soll die gezeigte Breite an der Obergrenze 640 klemmen (Mutant „zu groß“ entlarvt)', () => {
    const gezeigt = anzeige(2000, { links: 900, rechts: 900 }, offen());
    expect(gezeigt.links).toBe(640);
    expect(gezeigt.rechts).toBe(640);
  });

  test('soll die gezeigte Breite an der Untergrenze 240 halten (Mutant „zu klein“ entlarvt)', () => {
    // 596: links 240, Spalte zu (24), Diff 596 − 240 − 6 − 24 = 326.
    const gezeigt = anzeige(596, { links: 100, rechts: 100 }, offen());
    expect(gezeigt.links).toBe(240);
    expect(gezeigt.rechts).toBe(240);
  });

  test('soll die Höchstbreite je Seite aus der Belegung der anderen rechnen', () => {
    expect(hoechstLinks(1280, { links: 360, rechts: 320, linksEin: false, rechtsEin: false })).toBe(628); // 1280 − 332 − 320
    expect(hoechstLinks(1280, { rechts: 320, rechtsEin: true })).toBe(640); // 1280 − 350 → 640
    expect(hoechstLinks(700, { rechtsEin: true })).toBe(350); // 700 − 350
    expect(hoechstRechts(1280, { links: 360, linksEin: false })).toBe(588); // 1280 − 332 − 360
    expect(hoechstRechts(1280, { linksEin: true })).toBe(640); // 1280 − 350 → 640
    expect(hoechstRechts(900, { links: 360, linksEin: false })).toBe(240); // 208 → an der Mindestbreite gehalten
  });

  test('soll die Grenzwerte der linken Seite an der Grenze 590 px belegen (Befund B1, Nacharbeit)', () => {
    // Die alten Zeilen `hoechsteBreite(966, 0) = 616` und `hoechsteBreite(566, 0) = 240` mit der neuen Grenze:
    expect(hoechstLinks(966, { rechts: 320, rechtsEin: true })).toBe(616); // 966 − 350
    expect(hoechstLinks(590, { rechts: 320, rechtsEin: true })).toBe(240); // 590 − 350 = 240 → Diff genau 320
    expect(streifenPlatz(590)).toBe(240); // derselbe Platz aus derselben Quelle
    expect(streifenPlatz(966)).toBe(616);
    expect(hoechstRechts(590, { linksEin: true })).toBe(240); // Spiegel: Streifen links
    // Knapp darunter gilt der einspaltige Rückfall: keine Grenze zum Ziehen.
    expect(hoechstLinks(589, { rechts: 320, rechtsEin: true })).toBe(640);
    expect(hoechstRechts(589, { linksEin: true })).toBe(640);
  });

  test('soll im einspaltigen Rückfall die volle Spanne zulassen (kein Trenner, R00033)', () => {
    expect(hoechstLinks(500, { linksEin: false, rechtsEin: false })).toBe(640);
    expect(hoechstRechts(500, { linksEin: false, rechtsEin: false })).toBe(640);
  });
});

test.describe('Baustein Trenner-Werte — eine Quelle für die 590-Grenze (R00034, PO Zeile 249)', () => {
  test('soll die Mindestfensterbreite als Summe der Mindestbreiten rechnen und mit der CSS-Mediengrenze übereinstimmen', () => {
    expect(mindestFensterBreite()).toBe(590);
    expect(mindestFensterBreite()).toBe(KLEINSTE + DIFF_MINDEST + TRENNER + ERGEBNIS_STREIFEN);

    const css = fs.readFileSync(path.join(__dirname, '../../../src/GitReviewA/web/gitreviewa.css'), 'utf8');
    const stelle = css.indexOf('--gr-leiste-breite');
    const davor = css.slice(0, stelle);
    const treffer = [...davor.matchAll(/@media\s*\(min-width:(\d+)px\)/g)].pop();
    expect(treffer, 'Mediengrenze vor der Rahmen-Regel gefunden').toBeTruthy();
    expect(Number(treffer[1]), 'CSS-Mediengrenze ist die Summe der Konstanten (Streifen 24 + Seitenleiste 240 + Trenner 6 + Diff 320)').toBe(KLEINSTE + DIFF_MINDEST + TRENNER + ERGEBNIS_STREIFEN);
    expect(Number(treffer[1]), 'CSS-Mediengrenze stimmt mit mindestFensterBreite() überein').toBe(mindestFensterBreite());
  });

  test('soll den zweispaltigen Aufbau an 590 px festmachen (Fallback darunter, R00033)', () => {
    expect(passtZweiSpaltig(1280)).toBe(true);
    expect(passtZweiSpaltig(590)).toBe(true);
    expect(passtZweiSpaltig(589)).toBe(false);
    expect(passtZweiSpaltig(566)).toBe(false);
    expect(passtZweiSpaltig(560)).toBe(false);
  });

  test('soll Start, Ausklappen und Vorhandensein der Spalte an den Schwellen festmachen', () => {
    expect(ergebnisStartetAusgeklappt(1012)).toBe(true);
    expect(ergebnisStartetAusgeklappt(1011)).toBe(false);
    expect(ergebnisAusklappbar(812)).toBe(true);
    expect(ergebnisAusklappbar(811)).toBe(false);
    expect(ergebnisVorhanden(590)).toBe(true);
    expect(ergebnisVorhanden(589)).toBe(false);
    expect(ergebnisVorhanden(566)).toBe(false);
  });
});

test.describe('Baustein Trenner-Werte — Klemmen an beiden Grenzen (R00034)', () => {
  test('soll an der Untergrenze klemmen (Mutant „nur Obergrenze“ entlarvt)', () => {
    expect(klemme(100, 240, 640)).toBe(240);
    expect(klemme(-1000, 240, 640)).toBe(240);
    expect(klemme(239, 240, 640)).toBe(240);
    expect(klemme(240, 240, 640)).toBe(240); // genau an der Grenze
  });

  test('soll an der Obergrenze klemmen (Mutant „nur Untergrenze“ entlarvt)', () => {
    expect(klemme(900, 240, 640)).toBe(640);
    expect(klemme(1000, 240, 640)).toBe(640);
    expect(klemme(641, 240, 640)).toBe(640);
    expect(klemme(640, 240, 640)).toBe(640); // genau an der Grenze
  });

  test('soll einen Wert innerhalb der Spanne unverändert lassen (Mutant „fest/ignoriert“ entlarvt)', () => {
    expect(klemme(460, 240, 640)).toBe(460);
    expect(klemme(241, 240, 640)).toBe(241);
    expect(klemme(639, 240, 640)).toBe(639);
  });

  test('soll bei einer Höchstbreite unter der Mindestbreite die Mindestbreite halten', () => {
    expect(klemme(360, 240, 216)).toBe(240);
    expect(klemme(0, 240, 216)).toBe(240);
  });
});

test.describe('Baustein Trenner-Werte — Zug je Seite (R00034/R00042)', () => {
  test('soll die Breite der linken Seite aus der Zeigerposition und dem linken Rahmen rechnen', () => {
    expect(breiteNachZug(460, 0, 640, 360)).toBe(460);
    expect(breiteNachZug(700 + 350, 700, 350, 360)).toBe(350); // Rahmen bei 700, Höchstbreite 350
    expect(breiteNachZug(700 + 200, 700, 640, 360)).toBe(240); // 200 px gewünscht, unter der Mindestbreite → 240
  });

  test('soll den Zug der linken Seite an beiden Grenzen klemmen', () => {
    expect(breiteNachZug(100, 0, 640, 360)).toBe(240); // unter Min
    expect(breiteNachZug(900, 0, 640, 360)).toBe(640); // über Max
  });

  test('soll bei ungültigem Zug die Breite unverändert lassen', () => {
    expect(breiteNachZug(NaN, 0, 640, 360)).toBe(360);
    expect(breiteNachZug(undefined, 0, 640, 360)).toBe(360);
    expect(breiteNachZug('x', 0, 640, 360)).toBe(360);
  });

  test('soll die Breite der rechten Seite aus dem rechten Rahmen, dem Trenner und der Zeigerposition rechnen', () => {
    // rechter Rahmen bei 1020, Trennerkante bei 700 → Spalte 1020 − 700 − 6 = 314.
    expect(breiteNachZugRechts(700, 1020, 588, 320)).toBe(314);
    expect(breiteNachZugRechts(1020, 1020, 588, 320)).toBe(240); // unter Min
    expect(breiteNachZugRechts(100, 1020, 588, 320)).toBe(588); // über Max
  });

  test('soll bei ungültigem Zug der rechten Seite die Breite unverändert lassen', () => {
    expect(breiteNachZugRechts(NaN, 1020, 588, 320)).toBe(320);
    expect(breiteNachZugRechts(undefined, 1020, 588, 320)).toBe(320);
  });
});

test.describe('Baustein Trenner-Werte — Taste je Richtung (R00034/R00042)', () => {
  test('soll an der linken Seite Pfeil rechts verbreitern, Pfeil links verschmälern und an den Grenzen klemmen', () => {
    expect(breiteNachTaste(360, 'ArrowRight', 640)).toBe(376);
    expect(breiteNachTaste(360, 'ArrowLeft', 640)).toBe(344);
    expect(breiteNachTaste(240, 'ArrowLeft', 640)).toBe(240); // schon auf Min: nichts ändert sich
    expect(breiteNachTaste(640, 'ArrowRight', 640)).toBe(640);
    expect(breiteNachTaste(632, 'ArrowRight', 640)).toBe(640); // 648 → 640 (geklemmt)
  });

  test('soll an der rechten Seite Pfeil links verbreitern (die Spalte wächst nach links, APG)', () => {
    expect(breiteNachTaste(320, 'ArrowLeft', 588, -1)).toBe(336);
    expect(breiteNachTaste(320, 'ArrowRight', 588, -1)).toBe(304);
    expect(breiteNachTaste(240, 'ArrowRight', 588, -1)).toBe(240);
    expect(breiteNachTaste(588, 'ArrowLeft', 588, -1)).toBe(588);
  });

  test('soll Pos1 auf die Mindest- und Ende auf die Höchstbreite setzen (beide Seiten)', () => {
    expect(breiteNachTaste(360, 'Home', 640)).toBe(240);
    expect(breiteNachTaste(360, 'End', 640)).toBe(640);
    expect(breiteNachTaste(360, 'End', 350)).toBe(350); // im schmalen Fenster die tatsächliche Höchstbreite
    expect(breiteNachTaste(320, 'Home', 588, -1)).toBe(240);
    expect(breiteNachTaste(320, 'End', 588, -1)).toBe(588);
  });

  test('soll eine unbekannte Taste die Breite nicht ändern lassen', () => {
    expect(breiteNachTaste(360, 'ArrowUp', 640)).toBe(360);
    expect(breiteNachTaste(360, 'ArrowDown', 640)).toBe(360);
    expect(breiteNachTaste(360, 'a', 640)).toBe(360);
    expect(breiteNachTaste(360, 'Enter', 640)).toBe(360);
  });
});
