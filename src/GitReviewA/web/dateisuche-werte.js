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

  Object.assign(ziel, { suchtextFehler, trifft, istMuster, falte });
})(typeof module !== 'undefined' ? module.exports : (window.gitreviewaDateisucheWerte = window.gitreviewaDateisucheWerte || {}));
