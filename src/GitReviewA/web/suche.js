/* gitreviewA — Suche (R00027, R00044): Suchfeld, Zähler „k von n“ und Treffer-Navigation. **Eine** Fläche wird beim Anlegen
   beschrieben (`anlegen(flaeche)`): das Suchfeld, die Textzellen und die Texte kommen von der Laufart — der Diff (I0031,
   `#diff .df-sc td.c`) und die Dateiansicht (I0045, `#da-inhalt .da-text`) teilen sich dieselbe Rechnung und Markierung.
   Gesucht wird wörtlich über den **vollen** Text der Zeilen; Treffer jenseits des gezeigten Teils zählt die Suche nur (L5).
   Die Rechnung liegt in `suche-werte.js`; kein neuer Serverweg, kein neuer `git`-Aufruf. Tasten nur Enter (nächster) und
   Umschalt+Enter (voriger) im Feld; das Kürzel `/` gehört zum Katalog (R00030). */
(function () {
  'use strict';

  /** `begriff`: der zuletzt gesuchte Begriff (bleibt im Feld und über Wechsel hinweg); `treffer`: die gefundenen
      Stellen `{zeile, von, bis}` in Reihenfolge; `aktuell`: 1-basierte Stelle des aktuellen Treffers; `gedeckelt`:
      über der Treffergrenze. */
  const zustand = { begriff: '', treffer: [], aktuell: 0, gedeckelt: false, lauf: 0, elemente: [] };

  /** Höchstzahl Treffer, die eine Aufgabe des Hauptfadens markiert (bleibt unter der 150-ms-Zusage, R00027). */
  const HAEPPCHEN = 400;

  /**
   * Eine Suchfläche verbinden. `flaeche`: `{bereich, eingabe, zaehler, fehler, zellen(), texte(), sichtbar?(zelle),
   * zeichnenEreignis, leerenEreignis?, beobachteFarbe?, wurzel?}`. `zellen()` liefert die DOM-Zellen in Zeilenreihenfolge,
   * `texte()` die Suchtexte (Standard: der Text der Zellen), `sichtbar(zelle)` die Länge des gezeigten Textes (Treffer
   * dahinter werden gezählt, aber nicht markiert).
   */
  function anlegen(flaeche) {
    flaeche.eingabe.addEventListener('keydown', ereignis => beiTasteEingabe(flaeche, ereignis));
    document.addEventListener(flaeche.zeichnenEreignis, () => beiGezeichnet(flaeche));
    if (flaeche.leerenEreignis) {
      document.addEventListener(flaeche.leerenEreignis, () => beiGeleert(flaeche));
    }
    if (flaeche.beobachteFarbe) {
      beobachteFarbe(flaeche);
    }
  }

  /** Ein neues Zeichnen (Datei-, Commit-, Ansichts-Wechsel): die Treffer für die gezeigte Datei neu rechnen und die
      Position auf 1 setzen; der Suchbegriff bleibt. Ohne gezeichnete Zeilen gibt es keine Zeilen und damit „keine Treffer“. */
  function beiGezeichnet(flaeche) {
    if (zustand.begriff === '') {
      return;
    }
    rechnen(flaeche);
    zustand.aktuell = 1;
    markiere(flaeche, false);
    zeigeZaehler(flaeche);
  }

  /** Der Bereich ist geleert: die Markierungen verschwinden, der Zähler wird leer, der Suchbegriff bleibt im Feld. */
  function beiGeleert(flaeche) {
    zustand.lauf += 1;
    entferneMarkierungen(flaeche);
    zustand.treffer = [];
    zustand.aktuell = 0;
    zustand.gedeckelt = false;
    flaeche.zaehler.textContent = '';
  }

  /** Die Färbung (R00007) schreibt den Inhalt der Textzellen neu und nimmt damit die Markierung weg; endet sie
      (`data-farbe` `ja` oder `nein`), wird sie erneut aufgetragen — die Position bleibt. */
  function beobachteFarbe(flaeche) {
    const beobachter = new MutationObserver(eintraege => {
      if (zustand.begriff === '' || !faerbungFertig(eintraege)) {
        return;
      }
      rechnen(flaeche);
      markiere(flaeche, false);
      zeigeZaehler(flaeche);
    });
    beobachter.observe(flaeche.wurzel, { attributes: true, attributeFilter: ['data-farbe'], subtree: true });
  }

  /** Ob unter den Änderungen das Ende einer Färbung steht (`data-farbe` `ja` oder `nein`). */
  function faerbungFertig(eintraege) {
    return eintraege.some(eintrag => {
      const wert = eintrag.target.dataset.farbe;
      return wert === 'ja' || wert === 'nein';
    });
  }

  /** Enter sucht und springt zum nächsten Treffer, Umschalt+Enter zum vorigen; ein neuer Begriff beginnt bei 1. */
  function beiTasteEingabe(flaeche, ereignis) {
    if (ereignis.key !== 'Enter') {
      return;
    }
    ereignis.preventDefault();
    const text = flaeche.eingabe.value;
    const geprueft = pruefe(text);
    if (!geprueft.gueltig) {
      flaeche.fehler.textContent = geprueft.meldung;
      return;
    }
    flaeche.fehler.textContent = '';
    if (text === zustand.begriff) {
      springe(ereignis.shiftKey ? -1 : 1);
      setzeAktuellen(flaeche, true);
    } else {
      zustand.begriff = text;
      rechnen(flaeche);
      zustand.aktuell = 1;
      markiere(flaeche, true);
      // Debug-Zeile je Suche: nur Länge und Trefferzahl, nie der Wortlaut (R00027, Logging). Kein Serverweg.
      console.debug(`Suche: Länge ${text.length}, Treffer ${zustand.treffer.length}`);
    }
    zeigeZaehler(flaeche);
  }

  /** Die Suchtexte der Fläche: der volle Text der Zeilen (Standard) oder was `flaeche.texte()` liefert. */
  function texte(flaeche) {
    if (flaeche.texte) {
      return flaeche.texte();
    }
    return flaeche.zellen().map(zelle => (flaeche.text ? flaeche.text(zelle) : zelle.textContent));
  }

  /** Findet die Treffer des Begriffs im vollen Text der Zeilen, die die Fläche gerade zeigt. */
  function rechnen(flaeche) {
    const gefunden = finde(texte(flaeche), zustand.begriff);
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

  function zeigeZaehler(flaeche) {
    flaeche.zaehler.textContent = zaehlertext(zustand.aktuell, zustand.treffer.length, zustand.gedeckelt);
  }

  /** Markiert die Treffer als eigene Elemente um ihren Text (DOM-Bereich, `textContent` — nie `innerHTML`) und hebt den
      aktuellen hervor. Je Zelle in **einem** Durchgang: jeder Textknoten wird einmal abgelaufen, geteilt und durch seine
      Stücke ersetzt (Textknoten, Marke, Textknoten) — die Kosten wachsen so linear mit dem gezeigten Text und der Zahl der
      Treffer statt quadratisch mit der Zahl der Textknoten der Zelle. Treffer jenseits des gezeigten Teils werden nur
      gezählt. Gezählt wird über die Zellen in Häppchen, damit keine Aufgabe des Hauptfadens die 150-ms-Zusage bricht; eine
      neue Suche bricht einen laufenden Auftrag ab (`zustand.lauf`). */
  function markiere(flaeche, scroll) {
    const lauf = (zustand.lauf += 1);
    entferneMarkierungen(flaeche);
    zustand.elemente = new Array(zustand.treffer.length);
    verarbeiteAb(flaeche, lauf, trefferJeZelle(flaeche), 0, scroll);
  }

  /** Die Treffer in Zellenreihenfolge zu Gruppen je Zelle gebündelt: `{zelle, treffer:[{von, bis, kennung}]}`; innerhalb
      einer Zelle aufsteigend nach `von`. `kennung` ist die Stelle des Treffers in `zustand.treffer`. Treffer, deren Anfang
      jenseits des gezeigten Textes der Zelle liegt, werden übersprungen (nur gezählt, L5). */
  function trefferJeZelle(flaeche) {
    const zellen = flaeche.zellen();
    const gruppen = [];
    let letzte = null;
    for (let stelle = 0; stelle < zustand.treffer.length; stelle += 1) {
      const treffer = zustand.treffer[stelle];
      const zelle = zellen[treffer.zeile];
      if (!zelle) {
        continue;
      }
      const sichtbar = flaeche.sichtbar ? flaeche.sichtbar(zelle) : Infinity;
      if (treffer.von >= sichtbar) {
        continue;
      }
      if (letzte === null || letzte.zelle !== zelle) {
        letzte = { zelle, treffer: [] };
        gruppen.push(letzte);
      }
      letzte.treffer.push({ von: treffer.von, bis: Math.min(treffer.bis, sichtbar), kennung: stelle });
    }
    return gruppen;
  }

  function verarbeiteAb(flaeche, lauf, gruppen, anfang, scroll) {
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
      setTimeout(() => verarbeiteAb(flaeche, lauf, gruppen, index, scroll), 0);
      return;
    }
    setzeAktuellen(flaeche, scroll);
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
  function entferneMarkierungen(flaeche) {
    const eltern = new Set();
    for (const mark of flaeche.bereich.querySelectorAll('.suche-treffer')) {
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
  function setzeAktuellen(flaeche, scroll) {
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

  /* ── Die Laufart „Review“ verbindet sich selbst (I0031); die Dateiansicht ruft `anlegen` (I0045) ── */

  /** Die Textzellen der gezeigten Diff-Zeilen in Dokumentreihenfolge: einspaltig `td.c`, zweispaltig alt und neu. */
  function textzellen(bereichElement) {
    return [...bereichElement.querySelectorAll('td.c')];
  }

  /** Der gezeigte Text einer Zelle: der ganze Text der Zelle ohne den Lesetext für Vorlesewerkzeuge (`.vh`, das erste Kind). */
  function zellentext(zelle) {
    const erstes = zelle.firstElementChild;
    const lesetextLaenge = erstes && erstes.classList.contains('vh') ? erstes.textContent.length : 0;
    return zelle.textContent.slice(lesetextLaenge);
  }

  function anlegenReview() {
    const wurzel = document.getElementById('diff');
    if (!wurzel) {
      return;
    }
    const bereich = wurzel.querySelector('.df-sc');
    anlegen({
      wurzel,
      bereich,
      eingabe: wurzel.querySelector('#diff-suche'),
      zaehler: wurzel.querySelector('.diff-suche-zaehler'),
      fehler: wurzel.querySelector('#diff-suche-fehler'),
      zellen: () => textzellen(bereich),
      text: zellentext,
      zeichnenEreignis: 'diff-gezeichnet',
      leerenEreignis: 'diff-geleert',
      beobachteFarbe: true,
    });
  }

  window.gitreviewaSuche = { anlegen };
  document.addEventListener('DOMContentLoaded', anlegenReview);
}());
