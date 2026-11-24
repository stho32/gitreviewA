/* gitreviewA — Anmerkungs-Rechnung (R00010): welche Diff-Zeile annotierbar ist und welche Anmerkungen eine gezeichnete Ansicht zeigt.
   Reine Funktionen, im Browser und in Node. Die Stelle einer Anmerkung ist die Nummer neu (Stand nach dem Commit); eine entfernte
   Zeile hat keine und ist nicht annotierbar (Entscheidung des PO). */
(function (ziel) {
  'use strict';

  const ENTFERNT_HINWEIS = 'Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei';

  /** Diff-Zeile `{art, neu}` → `{art: 'annotierbar', neu}` | `{art: 'entfernt', hinweis}` | `{art: 'keines'}`.
      Bei ausgewähltem Text geschieht nichts, damit Kopieren aus dem Diff möglich bleibt. */
  function zeilenziel(zeile, textAusgewaehlt) {
    if (textAusgewaehlt) {
      return { art: 'keines' };
    }
    if (zeile.art === 'minus') {
      return { art: 'entfernt', hinweis: ENTFERNT_HINWEIS };
    }
    const hatNummerNeu = (zeile.art === 'plus' || zeile.art === 'kontext') && Number.isInteger(zeile.neu);
    if (!hatNummerNeu) {
      return { art: 'keines' };
    }
    return { art: 'annotierbar', neu: zeile.neu };
  }

  /** Anmerkungen des Laufs (Anlegereihenfolge) + gezeigte Datei + Menge der gezeigten Nummern neu →
      `jeZeile`: Nummer neu → Anmerkungen in Anlegereihenfolge; `ausserhalb`: Anzahl und aufsteigende Zeilen, die die Ansicht nicht zeigt. */
  function anmerkungsstand(anmerkungen, commit, datei, gezeigteNummern) {
    const jeZeile = new Map();
    const ausserhalbeZeilen = new Set();
    let ausserhalbAnzahl = 0;
    for (const anmerkung of anmerkungenAnZeilenDerDatei(anmerkungen, commit, datei)) {
      if (!gezeigteNummern.has(anmerkung.zeile)) {
        ausserhalbAnzahl += 1;
        ausserhalbeZeilen.add(anmerkung.zeile);
        continue;
      }
      if (!jeZeile.has(anmerkung.zeile)) {
        jeZeile.set(anmerkung.zeile, []);
      }
      jeZeile.get(anmerkung.zeile).push(anmerkung);
    }
    const zeilenAufsteigend = [...ausserhalbeZeilen].sort((links, rechts) => links - rechts);
    return { jeZeile, ausserhalb: { anzahl: ausserhalbAnzahl, zeilen: zeilenAufsteigend } };
  }

  /** Commit und Pfad genau gleich; Anmerkungen an der ganzen Datei (ohne Zeile) gehören zu keiner Zeile. */
  function anmerkungenAnZeilenDerDatei(anmerkungen, commit, datei) {
    return anmerkungen.filter(anmerkung => anmerkung.commit === commit && anmerkung.datei === datei && Number.isInteger(anmerkung.zeile));
  }

  /** „1 Anmerkung an einer Zeile, die diese Ansicht nicht zeigt: Zeile 10“; leer, wenn die Ansicht alle zeigt. */
  function hinweisAusserhalb(ausserhalb) {
    if (ausserhalb.anzahl === 0) {
      return '';
    }
    let anmerkungen = `${ausserhalb.anzahl} Anmerkungen`;
    if (ausserhalb.anzahl === 1) {
      anmerkungen = '1 Anmerkung';
    }
    let zeilenteil = 'an Zeilen, die diese Ansicht nicht zeigen';
    if (ausserhalb.zeilen.length === 1) {
      zeilenteil = 'an einer Zeile, die diese Ansicht nicht zeigt';
    }
    const liste = ausserhalb.zeilen.map(zeile => `Zeile ${zeile}`).join(', ');
    return `${anmerkungen} ${zeilenteil}: ${liste}`;
  }

  /** Anmerkungen (Anlegereihenfolge) + Nummer + neuer Text → dieselbe Liste in derselben Reihenfolge; nur der Text der Anmerkung mit
      dieser Nummer wechselt, Nummer und Stelle bleiben. Eine unbekannte Nummer lässt den Inhalt unverändert. */
  function mitGeaendertemText(anmerkungen, nummer, text) {
    return anmerkungen.map(anmerkung => {
      if (anmerkung.nummer !== nummer) {
        return anmerkung;
      }
      return { ...anmerkung, text };
    });
  }

  Object.assign(ziel, { zeilenziel, anmerkungsstand, hinweisAusserhalb, mitGeaendertemText, ENTFERNT_HINWEIS });
})(typeof module !== 'undefined' ? module.exports : window);
