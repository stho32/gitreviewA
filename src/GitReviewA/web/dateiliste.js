/* gitreviewA — Dateiliste nach Modus (R00003, R00012): in „Einzeln“ die Dateien des gewählten Commits, in „Zusammen“ die
   Netto-Liste der ganzen Auswahl. Gelesen wird erst bei Bedarf: in „Einzeln“ bei `commit-gewaehlt`, in „Zusammen“ beim
   `zusammen-geladen` (der Lader ist `zusammen.js`). Flach oder Baum; die Wahl meldet `datei-gewaehlt` mit Modus, Pfad,
   Status, AlterPfad und Commit. Jede Dateizeile trägt ein Kästchen zum Abhaken; beides führt `haken.js`, nach jedem Zeichnen
   gemeldet mit `dateiliste-gezeichnet`. */
(function () {
  'use strict';

  const zustand = {
    modus: 'einzeln', commit: null, dateien: [], darstellung: 'flach', gewaehlterPfad: null, letzteLadung: 0,
    uebernehmenAusstehend: false,
  };

  function init() {
    const ansicht = ansichtElemente();
    zustand.modus = modusJetzt();
    document.addEventListener('commit-gewaehlt', ereignis => {
      zustand.commit = ereignis.detail.hash;
      if (zustand.modus === 'einzeln') {
        ladeDateien(ansicht, false);
      }
    });
    document.addEventListener('modus-gewechselt', ereignis => {
      const vorher = ereignis.detail.vorher;
      zustand.modus = ereignis.detail.modus;
      if (zustand.modus === 'zusammen' && vorher !== 'zusammen') {
        zustand.uebernehmenAusstehend = true;
      }
      ladeAnsicht(ansicht, true);
    });
    document.addEventListener('zusammen-geladen', ereignis => {
      if (zustand.modus !== 'zusammen') {
        return;
      }
      const uebernehmen = zustand.uebernehmenAusstehend;
      zustand.uebernehmenAusstehend = false;
      uebernimmNettoStand(ansicht, ereignis.detail, uebernehmen);
    });
    document.addEventListener('zusammen-fehler', () => {
      if (zustand.modus !== 'zusammen') {
        return;
      }
      zeigeMeldung(ansicht, 'Dateien konnten nicht gelesen werden', true);
      meldeGezeichnet();
    });
    ansicht.darstellungElement.addEventListener('click', ereignis => waehleDarstellung(ansicht, ereignis));
    ansicht.zeilenElement.addEventListener('click', ereignis => waehleDatei(ansicht, ereignis));
    document.addEventListener('ausblenden-geaendert', () => {
      if (zustand.dateien.length > 0) {
        zeichneDateien(ansicht);
      }
    });
    ladeAnsicht(ansicht, false);
  }

  function modusJetzt() {
    if (window.gitreviewaModus && window.gitreviewaModus.hole) {
      return window.gitreviewaModus.hole();
    }
    return 'einzeln';
  }

  function ansichtElemente() {
    const wurzelElement = document.getElementById('dateiliste');
    return {
      summeElement: wurzelElement.querySelector('.dateien-summe'),
      meldungElement: wurzelElement.querySelector('.dateien-meldung'),
      darstellungElement: wurzelElement.querySelector('.darstellung'),
      zeilenElement: document.getElementById('datei-zeilen'),
    };
  }

  /** Lädt die Ansicht des Modus; `uebernehmen` sagt, ob die bisherige Wahl in die neue Sicht übernommen wird (Moduswechsel). */
  function ladeAnsicht(ansicht, uebernehmen) {
    if (zustand.modus === 'zusammen') {
      const stand = window.gitreviewaZusammen ? window.gitreviewaZusammen.hole() : null;
      if (stand) {
        uebernimmNettoStand(ansicht, stand, uebernehmen);
      } else {
        zustand.uebernehmenAusstehend = uebernehmen;
        zeigeMeldung(ansicht, 'Dateien werden geladen …', false);
      }
      return;
    }
    if (zustand.commit) {
      ladeDateien(ansicht, uebernehmen);
    }
  }

  /** Eine spätere Ladung verdrängt eine noch laufende: deren Antwort wird verworfen. */
  function neueLadung() {
    zustand.letzteLadung += 1;
    return zustand.letzteLadung;
  }

  /** Netto-Liste der Auswahl; die Wahl bleibt, wenn sie vorkommt, sonst die erste Datei (Moduswechsel, PO Frage 3). */
  function uebernimmNettoStand(ansicht, stand, uebernehmen) {
    neueLadung();
    zustand.dateien = stand.dateien;
    const uebernommen = wahlInNeuerSicht(stand.dateien, uebernehmen);
    zustand.gewaehlterPfad = uebernommen ? uebernommen.pfad : null;
    zeichneDateien(ansicht);
    if (uebernommen) {
      meldeWahl(uebernommen);
    } else {
      meldeWahlAufgehoben();
    }
  }

  async function ladeDateien(ansicht, uebernehmen) {
    const ladung = neueLadung();
    const hash = zustand.commit;
    zustand.dateien = [];
    const vorher = uebernehmen ? zustand.gewaehlterPfad : null;
    zustand.gewaehlterPfad = null;
    zeigeMeldung(ansicht, 'Dateien werden geladen …', false);
    let dateien;
    try {
      dateien = await dateienAbrufen(hash);
    } catch {
      if (ladung === zustand.letzteLadung) {
        zeigeMeldung(ansicht, 'Dateien konnten nicht gelesen werden', true);
        meldeGezeichnet();
      }
      return;
    }
    if (ladung !== zustand.letzteLadung) {
      return;
    }
    zustand.dateien = dateien;
    const uebernommen = wahlInNeuerSicht(dateien, uebernehmen, vorher);
    zustand.gewaehlterPfad = uebernommen ? uebernommen.pfad : null;
    zeichneDateien(ansicht);
    if (uebernommen) {
      meldeWahl(uebernommen);
    } else {
      meldeWahlAufgehoben();
    }
  }

  async function dateienAbrufen(hash) {
    const antwort = await fetch(`api/commits/${encodeURIComponent(hash)}/dateien`, { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  /** Wahl beim Moduswechsel: die bisherige Wahl, wenn sie vorkommt; sonst die erste Datei; ohne Übernahme keine Wahl. Die Regel
      selbst steht in `modus-werte.js` (eine Regel für Wahl und Liste, J10). */
  function wahlInNeuerSicht(sicht, uebernehmen, vorher) {
    if (!uebernehmen) {
      return null;
    }
    const kandidat = vorher === undefined ? zustand.gewaehlterPfad : vorher;
    const wahl = kandidat ? { pfad: kandidat } : null;
    return window.gitreviewaModusWerte.wahlUebernehmen(wahl, sicht, sichtbarerName);
  }

  function sichtbarerName(pfad) {
    return window.sichtbarerName ? window.sichtbarerName(pfad) : pfad;
  }

  function zeigeMeldung(ansicht, text, istFehler) {
    ansicht.summeElement.textContent = '';
    ansicht.meldungElement.textContent = text;
    ansicht.meldungElement.classList.toggle('fehler', Boolean(istFehler));
    ansicht.zeilenElement.replaceChildren();
  }

  function zeichneDateien(ansicht) {
    if (zustand.dateien.length === 0) {
      zeigeMeldung(ansicht, 'Keine Dateien geändert', false);
      meldeGezeichnet();
      return;
    }
    const sicht = sichtVon(zustand.dateien);
    ansicht.meldungElement.textContent = '';
    ansicht.meldungElement.classList.remove('fehler');
    ansicht.summeElement.textContent = summeText(zustand.dateien);
    if (sicht.sichtbare.length === 0) {
      ansicht.meldungElement.textContent = 'Alle Dateien ausgeblendet';
      ansicht.zeilenElement.replaceChildren();
      meldeGezeichnet();
      return;
    }
    const groesste = groessteAenderung(zustand.dateien);
    const zeilen = sichtbareZeilen(sicht, zustand.darstellung);
    const sammelElement = document.createDocumentFragment();
    for (const zeile of zeilen) {
      sammelElement.append(listeneintragElement(zeile, groesste));
    }
    ansicht.zeilenElement.replaceChildren(sammelElement);
    meldeGezeichnet();
  }

  /** Die Sicht auf die gezeigte Liste (R00029): Muster (R00025) und Abgehakte (Schalter). Ohne den Baustein bleibt es beim Muster-Abgleich. */
  function sichtVon(dateien) {
    if (window.gitreviewaAbgehakte) {
      return window.gitreviewaAbgehakte.sicht(dateien, zustand.modus, zustand.commit);
    }
    const sichtbar = window.gitreviewaAusblenden ? window.gitreviewaAusblenden.sichtbare(dateien) : dateien;
    return { sichtbare: sichtbar.map(datei => ({ datei })), ausgeblendetAbgehakt: 0, ausgeblendetMuster: 0 };
  }

  function meldeGezeichnet() {
    document.dispatchEvent(new CustomEvent('dateiliste-gezeichnet', {
      detail: { modus: zustand.modus, commit: zustand.commit, anzahl: zustand.dateien.length, dateien: zustand.dateien },
    }));
  }

  /** Fremder Text (Pfade) nur per textContent; nie als HTML. */
  function listeneintragElement(zeile, groesste) {
    if (zeile.art === 'ordner') {
      const ordnerElement = eintragElement('ordner-zeile', zeile.tiefe);
      ordnerElement.setAttribute('role', 'presentation');
      ordnerElement.append(textElement('pfad', zeile.name));
      return ordnerElement;
    }
    const datei = zeile.datei;
    const dateiElement = eintragElement('datei-zeile', zeile.tiefe);
    const istGewaehlt = zustand.gewaehlterPfad !== null && sichtbarerName(datei.pfad) === sichtbarerName(zustand.gewaehlterPfad);
    dateiElement.setAttribute('aria-current', String(istGewaehlt));
    dateiElement.dataset.pfad = datei.pfad;
    const statusElement = textElement(`status status-${datei.status}`, datei.status);
    dateiElement.append(hakenElement(datei), statusElement, textElement('pfad', zeile.name), textElement('haken-grund', ''), balkenElement(datei, groesste), textElement('zahlen mono', zahlenText(datei)));
    return dateiElement;
  }

  /** Kästchen vor dem Pfad (Vorlage kanbanD „Gesehen“); gesperrt, bis haken.js den Stand kennt. */
  function hakenElement(datei) {
    const zielElement = document.createElement('label');
    zielElement.className = 'haken-ziel';
    const kaestchenElement = document.createElement('input');
    kaestchenElement.type = 'checkbox';
    kaestchenElement.className = 'haken';
    kaestchenElement.disabled = true;
    kaestchenElement.setAttribute('aria-label', `Abgehakt: ${sichtbarerName(datei.pfad)}`);
    zielElement.append(kaestchenElement);
    return zielElement;
  }

  function eintragElement(klasse, tiefe) {
    const element = document.createElement('li');
    element.className = klasse;
    element.dataset.tiefe = String(tiefe);
    element.style.setProperty('--tiefe', String(tiefe));
    return element;
  }

  /** Größenbalken: je Zahl über 0 ein Anteil an der größten Änderung der Liste. */
  function balkenElement(datei, groesste) {
    const anteile = balkenTeile(datei, groesste);
    const balken = document.createElement('span');
    balken.className = 'balken';
    balken.setAttribute('aria-hidden', 'true');
    for (const [klasse, anteil] of [['balken-plus', anteile.plus], ['balken-minus', anteile.minus]]) {
      if (anteil > 0) {
        const teil = document.createElement('span');
        teil.className = klasse;
        teil.style.setProperty('--anteil', String(anteil));
        balken.append(teil);
      }
    }
    return balken;
  }

  function textElement(klassen, text) {
    const element = document.createElement('span');
    element.className = klassen;
    element.textContent = text;
    return element;
  }

  function waehleDarstellung(ansicht, ereignis) {
    const knopf = ereignis.target.closest('button[data-darstellung]');
    if (!knopf) {
      return;
    }
    zustand.darstellung = knopf.dataset.darstellung;
    for (const anderer of ansicht.darstellungElement.querySelectorAll('button[data-darstellung]')) {
      anderer.setAttribute('aria-pressed', String(anderer === knopf));
    }
    if (zustand.dateien.length > 0) {
      zeichneDateien(ansicht);
    }
  }

  /** Das Kästchen wählt keine Datei. */
  function waehleDatei(ansicht, ereignis) {
    if (ereignis.target.closest('.haken-ziel') !== null) {
      return;
    }
    const zeile = ereignis.target.closest('.datei-zeile');
    if (!zeile) {
      return;
    }
    const datei = zustand.dateien.find(eintrag => eintrag.pfad === zeile.dataset.pfad);
    if (!datei) {
      return;
    }
    zustand.gewaehlterPfad = datei.pfad;
    for (const andere of ansicht.zeilenElement.querySelectorAll('.datei-zeile')) {
      andere.setAttribute('aria-current', String(andere === zeile));
    }
    meldeWahl(datei);
  }

  function meldeWahlAufgehoben() {
    document.dispatchEvent(new CustomEvent('wahl-aufgehoben'));
  }

  function meldeWahl(datei) {
    document.dispatchEvent(new CustomEvent('datei-gewaehlt', {
      detail: {
        modus: zustand.modus,
        pfad: datei.pfad,
        status: datei.status,
        alterPfad: datei.alterPfad,
        commit: zustand.modus === 'zusammen' ? datei.zustaendiger : zustand.commit,
      },
    }));
  }

  /* Lesender Zugang zur aktuellen Wahl für andere Bausteine (I0025 „Nächste ungeprüfte“): die Wahl bleibt hier, es gibt keine zweite. */
  window.gitreviewaDateiliste = {
    gewaehlt: () => (zustand.gewaehlterPfad === null
      ? null
      : { modus: zustand.modus, pfad: zustand.gewaehlterPfad, commit: zustand.commit }),
  };

  document.addEventListener('DOMContentLoaded', init);
}());
