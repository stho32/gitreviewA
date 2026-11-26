/* gitreviewA — Ansichtsstand melden (R00041, B4001): das Ereignis „Diff gezeigt“ sagt, welche Stelle der Diff-Bereich gerade
   zeigt; diese Stellen meldet der Baustein einmal an `POST /api/angesehen`, den Stand hält der Server im RAM. Welche Stellen
   das sind, rechnet `angesehen-werte.js` (in „Zusammen“ alle Stellen der Datei, gesperrte fallen heraus). Ein gescheitertes
   Melden zeigt keine Meldung: es ändert an der Anzeige nichts. */
(function () {
  'use strict';

  function init() {
    document.addEventListener('diff-gezeigt', ereignis => melde(ereignis.detail));
  }

  function melde(gezeigt) {
    const stellen = werte().gezeigteStellen(gezeigt, standStellen(), sichtbarerName());
    if (stellen.length === 0) {
      return;
    }
    sende(stellen);
  }

  /** Der Stand des Hakens kennt dieselben Stellen (Commit und Datei) samt Sperrgrund — dieselbe Quelle wie das Kästchen. */
  function standStellen() {
    if (window.gitreviewaHaken) {
      return window.gitreviewaHaken.stellen();
    }
    return [];
  }

  function sichtbarerName() {
    if (window.sichtbarerName) {
      return window.sichtbarerName;
    }
    return pfad => pfad;
  }

  function werte() {
    return window.gitreviewaAngesehenWerte;
  }

  async function sende(stellen) {
    try {
      await fetch('api/angesehen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ stellen }),
      });
    } catch {
      // Der Bereich bleibt ohne Meldung: ein nicht erreichbarer Server ist kein Anzeigefehler des Diffs (R00041, Kriterium 8).
    }
  }

  document.addEventListener('DOMContentLoaded', init);
}());
