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

  /** Die gezeichneten Zeilen `{art, alt, neu, commit, abschnitt}` in Reihenfolge, der Index des Ankers (oder `null`) und der des Ziels,
      dazu ob beim Klick Text ausgewählt war → `{art:'bereich', von, bis, commit}` | `{art:'zeile', neu, commit}` |
      `{art:'entfernt', hinweis}` | `{art:'keines', grund}`. `abschnitt` vergibt die Oberfläche (Hunk und Commit); hier wird nur
      verglichen. Der Commit gehört von der Geste an zum Ergebnis: in „Zusammen“ ohne Kette steht dieselbe Nummer neu in mehreren
      Commit-Abschnitten (Befund B1), ein späteres Suchen nach der Nummer allein träfe den falschen Commit.
      `zielZeile` überschreibt die Zeile am Ziel: zweispaltig entscheidet die angeklickte Zelle über ihre Art (R00023). */
  function bereichsziel(zeilen, ankerStelle, zielStelle, textAusgewaehlt, zielZeile) {
    if (textAusgewaehlt) {
      return keines();
    }
    const ziel = zielZeile || zeilen[zielStelle];
    if (!ziel || !istGrenze(ziel)) {
      return istEntfernt(ziel) ? entfernt() : keines();
    }
    const anker = ankerOderNull(zeilen, ankerStelle);
    if (anker === null) {
      return { art: 'zeile', neu: ziel.neu, commit: ziel.commit };
    }
    const liegtImSelbenAbschnitt = anker.abschnitt === ziel.abschnitt;
    if (!liegtImSelbenAbschnitt) {
      return { art: 'keines', grund: ABSCHNITTSGRUND };
    }
    const von = Math.min(anker.neu, ziel.neu);
    const bis = Math.max(anker.neu, ziel.neu);
    if (von === bis) {
      return { art: 'zeile', neu: von, commit: anker.commit };
    }
    return { art: 'bereich', von, bis, commit: anker.commit };
  }

  /* ── Bereich der Dateiansicht (R00044, B4221): Zeilennummern ab 1, kein Abschnitt, kein Commit ── */

  /** Aus Anker und Ziel (Zeilennummern) den Bereich `{von, bis}` bilden: kleinere und größere Nummer, geklemmt auf
      `1…zeilenzahl`; dieselbe Zeile ergibt eine Zeile. Ohne Zeilen (leere Datei) bleibt der Bereich leer `{0, 0}`. */
  function bereich(anker, ziel, zeilenzahl) {
    const anzahl = Math.max(0, Math.trunc(zeilenzahl) || 0);
    if (anzahl === 0) {
      return { von: 0, bis: 0 };
    }
    const a = klemmeAufZeilen(anker, anzahl);
    const b = klemmeAufZeilen(ziel, anzahl);
    return { von: Math.min(a, b), bis: Math.max(a, b) };
  }

  function klemmeAufZeilen(nummer, anzahl) {
    const zahl = Math.trunc(nummer);
    if (!Number.isFinite(zahl) || zahl < 1) {
      return 1;
    }
    return Math.min(zahl, anzahl);
  }

  /** Die Zeilen `von…bis` aus `text` **samt** ihren Zeilenenden schneiden: CRLF bleibt CRLF, LF bleibt LF; die letzte Zeile
      ohne Zeilenende bleibt ohne; ein einzelnes CR ist kein Zeilenende und bleibt byte-gleich. Nur die Zeilen des Textes. */
  function ausschnitt(text, von, bis) {
    const zeilen = zeilenbereiche(text);
    if (zeilen.length === 0) {
      return '';
    }
    const erste = klemmeAufZeilen(von, zeilen.length);
    const letzte = klemmeAufZeilen(bis, zeilen.length);
    const a = Math.min(erste, letzte);
    const b = Math.max(erste, letzte);
    return text.slice(zeilen[a - 1].von, zeilen[b - 1].bis);
  }

  /** Die Zeilen als `{von, bis}` in Textstellen: `bis` zeigt hinter das Zeilenende (oder ans Textende ohne Zeilenende).
      Ein Zeilenende ist LF oder CRLF; ein einzelnes CR ist Text und trennt nicht (dieselbe Definition wie `zeilenVon`). */
  function zeilenbereiche(text) {
    const zeilen = [];
    let von = 0;
    let stelle = 0;
    while (stelle < text.length) {
      if (text[stelle] === '\n') {
        zeilen.push({ von, bis: stelle + 1 });
        von = stelle + 1;
      } else if (text[stelle] === '\r' && text[stelle + 1] === '\n') {
        zeilen.push({ von, bis: stelle + 2 });
        stelle += 1;
        von = stelle + 1;
      }
      stelle += 1;
    }
    if (von < text.length) {
      zeilen.push({ von, bis: text.length });
    }
    return zeilen;
  }

  /** „Zeile 3“ bei einer Zeile, sonst „Zeilen 3–5“ (R00044, Werkzeugleiste und Bestätigung). */
  function bereichsangabe(von, bis) {
    return von === bis ? `Zeile ${von}` : `Zeilen ${von}–${bis}`;
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

  /** Die **eine** Stelle, die die Art einer Anmerkung trennt (`anmerkungen-werte.js`); hier nur der Zugriff, der in Node
      (require) wie im Browser (window) funktioniert. */
  function artDerAnmerkung(anmerkung) {
    const werte = typeof require === 'function' ? require('./anmerkungen-werte.js') : window;
    return werte.artDerAnmerkung(anmerkung);
  }

  /** Die Bereichsanmerkungen einer Datei in Anlegereihenfolge als `[{von, bis}]` — Zeilen- und Dateianmerkungen bleiben draußen.
      Der Name wird roh verglichen (die Marke ist nur die Anzeige). */
  function bereicheDerAnmerkungen(anmerkungen, datei) {
    return anmerkungen
      .filter(anmerkung => anmerkung.datei === datei && artDerAnmerkung(anmerkung) === 'bereich')
      .map(anmerkung => ({ von: anmerkung.von, bis: anmerkung.bis }));
  }

  Object.assign(ziel, { bereichsziel, bereichsstand, bereicheDerAnmerkungen, bereich, ausschnitt, bereichsangabe, ABSCHNITTSGRUND, ENTFERNT_HINWEIS });
})(typeof module !== 'undefined' ? module.exports : window);
