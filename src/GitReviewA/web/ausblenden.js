/* gitreviewA — Ausblenden (R00025): Musterfeld, Zähler und Sicht. Die Muster aus dem Aufruf kommen mit `GET /api/zustand` und sind
   der Anfangsstand; die Oberfläche ändert sie nur im Speicher (Neuladen setzt zurück). Jede Änderung meldet `ausblenden-geaendert`;
   die Sicht zeichnet `dateiliste.js`. Der Zähler steht im Kopf neben dem Fortschritt und zählt über die gezeigte Liste. */
(function () {
  'use strict';

  const zustand = { muster: [] };

  function init() {
    const ansicht = ansichtElemente();
    ansicht.eingabeElement.addEventListener('keydown', ereignis => beiTasteEingabe(ansicht, ereignis));
    ansicht.musterElement.addEventListener('click', ereignis => entfernePerKlick(ansicht, ereignis));
    ladeMuster(ansicht);
  }

  function ansichtElemente() {
    return {
      eingabeElement: document.getElementById('ausblenden-eingabe'),
      musterElement: document.getElementById('ausblenden-muster'),
      fehlerElement: document.getElementById('ausblenden-fehler'),
    };
  }

  async function ladeMuster(ansicht) {
    let muster = [];
    try {
      const stand = await zustandAbrufen();
      if (Array.isArray(stand.muster)) {
        muster = stand.muster;
      }
    } catch {
      muster = [];
    }
    zustand.muster = muster;
    zeichneMuster(ansicht);
    meldeGeaendert();
  }

  async function zustandAbrufen() {
    const antwort = await fetch('api/zustand', { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  function beiTasteEingabe(ansicht, ereignis) {
    if (ereignis.key !== 'Enter') {
      return;
    }
    ereignis.preventDefault();
    fuegeHinzu(ansicht, ansicht.eingabeElement.value);
  }

  function fuegeHinzu(ansicht, text) {
    const fehler = musterFehler(text, zustand.muster.length);
    if (fehler) {
      ansicht.fehlerElement.textContent = fehler;
      ansicht.eingabeElement.focus();
      return;
    }
    ansicht.fehlerElement.textContent = '';
    zustand.muster = [...zustand.muster, text];
    ansicht.eingabeElement.value = '';
    zeichneMuster(ansicht);
    ansicht.eingabeElement.focus();
    meldeGeaendert();
  }

  function entfernePerKlick(ansicht, ereignis) {
    const knopfElement = ereignis.target.closest('.muster-entfernen');
    if (!knopfElement) {
      return;
    }
    const stelle = Number(knopfElement.dataset.stelle);
    zustand.muster = zustand.muster.filter((eintrag, index) => index !== stelle);
    ansicht.fehlerElement.textContent = '';
    zeichneMuster(ansicht);
    ansicht.eingabeElement.focus();
    meldeGeaendert();
  }

  function zeichneMuster(ansicht) {
    ansicht.musterElement.replaceChildren(...zustand.muster.map(chipElement));
  }

  /** Fremder Text (das Muster) nur per textContent; der Name des Entfernen-Knopfes beginnt mit dem sichtbaren Muster. */
  function chipElement(muster, stelle) {
    const eintragElement = document.createElement('li');
    eintragElement.className = 'ausblenden-chip';
    const textElement = document.createElement('span');
    textElement.className = 'muster-text';
    textElement.textContent = muster;
    const entfernenElement = document.createElement('button');
    entfernenElement.type = 'button';
    entfernenElement.className = 'muster-entfernen';
    entfernenElement.dataset.stelle = String(stelle);
    entfernenElement.setAttribute('aria-label', `${muster} entfernen`);
    entfernenElement.textContent = 'Entfernen';
    eintragElement.append(textElement, entfernenElement);
    return eintragElement;
  }

  function meldeGeaendert() {
    document.dispatchEvent(new CustomEvent('ausblenden-geaendert'));
  }

  window.gitreviewaAusblenden = {
    muster: () => zustand.muster,
    sichtbare: dateien => sichtbareDateien(dateien, zustand.muster),
    istSichtbar: pfad => anzahlAusgeblendet([{ pfad }], zustand.muster) === 0,
    /** Die Muster entfernen, die diesen Pfad verdecken — der Weg zur Datei aus dem Abschlussdialog (R00041, B4004). */
    entferneMusterFuer: pfad => entferneMusterFuer(pfad),
  };

  function entferneMusterFuer(pfad) {
    const behalten = zustand.muster.filter(muster => !window.passt(muster, pfad));
    if (behalten.length === zustand.muster.length) {
      return;
    }
    zustand.muster = behalten;
    zeichneMuster(ansichtElemente());
    meldeGeaendert();
  }

  document.addEventListener('DOMContentLoaded', init);
}());
