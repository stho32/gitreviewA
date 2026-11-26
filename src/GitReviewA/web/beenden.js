/* gitreviewA — Knöpfe „Beenden“ und „Abbrechen“ (R00050, B4602/B4604): beide öffnen den einen Dialog
   (`beenden-dialog.js`) mit der Beschreibung aus `beenden-werte.js`; beim Öffnen holt dieser Baustein Anmerkungen, Haken,
   Netto-Liste, den Ansichtsstand und den Ergebnistext einmal vom Server — die eine Stelle, an der I0042 weitere Quellen
   ergänzt (R00050, „Anschluss an I0042“). Daraus entstehen die Abschnitte „Nicht angesehen (n)“ und „Ergebnis für die KI“
   (R00041, B4003). Bestätigen sendet die Anforderung; der Antwortzustand bestimmt den Endzustand der Seite. */
(function () {
  'use strict';

  let laedt = false;

  function init() {
    const beenden = document.getElementById('beenden');
    const abbrechen = document.getElementById('abbrechen');
    beenden.addEventListener('click', () => oeffne(werte().BEENDEN));
    abbrechen.addEventListener('click', () => oeffne(werte().ABBRECHEN));
  }

  function werte() {
    return window.gitreviewaBeendenWerte;
  }

  function dialog() {
    return window.gitreviewaBeendenDialog;
  }

  async function oeffne(art) {
    if (!dialog() || dialog().istOffen() || laedt) {
      return;
    }
    laedt = true;
    const ausloeser = document.activeElement;
    try {
      const quellen = await ladeQuellen();
      const lage = werte().lageAusQuellen(quellen);
      lage.abschnitte = abschnitte(quellen);
      const beschreibung = werte().dialogBeschreibung(art, lage);
      dialog().oeffnen(ausloeser, beschreibung, () => bestaetige(art));
    } finally {
      laedt = false;
    }
  }

  /** Anmerkungen, Haken, Netto-Liste, Ansichtsstand und Ergebnis beim Öffnen; eine nicht lesbare Quelle wird `null`. */
  async function ladeQuellen() {
    const [anmerkungen, hakenstand, zusammenstand, angesehen, ergebnis] = await Promise.all([
      hole('api/anmerkungen'),
      hole('api/haken'),
      holeZusammen(),
      hole('api/angesehen'),
      hole('api/ergebnis'),
    ]);
    return { anmerkungen, hakenstand, zusammenstand, angesehen, ergebnis: ergebnistext(ergebnis) };
  }

  /** Die Abschnitte des Abschlussschritts (R00041, B4003): nicht angesehene Einträge und der Text, der auf stdout geht. */
  function abschnitte(quellen) {
    const modus = modusJetzt();
    const angesehen = angesehenSchluessel(quellen.angesehen);
    const liste = listeFuer(modus, quellen);
    const eintraege = abschlussWerte().nichtAngesehen(modus, liste, angesehen, gesperrtFuer(modus), ausgeblendetFuer(modus, quellen));
    return werte().abschlussAbschnitte(standBestimmbar(modus, quellen), eintraege, quellen.ergebnis);
  }

  /** Der Stand ist nur bestimmbar, wenn die Ansicht, die Liste des Modus und der Ansichtsstand selbst gelesen sind. */
  function standBestimmbar(modus, quellen) {
    if (!quellen.angesehen || !Array.isArray(quellen.angesehen.stellen)) {
      return false;
    }
    if (modus === 'zusammen') {
      return Boolean(quellen.zusammenstand) && Array.isArray(quellen.zusammenstand.dateien);
    }
    return Boolean(quellen.hakenstand) && Array.isArray(quellen.hakenstand.stellen);
  }

  function abschlussWerte() {
    return window.gitreviewaAbschlussWerte;
  }

  /** Der gelesene Stand als Menge der Stellen-Schlüssel; der Server nennt rohe Namen, die Liste zeigt Marken (R00041). */
  function angesehenSchluessel(angesehen) {
    const schluessel = new Set();
    if (!angesehen || !Array.isArray(angesehen.stellen)) {
      return schluessel;
    }
    for (const stelle of angesehen.stellen) {
      schluessel.add(stellenSchluessel(stelle.commit, sichtbarerName(stelle.datei)));
    }
    return schluessel;
  }

  function listeFuer(modus, quellen) {
    if (modus === 'zusammen') {
      return nettoListe(quellen.zusammenstand);
    }
    return stellenListe(quellen.hakenstand);
  }

  /** In „Zusammen“ eine Datei mit allen ihren Stellen; der Anzeigename führt (derselbe Schlüssel wie die Netto-Liste). */
  function nettoListe(zusammenstand) {
    if (!zusammenstand || !Array.isArray(zusammenstand.dateien)) {
      return [];
    }
    return zusammenstand.dateien.map(datei => ({
      pfad: datei.pfad,
      schluessel: datei.pfad,
      stellen: datei.stellen.map(stelle => ({ commit: stelle.commit, pfad: stelle.pfad })),
    }));
  }

  /** In „Einzeln“ eine Stelle; der rohe Pfad ist der Listenschlüssel, angezeigt wird der Name mit Marken. */
  function stellenListe(hakenstand) {
    if (!hakenstand || !Array.isArray(hakenstand.stellen)) {
      return [];
    }
    return hakenstand.stellen.map(stelle => ({
      pfad: sichtbarerName(stelle.datei),
      schluessel: stelle.datei,
      commit: stelle.commit,
    }));
  }

  /** Gesperrt wie in Kopf und Ergebnis (R00014): eine Stelle mit Sperrgrund steht dort schon als ungeprüft. */
  function gesperrtFuer(modus) {
    if (modus === 'zusammen') {
      return datei => {
        if (datei.sperrgrund) {
          return true;
        }
        return datei.stellen.some(stelle => haken().sperrgrund(stelle.commit, stelle.pfad) !== '');
      };
    }
    return stelle => haken().stelleGesperrt(stelle.commit, stelle.schluessel);
  }

  /** Ausgeblendet heißt hier: durch Muster (R00025) oder durch den Schalter für Abgehakte (R00029) verdeckt. */
  function ausgeblendetFuer(modus, quellen) {
    return punkt => istDurchMusterVerdeckt(punkt.schluessel) || istDurchHakenVerdeckt(modus, punkt, quellen);
  }

  function istDurchMusterVerdeckt(pfad) {
    if (!window.gitreviewaAusblenden) {
      return false;
    }
    return !window.gitreviewaAusblenden.istSichtbar(pfad);
  }

  function istDurchHakenVerdeckt(modus, punkt, quellen) {
    if (!window.gitreviewaAbgehakte || !window.gitreviewaAbgehakte.istAn()) {
      return false;
    }
    if (modus === 'zusammen') {
      return istDateiAbgehakt(punkt.schluessel, quellen.zusammenstand);
    }
    return haken().stelleAbgehakt(punkt.commit, punkt.schluessel);
  }

  function istDateiAbgehakt(anzeigename, zusammenstand) {
    if (!zusammenstand || !Array.isArray(zusammenstand.dateien)) {
      return false;
    }
    const datei = zusammenstand.dateien.find(eintrag => eintrag.pfad === anzeigename);
    if (!datei) {
      return false;
    }
    return haken().dateiAbgehakt(datei);
  }

  function haken() {
    return window.gitreviewaHaken;
  }

  function modusJetzt() {
    if (window.gitreviewaModus) {
      return window.gitreviewaModus.hole();
    }
    return 'zusammen';
  }

  function sichtbarerName(pfad) {
    if (window.sichtbarerName) {
      return window.sichtbarerName(pfad);
    }
    return pfad;
  }

  function stellenSchluessel(commit, pfad) {
    if (window.stellenSchluessel) {
      return window.stellenSchluessel(commit, pfad);
    }
    return `${commit} ${pfad}`;
  }

  function ergebnistext(antwort) {
    if (!antwort || typeof antwort.ergebnis !== 'string') {
      return null;
    }
    return antwort.ergebnis;
  }

  async function hole(pfad) {
    try {
      const antwort = await fetch(pfad, { headers: { Accept: 'application/json' } });
      if (!antwort.ok) {
        return null;
      }
      return await antwort.json();
    } catch {
      return null;
    }
  }

  /** Die Netto-Liste zählt nur, wenn sie wirklich gelesen ist; „zu groß“ ist keine Liste (R00048). */
  async function holeZusammen() {
    const stand = await hole('api/zusammen');
    if (!stand || stand.zuGross || !Array.isArray(stand.dateien)) {
      return null;
    }
    return stand;
  }

  async function bestaetige(art) {
    dialog().zeigeFehler('');
    dialog().setzeBestaetigenGesperrt(true);
    let ergebnis;
    try {
      ergebnis = await anfordern(art);
    } catch (fehler) {
      // Kein Server mehr (der Prozess ist schon zu Ende): das ist kein gescheitertes Beenden, sondern der Endzustand
      // (R00050, Kriterium 11). Für beide Dialoge dieselbe eine Stelle.
      if (fehler.netzfehler) {
        zeigeEndzustand(werte().BEREITS_ZU_ENDE);
        dialog().schliesse({ grund: 'endzustand' });
        return;
      }
      dialog().zeigeFehler(`${fehlerwort(art)} ist gescheitert: ${fehler.message}`);
      dialog().setzeBestaetigenGesperrt(false);
      return;
    }
    let zustand = ergebnis.zustand;
    if (!zustand) {
      zustand = endzustandDerArt(art);
    }
    zeigeEndzustand(endzustandBeschreibung(zustand));
    dialog().schliesse({ grund: 'endzustand' });
  }

  function fehlerwort(art) {
    if (art === werte().ABBRECHEN) {
      return 'Abbrechen';
    }
    return 'Beenden';
  }

  function endzustandDerArt(art) {
    if (art === werte().ABBRECHEN) {
      return 'abgebrochen';
    }
    return 'beendet';
  }

  /** 200 und 409 tragen den geltenden Zustand; 409 heißt, die andere Art war zuerst angenommen (R00050, Kriterium 11). */
  async function anfordern(art) {
    let pfad = 'api/beenden';
    if (art === werte().ABBRECHEN) {
      pfad = 'api/abbrechen';
    }
    let antwort;
    try {
      antwort = await fetch(pfad, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: '{}',
      });
    } catch {
      // Kein HTTP-Ausgang: der Server ist weg (Prozess schon beendet) oder die Verbindung brach ab — kein Antwortcode.
      const netzfehler = new Error('keine Verbindung zum Server');
      netzfehler.netzfehler = true;
      throw netzfehler;
    }
    let inhalt = {};
    try {
      inhalt = await antwort.json();
    } catch {
      inhalt = {};
    }
    if (antwort.status === 409 && inhalt.zustand) {
      return inhalt;
    }
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return inhalt;
  }

  /** Der Endzustand zu einem angenommenen Zustand — die eine Stelle, die „beendet“ und „abgebrochen“ unterscheidet. */
  function endzustandBeschreibung(zustand) {
    let art = werte().BEENDEN;
    if (zustand === 'abgebrochen') {
      art = werte().ABBRECHEN;
    }
    return werte().dialogBeschreibung(art, werte().lageAusQuellen(null)).endzustand;
  }

  /** Beide Endzustände ersetzen die Bedienung: „Ergebnis kopieren“, „Abbrechen“ und „Beenden“ verschwinden. */
  function zeigeEndzustand(endzustand) {
    const meldungElement = document.createElement('p');
    meldungElement.className = 'gr-beendet';
    meldungElement.setAttribute('role', 'status');
    meldungElement.textContent = endzustand.titel;
    const hinweisElement = document.createElement('p');
    hinweisElement.className = 'gr-beendet-hinweis muted';
    hinweisElement.textContent = endzustand.hinweis;
    for (const id of ['beenden', 'abbrechen', 'ergebnis-kopieren']) {
      document.getElementById(id)?.remove();
    }
    document.querySelector('main').replaceChildren(meldungElement, hinweisElement);
  }

  document.addEventListener('DOMContentLoaded', init);
}());