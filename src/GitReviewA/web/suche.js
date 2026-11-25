/* gitreviewA — Suche im Diff (R00027): Suchfeld im Diff-Werkzeugkasten, Zähler „k von n“ und Treffer-Navigation.
   Gesucht wird nur im gezeigten Text der schon gezeichneten Zeilen — kein neuer Serverweg, kein neuer `git`-Aufruf.
   Die Rechnung liegt in `suche-werte.js`; die gezeigten Zeilen liest dieses Modul aus dem DOM (`td.c` der Diff-Tabelle).
   Tasten nur Enter (nächster) und Umschalt+Enter (voriger) im Feld; ein eigenes Kürzel gehört zu I0015. */
(function () {
  'use strict';

  /** `begriff`: der zuletzt gesuchte Begriff (bleibt im Feld und über Wechsel hinweg); `treffer`: die gefundenen
      Stellen `{zeile, von, bis}` in Reihenfolge; `aktuell`: 1-basierte Stelle des aktuellen Treffers; `gedeckelt`:
      über der Treffergrenze. */
  const zustand = { begriff: '', treffer: [], aktuell: 0, gedeckelt: false, lauf: 0, elemente: [] };

  /** Höchstzahl Treffer, die eine Aufgabe des Hauptfadens markiert (bleibt unter der 150-ms-Zusage, R00027). */
  const HAEPPCHEN = 400;

  function init() {
    const ansicht = ansichtElemente();
    ansicht.eingabeElement.addEventListener('keydown', ereignis => beiTasteEingabe(ansicht, ereignis));
    document.addEventListener('diff-gezeichnet', () => beiGezeichnet(ansicht));
    document.addEventListener('diff-geleert', () => beiGeleert(ansicht));
    beobachteFarbe(ansicht);
  }

  function ansichtElemente() {
    const wurzelElement = document.getElementById('diff');
    return {
      wurzelElement,
      bereichElement: wurzelElement.querySelector('.df-sc'),
      eingabeElement: wurzelElement.querySelector('#diff-suche'),
      zaehlerElement: wurzelElement.querySelector('.diff-suche-zaehler'),
      fehlerElement: wurzelElement.querySelector('#diff-suche-fehler'),
    };
  }

  /** Ein neuer Diff ist gezeichnet (Datei-, Commit-, Ansichts-Wechsel): die Treffer für die gezeigte Datei neu rechnen und
      die Position auf 1 setzen; der Suchbegriff bleibt. Ohne gelesenen Bereich (zugeklappt, Binär, keine Änderung) gibt es
      keine Zeilen und damit „keine Treffer“. */
  function beiGezeichnet(ansicht) {
    if (zustand.begriff === '') {
      return;
    }
    rechnen(ansicht);
    zustand.aktuell = 1;
    markiere(ansicht, false);
    zeigeZaehler(ansicht);
  }

  /** Der Diff-Bereich ist geleert: die Markierungen verschwinden, der Zähler wird leer, der Suchbegriff bleibt im Feld. */
  function beiGeleert(ansicht) {
    zustand.lauf += 1;
    entferneMarkierungen(ansicht);
    zustand.treffer = [];
    zustand.aktuell = 0;
    zustand.gedeckelt = false;
    ansicht.zaehlerElement.textContent = '';
  }

  /** Die Färbung (R00007) schreibt den Inhalt der Textzellen neu und nimmt damit die Markierung weg; endet sie
      (`data-farbe` `ja` oder `nein`), wird sie erneut aufgetragen — die Position bleibt. */
  function beobachteFarbe(ansicht) {
    const beobachter = new MutationObserver(() => {
      const wert = ansicht.bereichElement.dataset.farbe;
      if ((wert === 'ja' || wert === 'nein') && zustand.begriff !== '') {
        rechnen(ansicht);
        markiere(ansicht, false);
        zeigeZaehler(ansicht);
      }
    });
    beobachter.observe(ansicht.bereichElement, { attributes: true, attributeFilter: ['data-farbe'] });
  }

  /** Enter sucht und springt zum nächsten Treffer, Umschalt+Enter zum vorigen; ein neuer Begriff beginnt bei 1. */
  function beiTasteEingabe(ansicht, ereignis) {
    if (ereignis.key !== 'Enter') {
      return;
    }
    ereignis.preventDefault();
    const text = ansicht.eingabeElement.value;
    const geprueft = pruefe(text);
    if (!geprueft.gueltig) {
      ansicht.fehlerElement.textContent = geprueft.meldung;
      return;
    }
    ansicht.fehlerElement.textContent = '';
    if (text === zustand.begriff) {
      springe(ereignis.shiftKey ? -1 : 1);
      setzeAktuellen(ansicht, true);
    } else {
      zustand.begriff = text;
      rechnen(ansicht);
      zustand.aktuell = 1;
      markiere(ansicht, true);
      // Debug-Zeile je Suche: nur Länge und Trefferzahl, nie der Wortlaut (R00027, Logging). Kein Serverweg.
      console.debug(`Suche im Diff: Länge ${text.length}, Treffer ${zustand.treffer.length}`);
    }
    zeigeZaehler(ansicht);
  }

  /** Findet die Treffer des Begriffs im gezeigten Text der Zeilen, die der Diff-Bereich gerade zeigt. */
  function rechnen(ansicht) {
    const texte = textzellen(ansicht).map(zellentext);
    const gefunden = finde(texte, zustand.begriff);
    zustand.treffer = gefunden.treffer;
    zustand.gedeckelt = gefunden.gedeckelt;
  }

  function springe(richtung) {
    const anzahl = zustand.treffer.length;
    if (anzahl === 0) {
      return;
    }
    zustand.aktuell = (((zustand.aktuell - 1 + richtung) % anzahl) + anzahl) % anzahl + 1;
  }

  function zeigeZaehler(ansicht) {
    ansicht.zaehlerElement.textContent = zaehlertext(zustand.aktuell, zustand.treffer.length, zustand.gedeckelt);
  }

  /** Markiert die Treffer als eigene Elemente um ihren Text (DOM-Bereich, `textContent` — nie `innerHTML`) und hebt den
      aktuellen hervor. In Häppchen, damit keine Aufgabe des Hauptfadens die 150-ms-Zusage bricht; eine neue Suche bricht
      einen laufenden Auftrag ab (`zustand.lauf`). Innerhalb einer Zeile von hinten nach vorn, damit die Stellen stimmen. */
  function markiere(ansicht, scroll) {
    const lauf = (zustand.lauf += 1);
    entferneMarkierungen(ansicht);
    const zellen = textzellen(ansicht);
    const arbeit = [];
    let index = 0;
    while (index < zustand.treffer.length) {
      const zellenIndex = zustand.treffer[index].zeile;
      const gruppe = [];
      while (index < zustand.treffer.length && zustand.treffer[index].zeile === zellenIndex) {
        gruppe.push(index);
        index += 1;
      }
      for (const stelle of gruppe.reverse()) {
        const treffer = zustand.treffer[stelle];
        arbeit.push({ stelle, zelle: zellen[treffer.zeile], von: treffer.von, bis: treffer.bis });
      }
    }
    zustand.elemente = new Array(zustand.treffer.length);
    verarbeiteAb(ansicht, lauf, arbeit, 0, scroll);
  }

  function verarbeiteAb(ansicht, lauf, arbeit, anfang, scroll) {
    if (lauf !== zustand.lauf) {
      return;
    }
    const ende = Math.min(anfang + HAEPPCHEN, arbeit.length);
    for (let stelle = anfang; stelle < ende; stelle += 1) {
      const posten = arbeit[stelle];
      const mark = markiereTreffer(posten.zelle, posten.von, posten.bis);
      if (mark) {
        zustand.elemente[posten.stelle] = mark;
      }
    }
    if (ende < arbeit.length) {
      setTimeout(() => verarbeiteAb(ansicht, lauf, arbeit, ende, scroll), 0);
      return;
    }
    setzeAktuellen(ansicht, scroll);
  }

  /** Legt um die Zeichenspanne `von`..`bis` im gezeigten Text der Zelle ein Markierungselement. Liegt die Spanne in einem
      einzigen Textknoten, wird der Knoten geteilt (schnell); sonst trägt `extractContents` sie zusammen (z. B. über eine
      Marke) — in beiden Fällen bleibt der Text unverändert. */
  function markiereTreffer(zelle, von, bis) {
    const knoten = textknoten(zelle);
    const anfang = knotenBei(knoten, von);
    const ende = knotenBei(knoten, bis);
    if (!anfang || !ende) {
      return null;
    }
    const mark = document.createElement('span');
    mark.className = 'suche-treffer';
    if (anfang.knoten === ende.knoten) {
      const treffer = anfang.knoten.splitText(anfang.index);
      treffer.splitText(bis - von);
      treffer.parentNode.insertBefore(mark, treffer);
      mark.append(treffer);
      return mark;
    }
    const bereich = document.createRange();
    bereich.setStart(anfang.knoten, anfang.index);
    bereich.setEnd(ende.knoten, ende.index);
    mark.append(bereich.extractContents());
    bereich.insertNode(mark);
    return mark;
  }

  /** Der Textknoten und die Stelle (0-basiert) zum Zeichenversatz `offset` im gezeigten Text der Zelle. */
  function knotenBei(knoten, offset) {
    let rest = offset;
    for (const textknoten of knoten) {
      if (rest <= textknoten.nodeValue.length) {
        return { knoten: textknoten, index: rest };
      }
      rest -= textknoten.nodeValue.length;
    }
    const letzter = knoten[knoten.length - 1];
    if (!letzter) {
      return null;
    }
    return { knoten: letzter, index: letzter.nodeValue.length };
  }

  /** Nimmt bestehende Markierungen wieder weg, ohne den Text zu verändern; benachbarte Textknoten werden wieder vereint. */
  function entferneMarkierungen(ansicht) {
    const eltern = new Set();
    for (const mark of ansicht.bereichElement.querySelectorAll('.suche-treffer')) {
      const elternKnoten = mark.parentNode;
      while (mark.firstChild) {
        elternKnoten.insertBefore(mark.firstChild, mark);
      }
      elternKnoten.removeChild(mark);
      eltern.add(elternKnoten);
    }
    for (const elternKnoten of eltern) {
      elternKnoten.normalize();
    }
    zustand.elemente = [];
  }

  /** Hebt den aktuellen Treffer hervor (und holt ihn auf Wunsch in den Blick); alle übrigen Markierungen verlieren die Hervorhebung. */
  function setzeAktuellen(ansicht, scroll) {
    for (const mark of zustand.elemente) {
      if (mark) {
        mark.classList.remove('suche-treffer-aktuell');
      }
    }
    const aktuell = zustand.elemente[zustand.aktuell - 1];
    if (!aktuell) {
      return;
    }
    aktuell.classList.add('suche-treffer-aktuell');
    if (scroll) {
      aktuell.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }

  /** Die Textzellen der gezeigten Diff-Zeilen in Dokumentreihenfolge: einspaltig `td.c`, zweispaltig alt und neu. */
  function textzellen(ansicht) {
    return [...ansicht.bereichElement.querySelectorAll('td.c')];
  }

  /** Der gezeigte Text einer Zelle: der ganze Text der Zelle ohne den Lesetext für Vorlesewerkzeuge (`.vh`, das erste Kind). */
  function zellentext(zelle) {
    const erstes = zelle.firstElementChild;
    const lesetextLaenge = erstes && erstes.classList.contains('vh') ? erstes.textContent.length : 0;
    return zelle.textContent.slice(lesetextLaenge);
  }

  function textknoten(zelle) {
    const knoten = [];
    const besuchen = element => {
      for (const kind of element.childNodes) {
        if (kind.nodeType === Node.TEXT_NODE) {
          knoten.push(kind);
        } else if (kind.nodeType === Node.ELEMENT_NODE && !kind.classList.contains('vh')) {
          besuchen(kind);
        }
      }
    };
    besuchen(zelle);
    return knoten;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
