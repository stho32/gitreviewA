/* gitreviewA — Diff-Bereich: liest den Diff einer Datei erst bei ihrer Wahl (Ereignis `datei-gewaehlt`) und zeigt ihn mit Nummern
   alt und neu; der Wechsel des Commits (`commit-gewaehlt`) hebt die Wahl auf und fordert zum Wählen auf. Zeilenaufbau nach kanbanD
   web/diff.js (zeileHtml), aber als DOM-Knoten mit textContent: Diff-Text, Pfade und Hunk-Titel sind fremder Text. */
(function () {
  'use strict';

  const HINWEIS_ZUR_WAHL = 'Datei wählen, um ihren Diff zu sehen';
  const MELDUNG_NACH_ART = { binaer: 'Binärdatei', leer: 'Keine Zeilenänderungen' };
  const LESETEXT = { plus: 'hinzugefügt: ', minus: 'entfernt: ' };
  const VORZEICHEN = { plus: '+', minus: '−', kontext: '' };

  const zustand = { letzteLadung: 0 };

  function init() {
    const ansicht = ansichtElemente();
    zeigeAufforderungZurWahl(ansicht);
    ansicht.umbruchElement.addEventListener('change', () => schalteUmbruch(ansicht));
    document.addEventListener('commit-gewaehlt', () => verwerfeWahl(ansicht));
    document.addEventListener('datei-gewaehlt', ereignis => ladeDiff(ansicht, ereignis.detail));
  }

  function ansichtElemente() {
    const wurzelElement = document.getElementById('diff');
    return {
      wurzelElement,
      umbruchElement: wurzelElement.querySelector('.umbruch-schalter'),
      pfadElement: wurzelElement.querySelector('.diff-pfad'),
      meldungElement: wurzelElement.querySelector('.diff-meldung'),
      rollElement: wurzelElement.querySelector('.df-sc'),
    };
  }

  /** Die Wahl liegt am Bereich, nicht am Diff: sie bleibt beim Wechsel von Datei und Commit. */
  function schalteUmbruch(ansicht) {
    ansicht.wurzelElement.classList.toggle('umbr', ansicht.umbruchElement.checked);
  }

  /** Ein Commit-Wechsel verdrängt auch eine noch laufende Ladung: deren Antwort wird verworfen. */
  function verwerfeWahl(ansicht) {
    zustand.letzteLadung += 1;
    zeigeAufforderungZurWahl(ansicht);
  }

  function zeigeAufforderungZurWahl(ansicht) {
    ansicht.pfadElement.textContent = '';
    zeigeMeldung(ansicht, HINWEIS_ZUR_WAHL, false);
  }

  /** Die jüngste Wahl gewinnt: eine Antwort zählt nur, wenn seit ihrer Anfrage keine andere Datei und kein anderer Commit gewählt wurde. */
  async function ladeDiff(ansicht, datei) {
    const ladung = zustand.letzteLadung + 1;
    zustand.letzteLadung = ladung;
    ansicht.pfadElement.replaceChildren(...sichtbarTeile(datei.pfad).map(teilKnoten));
    zeigeMeldung(ansicht, 'Diff wird geladen …', false);
    let antwort;
    try {
      antwort = await diffAbrufen(datei);
    } catch {
      if (ladung === zustand.letzteLadung) {
        zeigeMeldung(ansicht, 'Diff konnte nicht gelesen werden', true);
      }
      return;
    }
    if (ladung !== zustand.letzteLadung) {
      return;
    }
    zeichneAntwort(ansicht, antwort);
  }

  async function diffAbrufen(datei) {
    const adresse = `api/commits/${encodeURIComponent(datei.commit)}/diff?${new URLSearchParams({ pfad: datei.pfad })}`;
    const antwort = await fetch(adresse, { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  function zeigeMeldung(ansicht, text, istFehler) {
    ansicht.meldungElement.textContent = text;
    ansicht.meldungElement.classList.toggle('fehler', istFehler);
    ansicht.rollElement.replaceChildren();
    ansicht.rollElement.hidden = true;
  }

  function zeichneAntwort(ansicht, antwort) {
    const meldung = MELDUNG_NACH_ART[antwort.art];
    if (meldung) {
      zeigeMeldung(ansicht, meldung, false);
      return;
    }
    const zeilen = patchZeilen(antwort.patch);
    if (zeilen.length === 0) {
      zeigeMeldung(ansicht, MELDUNG_NACH_ART.leer, false);
      return;
    }
    const name = `Änderungen in ${antwort.pfad}`;
    const sammelElement = document.createDocumentFragment();
    for (const block of bloecke(zeilen)) {
      sammelElement.append(blockElement(block, name));
    }
    ansicht.meldungElement.textContent = '';
    ansicht.meldungElement.classList.remove('fehler');
    ansicht.rollElement.setAttribute('aria-label', name);
    ansicht.rollElement.replaceChildren(sammelElement);
    ansicht.rollElement.hidden = false;
  }

  /** Ein Block mit `content-visibility: auto` (Höhe vorab geschätzt), darin eine Tabelle: Spalten alt | neu | Vorzeichen | Text. */
  function blockElement(zeilen, name) {
    const blockElement = document.createElement('div');
    blockElement.className = 'dz-b';
    blockElement.style.setProperty('--zeilen', String(zeilen.length));
    blockElement.style.setProperty('--bb', `${blockBreite(zeilen)}px`);
    const tabelleElement = document.createElement('table');
    tabelleElement.className = 'dz';
    tabelleElement.setAttribute('aria-label', name);
    const rumpfElement = document.createElement('tbody');
    for (const zeile of zeilen) {
      rumpfElement.append(zeileElement(zeile));
    }
    tabelleElement.append(rumpfElement);
    blockElement.append(tabelleElement);
    return blockElement;
  }

  function zeileElement(zeile) {
    const diffzeileElement = document.createElement('tr');
    diffzeileElement.dataset.art = zeile.art;
    if (zeile.art === 'kopf') {
      diffzeileElement.className = 'hk';
      const kopfElement = textzelleElement(zeile);
      kopfElement.colSpan = 4;
      diffzeileElement.append(kopfElement);
      return diffzeileElement;
    }
    diffzeileElement.className = zeile.art;
    diffzeileElement.dataset.alt = nummerText(zeile.alt);
    diffzeileElement.dataset.neu = nummerText(zeile.neu);
    let vorzeichen = VORZEICHEN[zeile.art];
    if (vorzeichen === undefined) {
      vorzeichen = '';
    }
    diffzeileElement.append(
      verborgeneZelle('n alt', nummerText(zeile.alt)),
      verborgeneZelle('n neu', nummerText(zeile.neu)),
      verborgeneZelle('m', vorzeichen),
      textzelleElement(zeile),
    );
    return diffzeileElement;
  }

  function nummerText(nummer) {
    if (nummer === null) {
      return '';
    }
    return String(nummer);
  }

  function verborgeneZelle(klassen, text) {
    const zelleElement = document.createElement('td');
    zelleElement.className = klassen;
    zelleElement.setAttribute('aria-hidden', 'true');
    zelleElement.textContent = text;
    return zelleElement;
  }

  /** Der Text mit Lesetext für Screenreader und sichtbar gemachten Zeichen; jede Marke ist ein Bild mit Namen, ihr Text bleibt im Dokument. */
  function textzelleElement(zeile) {
    const zelleElement = document.createElement('td');
    zelleElement.className = 'c';
    const lesetext = LESETEXT[zeile.art];
    if (lesetext) {
      zelleElement.append(textElement('vh', lesetext));
    }
    for (const teil of sichtbarTeile(zeile.text)) {
      zelleElement.append(teilKnoten(teil));
    }
    return zelleElement;
  }

  function teilKnoten(teil) {
    if (!teil.marke) {
      return document.createTextNode(teil.text);
    }
    const markeElement = textElement(`mk-z mk-${teil.marke}`, teil.text);
    markeElement.setAttribute('role', 'img');
    markeElement.setAttribute('aria-label', `sichtbar gemachtes Zeichen ${teil.code}`);
    return markeElement;
  }

  function textElement(klassen, text) {
    const element = document.createElement('span');
    element.className = klassen;
    element.textContent = text;
    return element;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
