/* gitreviewA — Meldungen der Seitenleiste auch eingeklappt sichtbar (R00035, Befund S4): mit der eingeklappten Leiste sind
   ihre Statusregionen (`role="status"`/`role="alert"`) `hidden` — der Mensch sieht „Alles abgehakt“ aus R00028 nicht, und
   ein Vorleser hört nichts. Dieselben Meldungen stehen deshalb in `#seitenleiste-status` außerhalb der Leiste: gelesen aus
   den Regionen der Leiste (eine Quelle) und nur, solange die Leiste eingeklappt ist — ausgeklappt bleibt es wie bisher, die
   äußere Region ist leer. Beobachtet wird die Leiste, nicht ihre Schreiber — so kommt jede Meldung mit, gleich welcher
   Baustein sie setzt. */
(function () {
  'use strict';

  function init() {
    const leiste = document.querySelector('#seitenleiste');
    const aussen = document.querySelector('#seitenleiste-status');
    if (!leiste || !aussen) {
      return;
    }
    // Gemeldet wird der Wortlaut der Leiste; `hidden` setzt `einklappen.js`, wenn die Leiste eingeklappt wird.
    new MutationObserver(() => spiegleMeldungen()).observe(leiste, {
      subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden'],
    });
    spiegleMeldungen();

    function spiegleMeldungen() {
      const meldungen = [...leiste.querySelectorAll('[role="status"], [role="alert"]')]
        .map(region => region.textContent.trim())
        .filter(wortlaut => wortlaut !== '');
      aussen.textContent = leiste.hidden ? meldungen.join(' · ') : '';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
}());
