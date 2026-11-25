/* gitreviewA — Tastenbelegung und Kontext (R00030): **die eine** Tabelle Taste → Aktion mit Bereich und Verfügbarkeit.
   Hilfe-Overlay, Statuszeile und die Hinweise an den Bedienelementen lesen daraus; es gibt keine zweite Liste. Dazu die reine
   Kontextentscheidung (kein Eingabefeld, kein Strg/Alt/Meta außer AltGr, offener Dialog nur für Esc und ?) und der Abschnittswechsel
   der Diff-Zeilen. Reine Funktionen, im Browser und in Node; ohne DOM und ohne Zustand. */
(function (ziel) {
  'use strict';

  const ALLGEMEIN = 'allgemein';
  const LISTE = 'liste';
  const DIFF = 'diff';
  const ANMERKUNG = 'anmerkung';

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
   * ohne diese Schicht umzubauen); `imFeld` heißt: die Taste wirkt nur im Feld selbst und wird hier nie abgefangen. `kurz` ist
   * der Text der Statuszeile. Eine Karte, die ein Bedienelement mit Kürzel baut, ergänzt ihren Eintrag hier — Hinweis und
   * Verfügbarkeit folgen aus demselben `ziel`.
   */
  const EINTRAEGE = [
    { taste: '?', aktion: 'hilfe', bereich: ALLGEMEIN, text: 'diese Übersicht', anzeige: ['?'], kurz: 'alle Kürzel', ziel: '#hilfe-knopf' },
    { taste: 'Escape', aktion: 'schliessen', bereich: ALLGEMEIN, text: 'Notizfeld verwerfen, Ebene schließen', anzeige: ['Esc'], nurEbene: true },
    { taste: 'j', aktion: 'dateiWeiter', bereich: LISTE, text: 'nächste Datei', anzeige: ['j'], kurz: 'Datei' },
    { taste: 'k', aktion: 'dateiZurueck', bereich: LISTE, text: 'vorige Datei', anzeige: ['k'] },
    { taste: 'u', aktion: 'naechsteUngepruefte', bereich: LISTE, text: 'nächste ungeprüfte Datei', anzeige: ['u'], kurz: 'nächste ungeprüfte', ziel: '#naechste-ungepruefte' },
    { taste: 'x', aktion: 'abhaken', bereich: LISTE, text: 'gewählte Datei abhaken / Haken entnehmen', anzeige: ['x'], kurz: 'abhaken', ziel: '#datei-zeilen input.haken' },
    { taste: 'm', aktion: 'modusWechseln', bereich: LISTE, text: 'Zusammen / Einzeln', anzeige: ['m'], kurz: 'einzeln durchgehen', ziel: '.kz-modus' },
    { taste: '[', aktion: 'commitZurueck', bereich: LISTE, text: 'voriger Commit (nur Einzeln)', anzeige: ['['], nurEinzeln: true, ziel: '#commit-waehler' },
    { taste: ']', aktion: 'commitWeiter', bereich: LISTE, text: 'nächster Commit (nur Einzeln)', anzeige: [']'], nurEinzeln: true, kurz: 'Commit', ziel: '#commit-waehler' },
    { taste: 'h', aktion: 'abgehakteAusblenden', bereich: LISTE, text: 'Abgehakte ausblenden', anzeige: ['h'], ziel: '#ausblenden' },
    { taste: 'n', aktion: 'abschnittWeiter', bereich: DIFF, text: 'nächster Abschnitt', anzeige: ['n'], kurz: 'Abschnitt' },
    { taste: 'p', aktion: 'abschnittZurueck', bereich: DIFF, text: 'voriger Abschnitt', anzeige: ['p'] },
    { taste: 'ArrowDown', aktion: 'zeileWeiter', bereich: DIFF, text: 'Zeile im Diff wählen', anzeige: ['↓'], kurz: 'Zeile' },
    { taste: 'ArrowUp', aktion: 'zeileZurueck', bereich: DIFF, text: 'Zeile im Diff wählen', anzeige: ['↑'] },
    { taste: 'Enter', aktion: 'zeileAnmerken', bereich: DIFF, text: 'Zeile anmerken', anzeige: ['Enter'], kurz: 'anmerken' },
    { taste: 's', aktion: 'ansichtWechseln', bereich: DIFF, text: 'nur Änderungen / ganze Datei', anzeige: ['s'], ziel: '#diff .diffansicht-wahl' },
    { taste: 'v', aktion: 'anordnungWechseln', bereich: DIFF, text: 'untereinander / nebeneinander', anzeige: ['v'], ziel: '.anordnung-wahl' },
    { taste: 'w', aktion: 'umbruchWechseln', bereich: DIFF, text: 'Umbruch', anzeige: ['w'], ziel: '#diff .umbruch-schalter' },
    { taste: 'l', aktion: 'leerraumWechseln', bereich: DIFF, text: 'Leerraum', anzeige: ['l'], ziel: '#diff .leerraum-schalter' },
    { taste: 'g', aktion: 'naechsteLuecke', bereich: DIFF, text: 'nächste Lücke', anzeige: ['g'] },
    { taste: 'o', aktion: 'inVsCode', bereich: DIFF, text: 'Stelle in VS Code öffnen', anzeige: ['o'], ziel: '#diff .sprung-knopf' },
    { taste: '/', aktion: 'suche', bereich: DIFF, text: 'Suche im Diff', anzeige: ['/'], ziel: '#suche-eingabe' },
    { taste: 'a', aktion: 'dateiAnmerken', bereich: ANMERKUNG, text: 'Datei anmerken', anzeige: ['a'], ziel: '#diff .datei-anmerken' },
    { taste: 'e', aktion: 'anmerkungAendern', bereich: ANMERKUNG, text: 'Anmerkung ändern', anzeige: ['e'] },
    { taste: 'Enter', aktion: 'anmerkungSpeichern', bereich: ANMERKUNG, text: 'Anmerkung speichern (im Feld)', anzeige: ['Strg', 'Enter'], imFeld: true },
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
   * Aktion und eine unbekannte Taste ergeben `null`, dann bleibt die Taste beim Browser.
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
      const imDialog = eintrag.aktion === 'hilfe' || eintrag.aktion === 'schliessen';
      return imDialog ? eintrag.aktion : null;
    }
    if (eintrag.nurEbene) {
      return null;
    }
    return verfuegbar(eintrag.aktion, anlage) ? eintrag.aktion : null;
  }

  /** Die Hilfe: je Bereich seine Einträge mit Anzeige, Text und Kennzeichen der Verfügbarkeit — aus derselben Tabelle. */
  function belegung(lage) {
    return BEREICHE.map(bereich => ({
      kennung: bereich.kennung,
      titel: bereich.titel,
      eintraege: EINTRAEGE
        .filter(eintrag => eintrag.bereich === bereich.kennung)
        .map(eintrag => ({
          aktion: eintrag.aktion,
          anzeige: eintrag.anzeige.slice(),
          text: eintrag.text,
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

  /**
   * Hinweis und `aria-keyshortcuts` je Bedienelement: der Katalog nennt im `ziel` das Element; mehrere Einträge mit demselben
   * Ziel teilen sich einen Hinweis. Ein später gebautes Bedienelement braucht nur seinen Katalogeintrag mit `ziel` — der
   * Hinweis erscheint ohne zweite Liste.
   */
  function hinweise() {
    const nachZiel = new Map();
    for (const eintrag of EINTRAEGE) {
      if (!eintrag.ziel) {
        continue;
      }
      if (!nachZiel.has(eintrag.ziel)) {
        nachZiel.set(eintrag.ziel, []);
      }
      nachZiel.get(eintrag.ziel).push(eintrag);
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
    ZUSAMMEN,
    EINZELN,
    EINTRAEGE,
    eintragFuerTaste,
    verfuegbar,
    aktionFuer,
    belegung,
    statuszeile,
    hinweise,
    abschnittsanfaenge,
    naechsterAbschnitt,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    ziel.gitreviewaTastenWerte = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);