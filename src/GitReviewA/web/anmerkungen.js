/* gitreviewA — Anmerkungen (R00010, R00018): Klick oder Enter auf eine Diff-Zeile öffnet unter ihr ein Notizfeld, „Speichern“ legt die Anmerkung
   über `POST /api/anmerkungen` an; „Ändern“ im Anmerkungskopf öffnet ein Feld mit dem vorhandenen Text und schickt den neuen an
   `POST /api/anmerkungen/<nummer>`. Nach jedem Zeichnen eines Diffs (`diff-gezeichnet`) stehen die Anmerkungen unter ihren Zeilen.
   Quelle der Wahrheit ist der Server (`GET /api/anmerkungen`). Anmerkungstext und Pfade sind fremder Text: nur textContent und Attributwerte. */
(function () {
  'use strict';

  const SPEICHERN_GESCHEITERT = 'Anmerkung konnte nicht gespeichert werden';
  const AENDERN_GESCHEITERT = 'Anmerkung konnte nicht geändert werden';
  const DIFFZEILE = 'tr[data-art]';

  /** `anmerkungen`: Stand des Servers in Anlegereihenfolge; `ladung`: nur die jüngste Liste zählt; `gezeichnet`: Detail des letzten
      `diff-gezeichnet`; `fokusZeileElement`: die Diff-Zeile mit dem wandernden tabindex; `aenderungen`: offene Änderungsfelder. */
  const zustand = { anmerkungen: [], ladung: 0, gezeichnet: null, fokusZeileElement: null, aenderungen: [] };

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

  /** Lädt den Stand vom Server und zeichnet neu; mit `fokusNummer` nimmt dieser Anmerkungskopf danach den Fokus (er wird beim Zeichnen ersetzt). */
  async function ladeAnmerkungen(ansicht, fokusNummer = null) {
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
    zeigeAnmerkungen(ansicht);
    if (fokusNummer !== null) {
      fokussiereKopf(ansicht, fokusNummer);
    }
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
    zeigeAnmerkungen(ansicht);
  }

  /** Zeichnet die Anmerkungen des gezeigten Diffs neu: je Anmerkung eine Anmerkungszeile mit Kopf unter ihrer Diff-Zeile, darüber der Hinweis
      auf Anmerkungen an Zeilen, die die Ansicht nicht zeigt. Offene Notizfelder bleiben stehen, offene Änderungsfelder nicht (ihre Zeile wird neu gezeichnet). */
  function zeigeAnmerkungen(ansicht) {
    const gezeichnet = zustand.gezeichnet;
    const diffIstVerworfen = !gezeichnet || !gezeichnet.ersterBlockElement.isConnected;
    if (diffIstVerworfen) {
      return;
    }
    const bereichElement = gezeichnet.bereichElement;
    for (const altesElement of bereichElement.querySelectorAll('tr.anm, tr.anm-aendern, .anmerkungen-ausserhalb')) {
      altesElement.remove();
    }
    zustand.aenderungen = [];
    const zeileNachNummerNeu = zeilenMitNummerNeu(bereichElement);
    const stand = anmerkungsstand(zustand.anmerkungen, gezeichnet.commit, gezeichnet.pfad, new Set(zeileNachNummerNeu.keys()));
    for (const [nummerNeu, anmerkungen] of stand.jeZeile) {
      zeileNachNummerNeu.get(nummerNeu).after(...anmerkungen.map(anmerkung => anmerkungszeileElement(ansicht, anmerkung)));
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
  function anmerkungszeileElement(ansicht, anmerkung) {
    const zeileElement = document.createElement('tr');
    zeileElement.className = 'anm';
    zeileElement.dataset.anmerkung = String(anmerkung.nummer);
    const zelleElement = document.createElement('td');
    zelleElement.colSpan = 4;
    zelleElement.className = 'anm-zelle';
    const textElement = document.createElement('div');
    textElement.className = 'anm-text';
    textElement.textContent = anmerkung.text;
    const stelleElement = document.createElement('div');
    stelleElement.className = 'anm-stelle';
    stelleElement.textContent = stelleDer(anmerkung);
    zelleElement.append(anmerkungskopfElement(ansicht, anmerkung), textElement, stelleElement);
    zeileElement.append(zelleElement);
    return zeileElement;
  }

  /** Der Kopf nennt die stabile Nummer der Anmerkung (nicht ihre Position im Ergebnis) und trägt „Ändern“; er nimmt nach Speichern und
      Abbrechen den Fokus wieder auf. */
  function anmerkungskopfElement(ansicht, anmerkung) {
    const kopfElement = document.createElement('div');
    kopfElement.className = 'anm-kopf';
    kopfElement.tabIndex = -1;
    kopfElement.setAttribute('aria-label', `Anmerkung ${anmerkung.nummer}`);
    const nummerElement = document.createElement('span');
    nummerElement.className = 'anm-nummer';
    nummerElement.textContent = `Anmerkung ${anmerkung.nummer}`;
    const rechtsElement = document.createElement('span');
    rechtsElement.className = 'anm-rechts';
    rechtsElement.append(knopfElement('btn', 'Ändern', () => oeffneOderFokussiereAenderung(ansicht, anmerkung)));
    kopfElement.append(nummerElement, rechtsElement);
    return kopfElement;
  }

  /** Stelle der Anmerkung wie im Ergebnis: `<Datei>:<Zeile>` oder `<Datei> (ganze Datei)`. */
  function stelleDer(anmerkung) {
    const pfad = sichtbarerPfad(anmerkung.datei);
    if (anmerkung.zeile === null) {
      return `${pfad} (ganze Datei)`;
    }
    return `${pfad}:${anmerkung.zeile}`;
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
    const ziel = { commit: gezeichnet.commit, datei: gezeichnet.pfad, zeile: nummerNeu };
    const feld = {
      ansicht,
      zeileElement,
      ziel,
      feldname: `Anmerkung zu ${sichtbarerPfad(ziel.datei)}, Zeile ${ziel.zeile}`,
      zeilenklasse: 'anm-feld',
      vorbelegung: '',
      speichertGerade: false,
    };
    feld.speichern = () => speichere(feld);
    feld.abbrechen = () => schliesseFeld(feld);
    feld.feldzeileElement = notizfeldzeileElement(feld);
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

  /** Zeile eines Notizfelds (Anlegen wie Ändern): Feld, Meldung und Knöpfe; Name, Vorbelegung und Zeilenklasse kommen vom Feld. */
  function notizfeldzeileElement(feld) {
    const zeileElement = document.createElement('tr');
    zeileElement.className = feld.zeilenklasse;
    const zelleElement = document.createElement('td');
    zelleElement.colSpan = 4;
    zelleElement.className = 'anm-zelle';
    feld.eingabeElement = document.createElement('textarea');
    feld.eingabeElement.className = 'inp anm-eingabe';
    feld.eingabeElement.rows = 3;
    feld.eingabeElement.setAttribute('aria-label', feld.feldname);
    feld.eingabeElement.value = feld.vorbelegung;
    feld.eingabeElement.addEventListener('keydown', ereignis => bedieneFeldPerTastatur(feld, ereignis));
    feld.fehlerElement = document.createElement('p');
    feld.fehlerElement.className = 'anm-fehler';
    feld.fehlerElement.setAttribute('role', 'alert');
    feld.speichernElement = knopfElement('btn btn-haupt', 'Speichern', () => feld.speichern());
    const abbrechenElement = knopfElement('btn', 'Abbrechen', () => feld.abbrechen());
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
      feld.speichern();
      return;
    }
    if (ereignis.key === 'Escape') {
      ereignis.preventDefault();
      feld.abbrechen();
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
    zeigeAnmerkungen(feld.ansicht);
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

  /* ── Änderung: Feld unter der Anmerkung, eine Anfrage je Feld ── */

  /** Je Anmerkung höchstens ein Feld: ein zweiter Druck auf „Ändern“ fokussiert das offene, es öffnet kein zweites. Das Feld steht
      unter der Anmerkungszeile, damit der alte Text sichtbar bleibt, bis der neue angenommen ist. */
  function oeffneOderFokussiereAenderung(ansicht, anmerkung) {
    const offenes = zustand.aenderungen.find(feld => feld.anmerkung.nummer === anmerkung.nummer);
    if (offenes) {
      offenes.eingabeElement.focus();
      return;
    }
    const zeileElement = anmerkungszeile(ansicht, anmerkung.nummer);
    if (!zeileElement) {
      return;
    }
    const feld = {
      ansicht,
      anmerkung,
      zeileElement,
      feldname: feldnameDerAnmerkung(anmerkung),
      zeilenklasse: 'anm-aendern',
      vorbelegung: anmerkung.text,
      speichertGerade: false,
    };
    feld.speichern = () => speichereAenderung(feld);
    feld.abbrechen = () => schliesseAenderung(feld);
    feld.feldzeileElement = notizfeldzeileElement(feld);
    zeileElement.after(feld.feldzeileElement);
    zustand.aenderungen.push(feld);
    feld.eingabeElement.focus();
  }

  function anmerkungszeile(ansicht, nummer) {
    return ansicht.rollElement.querySelector(`tr.anm[data-anmerkung="${nummer}"]`);
  }

  /** Name des Änderungsfelds wie beim Anlegen: „Anmerkung zu <Datei>, Zeile <n>“; ohne Zeile nur „Anmerkung zu <Datei>“. */
  function feldnameDerAnmerkung(anmerkung) {
    const pfad = sichtbarerPfad(anmerkung.datei);
    if (anmerkung.zeile === null) {
      return `Anmerkung zu ${pfad}`;
    }
    return `Anmerkung zu ${pfad}, Zeile ${anmerkung.zeile}`;
  }

  /** Genau eine Anfrage je Feld zur Zeit. Die Antwort ersetzt den Text an ihrer stabilen Nummer — auch wenn währenddessen eine andere
      Datei gewählt wurde; nur gezeichnet wird, was zur Nummer gehört. */
  async function speichereAenderung(feld) {
    if (feld.speichertGerade) {
      return;
    }
    feld.speichertGerade = true;
    feld.speichernElement.disabled = true;
    feld.fehlerElement.textContent = '';
    const ausgang = await anmerkungAendern(feld.anmerkung.nummer, feld.eingabeElement.value);
    feld.speichertGerade = false;
    feld.speichernElement.disabled = false;
    if (ausgang.meldung) {
      feld.fehlerElement.textContent = ausgang.meldung;
      return;
    }
    entferneAenderung(feld);
    zustand.anmerkungen = mitGeaendertemText(zustand.anmerkungen, ausgang.nummer, ausgang.text);
    zeigeAnmerkungen(feld.ansicht);
    fokussiereKopf(feld.ansicht, ausgang.nummer);
    ladeAnmerkungen(feld.ansicht, ausgang.nummer);
  }

  /** `{nummer, text}` bei Erfolg; sonst `{meldung}`: der Satz des Servers bei 4xx, bei 5xx und ohne Antwort der allgemeine Satz. */
  async function anmerkungAendern(nummer, text) {
    let antwort;
    try {
      antwort = await fetch(`api/anmerkungen/${nummer}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text }),
      });
    } catch {
      return { meldung: AENDERN_GESCHEITERT };
    }
    const inhalt = await antwort.json().catch(() => ({}));
    const istGeaendert = antwort.ok && Number.isInteger(inhalt.nummer) && typeof inhalt.text === 'string';
    if (istGeaendert) {
      return { nummer: inhalt.nummer, text: inhalt.text };
    }
    const istSatzDesServers = antwort.status >= 400 && antwort.status < 500 && typeof inhalt.meldung === 'string' && inhalt.meldung !== '';
    if (istSatzDesServers) {
      return { meldung: inhalt.meldung };
    }
    return { meldung: AENDERN_GESCHEITERT };
  }

  /** Abbrechen lässt die Anmerkung, wie sie war; der Anmerkungskopf nimmt den Fokus wieder auf. */
  function schliesseAenderung(feld) {
    entferneAenderung(feld);
    fokussiereKopf(feld.ansicht, feld.anmerkung.nummer);
  }

  function entferneAenderung(feld) {
    feld.feldzeileElement.remove();
    zustand.aenderungen = zustand.aenderungen.filter(offenes => offenes !== feld);
  }

  function fokussiereKopf(ansicht, nummer) {
    const zeileElement = anmerkungszeile(ansicht, nummer);
    if (!zeileElement) {
      return;
    }
    zeileElement.querySelector('.anm-kopf').focus();
  }

  document.addEventListener('DOMContentLoaded', init);
}());
