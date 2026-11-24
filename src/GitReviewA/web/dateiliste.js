/* gitreviewA — Dateiliste des gewählten Commits: liest sie erst bei der Wahl (Ereignis `commit-gewaehlt`), zeigt sie flach oder als Baum
   und hält die gewählte Datei als Zustand {commit, pfad, status, alterPfad}; jede Wahl meldet das Ereignis `datei-gewaehlt`. */
(function () {
  'use strict';

  const zustand = { commit: null, dateien: [], darstellung: 'flach', gewaehlterPfad: null, letzteLadung: 0 };

  function init() {
    const ansicht = ansichtElemente();
    document.addEventListener('commit-gewaehlt', ereignis => ladeDateien(ansicht, ereignis.detail.hash));
    ansicht.darstellungElement.addEventListener('click', ereignis => waehleDarstellung(ansicht, ereignis));
    ansicht.zeilenElement.addEventListener('click', ereignis => waehleDatei(ansicht, ereignis));
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

  /** Eine spätere Wahl verdrängt eine noch laufende Ladung: deren Antwort wird verworfen. */
  async function ladeDateien(ansicht, hash) {
    const ladung = zustand.letzteLadung + 1;
    zustand.letzteLadung = ladung;
    zustand.commit = hash;
    zustand.dateien = [];
    zustand.gewaehlterPfad = null;
    zeigeMeldung(ansicht, 'Dateien werden geladen …', false);
    let dateien;
    try {
      dateien = await dateienAbrufen(hash);
    } catch {
      if (ladung === zustand.letzteLadung) {
        zeigeMeldung(ansicht, 'Dateien konnten nicht gelesen werden', true);
      }
      return;
    }
    if (ladung !== zustand.letzteLadung) {
      return;
    }
    zustand.dateien = dateien;
    zeichneDateien(ansicht);
  }

  async function dateienAbrufen(hash) {
    const antwort = await fetch(`api/commits/${encodeURIComponent(hash)}/dateien`, { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  function zeigeMeldung(ansicht, text, istFehler) {
    ansicht.summeElement.textContent = '';
    ansicht.meldungElement.textContent = text;
    ansicht.meldungElement.classList.toggle('fehler', istFehler);
    ansicht.zeilenElement.replaceChildren();
  }

  function zeichneDateien(ansicht) {
    if (zustand.dateien.length === 0) {
      zeigeMeldung(ansicht, 'Keine Dateien geändert', false);
      return;
    }
    ansicht.meldungElement.textContent = '';
    ansicht.summeElement.textContent = summeText(zustand.dateien);
    const groesste = groessteAenderung(zustand.dateien);
    let zeilen = flacheZeilen(zustand.dateien);
    if (zustand.darstellung === 'baum') {
      zeilen = baumZeilen(zustand.dateien);
    }
    const sammelElement = document.createDocumentFragment();
    for (const zeile of zeilen) {
      sammelElement.append(listeneintragElement(zeile, groesste));
    }
    ansicht.zeilenElement.replaceChildren(sammelElement);
  }

  /** Fremder Text (Pfade) nur über textContent — nie als HTML. */
  function listeneintragElement(zeile, groesste) {
    if (zeile.art === 'ordner') {
      const ordnerElement = eintragElement('ordner-zeile', zeile.tiefe);
      ordnerElement.setAttribute('role', 'presentation');
      ordnerElement.append(textElement('pfad', zeile.name));
      return ordnerElement;
    }
    const datei = zeile.datei;
    const dateiElement = eintragElement('datei-zeile', zeile.tiefe);
    dateiElement.setAttribute('role', 'option');
    dateiElement.setAttribute('aria-selected', String(datei.pfad === zustand.gewaehlterPfad));
    dateiElement.dataset.pfad = datei.pfad;
    const statusElement = textElement(`status status-${datei.status}`, datei.status);
    dateiElement.append(statusElement, textElement('pfad', zeile.name), balkenElement(datei, groesste), textElement('zahlen mono', zahlenText(datei)));
    return dateiElement;
  }

  function eintragElement(klasse, tiefe) {
    const element = document.createElement('li');
    element.className = klasse;
    element.dataset.tiefe = String(tiefe);
    element.style.setProperty('--tiefe', String(tiefe));
    return element;
  }

  /** Größenbalken: je Zahl über 0 ein Teil mit seinem Anteil an der größten Änderung; Länge im CSS (Vorlage kanbanD). */
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
    const knopfElement = ereignis.target.closest('button[data-darstellung]');
    if (!knopfElement) {
      return;
    }
    zustand.darstellung = knopfElement.dataset.darstellung;
    for (const element of ansicht.darstellungElement.querySelectorAll('button[data-darstellung]')) {
      element.setAttribute('aria-pressed', String(element === knopfElement));
    }
    if (zustand.dateien.length > 0) {
      zeichneDateien(ansicht);
    }
  }

  function waehleDatei(ansicht, ereignis) {
    const zeileElement = ereignis.target.closest('.datei-zeile');
    if (!zeileElement) {
      return;
    }
    const datei = zustand.dateien.find(d => d.pfad === zeileElement.dataset.pfad);
    zustand.gewaehlterPfad = datei.pfad;
    for (const element of ansicht.zeilenElement.querySelectorAll('.datei-zeile[aria-selected="true"]')) {
      element.setAttribute('aria-selected', 'false');
    }
    zeileElement.setAttribute('aria-selected', 'true');
    const gewaehlteDatei = { commit: zustand.commit, pfad: datei.pfad, status: datei.status, alterPfad: datei.alterPfad };
    document.dispatchEvent(new CustomEvent('datei-gewaehlt', { detail: gewaehlteDatei }));
  }

  document.addEventListener('DOMContentLoaded', init);
}());
