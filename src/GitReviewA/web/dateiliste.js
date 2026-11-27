/* gitreviewA — Dateiliste nach Modus (R00003, R00012): in „Einzeln“ die Dateien des gewählten Commits, in „Zusammen“ die
   Netto-Liste der ganzen Auswahl. Gelesen wird erst bei Bedarf: in „Einzeln“ bei `commit-gewaehlt`, in „Zusammen“ beim
   `zusammen-geladen` (der Lader ist `zusammen.js`). Flach oder Baum; die Wahl meldet `datei-gewaehlt` mit Modus, Pfad,
   Status, AlterPfad und Commit. Jede Dateizeile trägt ein Kästchen zum Abhaken; beides führt `haken.js`, nach jedem Zeichnen
   gemeldet mit `dateiliste-gezeichnet`. */
(function () {
  'use strict';

  const zustand = {
    modus: 'einzeln', commit: null, dateien: [], darstellung: 'flach', gewaehlterPfad: null, letzteLadung: 0,
    uebernehmenAusstehend: false, ausstehendeWahl: null,
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
    document.addEventListener('zusammen-fehler', ereignis => {
      if (zustand.modus !== 'zusammen') {
        return;
      }
      const grund = ereignis && ereignis.detail && ereignis.detail.meldung;
      zeigeMeldung(ansicht, grund || 'Dateien konnten nicht gelesen werden', true);
      meldeGezeichnet();
    });
    ansicht.darstellungElement.addEventListener('click', ereignis => waehleDarstellung(ansicht, ereignis));
    ansicht.zeilenElement.addEventListener('click', ereignis => waehleDatei(ansicht, ereignis));
    document.addEventListener('ausblenden-geaendert', () => {
      if (zustand.dateien.length > 0) {
        zeichneDateien(ansicht);
      }
    });
    document.addEventListener('suche-geaendert', () => {
      if (zustand.dateien.length > 0) {
        zeichneDateien(ansicht);
      }
    });
    document.addEventListener('abgehakte-geaendert', () => {
      if (zustand.dateien.length > 0) {
        zeichneDateien(ansicht);
      }
    });
    for (const ereignis of ['haken-stand-geladen', 'haken-geaendert']) {
      document.addEventListener(ereignis, aktualisiereGruppenZaehler);
    }
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
    if (dateien && dateien.zuGross) {
      if (ladung === zustand.letzteLadung) {
        zustand.dateien = [];
        zeigeMeldung(ansicht, dateien.meldung || 'zu groß', true);
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
    waehleAusstehende(ansicht);
  }

  /** Eine Wahl, die auf diesen Ladevorgang wartete (R00041, B4004: der Eintrag gehört zu einem anderen Commit). */
  function waehleAusstehende(ansicht) {
    const pfad = zustand.ausstehendeWahl;
    zustand.ausstehendeWahl = null;
    if (pfad) {
      waehle(pfad);
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
      ansicht.meldungElement.textContent = window.gitreviewaAbgehakteWerte
        ? window.gitreviewaAbgehakteWerte.meldung(0, zustand.dateien.length, sicht)
        : 'Alle Dateien ausgeblendet';
      ansicht.zeilenElement.replaceChildren();
      meldeGezeichnet();
      return;
    }
    ansicht.zeilenElement.replaceChildren(gruppeninhalt(sicht));
    meldeGezeichnet();
  }

  /** Je Gruppe der Kopf und darunter ihre Zeilen in der gezeigten Darstellung — ein eigener Baum je Gruppe (R00040). */
  function gruppeninhalt(sicht) {
    const zaehler = zaehlerJeGruppe();
    const groesste = groessteAenderung(zustand.dateien);
    const sammelElement = document.createDocumentFragment();
    for (const gruppe of sichtbareGruppen(sicht)) {
      sammelElement.append(gruppenKopfElement(gruppe, zaehler));
      for (const zeile of sichtbareZeilen({ sichtbare: gruppe.eintraege }, zustand.darstellung)) {
        sammelElement.append(listeneintragElement(zeile, groesste));
      }
    }
    return sammelElement;
  }

  /** Die gezeigten Einträge nach Gruppen (R00040): je Gruppe ein Kopf, darunter ihre Einträge in der bisherigen Reihenfolge. */
  function sichtbareGruppen(sicht) {
    return gruppenWerte().nachGruppen(sicht.sichtbare.map(eintrag => ({ datei: eintrag.datei, anzeigename: sichtbarerName(eintrag.datei.pfad) })));
  }

  /** Der Fortschritt je Gruppe über **alle** Dateien der Auswahl — auch die ausgeblendeten zählen in b (R00040). */
  function zaehlerJeGruppe() {
    return gruppenWerte().zaehlerJeGruppe(zaehlEintraege());
  }

  function zaehlEintraege() {
    const haken = hakenLeser();
    return zustand.dateien.map(datei => ({
      anzeigename: sichtbarerName(datei.pfad),
      abgehakt: zustand.modus === 'zusammen' ? haken.dateiAbgehakt(datei) : haken.stelleAbgehakt(zustand.commit, datei.pfad),
      gesperrt: zustand.modus === 'zusammen' ? haken.dateiGesperrt(datei) : haken.stelleGesperrt(zustand.commit, datei.pfad),
    }));
  }

  /** Gruppenköpfe sind Überschriften der Liste (NFA Benutzerfreundlichkeit): der Screenreader springt von Gruppe zu Gruppe. */
  function gruppenKopfElement(gruppe, zaehler) {
    const element = document.createElement('li');
    element.className = 'gruppe-kopf';
    element.setAttribute('role', 'presentation');
    element.dataset.gruppe = gruppe.schluessel;
    const titelElement = document.createElement('span');
    titelElement.className = 'gruppe-titel';
    titelElement.setAttribute('role', 'heading');
    titelElement.setAttribute('aria-level', '2');
    titelElement.append(textElement('gruppe-name', gruppe.name), document.createTextNode(' '), textElement('gruppe-zaehler', zaehlerFuer(gruppe, zaehler)));
    element.append(titelElement);
    return element;
  }

  function zaehlerFuer(gruppe, zaehler) {
    const gefunden = zaehler.find(eintrag => eintrag.schluessel === gruppe.schluessel);
    return gefunden ? gefunden.text : '';
  }

  /** Nach jeder Änderung am Haken-Stand steht der Fortschritt der Gruppen neu — ohne die Liste neu zu zeichnen. */
  function aktualisiereGruppenZaehler() {
    if (zustand.dateien.length === 0) {
      return;
    }
    const zaehler = zaehlerJeGruppe();
    for (const element of document.querySelectorAll('#datei-zeilen .gruppe-kopf')) {
      const eintrag = zaehler.find(gefunden => gefunden.schluessel === element.dataset.gruppe);
      element.querySelector('.gruppe-zaehler').textContent = eintrag ? eintrag.text : '';
    }
  }

  function gruppenWerte() {
    return window.gitreviewaGruppenWerte;
  }

  function hakenLeser() {
    return window.gitreviewaHaken || {
      dateiAbgehakt: () => false, dateiGesperrt: () => false, stelleAbgehakt: () => false, stelleGesperrt: () => false,
    };
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
      ordnerElement.append(pfadElement('pfad', zeile.name));
      return ordnerElement;
    }
    const datei = zeile.datei;
    const dateiElement = eintragElement('datei-zeile', zeile.tiefe);
    // Die Zeile ist selbst kein Tab-Stopp (das Kästchen ist einer), nimmt aber den Fokus der Kürzel `j`/`k`/`u` auf (R00030).
    dateiElement.tabIndex = -1;
    const istGewaehlt = zustand.gewaehlterPfad !== null && sichtbarerName(datei.pfad) === sichtbarerName(zustand.gewaehlterPfad);
    dateiElement.setAttribute('aria-current', String(istGewaehlt));
    dateiElement.dataset.pfad = datei.pfad;
    const statusElement = textElement(`status status-${datei.status}`, datei.status);
    dateiElement.append(hakenElement(datei), statusElement, pfadElement('pfad', pfadText(datei, zeile)), textElement('haken-grund', ''), balkenElement(datei, groesste), textElement('zahlen mono', zahlenText(datei)));
    return dateiElement;
  }

  /** Der Zeilentext einer Umbenennung nennt beide Namen (`neu ← alt`, PO 2026-11-25); sonst der angezeigte Pfad. */
  function pfadText(datei, zeile) {
    const umbenennung = window.umbenennungsText ? window.umbenennungsText(datei) : null;
    return umbenennung || zeile.name;
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

  /** Der Pfad als Element mit Umbruchstellen (R00056): der Anzeigename in Abschnitten, dazwischen je ein `<wbr>` (leer, kein
      Text — `textContent`, Markieren und Kopieren bleiben unverändert, R00011). Die Abschnitte kommen aus dem einen Baustein
      `dateinamen-umbruch-werte.js`, den Datei- und Ordnerzeile teilen. */
  function pfadElement(klassen, text) {
    const element = document.createElement('span');
    element.className = klassen;
    const werte = window.gitreviewaUmbruchStellen;
    const teile = werte ? werte.abschnitte(text) : [{ text, umbruchDanach: false }];
    for (const teil of teile) {
      element.append(document.createTextNode(teil.text));
      if (teil.umbruchDanach) {
        element.append(document.createElement('wbr'));
      }
    }
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
    /** Die Datei wählen, ohne auf einen Klick zu warten (R00041, B4004: der Eintrag im Abschlussdialog führt hierher);
        `pfad` ist der Listenschlüssel. Liefert `false`, wenn die gezeigte Liste sie nicht führt. */
    waehle,
    /** Die Datei erst nach dem nächsten Laden wählen — für einen Eintrag aus einem anderen Commit (R00041, B4004). */
    waehleNachLaden: pfad => { zustand.ausstehendeWahl = pfad; },
  };

  function waehle(pfad) {
    const datei = zustand.dateien.find(eintrag => eintrag.pfad === pfad);
    if (!datei) {
      return false;
    }
    zustand.gewaehlterPfad = datei.pfad;
    for (const zeile of document.querySelectorAll('#datei-zeilen .datei-zeile')) {
      zeile.setAttribute('aria-current', String(zeile.dataset.pfad === datei.pfad));
    }
    meldeWahl(datei);
    return true;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
