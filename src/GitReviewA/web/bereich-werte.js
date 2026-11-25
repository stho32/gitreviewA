/* gitreviewA — Bereichs-Rechnung (R00031): welche Zeilen ein Bereich umfasst und welche Zeilen eine Markierung tragen.
   Reine Funktionen, im Browser und in Node. Ein Bereich ist die Aussage des Menschen über Zeilen, die er gesehen hat:
   beide Enden tragen eine Nummer neu, liegen im selben Abschnitt (Hunk und Commit) und überschreiten nie eine zugeklappte
   Lücke (R00026) — die aufgeklappten Zeilen einer Lücke sind gezeigte Zeilen und dürfen Grenzen sein. Eine entfernte Zeile,
   ein Abschnittskopf und die Hinweiszeile sind keine Grenzen. */
(function (ziel) {
  'use strict';

  const ABSCHNITTSGRUND = 'Ein Bereich geht nur innerhalb eines Abschnitts';
  /** Derselbe Satz wie in `anmerkungen-werte.js` (R00010): eine entfernte Zeile ist keine Grenze und kein Ziel. */
  const ENTFERNT_HINWEIS = 'Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei';

  /** Die gezeichneten Zeilen `{art, alt, neu, abschnitt}` in Reihenfolge, der Index des Ankers (oder `null`) und der des Ziels,
      dazu ob beim Klick Text ausgewählt war → `{art:'bereich', von, bis}` | `{art:'zeile', neu}` | `{art:'entfernt', hinweis}` |
      `{art:'keines', grund}`. `abschnitt` vergibt die Oberfläche (Hunk und Commit); hier wird nur verglichen. */
  function bereichsziel(zeilen, ankerStelle, zielStelle, textAusgewaehlt) {
    if (textAusgewaehlt) {
      return keines();
    }
    const ziel = zeilen[zielStelle];
    if (!ziel || !istGrenze(ziel)) {
      return istEntfernt(ziel) ? entfernt() : keines();
    }
    const anker = ankerOderNull(zeilen, ankerStelle);
    if (anker === null) {
      return { art: 'zeile', neu: ziel.neu };
    }
    const liegtImSelbenAbschnitt = anker.abschnitt === ziel.abschnitt;
    if (!liegtImSelbenAbschnitt) {
      return { art: 'keines', grund: ABSCHNITTSGRUND };
    }
    const von = Math.min(anker.neu, ziel.neu);
    const bis = Math.max(anker.neu, ziel.neu);
    if (von === bis) {
      return { art: 'zeile', neu: von };
    }
    return { art: 'bereich', von, bis };
  }

  /** Nur eine Zeile mit Nummer neu ist eine Grenze: `+` und Kontext; `−`, Kopf und Hinweiszeile sind es nicht. */
  function istGrenze(zeile) {
    const hatNummerNeu = (zeile.art === 'plus' || zeile.art === 'kontext') && Number.isInteger(zeile.neu);
    return hatNummerNeu;
  }

  function istEntfernt(zeile) {
    return Boolean(zeile) && zeile.art === 'minus';
  }

  function ankerOderNull(zeilen, ankerStelle) {
    if (!Number.isInteger(ankerStelle) || ankerStelle < 0 || ankerStelle >= zeilen.length) {
      return null;
    }
    const anker = zeilen[ankerStelle];
    return istGrenze(anker) ? anker : null;
  }

  function keines() {
    return { art: 'keines', grund: '' };
  }

  function entfernt() {
    return { art: 'entfernt', hinweis: ENTFERNT_HINWEIS };
  }

  /** Die gezeichneten Zeilen + die Bereiche (laufende Auswahl und gespeicherte Bereiche) → je Nummer neu die Bereiche, die sie
      umfassen, in ihrer Reihenfolge. Eine Zeile ohne Nummer neu (entfernte Zeile) trägt keine Markierung. */
  function bereichsstand(zeilen, bereiche) {
    const stand = new Map();
    for (const zeile of zeilen) {
      if (!Number.isInteger(zeile.neu)) {
        continue;
      }
      const umfassend = bereiche.filter(bereich => zeile.neu >= bereich.von && zeile.neu <= bereich.bis);
      if (umfassend.length > 0) {
        stand.set(zeile.neu, umfassend);
      }
    }
    return stand;
  }

  /** Die Bereichsanmerkungen einer Datei in Anlegereihenfolge als `[{von, bis}]` — Zeilen- und Dateianmerkungen bleiben draußen.
      Der Name wird roh verglichen (die Marke ist nur die Anzeige). */
  function bereicheDerAnmerkungen(anmerkungen, datei) {
    return anmerkungen
      .filter(anmerkung => anmerkung.datei === datei && Number.isInteger(anmerkung.von) && Number.isInteger(anmerkung.bis))
      .map(anmerkung => ({ von: anmerkung.von, bis: anmerkung.bis }));
  }

  Object.assign(ziel, { bereichsziel, bereichsstand, bereicheDerAnmerkungen, ABSCHNITTSGRUND, ENTFERNT_HINWEIS });
})(typeof module !== 'undefined' ? module.exports : window);
