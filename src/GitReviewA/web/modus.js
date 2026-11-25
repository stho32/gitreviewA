/* gitreviewA — Modus der Seite (R00012): „Zusammen“ ist der Standard des Zielbilds (B1108); das Neuladen beginnt wieder in „Zusammen“.
   Der Zustand lebt nur im Speicher. Jeder Wechsel meldet `modus-gewechselt` mit `{ modus, vorher }`; Module, die beim Start schon
   laufen, lesen den Modus über `hole()`. Der Startmodus ist ein Eingabewert: `window.gitreviewaStartModus` belegt ihn vor (die Tests
   der Oberfläche brauchen einen echten Start in „Einzeln“, weil ein Wechsel die erste Datei wählt). */
(function () {
  'use strict';

  const STANDARD = 'zusammen';
  const zustand = { modus: startModus() };

  function startModus() {
    const vorgabe = window.gitreviewaStartModus;
    if (vorgabe === 'zusammen' || vorgabe === 'einzeln') {
      return vorgabe;
    }
    return STANDARD;
  }

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
