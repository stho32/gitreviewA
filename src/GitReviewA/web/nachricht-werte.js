/* gitreviewA — die eine Kürzungsregel für fremden Text (R00051, R00038): höchstens NACHRICHT_GRENZE Codepunkte,
   darüber der Hinweis mit der Zahl des nicht gezeigten Restes. Reine Funktion, im Browser und in Node. */
(function (ziel) {
  'use strict';

  /** Länge je Nachricht (PO Zeile 250): darüber endet der Text sichtbar mit der Zahl des nicht gezeigten Restes. */
  const NACHRICHT_GRENZE = 20000;

  /** Fremder Text, sichtbar gekürzt: höchstens `grenze` Codepunkte, danach der Hinweis. Zählt Codepunkte statt
      UTF-16-Einheiten, damit ein Surrogatpaar oder ein Mehrbyte-Zeichen an der Kante ganz bleibt (Lehre #17). */
  function nachrichtText(text, grenze = NACHRICHT_GRENZE) {
    const zeichen = Array.from(text);
    if (zeichen.length <= grenze) {
      return text;
    }
    return `${zeichen.slice(0, grenze).join('')}… (${zeichen.length - grenze} Zeichen nicht gezeigt)`;
  }

  Object.assign(ziel, { NACHRICHT_GRENZE, nachrichtText });
})(typeof module !== 'undefined' ? module.exports : (window.gitreviewaNachrichtWerte = window.gitreviewaNachrichtWerte || {}));
