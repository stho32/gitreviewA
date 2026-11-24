/* gitreviewA — Zeile annotieren (R00010): Klick oder Enter auf eine Diff-Zeile öffnet unter ihr ein Notizfeld, „Speichern“ legt die Anmerkung
   über `POST /api/anmerkungen` an, und nach jedem Zeichnen eines Diffs (`diff-gezeichnet`) stehen die Anmerkungen unter ihren Zeilen.
   Quelle der Wahrheit ist der Server (`GET /api/anmerkungen`). Anmerkungstext und Pfade sind fremder Text: nur textContent und Attributwerte. */
(function () {
  'use strict';

  const SPEICHERN_GESCHEITERT = 'Anmerkung konnte nicht gespeichert werden';
  const DIFFZEILE = 'tr[data-art]';

  /** `anmerkungen`: Stand des Servers in Anlegereihenfolge; `ladung`: nur die jüngste Liste zählt; `gezeichnet`: Detail des letzten
      `diff-gezeichnet`; `fokusZeileElement`: die Diff-Zeile mit dem wandernden tabindex. */
  const zustand = { anmerkungen: [], ladung: 0, gezeichnet: null, fokusZeileElement: null };

  function init() {
    const wurzelElement = document.getElementById('diff');
    const ansicht = {
      rollElement: wurzelElement.querySelector('.df-sc'),
      hinweisElement: wurzelElement.querySelector('.anmerkung-hinweis'),
    };
    ansicht.rollElement.addEventListener('click', ereignis => waehleZeilePerKlick(ansicht, ereignis));
    ansicht.rollElement.addEventListener('keydown', ereignis => bedieneZeilenPerTastatur(ansicht, ereignis));
    document.addEventListener('diff-gezeichnet', ereignis => merkeUndZeigeAn(ansicht, ereignis.detail));
    document.addEventListener('datei-gewaehlt', () => zeigeHinweis(ansicht, ''));
    document.addEventListener('commit-gewaehlt', () => zeigeHinweis(ansicht, ''));
    ladeAnmerkungen(ansicht);
  }

  /* ── Stand vom Server und Anzeige am Diff ── */

  async function ladeAnmerkungen(ansicht) {
    const ladung = zustand.ladung + 1;
    zustand.ladung = ladung;
    let anmerkungen;
    try {
      anmerkungen = await anmerkungenAbrufen();
    } catch {
      zeigeHinweis(ansicht, 'Anmerkungen konnten nicht geladen werden');
      return;
    }
    if (ladung !== zustand.ladung) {
      return;
    }
    zustand.anmerkungen = anmerkungen;
    zeigeAnmerkungen();
  }

  async function anmerkungenAbrufen() {
    const antwort = await fetch('api/anmerkungen', { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  function merkeUndZeigeAn(ansicht, gezeichnet) {
    zustand.gezeichnet = gezeichnet;
    zustand.fokusZeileElement = null;
    zeigeAnmerkungen();
  }

  /** Zeichnet die Anmerkungen des gezeigten Diffs neu: je Anmerkung eine Anmerkungszeile unter ihrer Diff-Zeile, darüber der Hinweis
      auf Anmerkungen an Zeilen, die die Ansicht nicht zeigt. Offene Notizfelder bleiben stehen. */
  function zeigeAnmerkungen() {
    const gezeichnet = zustand.gezeichnet;
    const diffIstVerworfen = !gezeichnet || !gezeichnet.ersterBlockElement.isConnected;
    if (diffIstVerworfen) {
      return;
    }
    const bereichElement = gezeichnet.bereichElement;
    for (const altesElement of bereichElement.querySelectorAll('tr.anm, .anmerkungen-ausserhalb')) {
      altesElement.remove();
    }
    const zeileNachNummerNeu = zeilenMitNummerNeu(bereichElement);
    const stand = anmerkungsstand(zustand.anmerkungen, gezeichnet.commit, gezeichnet.pfad, new Set(zeileNachNummerNeu.keys()));
    for (const [nummerNeu, anmerkungen] of stand.jeZeile) {
      zeileNachNummerNeu.get(nummerNeu).after(...anmerkungen.map(anmerkungszeileElement));
    }
    const hinweis = hinweisAusserhalb(stand.ausserhalb);
    if (hinweis) {
      bereichElement.prepend(ausserhalbElement(hinweis));
    }
  }

  function zeilenMitNummerNeu(bereichElement) {
    const zeileNachNummerNeu = new Map();
    for (const zeileElement of bereichElement.querySelectorAll('tr[data-neu]')) {
      if (zeileElement.dataset.neu !== '') {
        zeileNachNummerNeu.set(Number(zeileElement.dataset.neu), zeileElement);
      }
    }
    return zeileNachNummerNeu;
  }

  /** Keine Diff-Zeile: ohne `data-art`, `data-alt`, `data-neu` und ohne die Zellklassen der Färbung (`.c`, `.n`, `.m`). */
  function anmerkungszeileElement(anmerkung) {
    const zeileElement = document.createElement('tr');
    zeileElement.className = 'anm';
    const zelleElement = document.createElement('td');
    zelleElement.colSpan = 4;
    zelleElement.className = 'anm-zelle';
    const textElement = document.createElement('div');
    textElement.className = 'anm-text';
    textElement.textContent = anmerkung.text;
    const stelleElement = document.createElement('div');
    stelleElement.className = 'anm-stelle';
    stelleElement.textContent = `${sichtbarerPfad(anmerkung.datei)}:${anmerkung.zeile}`;
    zelleElement.append(textElement, stelleElement);
    zeileElement.append(zelleElement);
    return zeileElement;
  }

  function ausserhalbElement(hinweis) {
    const hinweisElement = document.createElement('p');
    hinweisElement.className = 'anmerkungen-ausserhalb';
    hinweisElement.setAttribute('role', 'status');
    hinweisElement.textContent = hinweis;
    return hinweisElement;
  }

  /** Unsichtbare und richtungsändernde Zeichen eines Pfads als Marke im Text (wie über dem Diff). */
  function sichtbarerPfad(pfad) {
    return sichtbarTeile(pfad).map(teil => teil.text).join('');
  }

  function zeigeHinweis(ansicht, text) {
    ansicht.hinweisElement.textContent = text;
  }

  /* ── Zeile wählen: Klick und Tastatur ── */

  function waehleZeilePerKlick(ansicht, ereignis) {
    const zeileElement = ereignis.target.closest(DIFFZEILE);
    if (!zeileElement) {
      return;
    }
    const textIstAusgewaehlt = window.getSelection().toString() !== '';
    waehleZeile(ansicht, zeileElement, textIstAusgewaehlt);
  }

  function waehleZeile(ansicht, zeileElement, textIstAusgewaehlt) {
    zeigeHinweis(ansicht, '');
    const ziel = zeilenziel({ art: zeileElement.dataset.art, neu: nummerOderNull(zeileElement.dataset.neu) }, textIstAusgewaehlt);
    if (ziel.art === 'entfernt') {
      zeigeHinweis(ansicht, ziel.hinweis);
      return;
    }
    if (ziel.art === 'annotierbar') {
      setzeZeilenfokus(zeileElement, false);
      oeffneOderFokussiereFeld(ansicht, zeileElement, ziel.neu);
    }
  }

  function nummerOderNull(text) {
    if (text === undefined || text === '') {
      return null;
    }
    return Number(text);
  }

  /** Der Diff-Bereich ist ein Tab-Stopp; Pfeil auf/ab wandert durch die Diff-Zeilen, Enter wählt die Zeile. Eingaben im Notizfeld bleiben dort. */
  function bedieneZeilenPerTastatur(ansicht, ereignis) {
    const istImFeld = ereignis.target.closest('.anm-feld') !== null;
    if (istImFeld) {
      return;
    }
    const zeileElement = ereignis.target.closest(DIFFZEILE);
    if (ereignis.key === 'ArrowDown' || ereignis.key === 'ArrowUp') {
      ereignis.preventDefault();
      const naechsteElement = benachbarteDiffzeile(ansicht.rollElement, zeileElement, ereignis.key === 'ArrowDown');
      if (naechsteElement) {
        setzeZeilenfokus(naechsteElement, true);
      }
      return;
    }
    if (ereignis.key === 'Enter' && zeileElement) {
      ereignis.preventDefault();
      waehleZeile(ansicht, zeileElement, false);
    }
  }

  /** Die Diff-Zeilen in Dokumentreihenfolge über alle Blöcke; ohne aktuelle Zeile beginnt Pfeil ab bei der ersten. */
  function benachbarteDiffzeile(rollElement, zeileElement, abwaerts) {
    const diffzeilen = rollElement.querySelectorAll(DIFFZEILE);
    if (!zeileElement) {
      return diffzeilen[0] || null;
    }
    const stelle = Array.prototype.indexOf.call(diffzeilen, zeileElement);
    let naechsteStelle = stelle - 1;
    if (abwaerts) {
      naechsteStelle = stelle + 1;
    }
    return diffzeilen[naechsteStelle] || null;
  }

  /** Wandernder tabindex: nur die aktuelle Diff-Zeile ist fokussierbar, Tab führt weiter über den Bereich als einen Stopp. */
  function setzeZeilenfokus(zeileElement, fokussieren) {
    const vorigeElement = zustand.fokusZeileElement;
    if (vorigeElement && vorigeElement !== zeileElement) {
      vorigeElement.removeAttribute('tabindex');
    }
    zeileElement.tabIndex = -1;
    zustand.fokusZeileElement = zeileElement;
    if (fokussieren) {
      zeileElement.focus();
    }
  }

  /* ── Notizfeld: öffnen, speichern, abbrechen ── */

  /** Je Zeile höchstens ein offenes Feld: ein weiterer Klick oder Doppelklick gibt dem offenen Feld den Fokus. */
  function oeffneOderFokussiereFeld(ansicht, zeileElement, nummerNeu) {
    const offenesEingabeElement = offeneEingabeDerZeile(zeileElement);
    if (offenesEingabeElement) {
      offenesEingabeElement.focus();
      return;
    }
    oeffneFeld(ansicht, zeileElement, nummerNeu);
  }

  /** Die Zeilen unter einer Diff-Zeile bis zur nächsten Diff-Zeile gehören zu ihr: Anmerkungen und höchstens ein Notizfeld. */
  function offeneEingabeDerZeile(zeileElement) {
    let naechsteElement = zeileElement.nextElementSibling;
    while (naechsteElement && !naechsteElement.matches(DIFFZEILE)) {
      if (naechsteElement.matches('tr.anm-feld')) {
        return naechsteElement.querySelector('textarea');
      }
      naechsteElement = naechsteElement.nextElementSibling;
    }
    return null;
  }

  function oeffneFeld(ansicht, zeileElement, nummerNeu) {
    const gezeichnet = zustand.gezeichnet;
    const feld = {
      ansicht,
      zeileElement,
      ziel: { commit: gezeichnet.commit, datei: gezeichnet.pfad, zeile: nummerNeu },
      speichertGerade: false,
    };
    feld.feldzeileElement = feldzeileElement(feld);
    letzteAnmerkungszeile(zeileElement).after(feld.feldzeileElement);
    feld.eingabeElement.focus();
  }

  /** Das neue Feld steht unter den Anmerkungen, die die Zeile schon trägt. */
  function letzteAnmerkungszeile(zeileElement) {
    let letzteElement = zeileElement;
    while (letzteElement.nextElementSibling && letzteElement.nextElementSibling.matches('tr.anm')) {
      letzteElement = letzteElement.nextElementSibling;
    }
    return letzteElement;
  }

  function feldzeileElement(feld) {
    const zeileElement = document.createElement('tr');
    zeileElement.className = 'anm-feld';
    const zelleElement = document.createElement('td');
    zelleElement.colSpan = 4;
    zelleElement.className = 'anm-zelle';
    feld.eingabeElement = document.createElement('textarea');
    feld.eingabeElement.className = 'inp anm-eingabe';
    feld.eingabeElement.rows = 3;
    feld.eingabeElement.setAttribute('aria-label', `Anmerkung zu ${sichtbarerPfad(feld.ziel.datei)}, Zeile ${feld.ziel.zeile}`);
    feld.eingabeElement.addEventListener('keydown', ereignis => bedieneFeldPerTastatur(feld, ereignis));
    feld.fehlerElement = document.createElement('p');
    feld.fehlerElement.className = 'anm-fehler';
    feld.fehlerElement.setAttribute('role', 'alert');
    feld.speichernElement = knopfElement('btn btn-haupt', 'Speichern', () => speichere(feld));
    const abbrechenElement = knopfElement('btn', 'Abbrechen', () => schliesseFeld(feld));
    const knoepfeElement = document.createElement('div');
    knoepfeElement.className = 'anm-knoepfe';
    knoepfeElement.append(feld.speichernElement, abbrechenElement);
    zelleElement.append(feld.eingabeElement, feld.fehlerElement, knoepfeElement);
    zeileElement.append(zelleElement);
    return zeileElement;
  }

  function knopfElement(klassen, text, beiKlick) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = klassen;
    element.textContent = text;
    element.addEventListener('click', beiKlick);
    return element;
  }

  function bedieneFeldPerTastatur(feld, ereignis) {
    const istSpeichern = ereignis.key === 'Enter' && (ereignis.ctrlKey || ereignis.metaKey);
    if (istSpeichern) {
      ereignis.preventDefault();
      speichere(feld);
      return;
    }
    if (ereignis.key === 'Escape') {
      ereignis.preventDefault();
      schliesseFeld(feld);
    }
  }

  /** Genau eine Anfrage je Feld zur Zeit: „Speichern“ ist gesperrt, bis die Antwort da ist. Die Anmerkung gehört zu Commit, Datei und Zeile
      des Felds — auch wenn währenddessen eine andere Datei gewählt wurde. */
  async function speichere(feld) {
    if (feld.speichertGerade) {
      return;
    }
    feld.speichertGerade = true;
    feld.speichernElement.disabled = true;
    feld.fehlerElement.textContent = '';
    const text = feld.eingabeElement.value;
    const ausgang = await anmerkungAnlegen({ ...feld.ziel, text });
    feld.speichertGerade = false;
    feld.speichernElement.disabled = false;
    if (ausgang.meldung) {
      feld.fehlerElement.textContent = ausgang.meldung;
      return;
    }
    zustand.anmerkungen = [...zustand.anmerkungen, { nummer: ausgang.nummer, ...feld.ziel, text }];
    schliesseFeld(feld);
    zeigeAnmerkungen();
    ladeAnmerkungen(feld.ansicht);
  }

  /** `{nummer}` bei Erfolg; sonst `{meldung}`: der Satz des Servers bei 4xx, bei 5xx und ohne Antwort der allgemeine Satz. */
  async function anmerkungAnlegen(anmerkung) {
    let antwort;
    try {
      antwort = await fetch('api/anmerkungen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(anmerkung),
      });
    } catch {
      return { meldung: SPEICHERN_GESCHEITERT };
    }
    const inhalt = await antwort.json().catch(() => ({}));
    if (antwort.ok && Number.isInteger(inhalt.nummer)) {
      return { nummer: inhalt.nummer };
    }
    const istSatzDesServers = antwort.status >= 400 && antwort.status < 500 && typeof inhalt.meldung === 'string' && inhalt.meldung !== '';
    if (istSatzDesServers) {
      return { meldung: inhalt.meldung };
    }
    return { meldung: SPEICHERN_GESCHEITERT };
  }

  /** Schließt das Feld; steht die Zeile noch im Dokument, bekommt sie den Fokus zurück. */
  function schliesseFeld(feld) {
    feld.feldzeileElement.remove();
    if (feld.zeileElement.isConnected) {
      setzeZeilenfokus(feld.zeileElement, true);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
}());
