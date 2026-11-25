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

  /** Die **eine** Stelle, die die Art einer Anmerkung trennt (R00031): `'bereich'` (von und bis), `'zeile'` (eine Nummer neu),
      sonst `'datei'` (die ganze Datei). Eine Bereichsanmerkung trägt ebenfalls `zeile === null`; wer nur darauf prüft, hält sie
      für eine Dateianmerkung. Alle Wege — Datei-Block, Zeilenanzeige, Stelle und Feldname, Markierung, Ergebnis — fragen hier. */
  function artDerAnmerkung(anmerkung) {
    if (Number.isInteger(anmerkung.von) && Number.isInteger(anmerkung.bis)) {
      return 'bereich';
    }
    if (Number.isInteger(anmerkung.zeile)) {
      return 'zeile';
    }
    return 'datei';
  }

  /** Dateianmerkungen der Stelle (R00022): Anmerkungen des Laufs (Anlegereihenfolge) + Commit + Datei → die Dateianmerkungen
      dieser Stelle in Anlegereihenfolge (keine Zeilen- und keine Bereichsanmerkung). Der Name wird roh verglichen (die Marke ist
      nur die Anzeige). */
  function dateianmerkungen(anmerkungen, commit, datei) {
    return anmerkungen.filter(anmerkung => anmerkung.commit === commit && anmerkung.datei === datei && artDerAnmerkung(anmerkung) === 'datei');
  }

  /** Eine Sicht der gezeigten Datei ist ein Abschnitt: `{ commit, gezeigteNummern }`. Ein Netto-Diff hat eine Sicht, eine Ansicht
      ohne lückenlose Kette je Commit im Abschnitt eine. Anmerkungen des Laufs (Anlegereihenfolge) + Datei + Sichten →
      `jeSicht`: je Sicht eine Map Nummer neu → Anmerkungen in Anlegereihenfolge; `ausserhalb`: Anmerkungen an Stellen, die keine
      Sicht zeigt, je mit ihrem Commit (die Ansicht zeigt sie an einer anderen Stelle oder in einem anderen Abschnitt).
      Eine Bereichsanmerkung (R00031) steht an ihrem Bereichsende `bis` und trägt `von`/`bis` mit. */
  function anmerkungsstandJeSicht(anmerkungen, datei, sichten) {
    const jeSicht = sichten.map(() => new Map());
    const ausserhalb = [];
    for (const anmerkung of anmerkungen) {
      if (anmerkung.datei !== datei) {
        continue;
      }
      const stelle = anmerkungsstelle(anmerkung);
      if (stelle === null) {
        continue;
      }
      const sichtstelle = sichten.findIndex(sicht => sicht.commit === anmerkung.commit && sicht.gezeigteNummern.has(stelle));
      if (sichtstelle < 0) {
        ausserhalb.push({ commit: anmerkung.commit, zeile: anmerkung.zeile, von: anmerkung.von, bis: anmerkung.bis });
        continue;
      }
      if (!jeSicht[sichtstelle].has(stelle)) {
        jeSicht[sichtstelle].set(stelle, []);
      }
      jeSicht[sichtstelle].get(stelle).push(anmerkung);
    }
    return { jeSicht, ausserhalb };
  }

  /** Die Zeile, an der eine Anmerkung steht: ihre Nummer neu, bei einem Bereich dessen Ende `bis` (R00031); null für die ganze Datei. */
  function anmerkungsstelle(anmerkung) {
    switch (artDerAnmerkung(anmerkung)) {
      case 'bereich':
        return anmerkung.bis;
      case 'zeile':
        return anmerkung.zeile;
      default:
        return null;
    }
  }

  /** Die Stelle als Text für einen Hinweis: „Zeile 10“ oder „Zeilen 3–7“ (R00031). */
  function stellentext(eintrag) {
    if (artDerAnmerkung(eintrag) === 'zeile') {
      return `Zeile ${eintrag.zeile}`;
    }
    return `Zeilen ${eintrag.von}–${eintrag.bis}`;
  }

  /** Eine Sicht allein: Anmerkungen des Commits der Ansicht (wie `anmerkungsstandJeSicht`) + Anzahl und aufsteigende Zeilen außerhalb. */
  function anmerkungsstand(anmerkungen, commit, datei, gezeigteNummern) {
    const stand = anmerkungsstandJeSicht(anmerkungen, datei, [{ commit, gezeigteNummern }]);
    return { jeZeile: stand.jeSicht[0], ausserhalb: { anzahl: stand.ausserhalb.length, zeilen: zeilenAufsteigend(stand.ausserhalb) } };
  }

  function zeilenAufsteigend(ausserhalb) {
    return [...new Set(ausserhalb.map(anmerkungsstelle))].sort((links, rechts) => links - rechts);
  }

  /** „1 Anmerkung an einer Zeile, die diese Ansicht nicht zeigt: Zeile 10“; leer, wenn die Ansicht alle zeigt. */
  function hinweisAusserhalb(ausserhalb) {
    if (ausserhalb.anzahl === 0) {
      return '';
    }
    return hinweisText(ausserhalb.anzahl, ausserhalb.zeilen.map(zeile => `Zeile ${zeile}`));
  }

  /** Ob unter den Stellen ein Bereich ist (dann heißt es „an Zeilen“, nicht „an einer Zeile“). */
  function istBereich(ausserhalb) {
    return ausserhalb.some(eintrag => artDerAnmerkung(eintrag) === 'bereich');
  }

  /** Wie `hinweisAusserhalb`, nennt aber eine Anmerkung eines anderen Commits derselben Datei mit Kurz-Hash: eine Ansicht ohne
      Kette zeigt je Abschnitt nur ihren Commit, und in „Einzeln“ gehört eine Anmerkung zu ihrem gewählten Commit. `ausserhalb`:
      `{ commit, zeile }` in Anlegereihenfolge; `gezeigteCommits` die Commits der gezeigten Sichten. */
  function hinweisAusserhalbMitCommits(ausserhalb, kurzVon, gezeigteCommits) {
    if (ausserhalb.length === 0) {
      return '';
    }
    const stellen = stellenMitCommit(ausserhalb, kurzVon, gezeigteCommits);
    return hinweisText(ausserhalb.length, stellen, istBereich(ausserhalb));
  }

  /** Anmerkungen außerhalb, je Stelle (Commit, Zeile) einmal, aufsteigend nach Zeile; den gezeigten Commit ohne Hash, einen fremden mit. */
  function stellenMitCommit(ausserhalb, kurzVon, gezeigteCommits) {
    const stellen = [];
    const gesehen = new Set();
    for (const eintrag of [...ausserhalb].sort((links, rechts) => anmerkungsstelle(links) - anmerkungsstelle(rechts))) {
      const schluessel = `${eintrag.commit}:${anmerkungsstelle(eintrag)}`;
      if (gesehen.has(schluessel)) {
        continue;
      }
      gesehen.add(schluessel);
      if (gezeigteCommits.has(eintrag.commit)) {
        stellen.push(stellentext(eintrag));
        continue;
      }
      stellen.push(`Commit ${kurzVon(eintrag.commit)}, ${stellentext(eintrag)}`);
    }
    return stellen;
  }

  function hinweisText(anzahl, stellen, istBereichsstelle = false) {
    const anmerkungen = anzahl === 1 ? '1 Anmerkung' : `${anzahl} Anmerkungen`;
    const zeilenteil = stellen.length === 1 && !istBereichsstelle ? 'an einer Zeile, die diese Ansicht nicht zeigt' : 'an Zeilen, die diese Ansicht nicht zeigen';
    return `${anmerkungen} ${zeilenteil}: ${stellen.join(', ')}`;
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

  /** Die Wahl der Art im Notizfeld (R00036): Wert für den Server und das Wort in der Oberfläche; `null` ist „ohne“. Die Werte
      sind dieselben, die `Anmerkungsart` auf dem Server annimmt. */
  const ARTEN = [
    { wert: null, wort: 'ohne' },
    { wert: 'muss', wort: 'Muss' },
    { wert: 'frage', wort: 'Frage' },
    { wert: 'idee', wort: 'Idee' },
  ];

  /** Der Wert einer Art für den Server: einer der drei oder `null`; ein unbekannter Wert gilt als „ohne“. */
  function artwert(wert) {
    return ARTEN.some(eintrag => eintrag.wert !== null && eintrag.wert === wert) ? wert : null;
  }

  /** Das Wort der Art für den Anmerkungskopf: „Muss“, „Frage“, „Idee“; ohne Art leer (R00036: die Art ist nie allein Farbe). */
  function artWort(wert) {
    const bekannt = artwert(wert);
    const eintrag = ARTEN.find(wahl => wahl.wert === bekannt);
    return eintrag.wert === null ? '' : eintrag.wort;
  }

  /** Anmerkungen (Anlegereihenfolge) + Nummer + Art → dieselbe Liste in derselben Reihenfolge; nur die Art der Anmerkung mit dieser
      Nummer wechselt (auf `null` = entfernt). Eine unbekannte Nummer lässt den Inhalt unverändert. */
  function mitGeaenderterArt(anmerkungen, nummer, art) {
    return anmerkungen.map(anmerkung => {
      if (anmerkung.nummer !== nummer) {
        return anmerkung;
      }
      return { ...anmerkung, art: artwert(art) };
    });
  }

  /** Anmerkungen (Anlegereihenfolge) + Nummer → dieselbe Liste in derselben Reihenfolge ohne den Eintrag mit dieser Nummer.
      Eine unbekannte Nummer lässt den Inhalt unverändert; die anderen behalten Stelle und Reihenfolge. */
  function ohneAnmerkung(anmerkungen, nummer) {
    return anmerkungen.filter(anmerkung => anmerkung.nummer !== nummer);
  }

  Object.assign(ziel, { zeilenziel, anmerkungsstand, anmerkungsstandJeSicht, anmerkungsstelle, stellentext, artDerAnmerkung, hinweisAusserhalb, hinweisAusserhalbMitCommits, mitGeaendertemText, mitGeaenderterArt, ohneAnmerkung, dateianmerkungen, ARTEN, artwert, artWort, ENTFERNT_HINWEIS });
})(typeof module !== 'undefined' ? module.exports : window);
