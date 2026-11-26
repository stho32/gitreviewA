/* gitreviewA — Ergebnis-Spalte (R00037, B3602/B3603): die Anzeige der rechten Spalte „Ergebnis für die KI“ und ihr
   Auffrischen. Sie zeigt den Text aus `GET /api/ergebnis` unverändert als vorformatierten Block (`textContent`), ist ein eigener
   Rollbereich und kennzeichnet einen veralteten Stand, wenn das Holen scheitert. Nach jedem Anlegen, Ändern und Löschen einer
   Anmerkung und nach jedem Haken holt sie den Stand neu; die Auffrischregel (`ergebnis-werte.js`) stellt sicher, dass höchstens
   eine Anfrage läuft. Das Einklappen liegt in der Mechanik aus I0036 (`einklappen.js`). Alles Fremde (Namen, Text des Menschen)
   läuft über `textContent`, nie über HTML. */
(function () {
  'use strict';

  const FEHLER = 'Ergebnis konnte nicht geladen werden';

  function werte() {
    return window.gitreviewaErgebnisWerte;
  }

  function init() {
    const spalteElement = document.getElementById('ergebnis');
    const textElement = document.getElementById('ergebnis-text');
    const fehlerElement = document.getElementById('ergebnis-fehler');
    const veraltetElement = document.getElementById('ergebnis-veraltet');
    if (!spalteElement || !textElement || !fehlerElement || !veraltetElement) {
      return;
    }
    const spalte = { spalteElement, textElement, fehlerElement, veraltetElement, regel: werte().start() };
    window.gitreviewaErgebnisSpalte = {
      zeige: text => zeige(spalte, text),
      zeigeFehler: () => zeigeFehler(spalte),
      hole: () => textElement.textContent,
      fehlerText: () => (fehlerElement.hidden ? '' : FEHLER),
      istVeraltet: () => veraltetElement.hidden === false,
      auffrischen: () => auffrischen(spalte),
      beenden: () => beenden(spalte),
    };
    document.addEventListener('anmerkung-geaendert', () => auffrischen(spalte));
    document.addEventListener('haken-geaendert', () => auffrischen(spalte));
    document.addEventListener('beenden-gestartet', () => beenden(spalte));
    document.dispatchEvent(new CustomEvent('ergebnis-spalte-bereit'));
    auffrischen(spalte);
  }

  /** Eine Änderung: die Regel entscheidet, ob sofort angefragt wird; läuft schon eine Anfrage, folgt genau eine nach. */
  function auffrischen(spalte) {
    const entscheidung = werte().naechsteAnfrage(spalte.regel, 'aenderung');
    spalte.regel = entscheidung.zustand;
    if (entscheidung.art === 'anfragen') {
      hole(spalte, entscheidung.fassung);
    }
  }

  /** Nach „Beenden“ wird nichts mehr angefragt und keine Antwort mehr angewendet (R00037). */
  function beenden(spalte) {
    spalte.regel = werte().naechsteAnfrage(spalte.regel, 'beenden').zustand;
  }

  /** Der Stand vom Server; Erfolg und Fehler gehen in dieselbe Antwortverarbeitung, damit die Regel den Zustand führt. */
  async function hole(spalte, fassung) {
    let text = null;
    let erfolg = true;
    try {
      text = await ergebnisAbrufen();
    } catch {
      erfolg = false;
    }
    const entscheidung = werte().naechsteAnfrage(spalte.regel, { art: 'antwort', fassung, erfolg });
    spalte.regel = entscheidung.zustand;
    if (entscheidung.anwenden) {
      zeige(spalte, text);
    }
    if (entscheidung.fehler) {
      zeigeFehler(spalte);
    }
    if (entscheidung.art === 'anfragen') {
      hole(spalte, entscheidung.fassung);
    }
  }

  async function ergebnisAbrufen() {
    const antwort = await fetch('api/ergebnis', { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    const inhalt = await antwort.json();
    return inhalt.ergebnis;
  }

  /** Den Stand in die Spalte setzen: `textContent` (nie HTML), der letzte Bildlauf bleibt, ein alter Fehler verschwindet. */
  function zeige(spalte, text) {
    const bildlauf = spalte.spalteElement.scrollTop;
    spalte.textElement.textContent = text;
    spalte.fehlerElement.hidden = true;
    spalte.veraltetElement.hidden = true;
    spalte.spalteElement.scrollTop = bildlauf;
  }

  /** Das Holen ist gescheitert: die Meldung steht über dem Text, der letzte Stand bleibt sichtbar und gilt als „veraltet“. */
  function zeigeFehler(spalte) {
    spalte.fehlerElement.hidden = false;
    spalte.veraltetElement.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
