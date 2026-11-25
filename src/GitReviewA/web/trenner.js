/* gitreviewA — Trenner der Seitenleiste (R00034, I0035): der Zustand der Breite (nur RAM, Start 360 px), das Trenner-Element im
   zweispaltigen Aufbau und die Breite über eine CSS-Variable am Rahmen (`--gr-leiste-breite`). Die reine Rechnung liegt in
   `trenner-werte.js`; die Breite wirkt allein über das Layout, ohne den Diff neu zu zeichnen (Lehre #23). Ziehen, Tastatur und
   Doppelklick folgen in eigenen Bubbles (B3303/B3304/B3305). Nach dem Neuladen gilt wieder die Startbreite — nichts wird gespeichert. */
(function () {
  'use strict';

  const RAHMEN = '.gr-ansicht';
  const DIFF = '#diff';
  const MEDIEN = '(min-width:566px)';
  const werte = window.gitreviewaTrennerWerte;
  const zustand = { breite: werte.START };

  function rahmen() {
    return document.querySelector(RAHMEN);
  }

  function trenner() {
    return document.querySelector(`${RAHMEN} .gr-trenner`);
  }

  function zweispaltig() {
    return window.matchMedia(MEDIEN).matches;
  }

  function hoechste() {
    return werte.hoechsteBreite(window.innerWidth);
  }

  function init() {
    anwenden();
    sichereTrenner();
    const medien = window.matchMedia(MEDIEN);
    if (typeof medien.addEventListener === 'function') {
      medien.addEventListener('change', sichereTrenner);
    }
    window.addEventListener('resize', beiGroesse);
  }

  /** Die Breite der Seitenleiste als CSS-Variable am Rahmen setzen — das Layout folgt, der Diff zeichnet nicht neu. */
  function anwenden() {
    const rahmenElement = rahmen();
    if (rahmenElement) {
      rahmenElement.style.setProperty('--gr-leiste-breite', `${zustand.breite}px`);
    }
  }

  /** Die Breite setzen (geklemmt auf die Spanne) und `breite-geaendert` melden, wenn sie sich ändert. */
  function setzen(neu) {
    const begrenzt = werte.klemme(Number(neu), werte.kleinsteBreite(), hoechste());
    if (!Number.isFinite(begrenzt) || begrenzt === zustand.breite) {
      return;
    }
    zustand.breite = begrenzt;
    anwenden();
    document.dispatchEvent(new CustomEvent('breite-geaendert', { detail: { breite: begrenzt } }));
  }

  /** Beim Verkleinern des Fensters nachklemmen: die Breite bleibt, aber nie über der neuen tatsächlichen Höchstbreite. */
  function beiGroesse() {
    if (zustand.breite > hoechste()) {
      setzen(hoechste());
    }
    sichereTrenner();
  }

  /** Der Trenner gehört nur in den zweispaltigen Aufbau; unter 566 px gibt es ihn nicht (R00033, Rückfall auf eine Spalte). */
  function sichereTrenner() {
    if (zweispaltig()) {
      if (!trenner()) {
        erzeugeTrenner();
      }
    } else if (trenner()) {
      trenner().remove();
    }
  }

  function erzeugeTrenner() {
    const element = document.createElement('div');
    element.className = 'gr-trenner';
    rahmen().insertBefore(element, rahmen().querySelector(DIFF));
  }

  window.gitreviewaBreite = {
    hole: () => zustand.breite,
    setzen,
    hoechste: () => hoechste(),
  };

  document.addEventListener('DOMContentLoaded', init);
}());
