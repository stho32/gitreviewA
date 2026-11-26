/* gitreviewA — Dateiliste durchsuchen (R00049): das Suchfeld „Dateien suchen“, die Meldung am Feld und der Suchlauf über die
   Anzeigenamen der gezeigten Liste. Die Regel (Prüfung, Abgleich, Aufwandsbuchung) steht im reinen Baustein
   `dateisuche-werte.js`; hier nur der Anschluss. Der Suchtext ist **eine Sicht**, kein Auswahlweg: er erreicht den Server nie,
   es gibt keinen neuen Endpunkt, keinen `git`-Aufruf und keine Zeile auf stderr.

   Der Zustand lebt im Speicher der Seite (Neuladen: leer) und bleibt beim Wechsel von Datei, Commit, Modus und Darstellung;
   jede Änderung meldet `suche-geaendert`, die Liste zeichnet `dateiliste.js` neu. Der Suchlauf läuft **einmal** je Text und
   Liste (`trefferFuer`), damit die mehrfachen Sichtrechnungen einer Zeichnung nicht dreimal suchen. */
(function () {
  'use strict';

  /** `text`: der gültige Suchtext (ungültige Texte ändern ihn nicht); `treffer`: die Menge der passenden Pfade oder `null`,
      wenn keine Suche läuft; `dateien`: die Liste, für die gerechnet wurde (Merker gegen doppelte Läufe). */
  const zustand = { text: '', treffer: null, dateien: null, berechnet: false };

  const ZU_AUFWENDIG = 'Suche zu aufwendig — Text kürzen';

  function init() {
    const feld = document.getElementById('dateiliste-suche');
    if (feld) {
      feld.addEventListener('input', () => beiEingabe(feld.value));
    }
    document.addEventListener('dateiliste-gezeichnet', ereignis => {
      trefferFuer(ereignis.detail.dateien);
    });
  }

  /** Jede Eingabe wirkt sofort. Ein ungültiger Text (zu lang, Steuer- oder Richtungszeichen) meldet am Feld und lässt den
      Suchtext **und** die Liste, wie der letzte gültige Text sie gemacht hat. */
  function beiEingabe(text) {
    const fehler = werte().suchtextFehler(text);
    if (fehler) {
      setzeMeldung(fehler);
      return;
    }
    zustand.text = text;
    zustand.berechnet = false;
    setzeMeldung('');
    trefferFuer(zustand.dateien);
    meldeGeaendert();
  }

  /**
   * Die Menge der Pfade, die zum Suchtext passen — `null`, wenn keine Suche läuft. Läuft einmal je Text und Liste: die
   * Liste wird als Merker gehalten, weil eine Zeichnung die Sicht mehrfach rechnet (Zähler, Liste, Hinweis).
   *
   * Überschreitet der Lauf das Aufwandsbudget, bricht er ab: die Meldung steht am Feld und die Treffermenge bleibt die des
   * letzten gültigen Textes — die Liste bleibt damit stehen (R00049, Kriterium 11).
   */
  function trefferFuer(dateien) {
    if (zustand.berechnet && zustand.dateien === dateien) {
      return zustand.treffer;
    }
    zustand.dateien = dateien;
    zustand.berechnet = true;
    if (zustand.text.trim() === '') {
      zustand.treffer = null;
      setzeMeldung('');
      return null;
    }
    const eintraege = (dateien || []).map(datei => ({ pfad: datei.pfad, anzeigename: anzeigename(datei.pfad) }));
    const lauf = werte().suchlauf(zustand.text, eintraege, werte().BUDGET);
    if (lauf.abgebrochen) {
      setzeMeldung(ZU_AUFWENDIG);
      return zustand.treffer;
    }
    zustand.treffer = new Set(lauf.treffer.map(eintrag => eintrag.pfad));
    setzeMeldung('');
    return zustand.treffer;
  }

  /** Gesucht wird gegen den **Anzeigenamen** des Pfades (unsichtbare Zeichen als Marke, Rohbytes als Marke) — der neue Pfad
      bei einer Umbenennung. Dieselbe Anzeige wie in der Liste, keine zweite Schreibweise. */
  function anzeigename(pfad) {
    return window.sichtbarerName ? window.sichtbarerName(pfad) : pfad;
  }

  function setzeMeldung(text) {
    const element = document.getElementById('dateisuche-fehler');
    if (element) {
      element.textContent = text;
    }
  }

  function meldeGeaendert() {
    document.dispatchEvent(new CustomEvent('suche-geaendert'));
  }

  function werte() {
    return window.gitreviewaDateisucheWerte;
  }

  /* Lesender Zugang für die Sicht (R00049): der Suchtext selbst wird nur hier gehalten, es gibt keine zweite Kopie.
     Eigener Name, weil `suche.js` (R00027, Suche im Diff) `gitreviewaSuche` schon belegt. */
  window.gitreviewaDateisuche = {
    text: () => zustand.text,
    treffer: () => zustand.treffer,
    trefferFuer,
  };

  document.addEventListener('DOMContentLoaded', init);
}());
