/* gitreviewA — Suche im Diff (R00027): Suchfeld im Diff-Werkzeugkasten, Zähler „k von n“ und Treffer-Navigation.
   Gesucht wird nur im gezeigten Text der schon gezeichneten Zeilen — kein neuer Serverweg, kein neuer `git`-Aufruf.
   Die Rechnung liegt in `suche-werte.js`; die gezeigten Zeilen liest dieses Modul aus dem DOM (`td.c` der Diff-Tabelle).
   Tasten nur Enter (nächster) und Umschalt+Enter (voriger) im Feld; ein eigenes Kürzel gehört zu I0015. */
(function () {
  'use strict';

  /** `begriff`: der zuletzt gesuchte Begriff (bleibt im Feld und über Wechsel hinweg); `treffer`: die gefundenen
      Stellen `{zeile, von, bis}` in Reihenfolge; `aktuell`: 1-basierte Stelle des aktuellen Treffers; `gedeckelt`:
      über der Treffergrenze. */
  const zustand = { begriff: '', treffer: [], aktuell: 0, gedeckelt: false };

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
    } else {
      zustand.begriff = text;
      rechnen(ansicht);
      zustand.aktuell = 1;
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
