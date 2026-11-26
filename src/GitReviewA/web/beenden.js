/* gitreviewA — Knöpfe „Beenden“ und „Abbrechen“ (R00050, B4602/B4604): beide öffnen den einen Dialog
   (`beenden-dialog.js`) mit der Beschreibung aus `beenden-werte.js`; beim Öffnen holt dieser Baustein Anmerkungen, Haken und
   Netto-Liste einmal vom Server (die eine Stelle, an der I0042 später weitere Quellen ergänzt). Bestätigen sendet die
   Anforderung; der Antwortzustand bestimmt den Endzustand der Seite. */
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
      const beschreibung = werte().dialogBeschreibung(art, werte().lageAusQuellen(quellen));
      dialog().oeffnen(ausloeser, beschreibung, () => bestaetige(art));
    } finally {
      laedt = false;
    }
  }

  /** Anmerkungen, Haken und Netto-Liste beim Öffnen; eine nicht lesbare Quelle wird `null` („konnte nicht bestimmt werden“). */
  async function ladeQuellen() {
    const [anmerkungen, hakenstand, zusammenstand] = await Promise.all([
      hole('api/anmerkungen'),
      hole('api/haken'),
      holeZusammen(),
    ]);
    return { anmerkungen, hakenstand, zusammenstand };
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