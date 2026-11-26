/* gitreviewA — Werte der Dateisuche (R00049): Prüfung des Suchtextes und Abgleich des Anzeigenamens.
   Reine Funktionen, im Browser und in Node. Kein git, kein Server; Mustersprache, Prüfung und der Muster-Abgleich kommen aus
   `ausblenden-werte.js` (eine Regel, R00025) — hier steht nur, wann eine Teilzeichenkette und wann ein Muster gilt, und die
   Angabe „ohne Rücksicht auf Groß/Klein“, die es nur für die Suche gibt (PO 2026-11-26).

   Der Text wird gegen den **Anzeigenamen** des Pfades gehalten (`dateiliste-werte.js sichtbarerName`): unsichtbare Zeichen
   stehen dort als Marke `⟨U+202E⟩`, Rohbytes als `⟨0xFF⟩` — wer die Marke tippt, findet die Datei. */
(function (ziel) {
  'use strict';

  const musterWerte = typeof module !== 'undefined' ? require('./ausblenden-werte.js') : null;

  /** `*`, `?` oder `[` machen aus dem Suchtext ein Muster (PO 2026-11-26: ein Feld, zwei Arten); sonst gilt er als Teilzeichenkette. */
  function istMuster(text) {
    return text.includes('*') || text.includes('?') || text.includes('[');
  }

  /** Prüft den Suchtext nach derselben Regel wie das Musterfeld (R00025): 1 bis 200 Zeichen ohne Steuer- und Richtungszeichen.
      Leer oder nur Leerraum ist **keine** Suche und kein Fehler — dann steht die ganze Liste da, ohne Zähler und Meldung. */
  function suchtextFehler(text) {
    if (text.trim().length === 0) {
      return null;
    }
    return musterFehler(text);
  }

  /** Ob der Anzeigename zum Suchtext passt: als Teilzeichenkette oder — mit `*`, `?`, `[` — als Muster wie in R00025,
      beides ohne Rücksicht auf Groß und klein. */
  function trifft(text, anzeigename) {
    if (istMuster(text)) {
      return passt(text, anzeigename, { ohneGrossKlein: true });
    }
    return falte(anzeigename).includes(falte(text));
  }

  function musterFehler(text) {
    if (musterWerte) {
      return musterWerte.musterFehler(text, 0);
    }
    return window.musterFehler(text, 0);
  }

  function passt(muster, pfad, angabe) {
    if (musterWerte) {
      return musterWerte.passt(muster, pfad, angabe);
    }
    return window.passt(muster, pfad, angabe);
  }

  function falte(text) {
    return Array.from(text, zeichen => zeichen.toLowerCase()).join('');
  }

  /** Das Budget eines Suchlaufs in Zellen (R00049, Hypothese ungemessen: 2 000 Pfade × 100 Zeichen × 100 Teile). */
  const BUDGET = 20000000;

  /** Was ein geprüfter Pfad kostet: Teile des Musters × (Pfadlänge + 1), bei einer Teilzeichenkette Pfadlänge + 1.
      **Die eine Stelle**, die Aufwand misst — gebucht wird genau dieser Wert, und gearbeitet wird nur Gebuchtes. */
  function aufwand(text, pfadlaenge) {
    if (istMuster(text)) {
      return abgleichKosten(text, pfadlaenge);
    }
    return pfadlaenge + 1;
  }

  /**
   * Der Suchlauf über die Einträge der gezeigten Liste: je Eintrag die Kosten buchen, dann abgleichen; überschreitet die
   * Summe das Budget, bricht der Lauf ab (`abgebrochen`) und der Aufrufer lässt die Liste, wie der letzte gültige Text sie
   * gemacht hat. `gebucht` ist die gebuchte Summe, `arbeit` das davon tatsächlich Gelesene — nie mehr als gebucht.
   * Ein leerer Text ist keine Suche: dann wird nichts gebucht und nichts verglichen.
   */
  function suchlauf(text, eintraege, budget) {
    if (text.trim().length === 0) {
      return { treffer: eintraege.slice(), abgebrochen: false, gebucht: 0, arbeit: 0 };
    }
    const treffer = [];
    let gebucht = 0;
    let arbeit = 0;
    for (const eintrag of eintraege) {
      const kosten = aufwand(text, eintrag.anzeigename.length);
      if (gebucht + kosten > budget) {
        return { treffer, abgebrochen: true, gebucht, arbeit };
      }
      gebucht += kosten;
      arbeit += kosten;
      if (trifft(text, eintrag.anzeigename)) {
        treffer.push(eintrag);
      }
    }
    return { treffer, abgebrochen: false, gebucht, arbeit };
  }

  function abgleichKosten(muster, pfadlaenge) {
    if (musterWerte) {
      return musterWerte.abgleichKosten(muster, pfadlaenge);
    }
    return window.abgleichKosten(muster, pfadlaenge);
  }

  Object.assign(ziel, { suchtextFehler, trifft, istMuster, falte, aufwand, suchlauf, BUDGET });
})(typeof module !== 'undefined' ? module.exports : (window.gitreviewaDateisucheWerte = window.gitreviewaDateisucheWerte || {}));
