/* gitreviewA — Abhaken je Modus (R00011, R00012): „Einzeln“ führt das Kästchen je Stelle (Commit und Datei), „Zusammen“ je Datei
   (alle ihre Stellen auf einmal). Der Kopf zeigt „n von m Stellen abgehakt“ bzw. „n von m Dateien abgehakt“; der Diff-Kopf trägt
   dasselbe Kästchen wie die gewählte Zeile. Ein Klick wünscht den Zielzustand; gezeichnet wird erst der vom Server bestätigte Zustand.
   Je Stelle bzw. Datei ist höchstens eine Anfrage unterwegs; weitere Klicks ändern nur den Wunsch. */
(function () {
  'use strict';

  const zustand = {
    istLesbar: false,
    modus: 'einzeln',
    stand: null,
    bestaetigtRoh: new Map(),
    sperrgrundRoh: new Map(),
    bestaetigtAnzeige: new Map(),
    sperrgrundAnzeige: new Map(),
    wunsch: new Map(),
    unterwegs: new Set(),
    angezeigterCommit: null,
    nettoDateien: [],
    diffPfad: null,
    diffCommit: null,
  };

  function init() {
    const ansicht = ansichtElemente();
    document.addEventListener('commit-gewaehlt', () => ladeStand(ansicht), { once: true });
    document.addEventListener('dateiliste-gezeichnet', ereignis => {
      uebernimmListe(ereignis.detail);
      zeichneFortschritt(ansicht);
      zeigeKaestchen(ansicht);
    });
    document.addEventListener('modus-gewechselt', () => {
      zustand.modus = modusJetzt();
      zeichneFortschritt(ansicht);
      zeigeKaestchen(ansicht);
      zeigeDiffKaestchen(ansicht);
    });
    document.addEventListener('diff-gezeichnet', ereignis => {
      zustand.diffPfad = ereignis.detail.pfad;
      zustand.diffCommit = ereignis.detail.commit;
      zeigeDiffKaestchen(ansicht);
    });
    document.addEventListener('diff-geleert', () => {
      zustand.diffPfad = null;
      zustand.diffCommit = null;
      zeigeDiffKaestchen(ansicht);
    });
    ansicht.zeilenElement.addEventListener('click', ereignis => bedieneKaestchen(ansicht, ereignis));
    ansicht.diffKaestchen.addEventListener('click', ereignis => bedieneDiffKaestchen(ansicht, ereignis));
  }

  function modusJetzt() {
    if (window.gitreviewaModus && window.gitreviewaModus.hole) {
      return window.gitreviewaModus.hole();
    }
    return 'einzeln';
  }

  function ansichtElemente() {
    const fortschrittElement = document.getElementById('kopf-fortschritt');
    const diffWurzel = document.getElementById('diff');
    return {
      zaehlerElement: fortschrittElement.querySelector('.haken-zaehler'),
      balkenElement: fortschrittElement.querySelector('.haken-balken'),
      anteilElement: fortschrittElement.querySelector('.haken-anteil'),
      ansageElement: fortschrittElement.querySelector('.haken-ansage'),
      meldungElement: fortschrittElement.querySelector('.haken-meldung'),
      zeilenElement: document.getElementById('dateiliste'),
      diffKaestchen: diffWurzel ? diffWurzel.querySelector('#diff-haken') : null,
      diffHakenZiel: diffWurzel ? diffWurzel.querySelector('.gr-diff-haken') : null,
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
    uebernimmStand(stand);
    zustand.istLesbar = true;
    document.dispatchEvent(new CustomEvent('haken-stand-geladen', { detail: stand }));
    zeichneFortschritt(ansicht);
    zeigeKaestchen(ansicht);
    zeigeDiffKaestchen(ansicht);
  }

  async function standAbrufen() {
    const antwort = await fetch('api/haken', { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  function uebernimmStand(stand) {
    zustand.stand = stand;
    for (const stelle of stand.stellen) {
      const roh = rohSchluessel(stelle.commit, stelle.datei);
      const anzeige = anzeigeSchluessel(stelle.commit, stelle.datei);
      zustand.bestaetigtRoh.set(roh, stelle.abgehakt);
      zustand.bestaetigtAnzeige.set(anzeige, stelle.abgehakt);
      zustand.sperrgrundRoh.set(roh, stelle.sperrgrund);
      zustand.sperrgrundAnzeige.set(anzeige, stelle.sperrgrund);
    }
  }

  function uebernimmListe(detail) {
    zustand.modus = detail.modus || modusJetzt();
    zustand.angezeigterCommit = detail.commit || null;
    zustand.nettoDateien = detail.modus === 'zusammen' ? detail.dateien : [];
  }

  function rohSchluessel(commit, pfad) {
    return `${commit} ${pfad}`;
  }

  function anzeigeSchluessel(commit, pfad) {
    return `${commit} ${sichtbarerName(pfad)}`;
  }

  function sichtbarerName(pfad) {
    return window.sichtbarerName ? window.sichtbarerName(pfad) : pfad;
  }

  /* ── Fortschritt im Kopf ── */

  function zeichneFortschritt(ansicht) {
    if (!zustand.istLesbar) {
      return;
    }
    const zusammen = zustand.modus === 'zusammen';
    const werte = zusammen ? fortschrittZusammenWerte() : fortschrittEinzelnWerte();
    const einheit = zusammen ? 'Dateien' : 'Stellen';
    const text = fortschrittText(werte.abgehakt, werte.gesamt, werte.nichtLesbar, einheit);
    ansicht.zaehlerElement.textContent = text;
    ansicht.ansageElement.textContent = text;
    ansicht.balkenElement.hidden = werte.gesamt === 0;
    ansicht.anteilElement.style.setProperty('--anteil', String(balkenAnteil(werte.abgehakt, werte.gesamt)));
  }

  function fortschrittZusammenWerte() {
    return fortschrittZusammen(zustand.nettoDateien, zustand.bestaetigtAnzeige, istDateiGesperrt);
  }

  function fortschrittEinzelnWerte() {
    const stand = zustand.stand;
    if (!stand) {
      return { abgehakt: 0, gesamt: 0, nichtLesbar: 0 };
    }
    return fortschrittEinzeln(stand.stellen, stand.abgehakt, stand.gesamt);
  }

  function istDateiGesperrt(datei) {
    return datei.stellen.some(stelle => sperrgrundAnzeige(stelle) !== '');
  }

  function sperrgrundRoh(schluessel) {
    return zustand.sperrgrundRoh.get(schluessel) || '';
  }

  function sperrgrundAnzeige(stelle) {
    return zustand.sperrgrundAnzeige.get(anzeigeSchluessel(stelle.commit, stelle.pfad)) || '';
  }

  /* ── Kästchen in der Liste ── */

  function zeigeKaestchen(ansicht) {
    const zusammen = zustand.modus === 'zusammen';
    for (const kaestchenElement of ansicht.zeilenElement.querySelectorAll('input.haken')) {
      const zeileElement = kaestchenElement.closest('.datei-zeile');
      if (zusammen) {
        zeigeDateiKaestchen(kaestchenElement, zeileElement);
      } else {
        zeigeStelleKaestchen(kaestchenElement, zeileElement);
      }
    }
  }

  function zeigeStelleKaestchen(kaestchenElement, zeileElement) {
    const schluessel = rohSchluessel(zustand.angezeigterCommit, zeileElement.dataset.pfad);
    const istAbgehakt = zustand.bestaetigtRoh.get(schluessel) === true;
    const grund = sperrgrundRoh(schluessel);
    kaestchenElement.checked = istAbgehakt;
    kaestchenElement.indeterminate = false;
    kaestchenElement.disabled = !zustand.istLesbar;
    kaestchenElement.setAttribute('aria-disabled', String(grund !== ''));
    kaestchenElement.setAttribute('aria-label', kaestchenBezeichnung(sichtbarerName(zeileElement.dataset.pfad), grund));
    zeileElement.querySelector('.haken-grund').textContent = grund;
  }

  function zeigeDateiKaestchen(kaestchenElement, zeileElement) {
    const datei = dateiDerZeile(zeileElement.dataset.pfad);
    if (!datei) {
      kaestchenElement.checked = false;
      kaestchenElement.indeterminate = false;
      kaestchenElement.disabled = true;
      kaestchenElement.setAttribute('aria-disabled', 'true');
      return;
    }
    const art = dateiZustand(datei.stellen, zustand.bestaetigtAnzeige);
    const grund = dateiSperrgrund(datei);
    kaestchenElement.checked = art === 'abgehakt';
    kaestchenElement.indeterminate = art === 'teilweise';
    kaestchenElement.disabled = !zustand.istLesbar;
    kaestchenElement.setAttribute('aria-disabled', String(grund !== ''));
    kaestchenElement.setAttribute('aria-label', kaestchenBezeichnung(datei.pfad, grund));
    if (art === 'teilweise') {
      kaestchenElement.setAttribute('aria-checked', 'mixed');
    } else {
      kaestchenElement.removeAttribute('aria-checked');
    }
    zeileElement.dataset.haken = art;
    zeileElement.querySelector('.haken-grund').textContent = '';
  }

  /** Der erste Sperrgrund der Datei; leer, wenn keine ihrer Stellen gesperrt ist. */
  function dateiSperrgrund(datei) {
    for (const stelle of datei.stellen) {
      const grund = sperrgrundAnzeige(stelle);
      if (grund !== '') {
        return grund;
      }
    }
    return '';
  }

  function dateiDerZeile(pfad) {
    return zustand.nettoDateien.find(datei => datei.pfad === pfad) || null;
  }

  /* ── Kästchen im Diff-Kopf ── */

  function zeigeDiffKaestchen(ansicht) {
    const kaestchen = ansicht.diffKaestchen;
    if (ansicht.diffHakenZiel) {
      ansicht.diffHakenZiel.hidden = !zustand.diffPfad;
    }
    if (!kaestchen || !zustand.diffPfad) {
      if (kaestchen) {
        kaestchen.disabled = true;
        kaestchen.setAttribute('aria-disabled', 'true');
        kaestchen.checked = false;
        kaestchen.indeterminate = false;
      }
      return;
    }
    if (zustand.modus === 'zusammen') {
      const datei = dateiDerZeile(zustand.diffPfad);
      if (!datei) {
        kaestchen.disabled = true;
        kaestchen.setAttribute('aria-disabled', 'true');
        return;
      }
      const art = dateiZustand(datei.stellen, zustand.bestaetigtAnzeige);
      const grund = dateiSperrgrund(datei);
      kaestchen.checked = art === 'abgehakt';
      kaestchen.indeterminate = art === 'teilweise';
      kaestchen.disabled = !zustand.istLesbar;
      kaestchen.setAttribute('aria-disabled', String(grund !== ''));
      kaestchen.setAttribute('aria-label', kaestchenBezeichnung(datei.pfad, grund));
      return;
    }
    const schluessel = rohSchluessel(zustand.diffCommit, zustand.diffPfad);
    const grund = sperrgrundRoh(schluessel);
    kaestchen.checked = zustand.bestaetigtRoh.get(schluessel) === true;
    kaestchen.indeterminate = false;
    kaestchen.disabled = !zustand.istLesbar;
    kaestchen.setAttribute('aria-disabled', String(grund !== ''));
    kaestchen.setAttribute('aria-label', kaestchenBezeichnung(sichtbarerName(zustand.diffPfad), grund));
  }

  /* ── Betätigung ── */

  function bedieneKaestchen(ansicht, ereignis) {
    const kaestchen = ereignis.target.closest('input.haken');
    if (!kaestchen) {
      return;
    }
    ereignis.preventDefault();
    if (!zustand.istLesbar) {
      return;
    }
    const zeileElement = kaestchen.closest('.datei-zeile');
    if (zustand.modus === 'zusammen') {
      bedieneDatei(ansicht, zeileElement.dataset.pfad);
    } else {
      bedieneStelle(ansicht, zustand.angezeigterCommit, zeileElement.dataset.pfad);
    }
  }

  function bedieneDiffKaestchen(ansicht, ereignis) {
    ereignis.preventDefault();
    if (!zustand.istLesbar || !zustand.diffPfad) {
      return;
    }
    if (zustand.modus === 'zusammen') {
      bedieneDatei(ansicht, zustand.diffPfad);
    } else {
      bedieneStelle(ansicht, zustand.diffCommit, zustand.diffPfad);
    }
  }

  function bedieneStelle(ansicht, commit, pfad) {
    if (!commit) {
      return;
    }
    const schluessel = rohSchluessel(commit, pfad);
    if (sperrgrundRoh(schluessel) !== '') {
      return;
    }
    const istBestaetigt = zustand.bestaetigtRoh.get(schluessel) === true;
    const ziel = naechsterZielzustand(istBestaetigt, zustand.wunsch.get(schluessel));
    zustand.wunsch.set(schluessel, ziel);
    sendeWunsch(ansicht, schluessel, { commit, datei: pfad, abgehakt: ziel });
  }

  function bedieneDatei(ansicht, pfad) {
    const datei = dateiDerZeile(pfad);
    if (!datei || istDateiGesperrt(datei)) {
      return;
    }
    const schluessel = `datei ${pfad}`;
    const istBestaetigt = dateiZustand(datei.stellen, zustand.bestaetigtAnzeige) === 'abgehakt';
    const ziel = naechsterZielzustand(istBestaetigt, zustand.wunsch.get(schluessel));
    zustand.wunsch.set(schluessel, ziel);
    sendeWunsch(ansicht, schluessel, { datei: pfad, abgehakt: ziel });
  }

  /** Sendet den jüngsten Wunsch einer Stelle bzw. Datei; solange einer unterwegs ist, übernimmt der nächste Zug ihn danach. */
  async function sendeWunsch(ansicht, schluessel, rumpf) {
    if (zustand.unterwegs.has(schluessel)) {
      return;
    }
    zustand.unterwegs.add(schluessel);
    try {
      while (zustand.wunsch.has(schluessel)) {
        const ziel = zustand.wunsch.get(schluessel);
        const antwort = await hakenSenden({ ...rumpf, abgehakt: ziel });
        bestaetigeAntwort(schluessel, rumpf, ziel, antwort);
        if (zustand.wunsch.get(schluessel) === ziel) {
          zustand.wunsch.delete(schluessel);
        }
        zeichneFortschritt(ansicht);
        zeigeKaestchen(ansicht);
        zeigeDiffKaestchen(ansicht);
      }
    } catch {
      zustand.wunsch.delete(schluessel);
      ansicht.meldungElement.textContent = 'Haken konnte nicht gespeichert werden';
      zeigeKaestchen(ansicht);
      zeigeDiffKaestchen(ansicht);
    } finally {
      zustand.unterwegs.delete(schluessel);
    }
  }

  async function hakenSenden(rumpf) {
    const antwort = await fetch('api/haken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(rumpf),
    });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  function bestaetigeAntwort(schluessel, rumpf, ziel, antwort) {
    if (zustand.stand) {
      zustand.stand.abgehakt = antwort.abgehakt;
      zustand.stand.gesamt = antwort.gesamt;
    }
    if (rumpf.commit) {
      const roh = rohSchluessel(rumpf.commit, rumpf.datei);
      const anzeige = anzeigeSchluessel(rumpf.commit, rumpf.datei);
      zustand.bestaetigtRoh.set(roh, ziel);
      zustand.bestaetigtAnzeige.set(anzeige, ziel);
      return;
    }
    const datei = dateiDerZeile(rumpf.datei);
    if (datei) {
      for (const stelle of datei.stellen) {
        zustand.bestaetigtAnzeige.set(anzeigeSchluessel(stelle.commit, stelle.pfad), ziel);
      }
    }
    for (const stelle of zustand.stand ? zustand.stand.stellen : []) {
      if (sichtbarerName(stelle.datei) === rumpf.datei) {
        zustand.bestaetigtRoh.set(rohSchluessel(stelle.commit, stelle.datei), ziel);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
}());
