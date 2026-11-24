/* gitreviewA — Datei abhaken (R00011): liest den Stand aller Stellen nach der Commit-Leiste (erstes Ereignis `commit-gewaehlt`), zeigt
   „n von m abgehakt“ mit Balken über der Dateiliste und führt die Kästchen der Dateizeilen (Ereignis `dateiliste-gezeichnet`); an einer
   gesperrten Stelle (R00014) steht der Grund neben der Zeile, und das Kästchen ändert nichts.
   Ein Klick sendet den Zielzustand; das Kästchen zeigt immer den vom Server bestätigten Zustand. Je Stelle ist höchstens eine Anfrage
   unterwegs; wer währenddessen erneut klickt, ändert nur den Wunsch, und die laufende Anfrage sendet ihn nach. */
(function () {
  'use strict';

  const zustand = {
    istLesbar: false,
    abgehakt: 0,
    gesamt: 0,
    nichtLesbar: 0,
    bestaetigt: new Map(),
    sperrgrund: new Map(),
    wunsch: new Map(),
    unterwegs: new Set(),
    angezeigterCommit: null,
  };

  function init() {
    const ansicht = ansichtElemente();
    document.addEventListener('commit-gewaehlt', () => ladeStand(ansicht), { once: true });
    document.addEventListener('dateiliste-gezeichnet', ereignis => {
      zustand.angezeigterCommit = ereignis.detail.commit;
      zeigeKaestchen(ansicht);
    });
    ansicht.zeilenElement.addEventListener('click', ereignis => bedieneKaestchen(ansicht, ereignis));
  }

  function ansichtElemente() {
    const fortschrittElement = document.querySelector('#dateiliste .haken-fortschritt');
    return {
      zaehlerElement: fortschrittElement.querySelector('.haken-zaehler'),
      balkenElement: fortschrittElement.querySelector('.haken-balken'),
      ansageElement: fortschrittElement.querySelector('.haken-ansage'),
      meldungElement: fortschrittElement.querySelector('.haken-meldung'),
      zeilenElement: document.getElementById('datei-zeilen'),
    };
  }

  async function ladeStand(ansicht) {
    let stand;
    try {
      stand = await standAbrufen();
    } catch {
      ansicht.meldungElement.textContent = 'Fortschritt konnte nicht gelesen werden';
      return;
    }
    for (const stelle of stand.stellen) {
      const schluessel = stellenSchluessel(stelle.commit, stelle.datei);
      zustand.bestaetigt.set(schluessel, stelle.abgehakt);
      zustand.sperrgrund.set(schluessel, stelle.sperrgrund);
    }
    zustand.nichtLesbar = stand.stellen.filter(stelle => stelle.sperrgrund.length > 0).length;
    zustand.abgehakt = stand.abgehakt;
    zustand.gesamt = stand.gesamt;
    zustand.istLesbar = true;
    zeichneFortschritt(ansicht);
    zeigeKaestchen(ansicht);
  }

  async function standAbrufen() {
    const antwort = await fetch('api/haken', { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  function zeichneFortschritt(ansicht) {
    const text = fortschrittText(zustand.abgehakt, zustand.gesamt, zustand.nichtLesbar);
    ansicht.zaehlerElement.textContent = text;
    ansicht.ansageElement.textContent = text;
    ansicht.balkenElement.hidden = zustand.gesamt === 0;
    ansicht.balkenElement.querySelector('.haken-anteil').style.setProperty('--anteil', String(balkenAnteil(zustand.abgehakt, zustand.gesamt)));
  }

  /** Alle Kästchen der gezeichneten Liste: bestätigter Zustand, bedienbar erst mit gelesenem Stand und nie an einer gesperrten Stelle. */
  function zeigeKaestchen(ansicht) {
    for (const kaestchenElement of ansicht.zeilenElement.querySelectorAll('input.haken')) {
      zeigeKaestchenZustand(kaestchenElement);
    }
  }

  function zeigeKaestchenZustand(kaestchenElement) {
    const zeileElement = kaestchenElement.closest('.datei-zeile');
    const schluessel = stellenSchluessel(zustand.angezeigterCommit, zeileElement.dataset.pfad);
    kaestchenElement.checked = zustand.bestaetigt.get(schluessel) === true;
    kaestchenElement.disabled = !zustand.istLesbar;
    zeigeSperre(zeileElement, kaestchenElement, sperrgrundDerStelle(schluessel));
  }

  function sperrgrundDerStelle(schluessel) {
    const istBekannt = zustand.sperrgrund.has(schluessel);
    if (!istBekannt) {
      return '';
    }
    return zustand.sperrgrund.get(schluessel);
  }

  /** Gesperrt bleibt das Kästchen fokussierbar (aria-disabled statt disabled): so finden Tastatur und Vorlesen den Grund. */
  function zeigeSperre(zeileElement, kaestchenElement, sperrgrund) {
    const istGesperrt = sperrgrund.length > 0;
    kaestchenElement.setAttribute('aria-disabled', String(istGesperrt));
    kaestchenElement.setAttribute('aria-label', kaestchenBezeichnung(sichtbarerName(zeileElement.dataset.pfad), sperrgrund));
    zeileElement.querySelector('.haken-grund').textContent = sperrgrund;
  }

  /** Das native Umschalten wird verhindert: gezeichnet wird erst mit der Antwort des Servers. */
  function bedieneKaestchen(ansicht, ereignis) {
    const kaestchenElement = ereignis.target.closest('input.haken');
    if (!kaestchenElement) {
      return;
    }
    ereignis.preventDefault();
    if (!zustand.istLesbar) {
      return;
    }
    const stelle = { commit: zustand.angezeigterCommit, pfad: kaestchenElement.closest('.datei-zeile').dataset.pfad };
    const schluessel = stellenSchluessel(stelle.commit, stelle.pfad);
    const istGesperrt = sperrgrundDerStelle(schluessel).length > 0;
    if (istGesperrt) {
      return;
    }
    const istBestaetigtAbgehakt = zustand.bestaetigt.get(schluessel) === true;
    zustand.wunsch.set(schluessel, naechsterZielzustand(istBestaetigtAbgehakt, zustand.wunsch.get(schluessel)));
    ansicht.meldungElement.textContent = '';
    sendeWunsch(ansicht, stelle, schluessel);
  }

  /** Sendet, solange ein Wunsch offen ist — nacheinander, damit eine spätere Antwort nie von einer früheren überholt wird. */
  async function sendeWunsch(ansicht, stelle, schluessel) {
    const istSchonUnterwegs = zustand.unterwegs.has(schluessel);
    if (istSchonUnterwegs) {
      return;
    }
    zustand.unterwegs.add(schluessel);
    try {
      while (zustand.wunsch.has(schluessel)) {
        const zielzustand = zustand.wunsch.get(schluessel);
        const antwort = await hakenSenden(stelle, zielzustand);
        zustand.bestaetigt.set(schluessel, zielzustand);
        if (zustand.wunsch.get(schluessel) === zielzustand) {
          zustand.wunsch.delete(schluessel);
        }
        zustand.abgehakt = antwort.abgehakt;
        zustand.gesamt = antwort.gesamt;
        zeichneFortschritt(ansicht);
        zeigeKaestchenDerStelle(ansicht, stelle);
      }
    } catch {
      zustand.wunsch.delete(schluessel);
      ansicht.meldungElement.textContent = 'Haken konnte nicht gespeichert werden';
      zeigeKaestchenDerStelle(ansicht, stelle);
    } finally {
      zustand.unterwegs.delete(schluessel);
    }
  }

  async function hakenSenden(stelle, abgehakt) {
    const antwort = await fetch('api/haken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ commit: stelle.commit, datei: stelle.pfad, abgehakt }),
    });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  /** Nur, wenn die Liste noch den Commit der Stelle zeigt; nach einem Wechsel zeichnet `dateiliste-gezeichnet` den Zustand neu. */
  function zeigeKaestchenDerStelle(ansicht, stelle) {
    const istAngezeigt = stelle.commit === zustand.angezeigterCommit;
    if (!istAngezeigt) {
      return;
    }
    for (const zeileElement of ansicht.zeilenElement.querySelectorAll('.datei-zeile')) {
      if (zeileElement.dataset.pfad === stelle.pfad) {
        zeigeKaestchenZustand(zeileElement.querySelector('input.haken'));
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
}());
