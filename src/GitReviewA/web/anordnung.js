/* gitreviewA — Anordnung der Diff-Zeilen (R00023, B2203): „untereinander“ (Voreinstellung) oder „nebeneinander“. Der Zustand lebt nur
   im Speicher, bleibt beim Wechsel von Datei und Commit und fällt erst beim Neuladen auf „untereinander“ zurück. Jeder Wechsel meldet
   `anordnung-gewechselt` mit `{ anordnung, vorher }`; Module, die schon laufen, lesen den Zustand über `hole()`. Die Stellung ist ein
   Eingabewert der Seite (`window.gitreviewaStartAnordnung`), damit Tests ohne Wechsel-Ereignis in „nebeneinander“ starten können. */
(function () {
  'use strict';

  const UNTEREINANDER = 'untereinander';
  const NEBENEINANDER = 'nebeneinander';
  const STANDARD = UNTEREINANDER;
  const zustand = { anordnung: startAnordnung() };

  function startAnordnung() {
    const vorgabe = window.gitreviewaStartAnordnung;
    if (vorgabe === UNTEREINANDER || vorgabe === NEBENEINANDER) {
      return vorgabe;
    }
    return STANDARD;
  }

  function init() {
    for (const knopf of knoepfe()) {
      knopf.addEventListener('click', () => setzen(knopf.dataset.anordnung));
    }
    zeigeAnordnung();
  }

  function setzen(neu) {
    const vorher = zustand.anordnung;
    if ((neu !== UNTEREINANDER && neu !== NEBENEINANDER) || neu === vorher) {
      return;
    }
    zustand.anordnung = neu;
    zeigeAnordnung();
    document.dispatchEvent(new CustomEvent('anordnung-gewechselt', { detail: { anordnung: neu, vorher } }));
  }

  function zeigeAnordnung() {
    for (const knopf of knoepfe()) {
      knopf.setAttribute('aria-pressed', String(knopf.dataset.anordnung === zustand.anordnung));
    }
    document.body.dataset.anordnung = zustand.anordnung;
  }

  function knoepfe() {
    return document.querySelectorAll('.anordnung-wahl [data-anordnung]');
  }

  window.gitreviewaAnordnung = {
    hole: () => zustand.anordnung,
    istNebeneinander: () => zustand.anordnung === NEBENEINANDER,
    setzen,
  };

  document.addEventListener('DOMContentLoaded', init);
}());
