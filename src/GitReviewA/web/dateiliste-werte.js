/* gitreviewA — Werte der Dateiliste: Summe, Zahlen, Balkenanteile, flache und Baum-Zeilen. Reine Funktionen, im Browser und in Node.
   Herkunft der Balken: kanbanD web/review-uebersicht.js (balkenTeile), Länge und Mindestlänge im CSS. */
(function (ziel) {
  'use strict';

  const STRICH = '–';

  const istBinaer = datei => datei.plus === null;

  /** `<n> Dateien · +<x> −<y>`; Binärdateien zählen als Datei, aber nicht in die Zeilen. */
  function summeText(dateien) {
    let plus = 0;
    let minus = 0;
    for (const datei of dateien.filter(d => !istBinaer(d))) {
      plus += datei.plus;
      minus += datei.minus;
    }
    let anzahlText = `${dateien.length} Dateien`;
    if (dateien.length === 1) {
      anzahlText = '1 Datei';
    }
    return `${anzahlText} · +${plus} −${minus}`;
  }

  function zahlenText(datei) {
    if (istBinaer(datei)) {
      return STRICH;
    }
    return `+${datei.plus} −${datei.minus}`;
  }

  function groessteAenderung(dateien) {
    const summen = dateien.filter(d => !istBinaer(d)).map(d => d.plus + d.minus);
    return Math.max(0, ...summen);
  }

  /** Je Zahl über 0 ein Anteil an der größten Änderung der Liste. */
  function balkenTeile(datei, groesste) {
    const anteil = zahl => {
      if (!(zahl > 0) || groesste <= 0) {
        return 0;
      }
      return zahl / groesste;
    };
    return { plus: anteil(datei.plus), minus: anteil(datei.minus) };
  }

  /** Richtungsändernde Zeichen: Einbettungen und Isolierungen, dazu LRM, RLM und ALM. */
  const RICHTUNGSZEICHEN = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

  /** Fremder Pfad („Trojan Source“): richtungsändernde Zeichen würden den Namen umdrehen; sie bleiben sichtbar als Marke `⟨U+202E⟩`
      wie im Diff. Nur der angezeigte Name ist markiert, `datei.pfad` bleibt roh für Auswahl und Anfragen. */
  function sichtbarerName(name) {
    return name.replace(RICHTUNGSZEICHEN, zeichen => `⟨U+${zeichen.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}⟩`);
  }

  function flacheZeilen(dateien) {
    return dateien.map(datei => ({ art: 'datei', name: sichtbarerName(datei.pfad), tiefe: 0, datei }));
  }

  /** Ordner als eigene Zeilen über ihren Dateien; je Ebene Ordner vor Dateien, alphabetisch ohne Beachtung der Schreibweise. */
  function baumZeilen(dateien) {
    const wurzel = ordnerKnoten();
    for (const datei of dateien) {
      haengeEin(wurzel, datei);
    }
    const zeilen = [];
    schreibeEbene(wurzel, 0, zeilen);
    return zeilen;
  }

  function ordnerKnoten() {
    return { ordner: new Map(), dateien: [] };
  }

  function haengeEin(wurzel, datei) {
    const teile = datei.pfad.split('/');
    const name = teile.pop();
    let knoten = wurzel;
    for (const ordnername of teile) {
      if (!knoten.ordner.has(ordnername)) {
        knoten.ordner.set(ordnername, ordnerKnoten());
      }
      knoten = knoten.ordner.get(ordnername);
    }
    knoten.dateien.push({ name, datei });
  }

  function schreibeEbene(knoten, tiefe, zeilen) {
    for (const ordnername of [...knoten.ordner.keys()].sort(alphabetischOhneSchreibweise)) {
      zeilen.push({ art: 'ordner', name: sichtbarerName(ordnername), tiefe });
      schreibeEbene(knoten.ordner.get(ordnername), tiefe + 1, zeilen);
    }
    const dateien = [...knoten.dateien].sort((a, b) => alphabetischOhneSchreibweise(a.name, b.name));
    for (const { name, datei } of dateien) {
      zeilen.push({ art: 'datei', name: sichtbarerName(name), tiefe, datei });
    }
  }

  /** Gleiche Namen ohne Schreibweise (`A` und `a`) bleiben in fester Reihenfolge. */
  function alphabetischOhneSchreibweise(a, b) {
    const ohneSchreibweise = a.toLowerCase().localeCompare(b.toLowerCase(), 'de');
    if (ohneSchreibweise !== 0) {
      return ohneSchreibweise;
    }
    if (a < b) {
      return -1;
    }
    return 1;
  }

  Object.assign(ziel, { summeText, zahlenText, groessteAenderung, balkenTeile, sichtbarerName, flacheZeilen, baumZeilen });
})(typeof module !== 'undefined' ? module.exports : window);
