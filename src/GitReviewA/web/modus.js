/* gitreviewA — Modus der Seite (R00012): „Zusammen“ ist der Standard des Zielbilds; bis B1108 startet die Seite in „Einzeln“.
   Der Zustand lebt nur im Speicher (Neuladen: wieder der Startmodus). Jeder Wechsel meldet `modus-gewechselt` mit
   `{ modus, vorher }`; Module, die beim Start schon laufen, lesen den Modus über `hole()`. */
(function () {
  'use strict';

  const STANDARD = 'einzeln';
  const zustand = { modus: STANDARD };

  function init() {
    const zusammen = document.getElementById('modus-zusammen');
    const einzeln = document.getElementById('modus-einzeln');
    if (zusammen) {
      zusammen.addEventListener('click', () => setzen('zusammen'));
    }
    if (einzeln) {
      einzeln.addEventListener('click', () => setzen('einzeln'));
    }
    zeigeModus();
  }

  function setzen(neu) {
    const vorher = zustand.modus;
    if (neu === vorher) {
      return;
    }
    zustand.modus = neu;
    zeigeModus();
    document.dispatchEvent(new CustomEvent('modus-gewechselt', { detail: { modus: neu, vorher } }));
  }

  function zeigeModus() {
    const zusammen = zustand.modus === 'zusammen';
    const zusammenKnopf = document.getElementById('modus-zusammen');
    const einzelnKnopf = document.getElementById('modus-einzeln');
    if (zusammenKnopf) {
      zusammenKnopf.setAttribute('aria-pressed', String(zusammen));
    }
    if (einzelnKnopf) {
      einzelnKnopf.setAttribute('aria-pressed', String(!zusammen));
    }
    document.body.dataset.modus = zustand.modus;
  }

  window.gitreviewaModus = {
    hole: () => zustand.modus,
    istZusammen: () => zustand.modus === 'zusammen',
    setzen,
  };

  document.addEventListener('DOMContentLoaded', init);
}());
