/* gitreviewA — Sprung-Rechnung (R00021): welche Nummer neu eine Diff-Zeile oder ein Abschnittskopf in VS Code öffnet und wie der
   Link aus dem server-seitigen Ziel entsteht. Reine Funktionen, im Browser und in Node; fremder Text geht hier nie durch. */
(function (ziel) {
  'use strict';

  const HUNK_NEU = /^@@ -\d+(?:,\d+)? \+(\d+)/;

  /** Die Nummer neu, an der die Stelle in VS Code öffnet: jede Zeile mit Nummer `neu`, ein Abschnittskopf an der ersten Zeile seiner
      neuen Seite; entfernte Zeilen und Hinweiszeilen haben keine und liefern `null`. */
  function sprungZeile(zeile) {
    if (zeile.art === 'kopf') {
      const treffer = HUNK_NEU.exec(zeile.text);
      if (!treffer) {
        return null;
      }
      return Math.max(1, Number(treffer[1]));
    }
    if (Number.isInteger(zeile.neu)) {
      return zeile.neu;
    }
    return null;
  }

  /** Ziel ohne Zeile + Nummer → Link; ohne Ziel oder ohne Nummer `null` — nie aus fremdem Text zusammengesetzt. */
  function sprungLink(ziel, nummer) {
    if (!ziel || !Number.isInteger(nummer)) {
      return null;
    }
    return `${ziel}:${nummer}`;
  }

  /** Der Name des Zeilen-Links für Vorlesewerkzeuge: „<pfad> Zeile <n>, in VS Code öffnen“ — die nackte Nummer allein wäre kein
      sprechender Name; ohne Nummer `null`, dann trägt der Link keinen Namen. */
  function sprungName(pfad, nummer) {
    if (!Number.isInteger(nummer)) {
      return null;
    }
    return `${pfad} Zeile ${nummer}, in VS Code öffnen`;
  }

  /** Die erste Zeile der gezeigten Ansicht mit Nummer neu; ohne solche Nummer die erste Abschnittskopf-Nummer; sonst 1 (etwa bei
      Binärdatei oder unlesbarem Diff, wo es keine Zeilen gibt). */
  function ersteSprungzeile(zeilen) {
    for (const zeile of zeilen) {
      if (Number.isInteger(zeile.neu)) {
        return zeile.neu;
      }
    }
    for (const zeile of zeilen) {
      const nummer = sprungZeile(zeile);
      if (Number.isInteger(nummer)) {
        return nummer;
      }
    }
    return 1;
  }

  Object.assign(ziel, { sprungZeile, sprungLink, sprungName, ersteSprungzeile });
})(typeof module !== 'undefined' ? module.exports : window);
