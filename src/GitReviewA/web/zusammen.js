/* gitreviewA — Netto-Liste der Auswahl (R00012): lädt `GET /api/zusammen` einmal je Seitenaufruf, wenn der Modus „Zusammen“ ist,
   und meldet `zusammen-geladen`; ein Fehler meldet `zusammen-fehler`. Reine Auskunft, kein Zustand im DOM. In „Einzeln“ wird nichts
   geladen: der Aufruf von `git` bleibt aus, bis der Mensch auf „Zusammen“ wechselt. */
(function () {
  'use strict';

  const zustand = { daten: null, laedt: false, fehler: false, ladung: 0 };

  function istZusammen() {
    return window.gitreviewaModus && window.gitreviewaModus.hole() === 'zusammen';
  }

  function laden() {
    if (zustand.laedt) {
      return;
    }
    zustand.laedt = true;
    const ladung = ++zustand.ladung;
    fetch('api/zusammen', { headers: { Accept: 'application/json' } })
      .then(antwort => {
        if (!antwort.ok) {
          throw new Error(`GET /api/zusammen antwortete mit ${antwort.status}`);
        }
        return antwort.json();
      })
      .then(daten => {
        if (ladung !== zustand.ladung) {
          return;
        }
        if (daten && daten.zuGross) {
          zustand.fehler = true;
          document.dispatchEvent(new CustomEvent('zusammen-fehler', { detail: { meldung: daten.meldung || 'zu groß' } }));
          return;
        }
        zustand.daten = daten;
        zustand.fehler = false;
        document.dispatchEvent(new CustomEvent('zusammen-geladen', { detail: daten }));
      })
      .catch(() => {
        if (ladung !== zustand.ladung) {
          return;
        }
        zustand.fehler = true;
        document.dispatchEvent(new CustomEvent('zusammen-fehler'));
      })
      .finally(() => {
        if (ladung === zustand.ladung) {
          zustand.laedt = false;
        }
      });
  }

  function beiModuswechsel() {
    if (istZusammen() && zustand.daten === null) {
      laden();
    }
  }

  window.gitreviewaZusammen = {
    hole: () => zustand.daten,
    laden,
    istGeladen: () => zustand.daten !== null,
  };

  document.addEventListener('DOMContentLoaded', beiModuswechsel);
  document.addEventListener('modus-gewechselt', beiModuswechsel);
}());
