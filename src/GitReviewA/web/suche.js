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
  }

  function ansichtElemente() {
    const wurzelElement = document.getElementById('diff');
    return {
      wurzelElement,
      eingabeElement: wurzelElement.querySelector('#diff-suche'),
      zaehlerElement: wurzelElement.querySelector('.diff-suche-zaehler'),
      fehlerElement: wurzelElement.querySelector('#diff-suche-fehler'),
    };
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
      springe(ansicht, ereignis.shiftKey ? -1 : 1);
      setzeAktuellen(ansicht, true);
    } else {
      zustand.begriff = text;
      rechnen(ansicht);
      zustand.aktuell = 1;
      markiere(ansicht, true);
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

  function springe(ansicht, richtung) {
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

  /** Legt um die Zeichenspanne `von`..`bis` im gezeigten Text der Zelle ein Markierungselement. Eine Spanne über mehrere
      Textknoten (z. B. über eine Marke) trägt `extractContents` zusammen, ohne den Text zu verändern. */
  function markiereTreffer(zelle, von, bis) {
    const knoten = textknoten(zelle);
    const anfang = knotenBei(knoten, von);
    const ende = knotenBei(knoten, bis);
    if (!anfang || !ende) {
      return null;
    }
    const bereich = document.createRange();
    bereich.setStart(anfang.knoten, anfang.index);
    bereich.setEnd(ende.knoten, ende.index);
    const mark = document.createElement('span');
    mark.className = 'suche-treffer';
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
    for (const mark of ansicht.wurzelElement.querySelectorAll('.df-sc .suche-treffer')) {
      const eltern = mark.parentNode;
      while (mark.firstChild) {
        eltern.insertBefore(mark.firstChild, mark);
      }
      eltern.removeChild(mark);
      eltern.normalize();
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
    return [...ansicht.wurzelElement.querySelectorAll('.df-sc td.c')];
  }

  /** Der gezeigte Text einer Zelle: alle Textknoten außer dem Lesetext für Vorlesewerkzeuge (`.vh`). */
  function zellentext(zelle) {
    let text = '';
    for (const knoten of textknoten(zelle)) {
      text += knoten.nodeValue;
    }
    return text;
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
