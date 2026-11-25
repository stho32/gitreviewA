/* gitreviewA — Gegenüberstellung der Diff-Zeilen für die Nebeneinander-Ansicht (R00023, B2201): rein, im Browser und in Node.
   Aus den Zeilen `{art, alt, neu, text}` (patchZeilen, R00004) wird eine Tabelle, in der ein Lauf entfernter Zeilen dem direkt
   folgenden Lauf hinzugefügter zeilenweise gegenübersteht (die i-te gegen die i-te, ein Überhang gegen leer). Eine unveränderte
   Zeile steht links und rechts (derselbe Index); ein Hunk-Kopf und die Hinweiszeile `\ No newline at end of file` sind eigene
   Tabellenzeilen und trennen die Paarung. Rechnung nach kanbanD web/review-uebersicht.js `gegenueberstellen` (R00249, ADR-0042),
   aber ohne HTML — die Zeilen sind hier nur Indizes in die Ausgangsliste, gezeichnet wird in `nebeneinander.js` über textContent. */
(function (ziel) {
  'use strict';

  /** Ein Lauf entfernte oder hinzugefügte Zeilen: Anfang und Ende (exklusiv) in der Ausgangsliste. */
  function laufArt(zeilen, ab, art) {
    let ende = ab;
    while (ende < zeilen.length && zeilen[ende].art === art) {
      ende += 1;
    }
    return ende;
  }

  /**
   * Zeilen `{art, alt, neu, text}` → Tabelle `{art, links, rechts}` (art = `kopf`, `zeile`, `hinweis`); `links` und `rechts`
   * sind Indizes in die Ausgangsliste oder `null` für die leere Seite. Die Tabelle ist eine Sicht: die Ausgangsliste bleibt unverändert.
   */
  function gegenueberstellen(zeilen) {
    const tabelle = [];
    let stelle = 0;
    while (stelle < zeilen.length) {
      const art = zeilen[stelle].art;
      if (art === 'minus') {
        const minusEnde = laufArt(zeilen, stelle, 'minus');
        const plusEnde = laufArt(zeilen, minusEnde, 'plus');
        stelle = plusPaare(tabelle, stelle, minusEnde, plusEnde);
        continue;
      }
      if (art === 'plus') {
        tabelle.push({ art: 'zeile', links: null, rechts: stelle });
        stelle += 1;
        continue;
      }
      if (art === 'kontext') {
        tabelle.push({ art: 'zeile', links: stelle, rechts: stelle });
        stelle += 1;
        continue;
      }
      if (art === 'kopf' || art === 'hinweis') {
        tabelle.push({ art, links: stelle, rechts: stelle });
        stelle += 1;
        continue;
      }
      throw new Error(`Unbekannte Zeilenart ${art}`);
    }
    return tabelle;
  }

  /** Ein Lauf `minus` gegen den direkt folgenden Lauf `plus`: die i-te gegen die i-te, der Überhang gegen leer. Liefert die nächste Stelle. */
  function plusPaare(tabelle, minusAnfang, minusEnde, plusEnde) {
    const minusAnzahl = minusEnde - minusAnfang;
    const plusAnzahl = plusEnde - minusEnde;
    const paare = Math.max(minusAnzahl, plusAnzahl);
    for (let i = 0; i < paare; i += 1) {
      tabelle.push({
        art: 'zeile',
        links: i < minusAnzahl ? minusAnfang + i : null,
        rechts: i < plusAnzahl ? minusEnde + i : null,
      });
    }
    return plusEnde;
  }

  Object.assign(ziel, { gegenueberstellen });
})(typeof module !== 'undefined' ? module.exports : window);
