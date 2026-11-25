/* gitreviewA — Werte der Dateiliste: Summe, Zahlen, Balkenanteile, flache und Baum-Zeilen. Reine Funktionen, im Browser und in Node.
   Herkunft der Balken: kanbanD web/review-uebersicht.js (balkenTeile), Länge und Mindestlänge im CSS. */
(function (ziel) {
  'use strict';

  const BINAER = 'binär';

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

  /** Das Wort „binär“ statt der Zahlen; die Datei zählt in der Summe als Datei, aber nicht in die Zeilen (PO 2026-11-25). */
  function zahlenText(datei) {
    if (istBinaer(datei)) {
      return BINAER;
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

  /** Richtungs-, Format- und Steuerzeichen (außer Tab) sowie Zeilen- und Absatztrenner: dieselbe Klasse wie
      `Fremdtext/UnsichtbareZeichen` im Server, keine zweite Zeichenliste. */
  const UNSICHTBARE_ZEICHEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;

  /** Fremder Pfad („Trojan Source“): unsichtbare Zeichen stehen als Marke `⟨U+202E⟩`; nur der angezeigte Name ist markiert,
      `datei.pfad` bleibt roh für Auswahl und Anfragen. Tab bleibt sichtbar wie im Server. */
  function sichtbarerName(name) {
    return name.replace(UNSICHTBARE_ZEICHEN, zeichen => (zeichen === '\t' ? zeichen : `⟨U+${zeichen.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}⟩`));
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

  /** Der letzte Namensabschnitt eines Pfads: eine Umbenennung nennt beide Namen ohne ihren Ordner (PO 2026-11-25). */
  function letzterNamensabschnitt(pfad) {
    const teile = pfad.split('/');
    return teile[teile.length - 1];
  }

  /** Beschriftung einer Umbenennung (Status `R` mit altem Pfad): der neue Name führt, der alte steht als `← alter Name`
      daneben; beide mit Marken für Unsichtbares. Ohne Umbenennung `null` — dieselbe Form in Dateiliste und Diff-Kopf. */
  function umbenennungsText(datei) {
    if (datei.status !== 'R' || !datei.alterPfad) {
      return null;
    }
    return `${sichtbarerName(letzterNamensabschnitt(datei.pfad))} ← ${sichtbarerName(letzterNamensabschnitt(datei.alterPfad))}`;
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

  /** Flache oder Baum-Zeilen aus der Sicht (R00029, B2802): beide Darstellungen aus **derselben** sichtbaren Liste; ein Ordner,
      in dem nach dem Ausblenden keine sichtbare Datei mehr steht (auch in keinem Unterordner), verschwindet samt Zeile. */
  function sichtbareZeilen(sicht, darstellung) {
    const dateien = sicht.sichtbare.map(eintrag => eintrag.datei);
    if (darstellung === 'baum') {
      return baumZeilen(dateien);
    }
    return flacheZeilen(dateien);
  }

  Object.assign(ziel, { summeText, zahlenText, groessteAenderung, balkenTeile, sichtbarerName, flacheZeilen, baumZeilen, sichtbareZeilen, umbenennungsText });
})(typeof module !== 'undefined' ? module.exports : window);
