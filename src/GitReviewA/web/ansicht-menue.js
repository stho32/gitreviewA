/* gitreviewA — Menü „Ansicht ▾“ (R00039, B3801): ein Menüknopf öffnet ein Menü mit den vier Anzeigeverfahren — Ansicht
   (nur Änderungen / ganze Datei), Anordnung (untereinander / nebeneinander), Leerraum ignorieren und Umbruch. Das Menü ist
   ein anderes Bedienelement derselben Zustände: es liest und schreibt nur über die öffentlichen Wege ihrer Module
   (`gitreviewaDiff`, `gitreviewaAnordnung`) — kein zweiter Zustand. Tastatur nach APG Menu Button (B3803): Enter, Leertaste
   und Pfeil runter öffnen, Pfeile wandern, Enter/Leertaste wählen, Esc schließt und gibt den Fokus auf den Knopf zurück.
   Kein Serverweg, kein `git`-Aufruf. */
(function () {
  'use strict';

  const KNOPF_ID = 'ansicht-knopf';
  const MENUE_ID = 'ansicht-menue';

  const zustand = { offen: false };

  function knopf() {
    return document.getElementById(KNOPF_ID);
  }

  function menue() {
    return document.getElementById(MENUE_ID);
  }

  function diff() {
    return window.gitreviewaDiff;
  }

  function anordnung() {
    return window.gitreviewaAnordnung;
  }

  /** Die sechs Einträge in ihren vier Gruppen; `gewaehlt` liest den Zustand aus dem Modul, `waehlen` schreibt dorthin. */
  function eintraege() {
    const ansicht = diff().ansicht();
    const ordnung = anordnung().hole();
    const leerraum = diff().leerraum();
    const umbruch = diff().umbruch();
    return [
      { gruppe: 'Ansicht', art: 'menuitemradio', text: 'nur Änderungen', gewaehlt: ansicht === 'aenderungen', waehlen: () => diff().setzeAnsicht('aenderungen') },
      { gruppe: 'Ansicht', art: 'menuitemradio', text: 'ganze Datei', gewaehlt: ansicht === 'ganz', waehlen: () => diff().setzeAnsicht('ganz') },
      { gruppe: 'Anordnung', art: 'menuitemradio', text: 'untereinander', gewaehlt: ordnung === 'untereinander', waehlen: () => anordnung().setzen('untereinander') },
      { gruppe: 'Anordnung', art: 'menuitemradio', text: 'nebeneinander', gewaehlt: ordnung === 'nebeneinander', waehlen: () => anordnung().setzen('nebeneinander') },
      { gruppe: 'Leerraum', art: 'menuitemcheckbox', text: 'Leerraum ignorieren', gewaehlt: leerraum === 'ignorieren', waehlen: () => diff().setzeLeerraum(leerraum === 'ignorieren' ? 'beachten' : 'ignorieren') },
      { gruppe: 'Umbruch', art: 'menuitemcheckbox', text: 'Umbruch', gewaehlt: umbruch === 'an', waehlen: () => diff().setzeUmbruch(umbruch === 'an' ? 'aus' : 'an') },
    ];
  }

  function init() {
    const knopfElement = knopf();
    if (!knopfElement) {
      return;
    }
    knopfElement.addEventListener('click', () => (zustand.offen ? schliessen(true) : oeffnen(0)));
    knopfElement.addEventListener('keydown', beiTasteAmKnopf);
    document.addEventListener('pointerdown', beiKlickDraussen);
  }

  /** Der Knopf öffnet mit Pfeil runter am ersten, mit Pfeil hoch am letzten Eintrag; Enter und Leertaste öffnen nativ. */
  function beiTasteAmKnopf(ereignis) {
    if (ereignis.key === 'ArrowDown') {
      ereignis.preventDefault();
      oeffnen(0);
      return;
    }
    if (ereignis.key === 'ArrowUp') {
      ereignis.preventDefault();
      oeffnen(-1);
    }
  }

  /** Baut das Menü aus den Zuständen, zeigt es und setzt den Fokus auf den gewählten (oder ersten) Eintrag. */
  function oeffnen(stelle) {
    const menueElement = menue();
    if (!menueElement) {
      return;
    }
    menueElement.replaceChildren(...gruppenElemente());
    menueElement.hidden = false;
    zustand.offen = true;
    knopf().setAttribute('aria-expanded', 'true');
    const posten = eintragsKnoepfe();
    const gewaehlt = posten.findIndex(element => element.getAttribute('aria-checked') === 'true');
    const ziel = stelle < 0 ? posten.length - 1 : (stelle > 0 ? stelle : (gewaehlt >= 0 ? gewaehlt : 0));
    if (posten[ziel]) {
      posten[ziel].focus();
    }
  }

  /** Schließt das Menü; `fokusZurueck` gibt den Fokus auf den Menüknopf (Esc, Wahl), sonst bleibt er, wo er ist (Tab). */
  function schliessen(fokusZurueck) {
    if (!zustand.offen) {
      return;
    }
    zustand.offen = false;
    menue().hidden = true;
    knopf().setAttribute('aria-expanded', 'false');
    if (fokusZurueck) {
      knopf().focus();
    }
  }

  function istOffen() {
    return zustand.offen;
  }

  /** Die vier Gruppen als `role="group"` mit Namen; je Eintrag ein Knopf mit `role` und `aria-checked` (sichtbares Häkchen). */
  function gruppenElemente() {
    const gruppen = [];
    for (const eintrag of eintraege()) {
      let gruppe = gruppen[gruppen.length - 1];
      if (!gruppe || gruppe.name !== eintrag.gruppe) {
        gruppe = { name: eintrag.gruppe, eintraege: [] };
        gruppen.push(gruppe);
      }
      gruppe.eintraege.push(eintrag);
    }
    return gruppen.map(gruppeElement);
  }

  function gruppeElement(gruppe) {
    const element = document.createElement('div');
    element.className = 'menue-gruppe';
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', gruppe.name);
    element.append(...gruppe.eintraege.map(eintragElement));
    return element;
  }

  function eintragElement(eintrag) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'menue-eintrag';
    element.setAttribute('role', eintrag.art);
    element.setAttribute('aria-checked', String(eintrag.gewaehlt));
    const haken = document.createElement('span');
    haken.className = 'menue-haken';
    haken.setAttribute('aria-hidden', 'true');
    haken.textContent = eintrag.gewaehlt ? '✓' : '';
    const text = document.createElement('span');
    text.className = 'menue-text';
    text.textContent = eintrag.text;
    element.append(haken, text);
    element.addEventListener('click', () => waehlen(eintrag));
    element.addEventListener('keydown', beiTasteImMenue);
    return element;
  }

  /** Eine Wahl wirkt wie der bisherige Schalter und schließt das Menü; der Fokus kehrt auf den Knopf zurück. */
  function waehlen(eintrag) {
    eintrag.waehlen();
    schliessen(true);
  }

  /** Pfeile wandern mit Umlauf, Pos1/Ende an die Ränder, Enter/Leertaste wählen nativ, Esc schließt, Tab lässt das Menü. */
  function beiTasteImMenue(ereignis) {
    const posten = eintragsKnoepfe();
    const stelle = posten.indexOf(document.activeElement);
    switch (ereignis.key) {
      case 'ArrowDown':
        ereignis.preventDefault();
        posten[(stelle + 1) % posten.length].focus();
        return;
      case 'ArrowUp':
        ereignis.preventDefault();
        posten[(stelle - 1 + posten.length) % posten.length].focus();
        return;
      case 'Home':
        ereignis.preventDefault();
        posten[0].focus();
        return;
      case 'End':
        ereignis.preventDefault();
        posten[posten.length - 1].focus();
        return;
      case 'Escape':
        ereignis.preventDefault();
        schliessen(true);
        return;
      case 'Tab':
        schliessen(false);
        return;
      default:
    }
  }

  function eintragsKnoepfe() {
    return [...menue().querySelectorAll('.menue-eintrag')];
  }

  /** Ein Klick außerhalb des Menüs und des Knopfes schließt es (ohne Fokuswechsel). */
  function beiKlickDraussen(ereignis) {
    if (!zustand.offen) {
      return;
    }
    const ziel = ereignis.target;
    if (menue().contains(ziel) || knopf().contains(ziel)) {
      return;
    }
    schliessen(false);
  }

  window.gitreviewaAnsichtMenue = { istOffen, oeffnen, schliessen };

  document.addEventListener('DOMContentLoaded', init);
}());
