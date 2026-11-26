/* gitreviewA — Abgehakte ausblenden (R00029): der Schalter in der Werkzeugzeile der Dateiliste, die Sicht aus der gezeigten Liste und
   dem Haken-Stand (zusammen mit dem Muster-Abgleich R00025) und der Hinweis auf die ausgeblendete gewählte Datei. Die reine Rechnung
   steht im Baustein `abgehakte-werte.js`; hier nur der Anschluss. Der Zustand lebt im Speicher (Neuladen: aus) und bleibt beim Wechsel
   von Datei, Commit und Modus; die Sicht zeichnet `dateiliste.js` über `sichtbare()` neu (Ereignis `abgehakte-geaendert`). */
(function () {
  'use strict';

  const zustand = { an: false, dateien: [], modus: 'zusammen', commit: null, gewaehlterPfad: null };

  function init() {
    const schalterElement = document.getElementById('ausblenden');
    if (schalterElement) {
      zeichneSchalter();
      schalterElement.addEventListener('change', () => setzen(schalterElement.checked));
    }
    document.addEventListener('dateiliste-gezeichnet', ereignis => {
      zustand.dateien = ereignis.detail.dateien;
      zustand.modus = ereignis.detail.modus;
      zustand.commit = ereignis.detail.commit;
      zeichneZaehler();
      zeichneHinweis();
    });
    document.addEventListener('haken-stand-geladen', beiHakenAenderung);
    document.addEventListener('haken-geaendert', beiHakenAenderung);
    document.addEventListener('datei-gewaehlt', ereignis => {
      zustand.gewaehlterPfad = ereignis.detail.pfad;
      zeichneHinweis();
    });
    document.addEventListener('wahl-aufgehoben', () => {
      zustand.gewaehlterPfad = null;
      zeichneHinweis();
    });
    document.addEventListener('suche-geaendert', zeichneHinweis);
  }

  function setzen(an) {
    if (an === zustand.an) {
      return;
    }
    zustand.an = an;
    zeichneSchalter();
    meldeGeaendert();
  }

  /** Der Schalter im Kopf ist eine Ansicht des Zustands — auch wenn der Weg zur Datei ihn ausschaltet (R00041, B4004). */
  function zeichneSchalter() {
    const schalterElement = document.getElementById('ausblenden');
    if (schalterElement) {
      schalterElement.checked = zustand.an;
    }
  }

  /** Eine Änderung an Haken-Stand oder Schalter rechnet die Sicht neu; die Liste zeichnet `dateiliste.js` neu und meldet es.
      Bei ausgeschaltetem Schalter ändert eine Haken-Änderung die Sicht nicht — dann bleibt das Zeichnen aus, und der Fokus im
      Kästchen bleibt stehen (R00011, Kriterium 4). */
  function beiHakenAenderung() {
    if (zustand.an) {
      meldeGeaendert();
    }
  }

  /** Ob der Schalter diese Datei gerade verdeckt — der Weg zur Datei hebt das auf (R00041, B4004), die Sicht rechnet dieselbe Regel. */
  function istVerdeckt(pfad) {
    if (!zustand.an) {
      return false;
    }
    const datei = zustand.dateien.find(eintrag => eintrag.pfad === pfad);
    if (!datei) {
      return false;
    }
    return werte().verdecktDurchHaken(eintragFuer(datei, zustand.modus, zustand.commit), zustand.an);
  }

  function meldeGeaendert() {
    document.dispatchEvent(new CustomEvent('abgehakte-geaendert'));
  }

  /** Der Zähler im Kopf nennt beide Anteile (R00025/R00029); bei 0 Ausgeblendeten steht kein Zusatz. */
  function zeichneZaehler() {
    const element = document.querySelector('#kopf-fortschritt .ausblenden-zaehler');
    if (!element) {
      return;
    }
    element.textContent = werte().zaehlertext(sicht(zustand.dateien, zustand.modus, zustand.commit));
  }

  /** Die Sicht auf die gezeigte Liste: je Muster (R00025), je Suchtext (R00049) und je Haken (nur bei eingeschaltetem Schalter) ausgeblendet. */
  function sicht(dateien, modus, commit) {
    const muster = window.gitreviewaAusblenden ? window.gitreviewaAusblenden.muster() : [];
    const eintraege = dateien.map(datei => eintragFuer(datei, modus, commit));
    return werte().sicht(eintraege, muster, zustand.an, sucheTreffer(dateien));
  }

  /** Die Pfade, die zum Suchtext passen, oder `null`, wenn keine Suche läuft; den Lauf führt `dateisuche.js` einmal je Text und Liste. */
  function sucheTreffer(dateien) {
    return window.gitreviewaDateisuche ? window.gitreviewaDateisuche.trefferFuer(dateien) : null;
  }

  /** In „Zusammen“ eine Datei (abgehakt, wenn alle ihre Stellen es sind), in „Einzeln“ eine Stelle (Commit und Datei). */
  function eintragFuer(datei, modus, commit) {
    const haken = hakenLeser();
    if (modus === 'zusammen') {
      return { datei, pfad: datei.pfad, abgehakt: haken.dateiAbgehakt(datei), gesperrt: haken.dateiGesperrt(datei) };
    }
    return { datei, pfad: datei.pfad, abgehakt: haken.stelleAbgehakt(commit, datei.pfad), gesperrt: haken.stelleGesperrt(commit, datei.pfad) };
  }

  /** Der Hinweis nennt die gewählte Datei, solange sie ausgeblendet ist — für **jeden** Grund (Muster R00025, Suche R00049,
      Haken R00029, dessen Schalter die Sicht schon berücksichtigt); sonst steht er leer. */
  function zeichneHinweis() {
    const element = document.querySelector('#dateiliste .abgehakte-hinweis');
    if (!element) {
      return;
    }
    const ausgeblendet = zustand.gewaehlterPfad !== null
      && !sicht(zustand.dateien, zustand.modus, zustand.commit).sichtbare.some(eintrag => eintrag.pfad === zustand.gewaehlterPfad);
    element.textContent = ausgeblendet ? 'Die gewählte Datei ist ausgeblendet' : '';
  }

  function werte() {
    return window.gitreviewaAbgehakteWerte;
  }

  function hakenLeser() {
    return window.gitreviewaHaken || {
      stelleAbgehakt: () => false, stelleGesperrt: () => false, dateiAbgehakt: () => false, dateiGesperrt: () => false,
    };
  }

  window.gitreviewaAbgehakte = {
    sicht,
    istAn: () => zustand.an,
    istVerdeckt,
    /** Den Schalter ausschalten — der Weg zur Datei aus dem Abschlussdialog (R00041, B4004). */
    ausschalten: () => setzen(false),
  };

  document.addEventListener('DOMContentLoaded', init);
}());
