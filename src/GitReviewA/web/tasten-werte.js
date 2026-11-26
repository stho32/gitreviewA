/* gitreviewA — Tastenbelegung und Kontext (R00030): **die eine** Tabelle Taste → Aktion mit Bereich und Verfügbarkeit.
   Hilfe-Overlay, Statuszeile und die Hinweise an den Bedienelementen lesen daraus; es gibt keine zweite Liste. Dazu die reine
   Kontextentscheidung (kein Eingabefeld, kein Strg/Alt/Meta außer AltGr, offener Dialog für Esc und ?, der modale
   Beenden-Dialog nur für Esc) und der Abschnittswechsel
   der Diff-Zeilen. Reine Funktionen, im Browser und in Node; ohne DOM und ohne Zustand. */
(function (ziel) {
  'use strict';

  const ALLGEMEIN = 'allgemein';
  const LISTE = 'liste';
  const DIFF = 'diff';
  const ANMERKUNG = 'anmerkung';
  const REVIEW = 'review';
  const DATEIANSICHT = 'dateiansicht';

  /** Bereiche in Anzeige- und Gruppenreihenfolge der Hilfe (R00030, Hilfe-Overlay). */
  const BEREICHE = [
    { kennung: ALLGEMEIN, titel: 'Allgemein' },
    { kennung: LISTE, titel: 'Liste' },
    { kennung: DIFF, titel: 'Diff' },
    { kennung: ANMERKUNG, titel: 'Anmerkung' },
  ];

  /**
   * Der Katalog: `taste` ist der Wert von `KeyboardEvent.key`, `anzeige` steht so in Hilfe und Statuszeile, `text` ist die
   * Beschreibung der Aktion. `nurEinzeln` gilt nur im Modus „Einzeln“; `ziel` nennt das Bedienelement, dessen Vorhandensein die
   * Aktion verfügbar macht und das den Hinweis (`<kbd>` und `aria-keyshortcuts`) trägt (die Karte des Bedienelements setzt es,
   * ohne diese Schicht umzubauen); `laufart` bindet einen Eintrag an eine Laufart (R00030, Katalogeintrag mit Laufart);
   * `zielJeLaufart`/`textJeLaufart` überschreiben Ziel und Text für eine Laufart (dasselbe Kürzel steht in der Dateiansicht an
   * einem anderen Bedienelement, R00039/R00044); `imFeld` heißt: die Taste wirkt nur im Feld selbst und wird hier nie
   * abgefangen. `kurz` ist der Text der Statuszeile. Eine Karte, die ein Bedienelement mit Kürzel baut, ergänzt ihren Eintrag
   * hier — Hinweis und Verfügbarkeit folgen aus demselben `ziel`.
   */
  const EINTRAEGE = [
    { taste: '?', aktion: 'hilfe', bereich: ALLGEMEIN, text: 'diese Übersicht', anzeige: ['?'], kurz: 'alle Kürzel', ziel: '#hilfe-knopf' },
    { taste: 'q', aktion: 'beendenDialog', bereich: ALLGEMEIN, text: 'Beenden: Bestätigungsdialog öffnen', anzeige: ['q'], ziel: '#beenden', laufart: REVIEW },
    { taste: 'Escape', aktion: 'schliessen', bereich: ALLGEMEIN, text: 'Notizfeld verwerfen, Ebene schließen', anzeige: ['Esc'], nurEbene: true, textJeLaufart: { [DATEIANSICHT]: 'Markierung aufheben, Übersicht schließen' } },
    { taste: 'j', aktion: 'dateiWeiter', bereich: LISTE, text: 'nächste Datei', anzeige: ['j'], kurz: 'Datei' },
    { taste: 'k', aktion: 'dateiZurueck', bereich: LISTE, text: 'vorige Datei', anzeige: ['k'] },
    { taste: 'u', aktion: 'naechsteUngepruefte', bereich: LISTE, text: 'nächste ungeprüfte Datei', anzeige: ['u'], kurz: 'nächste ungeprüfte', ziel: '#naechste-ungepruefte', laufart: REVIEW },
    { taste: 'x', aktion: 'abhaken', bereich: LISTE, text: 'gewählte Datei abhaken / Haken entnehmen', anzeige: ['x'], kurz: 'abhaken', ziel: '#datei-zeilen input.haken', laufart: REVIEW },
    { taste: 'm', aktion: 'modusWechseln', bereich: LISTE, text: 'Zusammen / Einzeln', anzeige: ['m'], kurz: 'einzeln durchgehen', ziel: '.kz-modus', laufart: REVIEW },
    { taste: '[', aktion: 'commitZurueck', bereich: LISTE, text: 'voriger Commit (nur Einzeln)', anzeige: ['['], nurEinzeln: true, ziel: '#commit-waehler', laufart: REVIEW },
    { taste: ']', aktion: 'commitWeiter', bereich: LISTE, text: 'nächster Commit (nur Einzeln)', anzeige: [']'], nurEinzeln: true, kurz: 'Commit', ziel: '#commit-waehler', laufart: REVIEW },
    { taste: 'h', aktion: 'abgehakteAusblenden', bereich: LISTE, text: 'Abgehakte ausblenden', anzeige: ['h'], ziel: '#ausblenden', laufart: REVIEW },
    { taste: 'f', aktion: 'dateiSuchen', bereich: LISTE, text: 'Dateien suchen', anzeige: ['f'], kurz: 'Dateien suchen', ziel: '#dateiliste-suche', laufart: REVIEW },
    { taste: 'b', aktion: 'seitenleisteEinklappen', bereich: LISTE, text: 'Seitenleiste ein-/ausklappen', anzeige: ['b'], ziel: '#einklappen' },
    { taste: 'r', aktion: 'ergebnisEinklappen', bereich: LISTE, text: 'Ergebnis-Spalte ein-/ausklappen', anzeige: ['r'], ziel: '#ergebnis-einklappen', laufart: REVIEW },
    { taste: 'n', aktion: 'abschnittWeiter', bereich: DIFF, text: 'nächster Abschnitt', anzeige: ['n'], kurz: 'Abschnitt', laufart: REVIEW },
    { taste: 'p', aktion: 'abschnittZurueck', bereich: DIFF, text: 'voriger Abschnitt', anzeige: ['p'], laufart: REVIEW },
    { taste: 'ArrowDown', aktion: 'zeileWeiter', bereich: DIFF, text: 'Zeile im Diff wählen', anzeige: ['↓'], kurz: 'Zeile', laufart: REVIEW },
    { taste: 'ArrowUp', aktion: 'zeileZurueck', bereich: DIFF, text: 'Zeile im Diff wählen', anzeige: ['↑'], laufart: REVIEW },
    { taste: 'Enter', aktion: 'zeileAnmerken', bereich: DIFF, text: 'Zeile anmerken', anzeige: ['Enter'], kurz: 'anmerken', laufart: REVIEW },
    { taste: '1', aktion: 'zeileAnmerkenMuss', bereich: DIFF, text: 'Zeile anmerken: Muss', anzeige: ['1'], ziel: '#diff .df-sc', laufart: REVIEW },
    { taste: '2', aktion: 'zeileAnmerkenFrage', bereich: DIFF, text: 'Zeile anmerken: Frage', anzeige: ['2'], ziel: '#diff .df-sc', laufart: REVIEW },
    { taste: '3', aktion: 'zeileAnmerkenIdee', bereich: DIFF, text: 'Zeile anmerken: Idee', anzeige: ['3'], ziel: '#diff .df-sc', laufart: REVIEW },
    { taste: 's', aktion: 'ansichtWechseln', bereich: DIFF, text: 'nur Änderungen / ganze Datei (Ansicht ▾)', anzeige: ['s'], ziel: '#ansicht-knopf', laufart: REVIEW },
    { taste: 'v', aktion: 'anordnungWechseln', bereich: DIFF, text: 'untereinander / nebeneinander (Ansicht ▾)', anzeige: ['v'], ziel: '#ansicht-knopf', laufart: REVIEW },
    { taste: 'w', aktion: 'umbruchWechseln', bereich: DIFF, text: 'Umbruch (Ansicht ▾)', anzeige: ['w'], ziel: '#ansicht-knopf', zielJeLaufart: { [DATEIANSICHT]: '#da-umbruch' } },
    { taste: 'c', aktion: 'dateiKopieren', bereich: DIFF, text: 'Datei kopieren', anzeige: ['c'], kurz: 'Datei kopieren', laufart: DATEIANSICHT, ziel: '#datei-kopieren' },
    { taste: 'y', aktion: 'bereichKopieren', bereich: DIFF, text: 'Bereich kopieren', anzeige: ['y'], kurz: 'Bereich kopieren', laufart: DATEIANSICHT, ziel: '#bereich-kopieren' },
    { taste: 'l', aktion: 'leerraumWechseln', bereich: DIFF, text: 'Leerraum (Ansicht ▾)', anzeige: ['l'], ziel: '#ansicht-knopf', laufart: REVIEW },
    { taste: 'g', aktion: 'naechsteLuecke', bereich: DIFF, text: 'nächste Lücke', anzeige: ['g'], laufart: REVIEW },
    { taste: 'o', aktion: 'inVsCode', bereich: DIFF, text: 'Stelle in VS Code öffnen', anzeige: ['o'], ziel: '#diff .sprung-knopf', laufart: REVIEW },
    { taste: '/', aktion: 'suche', bereich: DIFF, text: 'Suche im Diff', anzeige: ['/'], ziel: '#diff-suche', zielJeLaufart: { [DATEIANSICHT]: '#da-suche' }, textJeLaufart: { [DATEIANSICHT]: 'In der Datei suchen' } },
    { taste: 'a', aktion: 'dateiAnmerken', bereich: ANMERKUNG, text: 'Datei anmerken', anzeige: ['a'], ziel: '#diff .datei-anmerken', laufart: REVIEW },
    { taste: 'e', aktion: 'anmerkungAendern', bereich: ANMERKUNG, text: 'Anmerkung ändern', anzeige: ['e'], laufart: REVIEW },
    { taste: 'Enter', aktion: 'anmerkungSpeichern', bereich: ANMERKUNG, text: 'Anmerkung speichern (im Feld)', anzeige: ['Strg', 'Enter'], imFeld: true, laufart: REVIEW },
  ];

  /** Die Statuszeile nennt die wichtigsten Kürzel des Bereichs; ihr Text kommt aus dem Katalog (R00030, Statuszeile). */
  const STATUSZEILE = [
    ['dateiWeiter', 'dateiZurueck'],
    ['abschnittWeiter', 'abschnittZurueck'],
    ['zeileZurueck', 'zeileWeiter'],
    ['zeileAnmerken'],
    ['abhaken'],
    ['naechsteUngepruefte'],
    ['commitZurueck', 'commitWeiter'],
    ['hilfe'],
  ];

  const ZUSAMMEN = 'zusammen';
  const EINZELN = 'einzeln';

  /** Ein Eintrag mit `laufart` gilt nur in seiner Laufart; ohne Angabe gilt er in beiden (R00030, Katalogeintrag mit Laufart). */
  function passtZurLaufart(eintrag, lage) {
    if (!eintrag.laufart) {
      return true;
    }
    if (!lage || !lage.laufart) {
      return true;
    }
    return eintrag.laufart === lage.laufart;
  }

  function eintragFuerAktion(aktion) {
    return EINTRAEGE.find(eintrag => eintrag.aktion === aktion) || null;
  }

  /** Der Eintrag einer Taste außerhalb von Feldern (die Feld-Einträge fängt das Feld selbst ab). */
  function eintragFuerTaste(taste) {
    return EINTRAEGE.find(eintrag => eintrag.taste === taste && !eintrag.imFeld) || null;
  }

  /** AltGr ist die einzige „Modifikatortaste“, die ein Kürzel tragen darf (deutsche Tastatur, `[`/`]`). */
  function modifikatorSperrt(modifikatoren) {
    if (!modifikatoren) {
      return false;
    }
    if (modifikatoren.strg || modifikatoren.meta) {
      return true;
    }
    return Boolean(modifikatoren.alt) && !modifikatoren.altGraph;
  }

  /**
   * Ist die Aktion in dieser Lage verfügbar? `nurEinzeln` nach Modus; ein Eintrag mit `ziel` nur, wenn seine Kennung in
   * `lage.vorhanden` steht (das Bedienelement ist gebaut) — fehlt die Liste, gilt er als vorhanden.
   */
  function verfuegbar(aktion, lage) {
    const eintrag = eintragFuerAktion(aktion);
    if (!eintrag) {
      return false;
    }
    const anlage = lage || {};
    if (!passtZurLaufart(eintrag, anlage)) {
      return false;
    }
    if (eintrag.nurEinzeln && anlage.modus !== EINZELN) {
      return false;
    }
    if (eintrag.ziel && Array.isArray(anlage.vorhanden) && !anlage.vorhanden.includes(aktion)) {
      return false;
    }
    return true;
  }

  /**
   * Die Aktion zu einem Tastendruck oder `null`. Regeln (R00030): im Eingabefeld wirkt nur das Feld selbst; Strg, Alt und Meta
   * sperren (Shift ist erlaubt, AltGr zählt nicht als Alt); ein offener Dialog lässt nur Esc und `?` durch; eine nicht verfügbare
   * Aktion und eine unbekannte Taste ergeben `null`, dann bleibt die Taste beim Browser. Der modale Beenden-Dialog (R00050) lässt
   * nur Esc durch — auch `?` öffnet die Hilfe nicht darüber.
   */
  function aktionFuer(taste, lage) {
    const anlage = lage || {};
    if (anlage.feldImFokus || modifikatorSperrt(anlage.modifikatoren)) {
      return null;
    }
    const eintrag = eintragFuerTaste(taste);
    if (!eintrag) {
      return null;
    }
    if (anlage.offenerDialog) {
      if (eintrag.aktion === 'schliessen') {
        return eintrag.aktion;
      }
      if (eintrag.aktion === 'hilfe' && !anlage.modalerDialog) {
        return eintrag.aktion;
      }
      return null;
    }
    if (eintrag.nurEbene) {
      return null;
    }
    return verfuegbar(eintrag.aktion, anlage) ? eintrag.aktion : null;
  }

  /** Der Text eines Eintrags in dieser Lage: `textJeLaufart` schlägt `text` (R00044 — dasselbe Kürzel, anderer Wortlaut). */
  function textFuer(eintrag, lage) {
    const laufart = lage && lage.laufart;
    if (laufart && eintrag.textJeLaufart && eintrag.textJeLaufart[laufart]) {
      return eintrag.textJeLaufart[laufart];
    }
    return eintrag.text;
  }

  /** Die Hilfe: je Bereich seine Einträge mit Anzeige, Text und Kennzeichen der Verfügbarkeit — aus derselben Tabelle. */
  function belegung(lage) {
    return BEREICHE.map(bereich => ({
      kennung: bereich.kennung,
      titel: bereich.titel,
      eintraege: EINTRAEGE
        .filter(eintrag => eintrag.bereich === bereich.kennung && passtZurLaufart(eintrag, lage))
        .map(eintrag => ({
          aktion: eintrag.aktion,
          anzeige: eintrag.anzeige.slice(),
          text: textFuer(eintrag, lage),
          verfuegbar: eintrag.imFeld || verfuegbar(eintrag.aktion, lage),
        })),
    }));
  }

  /** Die Statuszeile des Bereichs: je Zeile die Tasten und ihr kurzer Text, aus dem Katalog und dem Modus. */
  function statuszeile(lage) {
    const zeilen = [];
    for (const aktionen of STATUSZEILE) {
      const sichtbar = aktionen.filter(aktion => verfuegbar(aktion, lage));
      if (sichtbar.length === 0) {
        continue;
      }
      const eintraege = sichtbar.map(eintragFuerAktion);
      const kurz = eintraege.map(eintrag => eintrag.kurz).find(text => text) || eintraege[0].text;
      zeilen.push({
        anzeige: eintraege.flatMap(eintrag => eintrag.anzeige),
        text: kurz,
        rechts: sichtbar.includes('hilfe'),
      });
    }
    return zeilen;
  }

  /** Das Ziel eines Eintrags in dieser Lage: `zielJeLaufart` schlägt `ziel` (R00039 — dasselbe Kürzel, anderes Bedienelement). */
  function zielFuer(eintrag, lage) {
    const laufart = lage && lage.laufart;
    if (laufart && eintrag.zielJeLaufart && eintrag.zielJeLaufart[laufart]) {
      return eintrag.zielJeLaufart[laufart];
    }
    return eintrag.ziel || null;
  }

  /**
   * Hinweis und `aria-keyshortcuts` je Bedienelement: der Katalog nennt im `ziel` das Element (je Laufart, R00039); nur
   * Einträge der jeweiligen Laufart zählen (R00030/R00044). Mehrere Einträge mit demselben Ziel teilen sich einen Hinweis;
   * ein später gebautes Bedienelement braucht nur seinen Katalogeintrag mit `ziel` — der Hinweis erscheint ohne zweite Liste.
   */
  function hinweise(lage) {
    const nachZiel = new Map();
    for (const eintrag of EINTRAEGE) {
      if (!passtZurLaufart(eintrag, lage)) {
        continue;
      }
      const ziel = zielFuer(eintrag, lage);
      if (!ziel) {
        continue;
      }
      if (!nachZiel.has(ziel)) {
        nachZiel.set(ziel, []);
      }
      nachZiel.get(ziel).push(eintrag);
    }
    return [...nachZiel].map(([ziel, eintraege]) => ({
      selektor: ziel,
      anzeige: eintraege.flatMap(eintrag => eintrag.anzeige),
      aria: eintraege.map(eintrag => ariaTaste(eintrag.taste)).join(' '),
    }));
  }

  /** `KeyboardEvent.key` in der Schreibweise von `aria-keyshortcuts` (R00030: `Enter`, `ArrowUp`, sonst das Zeichen selbst). */
  function ariaTaste(taste) {
    const namen = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', Enter: 'Enter', Escape: 'Escape' };
    return namen[taste] || taste;
  }

  /** Die Abschnittsanfänge einer Diff-Ansicht: die erste Zeile nach jedem Abschnittskopf; ohne Kopf die erste Zeile. */
  function abschnittsanfaenge(arten) {
    if (!Array.isArray(arten) || arten.length === 0) {
      return [];
    }
    const anfaenge = [];
    if (arten[0] !== 'kopf') {
      anfaenge.push(0);
    }
    for (let stelle = 0; stelle < arten.length - 1; stelle += 1) {
      if (arten[stelle] === 'kopf' && arten[stelle + 1] !== 'kopf') {
        anfaenge.push(stelle + 1);
      }
    }
    return anfaenge;
  }

  /**
   * Der nächste (`richtung` > 0) oder vorige Abschnittsanfang ab der aktuellen Zeile; an den Enden `null`, dann bleibt der Fokus
   * stehen. Ohne aktuelle Zeile ist das Ziel der erste Abschnitt — beide Richtungen beginnen am Dokumentanfang.
   */
  function naechsterAbschnitt(anfaenge, aktuelle, richtung) {
    if (!Array.isArray(anfaenge) || anfaenge.length === 0) {
      return null;
    }
    if (aktuelle === null || aktuelle === undefined) {
      return anfaenge[0];
    }
    if (richtung > 0) {
      const naechster = anfaenge.find(anfang => anfang > aktuelle);
      return naechster === undefined ? null : naechster;
    }
    const vorherige = anfaenge.filter(anfang => anfang < aktuelle);
    return vorherige.length === 0 ? null : vorherige[vorherige.length - 1];
  }

  const api = {
    BEREICHE,
    REVIEW,
    DATEIANSICHT,
    ZUSAMMEN,
    EINZELN,
    EINTRAEGE,
    eintragFuerTaste,
    verfuegbar,
    aktionFuer,
    belegung,
    statuszeile,
    hinweise,
    zielFuer,
    textFuer,
    abschnittsanfaenge,
    naechsterAbschnitt,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaTastenWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);