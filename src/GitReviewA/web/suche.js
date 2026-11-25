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
      (`data-farbe` `ja` oder `nein`), wird sie erneut aufgetragen — die Position bleibt. Beobachtet wird dort, wo die
      Färbung `data-farbe` setzt: im Einspalten-Verfahren am Rollbereich (`.df-sc`), im Anzeigeverfahren „Zusammen“ mit
      Abschnitten dagegen je `.diff-abschnitt` — deshalb der ganze Diff-Bereich samt Unterbaum. */
  function beobachteFarbe(ansicht) {
    const beobachter = new MutationObserver(eintraege => {
      if (zustand.begriff === '' || !faerbungFertig(eintraege)) {
        return;
      }
      rechnen(ansicht);
      markiere(ansicht, false);
      zeigeZaehler(ansicht);
    });
    beobachter.observe(ansicht.wurzelElement, { attributes: true, attributeFilter: ['data-farbe'], subtree: true });
  }

  /** Ob unter den Änderungen das Ende einer Färbung steht (`data-farbe` `ja` oder `nein`). */
  function faerbungFertig(eintraege) {
    return eintraege.some(eintrag => {
      const wert = eintrag.target.dataset.farbe;
      return wert === 'ja' || wert === 'nein';
    });
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
      aktuellen hervor. Je Zelle in **einem** Durchgang: jeder Textknoten wird einmal abgelaufen, geteilt und durch seine
      Stücke ersetzt (Textknoten, Marke, Textknoten) — die Kosten wachsen so linear mit dem gezeigten Text und der Zahl der
      Treffer statt quadratisch mit der Zahl der Textknoten der Zelle (Befund B1 des Security-Reviews: viele Treffer in einer
      Zeile). Gezählt wird über die Zellen in Häppchen, damit keine Aufgabe des Hauptfadens die 150-ms-Zusage bricht; eine neue
      Suche bricht einen laufenden Auftrag ab (`zustand.lauf`). */
  function markiere(ansicht, scroll) {
    const lauf = (zustand.lauf += 1);
    entferneMarkierungen(ansicht);
    zustand.elemente = new Array(zustand.treffer.length);
    verarbeiteAb(ansicht, lauf, trefferJeZelle(textzellen(ansicht)), 0, scroll);
  }

  /** Die Treffer in Zellenreihenfolge zu Gruppen je Zelle gebündelt: `{zelle, treffer:[{von, bis, kennung}]}`; innerhalb
      einer Zelle aufsteigend nach `von`, wie `finde` sie liefert. `kennung` ist die Stelle des Treffers in `zustand.treffer`. */
  function trefferJeZelle(zellen) {
    const gruppen = [];
    let letzte = null;
    for (let stelle = 0; stelle < zustand.treffer.length; stelle += 1) {
      const treffer = zustand.treffer[stelle];
      const zelle = zellen[treffer.zeile];
      if (letzte === null || letzte.zelle !== zelle) {
        letzte = { zelle, treffer: [] };
        gruppen.push(letzte);
      }
      letzte.treffer.push({ von: treffer.von, bis: treffer.bis, kennung: stelle });
    }
    return gruppen;
  }

  function verarbeiteAb(ansicht, lauf, gruppen, anfang, scroll) {
    if (lauf !== zustand.lauf) {
      return;
    }
    let index = anfang;
    let markiert = 0;
    while (index < gruppen.length && markiert < HAEPPCHEN) {
      const gruppe = gruppen[index];
      const marken = markiereZelle(gruppe.zelle, gruppe.treffer);
      for (let stelle = 0; stelle < marken.length; stelle += 1) {
        zustand.elemente[gruppe.treffer[stelle].kennung] = marken[stelle];
      }
      markiert += marken.length;
      index += 1;
    }
    if (index < gruppen.length) {
      setTimeout(() => verarbeiteAb(ansicht, lauf, gruppen, index, scroll), 0);
      return;
    }
    setzeAktuellen(ansicht, scroll);
  }

  /** Legt um jede Trefferspanne einer Zelle ein Markierungselement, in einem Durchgang über ihre Textknoten (der Lesetext
      `.vh` zählt nicht mit): jeder Textknoten wird einmal zerlegt und durch seine Stücke ersetzt. Reicht eine Spanne über
      eine Elementgrenze (über eine Marke hinweg), sammelt die eine Marke ihre Stücke. Liefert die Marken in Trefferreihenfolge. */
  function markiereZelle(zelle, treffer) {
    const marken = new Array(treffer.length);
    teile(zelle, treffer, marken, { index: 0, versatz: 0, offen: null });
    return marken;
  }

  function teile(eltern, treffer, marken, wandern) {
    for (const knoten of [...eltern.childNodes]) {
      if (knoten.nodeType === Node.TEXT_NODE) {
        teileTextknoten(knoten, treffer, marken, wandern);
      } else if (knoten.nodeType === Node.ELEMENT_NODE && !knoten.classList.contains('vh')) {
        teile(knoten, treffer, marken, wandern);
      }
    }
  }

  /** Zerlegt einen Textknoten an den Treffergrenzen und ersetzt ihn durch seine Stücke; offene Spannen (über eine
      Elementgrenze) führen ihre Stücke in derselben Marke weiter. `wandern` hält den Stand über Textknoten hinweg. */
  function teileTextknoten(knoten, treffer, marken, wandern) {
    const text = knoten.nodeValue;
    const sammel = document.createDocumentFragment();
    let lokal = 0;
    while (wandern.index < treffer.length && treffer[wandern.index].von < wandern.versatz + text.length) {
      const stelle = treffer[wandern.index];
      const von = Math.max(stelle.von - wandern.versatz, lokal);
      const bis = Math.min(stelle.bis - wandern.versatz, text.length);
      if (von > lokal) {
        sammel.appendChild(document.createTextNode(text.slice(lokal, von)));
      }
      if (wandern.offen === null) {
        wandern.offen = document.createElement('span');
        wandern.offen.className = 'suche-treffer';
        marken[wandern.index] = wandern.offen;
        sammel.appendChild(wandern.offen);
      }
      wandern.offen.appendChild(document.createTextNode(text.slice(von, bis)));
      lokal = bis;
      if (stelle.bis > wandern.versatz + text.length) {
        break;                       // die Spanne läuft in den nächsten Textknoten weiter
      }
      wandern.index += 1;
      wandern.offen = null;
    }
    if (lokal < text.length) {
      sammel.appendChild(document.createTextNode(text.slice(lokal)));
    }
    knoten.replaceWith(sammel);
    wandern.versatz += text.length;
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

  document.addEventListener('DOMContentLoaded', init);
}());
