/* gitreviewA — Sprungziel einer Datei (R00021): fragt es bei der Wahl der Datei einmal an, verwirft die späte Antwort einer früheren
   Wahl und meldet das Ergebnis als Ereignis `sprung-geladen`. Die Entscheidung, ob es einen Link gibt, fällt der Server (dort liegen die
   Bytes des fremden Namens); hier entsteht nur der Abruf und der Zustand. Die Darstellung führt diff.js. */
(function () {
  'use strict';

  const zustand = { ladung: 0 };

  function init() {
    document.addEventListener('datei-gewaehlt', ereignis => ladeSprung(ereignis.detail));
    document.addEventListener('commit-gewaehlt', () => verwerfe());
  }

  /** Ein Commit-Wechsel verdrängt die Wahl samt noch laufender Ladung. */
  function verwerfe() {
    zustand.ladung += 1;
    melde(null);
  }

  /** Eine spätere Wahl gewinnt: eine Antwort zählt nur, wenn seither keine andere Datei gewählt wurde. */
  async function ladeSprung(datei) {
    const ladung = zustand.ladung + 1;
    zustand.ladung = ladung;
    melde(null);
    let ergebnis;
    try {
      ergebnis = await sprungAbrufen(datei);
    } catch {
      return;
    }
    if (ladung !== zustand.ladung) {
      return;
    }
    melde({ commit: datei.commit, pfad: datei.pfad, ziel: ergebnis.ziel, geaendert: ergebnis.geaendert === true, grund: ergebnis.grund });
  }

  async function sprungAbrufen(datei) {
    const abfrage = new URLSearchParams({ pfad: datei.pfad });
    const adresse = `api/commits/${encodeURIComponent(datei.commit)}/sprung?${abfrage}`;
    const antwort = await fetch(adresse, { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  function melde(sprung) {
    document.dispatchEvent(new CustomEvent('sprung-geladen', { detail: sprung }));
  }

  document.addEventListener('DOMContentLoaded', init);
}());
