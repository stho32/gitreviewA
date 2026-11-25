/* gitreviewA — Suche (R00027): reine Rechnung für den Suchbegriff, das Finden der Treffer im gezeigten Text und das
   Abbilden der Treffer auf die Textteile. Läuft unter Node und im Browser (wie `diff-werte.js`); fremder Text geht
   hier unverändert durch, gezeichnet wird er anderswo nur über `textContent`. Kein Regex — die Suche ist wörtlich. */
(function (ziel) {
  'use strict';

  /** Höchstlänge des Suchbegriffs in Zeichen (R00027, Grenzen): leer oder darüber heißt keine Suche. */
  const ZEICHEN_GRENZE = 200;
  /** Höchstzahl gezählter und markierter Treffer (R00027, Grenzen); darüber nennt der Zähler als Gesamtzahl „10000+“. */
  const TREFFER_GRENZE = 10000;

  /** Der geprüfte Suchbegriff `{gueltig, grund, meldung}`: leer (auch nur Leerraum) und über der Längengrenze werden
      abgelehnt. `grund` ist `'leer'`, `'zuLang'` oder `null`. Wörtlich: Sonderzeichen wie `.*`, `[`, `\` sind Text. */
  function pruefe(text) {
    if (typeof text !== 'string' || text.trim() === '') {
      return { gueltig: false, grund: 'leer', meldung: 'Bitte einen Suchbegriff eingeben.' };
    }
    if (text.length > ZEICHEN_GRENZE) {
      return { gueltig: false, grund: 'zuLang', meldung: `Der Suchbegriff darf höchstens ${ZEICHEN_GRENZE} Zeichen haben.` };
    }
    return { gueltig: true, grund: null, meldung: '' };
  }

  Object.assign(ziel, { pruefe, ZEICHEN_GRENZE, TREFFER_GRENZE });
})(typeof module !== 'undefined' ? module.exports : window);
