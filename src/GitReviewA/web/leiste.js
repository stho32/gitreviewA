/* gitreviewA — Werkzeugleiste mit fester Höhe (R00039, B3802): ab 600 px Breite des Diff-Bereichs ist der Diff-Kopf eine Zeile,
   darunter höchstens zwei (die Werkzeugzeile mit Suche und „Ansicht ▾“ rückt in die zweite). Der Aufbau folgt der Breite von
   `#diff` über die Klasse `schmal` am Kopf — kein Neuzeichnen des Diffs, kein Serverweg. Die Schwelle ist die Grenze „medium“
   aus Material 3 (PO 2026-11-25, Zeile 196). */
(function () {
  'use strict';

  const SCHWELLE = 600;

  function init() {
    const diff = document.getElementById('diff');
    const kopf = diff ? diff.querySelector('.diff-kopf') : null;
    if (!diff || !kopf) {
      return;
    }
    const setzen = () => kopf.classList.toggle('schmal', diff.clientWidth < SCHWELLE);
    setzen();
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(setzen).observe(diff);
    }
    window.addEventListener('resize', setzen);
  }

  document.addEventListener('DOMContentLoaded', init);
}());
